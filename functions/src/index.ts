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
import { FieldValue } from "firebase-admin/firestore";
import {
  onValueCreated,
  onValueDeleted,
  onValueUpdated,
} from "firebase-functions/database";
import { HttpsError, onCall } from "firebase-functions/https";
import { onDocumentCreated } from "firebase-functions/v2/firestore";
import fetch from "node-fetch";

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

const BOT_UID = "bot-nope";
const BOT_NAME = "nope";

export const onHugCreated = onDocumentCreated("hugs/{hugId}", async (event) => {
  console.log("🔥🔥🔥 onHugCreated FIRED");
  console.log("hugId:", event.params.hugId);

  const snap = event.data;
  if (!snap) return;

  const hug = snap.data();
  if (!hug?.to) return;

  // introducing the BOT here
  // do not process hugs that are sent by the
  if (hug.to === BOT_UID && hug.from !== BOT_UID) {
    await sendBotReply(hug);
    return;
  }

  // update stats here
  const batch = db.batch();
  batch.update(db.doc(`users/${hug.from}/friends/${hug.to}`), {
    // cache
    totalHugsSent: FieldValue.increment(1),
    lastSentHug: FieldValue.serverTimestamp(),
  });
  batch.update(db.doc(`users/${hug.to}/friends/${hug.from}`), {
    totalHugsReceived: FieldValue.increment(1),
  });

  await batch.commit();

  // send notification
  await sendPushNotification(hug, snap.id);
});

const sendBotReply = async (originalHug: FirebaseFirestore.DocumentData) => {
  console.log(`🤖 Bot replying to ${originalHug.from}`);

  // get response from no-as-a-service endpoint here
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

  // now use that reason
  await db.collection("hugs").add({
    from: BOT_UID,
    fromName: BOT_NAME,
    to: originalHug.from,
    toName: originalHug.fromName,
    note: reason,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
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

    // // remove the invitation after handled
    // if (after.status === "accepted" || after.status === "declined") {
    //   await getDatabase()
    //     .ref(`userInvites/${after.to}/${event.params.roomId}`)
    //     .remove();
    // }
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

    if (req.to === BOT_UID && req.from !== BOT_UID) {
      await linkFriends(req.to, req.from);
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

async function linkFriends(a: string, b: string) {
  const [aSnap, bSnap] = await Promise.all([
    db.doc(`users/${a}`).get(),
    db.doc(`users/${b}`).get(),
  ]);
  const now = FieldValue.serverTimestamp();
  const base = {
    friendedAt: now,
    totalHugsSent: 0,
    totalHugsReceived: 0,
    numStreakDays: 0,
  };

  const batch = db.batch();
  batch.set(db.doc(`users/${a}/friends/${b}`), {
    id: b,
    displayName: bSnap.get("displayName"),
    avatar: bSnap.get("avatar") ?? null,
    ...base,
  });
  batch.set(db.doc(`users/${b}/friends/${a}`), {
    id: a,
    displayName: aSnap.get("displayName"),
    avatar: aSnap.get("avatar") ?? null,
    ...base,
  });
  batch.update(db.doc(`users/${a}`), { friends: FieldValue.arrayUnion(b) });
  batch.update(db.doc(`users/${b}`), { friends: FieldValue.arrayUnion(a) });
  await batch.commit();
  return { aSnap, bSnap };
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

  const token = aSnap.get("pushToken");
  if (token) {
    await sendExpoPush(token, {
      title: "New friend! 🤗",
      body: `${bSnap.get("displayName")} accepted your request`,
    });
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

async function sendExpoPush(
  token: string,
  {
    title,
    body,
    data,
  }: { title: string; body: string; data?: { type: string; requestId: any } },
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
