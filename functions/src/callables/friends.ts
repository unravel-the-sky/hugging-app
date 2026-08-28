/* ------------------------------------------------------------------ */
/* Friend callables                                                    */
/* ------------------------------------------------------------------ */

import { HttpsError, onCall } from "firebase-functions/https";

import { db } from "../firebase";
import { linkFriends, unlinkFriends } from "../lib/friends";
import { purgeHugsBetween } from "../lib/hugs";
import { sendExpoPush } from "../lib/push";

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
