/* ------------------------------------------------------------------ */
/* Expo push                                                           */
/* ------------------------------------------------------------------ */

import fetch from "node-fetch";

import { db } from "../firebase";

export async function sendExpoPush(
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

export const sendPushNotification = async (
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
