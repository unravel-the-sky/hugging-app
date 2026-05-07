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
