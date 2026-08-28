/* ------------------------------------------------------------------ */
/* Friendships                                                         */
/* ------------------------------------------------------------------ */

import { FieldValue, Timestamp } from "firebase-admin/firestore";

import { db } from "../firebase";

/** Tear down a friendship in both directions. Safe to call when absent. */
export function unlinkFriends(uid: string, friendId: string) {
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
export async function clearFriendshipRequests(a: string, b: string) {
  const refs = [
    db.doc(`friendshipRequests/${a}_${b}`),
    db.doc(`friendshipRequests/${b}_${a}`),
  ];
  await Promise.all(refs.map((ref) => ref.delete()));
}

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

export async function linkFriends(a: string, b: string) {
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
