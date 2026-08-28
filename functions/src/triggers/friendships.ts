/* ------------------------------------------------------------------ */
/* Friendship request trigger                                          */
/* ------------------------------------------------------------------ */

import { onDocumentCreated } from "firebase-functions/v2/firestore";

import { db } from "../firebase";
import { isBlockedEitherWay } from "../lib/blocks";
import { isBot } from "../lib/bots";
import { linkFriends } from "../lib/friends";
import { sendExpoPush } from "../lib/push";

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
