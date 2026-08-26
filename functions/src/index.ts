/**
 * Import function triggers from their respective submodules:
 *
 * import {onCall} from "firebase-functions/v2/https";
 * import {onDocumentWritten} from "firebase-functions/v2/firestore";
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

import { setGlobalOptions } from "firebase-functions";

import * as admin from "firebase-admin";
import { getDatabase } from "firebase-admin/database";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import {
  onValueCreated,
  onValueDeleted,
  onValueUpdated,
} from "firebase-functions/database";
import { HttpsError, onCall } from "firebase-functions/https";
import {
  onDocumentCreated,
  onDocumentUpdated,
} from "firebase-functions/v2/firestore";
import fetch from "node-fetch";
import { getAuth } from "firebase-admin/auth";
import { getStorage } from "firebase-admin/storage";

// Start writing functions
// https://firebase.google.com/docs/functions/typescript

// For cost control, you can set the maximum number of containers that can be
// running at the same time. This helps mitigate the impact of unexpected
// traffic spikes by instead downgrading performance. This limit is a
// per-function limit. You can override the limit for each function using the
// `maxInstances` option in the function's options, e.g.
// `onRequest({ maxInstances: 5 }, (req, res) => { ... })`.
// NOTE: setGlobalOptions does not apply to functions using the v1 API. V1
// functions should each use functions.runWith({ maxInstances: 10 }) instead.
// In the v1 API, each function can only serve one request per container, so
// this will be the maximum concurrent request count.
setGlobalOptions({ maxInstances: 10 });

// export const helloWorld = onRequest((request, response) => {
//   logger.info("Hello logs!", {structuredData: true});
//   response.send("Hello from Firebase!");
// });

admin.initializeApp();
const db = admin.firestore();

/**
 * The bots. Each one is a real user doc (`users/{uid}`, with a displayName)
 * that answers hugs automatically: it accepts any friend request, opens
 * every hug it gets, and answers in the hug's own thread until the thread's
 * turns run out.
 *
 * A bot is entirely defined by its note source, so adding one is a user doc
 * plus an entry here.
 */
const BOTS: Record<string, () => Promise<string | null>> = {
  "bot-nope": fetchNoReason,
  "bot-zen": fetchZenQuote,
};

const isBot = (uid: string) => uid in BOTS;

/* ------------------------------------------------------------------ */
/* Blocking                                                            */
/* ------------------------------------------------------------------ */

/**
 * A block lives at `blocks/{blockerUid}_{blockedUid}`. The deterministic id
 * means any check is a direct get instead of a query, and the pair can only
 * ever be blocked once.
 *
 * The blocked person must never learn they were blocked, so nothing about a
 * block is ever exposed to them: security rules keep this collection
 * server-only, and everything the client needs goes through the callables
 * below.
 */
const blockDocId = (blocker: string, blocked: string) =>
  `${blocker}_${blocked}`;

const blockRef = (blocker: string, blocked: string) =>
  db.doc(`blocks/${blockDocId(blocker, blocked)}`);

/**
 * True if either side has blocked the other. Contact is cut in both
 * directions: a blocker doesn't want to hear from the person they blocked
 * either.
 */
async function isBlockedEitherWay(a: string, b: string): Promise<boolean> {
  const [ab, ba] = await db.getAll(blockRef(a, b), blockRef(b, a));
  return ab.exists || ba.exists;
}

/** Tear down a friendship in both directions. Safe to call when absent. */
function unlinkFriends(uid: string, friendId: string) {
  const batch = db.batch();
  batch.delete(db.doc(`users/${uid}/friends/${friendId}`));
  batch.delete(db.doc(`users/${friendId}/friends/${uid}`));
  batch.update(db.doc(`users/${uid}`), {
    friends: FieldValue.arrayRemove(friendId),
  });
  batch.update(db.doc(`users/${friendId}`), {
    friends: FieldValue.arrayRemove(uid),
  });
  return batch.commit();
}

/** Drop any friendship request between the two, in either direction. */
async function clearFriendshipRequests(a: string, b: string) {
  const refs = [
    db.doc(`friendshipRequests/${a}_${b}`),
    db.doc(`friendshipRequests/${b}_${a}`),
  ];
  await Promise.all(refs.map((ref) => ref.delete()));
}

export const onHugCreated = onDocumentCreated("hugs/{hugId}", async (event) => {
  console.log("🔥🔥🔥 onHugCreated FIRED");
  console.log("hugId:", event.params.hugId);

  const snap = event.data;
  if (!snap) return;

  const hug = snap.data();
  if (!hug?.to) return;

  // introducing the BOTs here
  // do not process hugs that a bot sent itself
  if (isBot(hug.to) && !isBot(hug.from)) {
    await sendBotReply(snap.ref, hug);
    return;
  }

  // A blocked pair never exchanges hugs. The doc is flagged rather than
  // deleted so the sender's own outbox still looks normal — they must not be
  // able to tell a block from a quiet friend. The recipient's list filters
  // flagged hugs out, and no stats or push follow.
  if (hug.from && (await isBlockedEitherWay(hug.from, hug.to))) {
    await snap.ref.update({ blockedDelivery: true });
    console.log("Hug not delivered, pair is blocked", snap.id);
    return;
  }

  // update stats here
  try {
    const batch = db.batch();

    // Only touch friend docs that already exist. `set(..., {merge:true})`
    // creates one when it's missing, which resurrected removed friendships as
    // a nameless "?" row in the other person's list — any hug landing after an
    // unfriend or a block was enough to do it.
    const sentRef = db.doc(`users/${hug.from}/friends/${hug.to}`);
    const receivedRef = db.doc(`users/${hug.to}/friends/${hug.from}`);
    const [sentDoc, receivedDoc] = await db.getAll(sentRef, receivedRef);

    if (sentDoc.exists) {
      batch.set(
        sentRef,
        {
          totalHugsSent: FieldValue.increment(1),
          lastSentHug: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );
    }

    if (receivedDoc.exists) {
      batch.set(
        receivedRef,
        {
          totalHugsReceived: FieldValue.increment(1),
          lastReceivedHug: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );
    }

    batch.set(
      db.doc(`users/${hug.from}`),
      { stats: { hugsSent: FieldValue.increment(1) } },
      { merge: true },
    );

    batch.set(
      db.doc(`users/${hug.to}`),
      { stats: { hugsReceived: FieldValue.increment(1) } },
      { merge: true },
    );

    await batch.commit();
  } catch (err) {
    console.error("Stats update failed for hug", snap.id, err);
  }

  // send notification
  await sendPushNotification(hug, snap.id);
});

const DAY_MS = 24 * 60 * 60 * 1000;

/** Keep in sync with lib/hugs/thread.ts. */
const MAX_HUG_BACKS = 6;

/** Keep in sync with MAX_HUG_BACKS_PER_PERSON in lib/hugs/thread.ts. */
const MAX_HUG_BACKS_PER_PERSON = MAX_HUG_BACKS / 2;

/** Keep in sync with MAX_LEN in lib/handleHugs.ts. */
const MAX_HUG_BACK_LEN = 140;

type HugBackItem = {
  from: string;
  note: string;
  createdAt: FirebaseFirestore.Timestamp;
};

const threadOf = (data: FirebaseFirestore.DocumentData): HugBackItem[] =>
  Array.isArray(data.hugBacks) ? (data.hugBacks as HugBackItem[]) : [];

export const onHugBack = onDocumentUpdated("hugs/{hugId}", async (event) => {
  const before = event.data?.before.data();
  const after = event.data?.after.data();
  if (!before || !after) return;

  // this fires on every hug write — marking seen alone will hit it
  // constantly. Only proceed when a turn was actually appended.
  const beforeThread = threadOf(before);
  const afterThread = threadOf(after);
  if (afterThread.length <= beforeThread.length) return;
  if (afterThread.length > MAX_HUG_BACKS) return;
  if (!after.from || !after.to) return;

  const latest = afterThread[afterThread.length - 1];
  const backFrom = latest.from;
  const backTo = backFrom === after.from ? after.to : after.from;
  const isFirstBack = afterThread.length === 1;

  // Blocking deletes the hugs between the pair, so there should be nothing
  // left to hug back — but a client holding a stale copy can still write one,
  // and it must not reach the person who blocked them.
  if (await isBlockedEitherWay(backFrom, backTo)) {
    console.log("Hug-back dropped, pair is blocked", event.params.hugId);
    return;
  }

  // A bot keeps the thread going: it answers every turn addressed to it,
  // until it runs out of turns. Its own reply comes back through here as a
  // turn from the bot, which takes the normal path below (stats, push).
  if (isBot(backTo) && !isBot(backFrom)) {
    await sendBotHugBack(event.data!.after.ref, backTo, afterThread);
    return;
  }

  try {
    // How long this turn took: measured from the turn it answers, or from
    // the hug itself for the first one.
    const basis = isFirstBack
      ? (after.seenAt ?? after.createdAt)
      : afterThread[afterThread.length - 2].createdAt;
    const ms = basis
      ? Math.min(latest.createdAt.toMillis() - basis.toMillis(), DAY_MS)
      : null;

    const batch = db.batch();

    batch.set(
      db.doc(`users/${backFrom}`),
      { stats: { hugsBackSent: FieldValue.increment(1) } },
      { merge: true },
    );
    batch.set(
      db.doc(`users/${backTo}`),
      { stats: { hugsBackReceived: FieldValue.increment(1) } },
      { merge: true },
    );

    // on the receiver's friend doc: how fast does this friend hug back?
    // skipped when they're no longer friends, so the write can't recreate a
    // friend doc that was removed (see onHugCreated).
    const friendRef = db.doc(`users/${backTo}/friends/${backFrom}`);
    if ((await friendRef.get()).exists) {
      batch.set(
        friendRef,
        {
          hugBackCount: FieldValue.increment(1),
          ...(ms !== null && { hugBackTotalMs: FieldValue.increment(ms) }),
          lastHugBackAt: latest.createdAt,
        },
        { merge: true },
      );
    }

    await batch.commit();
  } catch (err) {
    console.error("Hug-back stats failed", event.params.hugId, err);
  }

  const userSnap = await db.doc(`users/${backTo}`).get();
  const token = userSnap.get("pushToken");
  if (!token) return;

  // Names live on the hug, keyed by direction, not by who is speaking now.
  const backFromName =
    (backFrom === after.from ? after.fromName : after.toName) ?? "Someone";

  await sendExpoPush(token, {
    title: "Hugged back 🫂",
    body: isFirstBack
      ? `${backFromName} hugged you back!`
      : `${backFromName} answered: ${latest.note}`,
    data: { type: "hug_back", hugId: event.params.hugId },
  });
});

/* ------------------------------------------------------------------ */
/* Bot note sources                                                     */
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
const sendBotHugBack = async (
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

    const now = admin.firestore.Timestamp.now();
    const item: HugBackItem = { from: botUid, note, createdAt: now };

    tx.update(hugRef, {
      ...extra,
      [`seenAtBy.${botUid}`]: now,
      hugBacks: [...thread, item],
    });
  });
};

const sendBotReply = async (
  hugRef: FirebaseFirestore.DocumentReference,
  originalHug: FirebaseFirestore.DocumentData,
) => {
  console.log(`🤖 ${originalHug.to} replying to ${originalHug.from}`);

  // The bot answers in the hug's own thread — a hug back, not a fresh hug —
  // so it opens the thread the same way a real recipient would. Opening the
  // hug rides along with that first turn: `onHugBack` measures the turn from
  // `seenAt`, so it has to be there by the time the thread grows.
  await sendBotHugBack(hugRef, originalHug.to, [], {
    seenAt: admin.firestore.Timestamp.now(),
  });
};

const sendPushNotification = async (
  hug: FirebaseFirestore.DocumentData,
  hugId: string,
) => {
  // get user
  const userSnap = await db.doc(`users/${hug.to}`).get();
  const user = userSnap.data();

  if (!user?.pushToken) {
    console.log("No push token for user", hug.to);
    return;
  }

  // send the msgggg, whoaa!
  const message = {
    to: user.pushToken,
    sound: "default",
    title: "You got a hug 🥹",
    body: `${hug.fromName ?? "Someone"} sent you a ${hug.imagePath ? "postcard" : "hug"}`,
    data: {
      hugId,
    },
  };

  const json = await fetch("https://exp.host/--/api/v2/push/send", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(message),
  });
  console.log("Expo push response:", json);
};

export const onHugRoomInvite = onValueCreated(
  {
    ref: `hugRooms/{roomId}/invite`,
    region: "europe-west1",
  },
  async (event) => {
    const snap = event.data;
    if (!snap) return;

    const invite = snap.val();
    if (invite.status !== "pending") return;

    const roomId = event.params.roomId;
    // const db = getDatabase();

    // blocked either way: no inbox entry, no push. The inviter is left in an
    // empty room, exactly as if the other side never picked up.
    if (invite.from && invite.to) {
      if (await isBlockedEitherWay(invite.from, invite.to)) {
        console.log("Invite dropped, pair is blocked", roomId);
        return;
      }
    }

    console.log("Writing inbox entry", { to: invite.to, roomId });

    await getDatabase().ref(`userInvites/${invite.to}/${roomId}`).set({
      from: invite.from,
      fromName: invite.fromName,
      createdAt: invite.createdAt,
      status: "pending",
      sessionState: "ongoing",
    });
    console.log("Inbox entry written");

    // the bottom is copy pasta, but make a generic function for sending notifications afterwards
    // get user
    const userSnap = await db.doc(`users/${invite.to}`).get();
    const user = userSnap.data();

    if (!user?.pushToken) {
      console.log("No push token for user", invite.to);
      return;
    }

    // send the msgggg, whoaa!
    const message = {
      to: user.pushToken,
      sound: "default",
      title: "You got an invite!",
      body: `${invite.fromName} invites you to the room`,
      data: {
        type: "hug_invite",
        roomId: snap.key,
      },
      categoryId: "hug_invite",
    };

    const json = await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(message),
    });
    console.log("Expo push response:", json);
  },
);

export const onInviteStatusChanged = onValueUpdated(
  {
    ref: "hugRooms/{roomId}/invite",
    region: "europe-west1",
  },
  async (event) => {
    const before = event.data?.before.val();
    const after = event.data?.after.val();

    if (!after || before?.status === after.status) return;

    const roomId = event.params.roomId;

    const entry = getDatabase().ref(`userInvites/${after.to}/${roomId}`);

    if (after.status === "accepted") {
      await entry.update({ status: "accepted", sessionState: "ongoing" });
    } else if (after.status === "declined") {
      await entry.update({ status: "declined", sessionState: "ended" });
    }
  },
);

export const onHugRoomDeleted = onValueDeleted(
  { ref: "hugRooms/{roomId}", region: "europe-west1" },
  async (event) => {
    const invite = event.data.val()?.invite;
    if (!invite) return;
    await getDatabase()
      .ref(`userInvites/${invite.to}/${event.params.roomId}`)
      .update({ sessionState: "ended" });
  },
);

export const onFriendshipRequestCreated = onDocumentCreated(
  "friendshipRequests/{id}",
  async (event) => {
    const req = event.data?.data();
    if (!req || req.status !== "pending") return;

    if (isBot(req.to) && !isBot(req.from)) {
      await linkFriends(req.to, req.from);
      // Same as `acceptFriendRequest`: an accepted request is a deleted one.
      // Left in place it keeps showing as pending on the sender's side.
      await event.data?.ref.delete();
      return;
    }

    // blocked either way: drop the request silently, no notification
    if (await isBlockedEitherWay(req.from, req.to)) {
      await event.data?.ref.delete();
      return;
    }

    const toSnap = await db.doc(`users/${req.to}`).get();
    const token = toSnap.get("pushToken");

    // send notification
    if (token) {
      await sendExpoPush(token, {
        title: "New hug friend?",
        body: `${req.fromName} wants to be your friend`,
        data: { type: "friend_request", requestId: req.id },
      });
    }
  },
);

/** RETAINING HUGS WORK */
const HUG_PAGE = 300;

type PairTotals = {
  // from A's perspective:
  aSent: number; // hugs A sent to B
  aReceived: number; // hugs A received from B
  lastSentByA: Timestamp | null; // most recent hug A sent to B
  lastSentByB: Timestamp | null; // most recent hug B sent to A
};

/**
 * Replay the hug log between two users and tally directional totals.
 * Returns zeros if they've never hugged (fresh friendship).
 * Paginated so an old, hug-heavy pair doesn't load everything at once.
 */
async function recountHugsBetween(a: string, b: string): Promise<PairTotals> {
  const totals: PairTotals = {
    aSent: 0,
    aReceived: 0,
    lastSentByA: null,
    lastSentByB: null,
  };

  // two directional queries: A->B and B->A
  const directions: { from: string; to: string }[] = [
    { from: a, to: b },
    { from: b, to: a },
  ];

  for (const { from, to } of directions) {
    let cursor: FirebaseFirestore.QueryDocumentSnapshot | null = null;

    while (true) {
      let q = db
        .collection("hugs")
        .where("from", "==", from)
        .where("to", "==", to)
        .orderBy("createdAt") // needs a composite index (from,to,createdAt)
        .limit(HUG_PAGE);

      if (cursor) q = q.startAfter(cursor);

      const snap = await q.get();
      if (snap.empty) break;

      for (const d of snap.docs) {
        const createdAt: Timestamp | null = d.get("createdAt") ?? null;
        if (from === a) {
          totals.aSent += 1;
          if (
            createdAt &&
            (!totals.lastSentByA ||
              createdAt.toMillis() > totals.lastSentByA.toMillis())
          ) {
            totals.lastSentByA = createdAt;
          }
        } else {
          totals.aReceived += 1;
          if (
            createdAt &&
            (!totals.lastSentByB ||
              createdAt.toMillis() > totals.lastSentByB.toMillis())
          ) {
            totals.lastSentByB = createdAt;
          }
        }
      }

      if (snap.size < HUG_PAGE) break;
      cursor = snap.docs[snap.docs.length - 1];
    }
  }

  return totals;
}

async function linkFriends(a: string, b: string) {
  const [aSnap, bSnap, totals] = await Promise.all([
    db.doc(`users/${a}`).get(),
    db.doc(`users/${b}`).get(),
    recountHugsBetween(a, b),
  ]);

  const now = FieldValue.serverTimestamp();

  // A's doc about B: A's "sent" is aSent, A's "received" is aReceived,
  // A's lastSentHug is the last hug A sent to B.
  const aFriendDoc = {
    id: b,
    displayName: bSnap.get("displayName"),
    avatar: bSnap.get("avatar") ?? null,
    friendedAt: now,
    totalHugsSent: totals.aSent,
    totalHugsReceived: totals.aReceived,
    lastSentHug: totals.lastSentByA, // may be null
    lastReceivedHug: totals.lastSentByB, // A received what B sent
    numStreakDays: 0,
  };

  // B's doc about A is the mirror: B's "sent" == A's "received", and vice versa.
  const bFriendDoc = {
    id: a,
    displayName: aSnap.get("displayName"),
    avatar: aSnap.get("avatar") ?? null,
    friendedAt: now,
    totalHugsSent: totals.aReceived, // B sent what A received
    totalHugsReceived: totals.aSent, // B received what A sent
    lastSentHug: totals.lastSentByB, // last hug B sent to A
    lastReceivedHug: totals.lastSentByA, // B received what A sent
    numStreakDays: 0,
  };

  const batch = db.batch();
  batch.set(db.doc(`users/${a}/friends/${b}`), aFriendDoc);
  batch.set(db.doc(`users/${b}/friends/${a}`), bFriendDoc);
  batch.update(db.doc(`users/${a}`), { friends: FieldValue.arrayUnion(b) });
  batch.update(db.doc(`users/${b}`), { friends: FieldValue.arrayUnion(a) });
  await batch.commit();

  return { aSnap, bSnap, resumed: totals.aSent + totals.aReceived > 0 };
}

export const acceptFriendRequest = onCall(async (request) => {
  const uid = request.auth?.uid;
  if (!uid) throw new HttpsError("unauthenticated", "Sign in");

  const reqRef = db.doc(`friendshipRequests/${request.data.requestId}`);
  const snap = await reqRef.get();
  if (!snap.exists) throw new HttpsError("not-found", "Request gone");
  const req = snap.data()!;
  if (req.to !== uid)
    throw new HttpsError("permission-denied", "Not your request");
  if (req.status !== "pending")
    throw new HttpsError("failed-precondition", "Already handled");

  const { aSnap, bSnap } = await linkFriends(req.from, req.to);
  await reqRef.delete();

  // the caller is waiting on this response to unblock its UI, so don't make
  // it sit through a round trip to Expo's push server
  const token = aSnap.get("pushToken");
  if (token) {
    void sendExpoPush(token, {
      title: "New friend! 🤗",
      body: `${bSnap.get("displayName")} accepted your request`,
    }).catch((err) => console.error("accept push failed", err));
  }
  return { ok: true };
});

export const declineFriendRequest = onCall(async (request) => {
  const uid = request.auth?.uid;
  if (!uid) throw new HttpsError("unauthenticated", "Sign in");
  const reqRef = db.doc(`friendshipRequests/${request.data.requestId}`);
  const snap = await reqRef.get();
  if (snap.exists && snap.get("to") === uid) await reqRef.delete();
  return { ok: true };
});

export const removeFriend = onCall(async (request) => {
  const uid = request.auth?.uid;
  if (!uid) throw new HttpsError("unauthenticated", "Sign in");

  const friendId: string | undefined = request.data?.friendId;
  const deleteHistory: boolean = request.data?.deleteHistory ?? false;
  if (!friendId) throw new HttpsError("invalid-argument", "friendId required");
  if (friendId === uid)
    throw new HttpsError("invalid-argument", "Can't unfriend yourself");

  // --- 1. tear down the relationship ---
  await unlinkFriends(uid, friendId);

  // --- 2. optionally purge hug history (both directions) ---
  if (deleteHistory) {
    await purgeHugsBetween(uid, friendId);
  }

  return { ok: true, deletedHistory: deleteHistory };
});

/**
 * Block someone: cut the friendship, drop pending requests, and record the
 * block so every delivery path (hugs, requests, room invites, search) starts
 * skipping this pair. Hug history is deliberately left alone — the blocker
 * keeps their memories, shown under a neutral name in the app.
 */
export const blockUser = onCall(async (request) => {
  const uid = request.auth?.uid;
  if (!uid) throw new HttpsError("unauthenticated", "Sign in");

  const targetId: string | undefined = request.data?.targetId;
  if (!targetId) throw new HttpsError("invalid-argument", "targetId required");
  if (targetId === uid)
    throw new HttpsError("invalid-argument", "Can't block yourself");

  const targetSnap = await db.doc(`users/${targetId}`).get();
  if (!targetSnap.exists) throw new HttpsError("not-found", "No such user");

  await blockRef(uid, targetId).set({
    blocker: uid,
    blocked: targetId,
    // snapshotted so the blocked list still reads well after they rename
    blockedName: targetSnap.get("displayName") ?? null,
    createdAt: FieldValue.serverTimestamp(),
  });

  await Promise.all([
    unlinkFriends(uid, targetId),
    clearFriendshipRequests(uid, targetId),
  ]);

  // Every hug between them goes, for both sides. Leaving the blocked person's
  // copy behind left them a live thread into someone who blocked them: they
  // could still open those hugs and hug back, and the hug-back would land.
  // This is deliberately irreversible — unblocking does not bring them back.
  await purgeHugsBetween(uid, targetId);

  return { ok: true };
});

/** Lift a block. Does not restore the friendship — that has to be re-earned. */
export const unblockUser = onCall(async (request) => {
  const uid = request.auth?.uid;
  if (!uid) throw new HttpsError("unauthenticated", "Sign in");

  const targetId: string | undefined = request.data?.targetId;
  if (!targetId) throw new HttpsError("invalid-argument", "targetId required");

  await blockRef(uid, targetId).delete();
  return { ok: true };
});

/**
 * The people *you* blocked. Served by a callable rather than a client query
 * so the `blocks` collection can stay unreadable from the client — that's
 * what keeps the other direction ("who blocked me") private.
 */
export const getBlockedUsers = onCall(async (request) => {
  const uid = request.auth?.uid;
  if (!uid) throw new HttpsError("unauthenticated", "Sign in");

  const snap = await db.collection("blocks").where("blocker", "==", uid).get();

  const users = snap.docs.map((d) => ({
    uid: d.get("blocked") as string,
    displayName: (d.get("blockedName") as string | null) ?? "Someone",
    blockedAt: (d.get("createdAt") as Timestamp | null)?.toMillis() ?? null,
  }));

  return { users };
});

const SEARCH_LIMIT = 10;

/**
 * Prefix search over displayName, minus yourself and anyone on either end of
 * a block. Runs server-side because hiding a blocker from the person they
 * blocked can't be done on the client without handing them the block list.
 */
export const searchUsers = onCall(async (request) => {
  const uid = request.auth?.uid;
  if (!uid) throw new HttpsError("unauthenticated", "Sign in");

  // Lowercased here as well as on the client: usernames are stored
  // normalised, the range query below is byte-ordered, and this is the only
  // side that every caller has to go through.
  const term = (request.data?.term ?? "").trim().toLowerCase();
  if (term.length < 3) return { users: [] };

  const snap = await db
    .collection("users")
    .where("displayName", ">=", term)
    // high private-use codepoint as the upper bound -> every prefix match
    .where("displayName", "<=", term + "")
    .orderBy("displayName")
    .limit(SEARCH_LIMIT)
    .get();

  const candidates = snap.docs.filter((d) => d.id !== uid);
  if (candidates.length === 0) return { users: [] };

  // one getAll for both directions of every candidate pair
  const refs = candidates.flatMap((d) => [
    blockRef(uid, d.id),
    blockRef(d.id, uid),
  ]);
  const blockSnaps = await db.getAll(...refs);
  const blockedIds = new Set(
    blockSnaps
      .filter((s) => s.exists)
      .flatMap((s) => [s.get("blocker") as string, s.get("blocked") as string]),
  );

  const users = candidates
    .filter((d) => !blockedIds.has(d.id))
    .map((d) => ({
      uid: d.id,
      displayName: d.get("displayName") ?? "",
      avatar: d.get("avatar") ?? null,
    }));

  return { users };
});

/**
 * Delete every hug doc between two users, both directions.
 * Paginated so it stays safe even for long friendships.
 * Assumes hugs have `from` and `to` fields.
 */
async function purgeHugsBetween(a: string, b: string) {
  const pairs = [
    { from: a, to: b },
    { from: b, to: a },
  ];

  for (const { from, to } of pairs) {
    // page through in chunks of 300 to respect the 500-op batch limit
    // and avoid loading an unbounded set into memory at once
    while (true) {
      const snap = await db
        .collection("hugs")
        .where("from", "==", from)
        .where("to", "==", to)
        .limit(300)
        .get();

      if (snap.empty) break;

      const batch = db.batch();
      snap.docs.forEach((d) => batch.delete(d.ref));
      await batch.commit();

      if (snap.size < 300) break; // last page
    }
  }
}

async function sendExpoPush(
  token: string,
  {
    title,
    body,
    data,
  }: { title: string; body: string; data?: Record<string, unknown> },
) {
  if (!token) return;

  const message = {
    to: token,
    sound: "default",
    title,
    body,
    ...(data && { data }),
  };

  const res = await fetch("https://exp.host/--/api/v2/push/send", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(message),
  });

  if (!res.ok) {
    console.error("Expo push failed", await res.text());
  }
}

export const deleteAccount = onCall(async (request) => {
  const uid = request.auth?.uid;
  if (!uid) throw new HttpsError("unauthenticated", "Sign in first.");

  const userRef = db.doc(`users/${uid}`);

  // 1. free the username reservation
  const usernameDocs = await db
    .collection("usernames")
    .where("uid", "==", uid)
    .get();
  for (const d of usernameDocs.docs) await d.ref.delete();

  // 2. remove uid from everyone's friends arrays
  const friendsOfUser = await db
    .collection("users")
    .where("friends", "array-contains", uid)
    .get();
  const batch = db.batch();
  friendsOfUser.forEach((snap) => {
    batch.update(snap.ref, { friends: FieldValue.arrayRemove(uid) });
    batch.delete(snap.ref.collection("friends").doc(uid));
  });
  await batch.commit();

  // 3. anonymize sent hugs, delete attached photos
  const sentHugs = await db.collection("hugs").where("from", "==", uid).get();
  const hugBatch = db.batch();
  sentHugs.forEach((snap) =>
    hugBatch.update(snap.ref, {
      from: null,
      fromName: null,
      imagePath: FieldValue.delete(),
      senderDeleted: true,
    }),
  );
  await hugBatch.commit();

  // 4. wipe their storage folder (photos)
  await getStorage()
    .bucket()
    .deleteFiles({ prefix: `users/${uid}/` }) // adjust to your path scheme
    .catch(() => {});

  // 4b. drop every block this account is on either side of
  const [blocksMade, blocksAgainst] = await Promise.all([
    db.collection("blocks").where("blocker", "==", uid).get(),
    db.collection("blocks").where("blocked", "==", uid).get(),
  ]);
  const blockBatch = db.batch();
  [...blocksMade.docs, ...blocksAgainst.docs].forEach((d) =>
    blockBatch.delete(d.ref),
  );
  await blockBatch.commit();

  const ownFriends = await userRef.collection("friends").get();
  const ownBatch = db.batch();
  ownFriends.forEach((d) => ownBatch.delete(d.ref));
  await ownBatch.commit();

  // 5. delete the user doc
  await userRef.delete();

  // 6. finally, the Auth account itself
  await getAuth().deleteUser(uid);

  return { ok: true };
});
