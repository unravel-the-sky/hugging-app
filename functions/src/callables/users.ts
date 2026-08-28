/* ------------------------------------------------------------------ */
/* User callables                                                      */
/* ------------------------------------------------------------------ */

import { getAuth } from "firebase-admin/auth";
import { FieldValue } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";
import { HttpsError, onCall } from "firebase-functions/https";

import { db } from "../firebase";
import { blockRef } from "../lib/blocks";

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
