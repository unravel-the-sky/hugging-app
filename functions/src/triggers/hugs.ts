/* ------------------------------------------------------------------ */
/* Hug triggers                                                        */
/* ------------------------------------------------------------------ */

import { FieldValue } from "firebase-admin/firestore";
import {
  onDocumentCreated,
  onDocumentUpdated,
} from "firebase-functions/v2/firestore";

import { db } from "../firebase";
import { isBlockedEitherWay } from "../lib/blocks";
import { isBot, sendBotHugBack, sendBotReply } from "../lib/bots";
import { DAY_MS, MAX_HUG_BACKS, threadOf } from "../lib/hugs";
import { sendExpoPush, sendPushNotification } from "../lib/push";

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
