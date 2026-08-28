/* ------------------------------------------------------------------ */
/* Bots                                                                */
/* ------------------------------------------------------------------ */

import { Timestamp } from "firebase-admin/firestore";
import fetch from "node-fetch";

import { db } from "../firebase";
import {
  HugBackItem,
  MAX_HUG_BACKS,
  MAX_HUG_BACKS_PER_PERSON,
  MAX_HUG_BACK_LEN,
  threadOf,
} from "./hugs";

/**
 * The bots. Each one is a real user doc (`users/{uid}`, with a displayName)
 * that answers hugs automatically: it accepts any friend request, opens
 * every hug it gets, and answers in the hug's own thread until the thread's
 * turns run out.
 *
 * A bot is entirely defined by its note source, so adding one is a user doc
 * plus an entry here.
 */
export const BOTS: Record<string, () => Promise<string | null>> = {
  "bot-nope": fetchNoReason,
  "bot-zen": fetchZenQuote,
};

export const isBot = (uid: string) => uid in BOTS;

/* ------------------------------------------------------------------ */
/* Bot note sources                                                    */
/* ------------------------------------------------------------------ */

/** A fresh "no" from no-as-a-service. */
async function fetchNoReason(): Promise<string> {
  let reason = "NO!";
  try {
    const res = await fetch("https://naas.isalman.dev/no");
    if (res.ok) {
      const data = (await res.json()) as { reason?: string };
      if (data.reason) reason = data.reason;
    }
  } catch (err) {
    console.error("Failed to fetch from naas with error: ", err);
  }
  return reason.slice(0, MAX_HUG_BACK_LEN);
}

type ZenQuote = { q?: string; a?: string };

/**
 * ZenQuotes allows 5 calls per 30s per IP, and answers an exceeded limit
 * with HTTP 200 and a quote-shaped body — so a per-hug call would quietly
 * start sending "Too many requests" as a hug back. Instead one batch of 50
 * is fetched at most hourly and served from memory, as their docs ask.
 *
 * The cache lives on the instance: a cold start re-fetches, and several warm
 * instances each keep their own. That is still one call per instance-hour,
 * far below the limit.
 */
const ZEN_TTL_MS = 60 * 60 * 1000;
let zenCache: string[] = [];
let zenFetchedAt = 0;

/** A quote as a note, formatted and short enough to fit. */
const zenNote = (quote: ZenQuote): string | null => {
  const q = quote.q?.trim();
  // The rate-limit body is a well-formed quote attributed to the service.
  if (!q || quote.a === "zenquotes.io") return null;
  const note = quote.a ? `“${q}” — ${quote.a}` : `“${q}”`;
  // Long quotes are dropped rather than cut off mid-sentence: a batch of 50
  // always leaves plenty that fit.
  return note.length <= MAX_HUG_BACK_LEN ? note : null;
};

async function fetchZenQuote(): Promise<string | null> {
  if (!zenCache.length || Date.now() - zenFetchedAt > ZEN_TTL_MS) {
    try {
      const res = await fetch("https://zenquotes.io/api/quotes");
      if (res.ok) {
        const data = (await res.json()) as ZenQuote[];
        const notes = Array.isArray(data)
          ? data.map(zenNote).filter((note): note is string => !!note)
          : [];
        // An empty batch means rate-limited or malformed: keep whatever is
        // cached, stale as it may be, rather than going silent.
        if (notes.length) {
          zenCache = notes;
          zenFetchedAt = Date.now();
        }
      }
    } catch (err) {
      console.error("Failed to fetch from zenquotes with error: ", err);
    }
  }

  if (!zenCache.length) return null;
  return zenCache[Math.floor(Math.random() * zenCache.length)];
}

/* ------------------------------------------------------------------ */
/* Bot replies                                                          */
/* ------------------------------------------------------------------ */

/**
 * Appends a bot's turn to a hug's thread and marks the thread read for it.
 *
 * Read-modify-write in a transaction, like `sendHugBack` on the client: the
 * turn is re-checked against the thread as it stands at write time, so a
 * reply that raced in can't be overwritten.
 */
export const sendBotHugBack = async (
  hugRef: FirebaseFirestore.DocumentReference,
  botUid: string,
  seenThread: HugBackItem[],
  extra: FirebaseFirestore.UpdateData<FirebaseFirestore.DocumentData> = {},
) => {
  // Both caps: the thread's total, and the bot's own share of it.
  const used = seenThread.filter((item) => item.from === botUid).length;
  if (seenThread.length >= MAX_HUG_BACKS || used >= MAX_HUG_BACKS_PER_PERSON) {
    console.log(`🤖 ${botUid} is out of turns`, hugRef.id);
    return;
  }

  const note = await BOTS[botUid]();
  // No note to send: better to stay quiet than to answer with an error.
  if (!note) {
    console.error(`🤖 ${botUid} had no note to send`, hugRef.id);
    return;
  }

  await db.runTransaction(async (tx) => {
    const snap = await tx.get(hugRef);
    if (!snap.exists) return;

    const thread = threadOf(snap.data()!);
    const last = thread[thread.length - 1];
    // Not the bot's turn any more: the thread filled up or moved on while
    // the note was in flight.
    if (thread.length >= MAX_HUG_BACKS) return;
    if (last && last.from === botUid) return;

    const now = Timestamp.now();
    const item: HugBackItem = { from: botUid, note, createdAt: now };

    tx.update(hugRef, {
      ...extra,
      [`seenAtBy.${botUid}`]: now,
      hugBacks: [...thread, item],
    });
  });
};

export const sendBotReply = async (
  hugRef: FirebaseFirestore.DocumentReference,
  originalHug: FirebaseFirestore.DocumentData,
) => {
  console.log(`🤖 ${originalHug.to} replying to ${originalHug.from}`);

  // The bot answers in the hug's own thread — a hug back, not a fresh hug —
  // so it opens the thread the same way a real recipient would. Opening the
  // hug rides along with that first turn: `onHugBack` measures the turn from
  // `seenAt`, so it has to be there by the time the thread grows.
  await sendBotHugBack(hugRef, originalHug.to, [], {
    seenAt: Timestamp.now(),
  });
};
