/* ------------------------------------------------------------------ */
/* Hug room triggers                                                   */
/* ------------------------------------------------------------------ */

import { getDatabase } from "firebase-admin/database";
import {
  onValueCreated,
  onValueDeleted,
  onValueUpdated,
} from "firebase-functions/database";
import fetch from "node-fetch";

import { db } from "../firebase";
import { isBlockedEitherWay } from "../lib/blocks";

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
