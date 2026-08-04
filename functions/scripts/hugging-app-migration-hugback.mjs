#!/usr/bin/env node
/**
 * Backfill hug + hug-back counters in Squish.
 *
 * One scan of `hugs` produces, for every user:
 *
 *   users/{uid}.stats.hugsSent           — hugs where hug.from === uid
 *   users/{uid}.stats.hugsReceived       — hugs where hug.to   === uid
 *   users/{uid}.stats.hugsBackSent       — hugs uid hugged back (uid was the recipient)
 *   users/{uid}.stats.hugsBackReceived   — uid's hugs that got hugged back
 *
 * and on each friend doc:
 *
 *   users/{uid}/friends/{fid}.totalHugsSent      — hugs uid sent to fid
 *   users/{uid}/friends/{fid}.totalHugsReceived  — hugs uid received from fid
 *   users/{uid}/friends/{fid}.hugBackCount       — times fid hugged uid back
 *   users/{uid}/friends/{fid}.hugBackTotalMs     — summed response latency
 *   users/{uid}/friends/{fid}.lastHugBackAt      — most recent hug-back from fid
 *
 * Mean response time is hugBackTotalMs / hugBackCount, computed client-side.
 * Direction note: a hug A->B that B hugs back is credited on A's doc about B,
 * matching the onHugBack trigger — "how fast does this friend hug me back".
 *
 * Every value is absolute and derived from the hug log, so re-running is safe.
 *
 * Usage:
 *   node backfill-user-stats.mjs --key=./sa.json                  # dry run
 *   node backfill-user-stats.mjs --key=./sa.json --apply          # write
 *   node backfill-user-stats.mjs --key=./sa.json --apply --uid=x  # one user
 *   node backfill-user-stats.mjs --key=./sa.json --skip-friends   # stats only
 */

import { initializeApp, cert, applicationDefault } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { readFileSync } from "node:fs";

const PAGE_SIZE = 1000;
const FLUSH_EVERY = 200;
const DAY_MS = 24 * 60 * 60 * 1000; // latency cap — must match the trigger

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

/**
 * uid -> {
 *   sent, received, backSent, backReceived,
 *   sentTo:       Map<uid, n>,
 *   receivedFrom: Map<uid, n>,
 *   backFrom:     Map<uid, { count, totalMs, last }>   // friend hugged ME back
 * }
 */
const tallies = new Map();

function slot(uid) {
  let t = tallies.get(uid);
  if (!t) {
    t = {
      sent: 0,
      received: 0,
      backSent: 0,
      backReceived: 0,
      sentTo: new Map(),
      receivedFrom: new Map(),
      backFrom: new Map(),
    };
    tallies.set(uid, t);
  }
  return t;
}

const bump = (map, key) => map.set(key, (map.get(key) ?? 0) + 1);

function recordHugBack(hug) {
  // hug went from -> to; `to` hugged back, so `from` is the one being hugged back
  const backFrom = hug.to;
  const backTo = hug.from;

  slot(backFrom).backSent++;

  const owner = slot(backTo);
  owner.backReceived++;

  const entry = owner.backFrom.get(backFrom) ?? {
    count: 0,
    totalMs: 0,
    last: null,
  };

  entry.count++;

  // measure from when they saw it, not when it was sent — otherwise the metric
  // ranks people by timezone and sleep schedule rather than responsiveness
  const basis = hug.seenAt ?? hug.createdAt;
  if (basis?.toMillis) {
    const raw = hug.hugBackAt.toMillis() - basis.toMillis();
    if (raw >= 0) entry.totalMs += Math.min(raw, DAY_MS);
  }

  if (!entry.last || hug.hugBackAt.toMillis() > entry.last.toMillis()) {
    entry.last = hug.hugBackAt;
  }

  owner.backFrom.set(backFrom, entry);
}

async function tallyHugs() {
  let cursor = null;
  let scanned = 0;
  let anonymized = 0;
  let hugBacks = 0;

  for (;;) {
    let q = db
      .collection("hugs")
      .select("to", "from", "createdAt", "seenAt", "hugBackAt")
      .orderBy("__name__")
      .limit(PAGE_SIZE);

    if (cursor) q = q.startAfter(cursor);

    const snap = await q.get();
    if (snap.empty) break;

    for (const doc of snap.docs) {
      const hug = doc.data();
      const { to, from, hugBackAt } = hug;

      if (typeof to === "string" && typeof from === "string") {
        const sender = slot(from);
        sender.sent++;
        bump(sender.sentTo, to);

        const recipient = slot(to);
        recipient.received++;
        bump(recipient.receivedFrom, from);

        if (hugBackAt?.toMillis) {
          recordHugBack(hug);
          hugBacks++;
        }
      } else if (typeof to === "string") {
        // deleteAccount sets from: null — recipient still received it,
        // but there is no sender left to credit
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
  console.log(`  ${hugBacks} hug-back(s) found`);
  if (anonymized) {
    console.log(`  ${anonymized} hug(s) from deleted senders — received only`);
  }
  return { scanned, hugBacks };
}

// ---------------------------------------------------------------------------
// pass 2 — write
// ---------------------------------------------------------------------------

const EMPTY = {
  sent: 0,
  received: 0,
  backSent: 0,
  backReceived: 0,
  sentTo: new Map(),
  receivedFrom: new Map(),
  backFrom: new Map(),
};

const fmt = (ms) =>
  ms < 60_000
    ? `${Math.round(ms / 1000)}s`
    : ms < 3_600_000
      ? `${Math.round(ms / 60_000)}m`
      : `${(ms / 3_600_000).toFixed(1)}h`;

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
      const t = tallies.get(uid) ?? EMPTY;
      const was = doc.data().stats ?? {};

      rows.push({
        user: `${doc.data().displayName ?? "?"} (${uid.slice(0, 6)})`,
        sent: `${was.hugsSent ?? "-"} -> ${t.sent}`,
        received: `${was.hugsReceived ?? "-"} -> ${t.received}`,
        backSent: t.backSent,
        backReceived: t.backReceived,
      });

      if (APPLY) {
        writer.set(
          doc.ref,
          {
            stats: {
              hugsSent: t.sent,
              hugsReceived: t.received,
              hugsBackSent: t.backSent,
              hugsBackReceived: t.backReceived,
            },
          },
          { merge: true },
        );
        await maybeFlush();
      }

      if (SKIP_FRIENDS) continue;

      // only rewrite friend docs that exist — do not resurrect unfriended pairs
      const friendDocs = await doc.ref.collection("friends").select().get();

      for (const f of friendDocs.docs) {
        const fid = f.id;
        const back = t.backFrom.get(fid);

        if (APPLY) {
          writer.set(
            f.ref,
            {
              totalHugsSent: t.sentTo.get(fid) ?? 0,
              totalHugsReceived: t.receivedFrom.get(fid) ?? 0,
              hugBackCount: back?.count ?? 0,
              hugBackTotalMs: back?.totalMs ?? 0,
              lastHugBackAt: back?.last ?? FieldValue.delete(),
            },
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
// fastest-hugger preview — sanity check the latency numbers before trusting them
// ---------------------------------------------------------------------------

function previewFastest() {
  const out = [];
  for (const [uid, t] of tallies) {
    for (const [fid, back] of t.backFrom) {
      if (back.count === 0) continue;
      out.push({
        of: uid.slice(0, 6),
        friend: fid.slice(0, 6),
        hugBacks: back.count,
        mean: fmt(back.totalMs / back.count),
      });
    }
  }
  return out.sort((a, b) => b.hugBacks - a.hugBacks).slice(0, 20);
}

// ---------------------------------------------------------------------------

const started = Date.now();
console.log(APPLY ? "\nAPPLY — writes are live\n" : "\nDRY RUN — nothing written\n");

console.log("pass 1: scanning hugs");
const { scanned, hugBacks } = await tallyHugs();

console.log("\npass 2: users + friend docs");
const { rows, friendWrites } = await writeAll();

console.table(rows.sort((a, b) => b.backReceived - a.backReceived).slice(0, 50));
if (rows.length > 50) console.log(`  ...and ${rows.length - 50} more`);

if (hugBacks > 0) {
  console.log("\nhug-back response times (mean, capped at 24h):");
  console.table(previewFastest());
}

console.log(
  [
    "",
    `hugs scanned:  ${scanned}`,
    `hug-backs:     ${hugBacks}`,
    `users:         ${rows.length}`,
    `friend docs:   ${friendWrites}`,
    `elapsed:       ${((Date.now() - started) / 1000).toFixed(1)}s`,
    APPLY ? "" : "\nRe-run with --apply to write.",
  ].join("\n"),
);

process.exit(0);
