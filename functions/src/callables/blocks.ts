/* ------------------------------------------------------------------ */
/* Block callables                                                     */
/* ------------------------------------------------------------------ */

import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { HttpsError, onCall } from "firebase-functions/https";

import { db } from "../firebase";
import { blockRef } from "../lib/blocks";
import { clearFriendshipRequests, unlinkFriends } from "../lib/friends";
import { purgeHugsBetween } from "../lib/hugs";

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
