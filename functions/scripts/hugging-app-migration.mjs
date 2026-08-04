#!/usr/bin/env node
/**
 * Backfill hug counters in Squish.
 *
 * Writes, from a single scan of the `hugs` collection:
 *
 *   users/{uid}.stats.hugsSent            — hugs where hug.from === uid
 *   users/{uid}.stats.hugsReceived        — hugs where hug.to   === uid
 *   users/{uid}/friends/{fid}.totalHugsSent      — hugs uid sent to fid
 *   users/{uid}/friends/{fid}.totalHugsReceived  — hugs uid received from fid
 *
 * The friend-level counters are what useTopHugger reads, so they are rewritten
 * here too — earlier purges (removeFriend with deleteHistory) decremented
 * nothing, so they may have drifted from the actual hug log.
 *
 * Usage:
 *   node backfill-user-stats.mjs --key=./sa.json                  # dry run
 *   node backfill-user-stats.mjs --key=./sa.json --apply          # write
 *   node backfill-user-stats.mjs --key=./sa.json --apply --uid=x  # one user
 *   node backfill-user-stats.mjs --key=./sa.json --skip-friends   # stats only
 */

import { initializeApp, cert, applicationDefault } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { readFileSync } from "node:fs";

const PAGE_SIZE = 1000;
const FLUSH_EVERY = 200;

const args = new Map(
  process.argv.slice(2).map((a) => {
    const [k, v] = a.replace(/^--/, "").split("=");
    return [k, v ?? true];
  }),
);

const APPLY = args.has("apply");
const SKIP_FRIENDS = args.has("skip-friends");
const ONLY_UID = typeof args.get("uid") === "string" ? args.get("uid") : null;
const KEY_PATH = typeof args.get("key") === "string" ? args.get("key") : null;

initializeApp({
  credential: KEY_PATH
    ? cert(JSON.parse(readFileSync(KEY_PATH, "utf8")))
    : applicationDefault(),
});

const db = getFirestore();

// ---------------------------------------------------------------------------
// pass 1 — one scan of `hugs`, tally everything
// ---------------------------------------------------------------------------

/** uid -> { sent, received, sentTo: Map<uid,n>, receivedFrom: Map<uid,n> } */
const tallies = new Map();

function slot(uid) {
  let t = tallies.get(uid);
  if (!t) {
    t = { sent: 0, received: 0, sentTo: new Map(), receivedFrom: new Map() };
    tallies.set(uid, t);
  }
  return t;
}

const bump = (map, key) => map.set(key, (map.get(key) ?? 0) + 1);

async function tallyHugs() {
  let cursor = null;
  let scanned = 0;
  let anonymized = 0;

  for (;;) {
    let q = db
      .collection("hugs")
      .select("to", "from")
      .orderBy("__name__")
      .limit(PAGE_SIZE);

    if (cursor) q = q.startAfter(cursor);

    const snap = await q.get();
    if (snap.empty) break;

    for (const doc of snap.docs) {
      const { to, from } = doc.data();

      // deleteAccount sets from: null — the recipient still received it,
      // but there is no sender left to credit.
      if (typeof to === "string" && typeof from === "string") {
        const sender = slot(from);
        sender.sent++;
        bump(sender.sentTo, to);

        const recipient = slot(to);
        recipient.received++;
        bump(recipient.receivedFrom, from);
      } else if (typeof to === "string") {
        slot(to).received++;
        anonymized++;
      }
    }

    scanned += snap.size;
    cursor = snap.docs[snap.docs.length - 1];
    process.stdout.write(`\r  scanned ${scanned} hugs...`);

    if (snap.size < PAGE_SIZE) break;
  }

  process.stdout.write("\n");
  if (anonymized) {
    console.log(
      `  ${anonymized} hug(s) from deleted senders — counted as received only`,
    );
  }
  return scanned;
}

// ---------------------------------------------------------------------------
// pass 2 — write
// ---------------------------------------------------------------------------

async function writeAll() {
  const usersRef = db.collection("users");
  const writer = db.bulkWriter();
  writer.onWriteError((err) => {
    console.error(`  write failed: ${err.documentRef.path} — ${err.message}`);
    return err.failedAttempts < 3;
  });

  const rows = [];
  let cursor = null;
  let pending = 0;
  let friendWrites = 0;

  const maybeFlush = async () => {
    if (APPLY && ++pending >= FLUSH_EVERY) {
      await writer.flush();
      pending = 0;
    }
  };

  for (;;) {
    let q;
    if (ONLY_UID) {
      q = usersRef.where("__name__", "==", usersRef.doc(ONLY_UID));
    } else {
      q = usersRef
        .select("displayName", "stats")
        .orderBy("__name__")
        .limit(PAGE_SIZE);
      if (cursor) q = q.startAfter(cursor);
    }

    const snap = await q.get();
    if (snap.empty) break;

    for (const doc of snap.docs) {
      const uid = doc.id;
      const t = tallies.get(uid) ?? {
        sent: 0,
        received: 0,
        sentTo: new Map(),
        receivedFrom: new Map(),
      };
      const was = doc.data().stats ?? {};

      rows.push({
        user: `${doc.data().displayName ?? "?"} (${uid.slice(0, 6)})`,
        sent: `${was.hugsSent ?? "-"} -> ${t.sent}`,
        received: `${was.hugsReceived ?? "-"} -> ${t.received}`,
        partners: new Set([...t.sentTo.keys(), ...t.receivedFrom.keys()]).size,
      });

      if (APPLY) {
        writer.set(
          doc.ref,
          { stats: { hugsSent: t.sent, hugsReceived: t.received } },
          { merge: true },
        );
        await maybeFlush();
      }

      if (SKIP_FRIENDS) continue;

      // rewrite friend-level counters for friend docs that actually exist —
      // we do not create friend docs for people who are no longer friends.
      const friendDocs = await doc.ref.collection("friends").select().get();

      for (const f of friendDocs.docs) {
        const fid = f.id;
        const sentTo = t.sentTo.get(fid) ?? 0;
        const receivedFrom = t.receivedFrom.get(fid) ?? 0;

        if (APPLY) {
          writer.set(
            f.ref,
            { totalHugsSent: sentTo, totalHugsReceived: receivedFrom },
            { merge: true },
          );
          await maybeFlush();
        }
        friendWrites++;
      }
    }

    cursor = snap.docs[snap.docs.length - 1];
    if (ONLY_UID || snap.size < PAGE_SIZE) break;
  }

  if (APPLY) await writer.close();
  return { rows, friendWrites };
}

// ---------------------------------------------------------------------------

const started = Date.now();
console.log(
  APPLY ? "\nAPPLY — writes are live\n" : "\nDRY RUN — nothing written\n",
);

console.log("pass 1: scanning hugs");
const hugCount = await tallyHugs();

console.log("\npass 2: users + friend docs");
const { rows, friendWrites } = await writeAll();

console.table(rows.sort((a, b) => b.partners - a.partners).slice(0, 50));
if (rows.length > 50) console.log(`  ...and ${rows.length - 50} more`);

console.log(
  [
    "",
    `hugs scanned:  ${hugCount}`,
    `users:         ${rows.length}`,
    `friend docs:   ${friendWrites}`,
    `elapsed:       ${((Date.now() - started) / 1000).toFixed(1)}s`,
    APPLY ? "" : "\nRe-run with --apply to write.",
  ].join("\n"),
);

process.exit(0);
