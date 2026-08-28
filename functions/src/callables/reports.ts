/* -------------------------------------------------------------------- */
/* Reporting                                                            */
/* -------------------------------------------------------------------- */

import { FieldValue } from "firebase-admin/firestore";
import { HttpsError, onCall } from "firebase-functions/https";

import { db } from "../firebase";

/**
 * The reasons a report may carry. Kept in lockstep with `REPORT_REASONS` in
 * `lib/handleReports.ts` — the client sends one of these strings and anything
 * else is refused.
 */
const REPORT_REASONS = [
  "harassment",
  "sexual",
  "hate",
  "spam",
  "other",
] as const;
type ReportReason = (typeof REPORT_REASONS)[number];

const MAX_REPORT_NOTE = 500;

/**
 * Reports one account may file per day. Reporting is a way to reach a human,
 * so it is also a way to flood one; the cap is high enough that no honest
 * reporter will meet it.
 */
const REPORT_DAILY_LIMIT = 20;

/** UTC day key, so the cap rolls over at a fixed time rather than per-user. */
const dayKey = (ms: number) => new Date(ms).toISOString().slice(0, 10);

/**
 * Counts one report against the caller's daily allowance, throwing once they
 * are over it. A counter document rather than a query over `reports`: the
 * equality-plus-range query that would answer the same question needs a
 * composite index, and this project ships no index file.
 */
async function consumeReportQuota(uid: string) {
  const ref = db.doc(`reportQuota/${uid}`);
  const today = dayKey(Date.now());

  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const sameDay = snap.exists && snap.get("day") === today;
    const count = sameDay ? (snap.get("count") as number) : 0;

    if (count >= REPORT_DAILY_LIMIT) {
      throw new HttpsError(
        "resource-exhausted",
        "Too many reports today. Please try again tomorrow.",
      );
    }

    tx.set(ref, { day: today, count: count + 1 });
  });
}

/**
 * File a report against a user, optionally about one specific hug.
 *
 * The snapshot is the point of this function. `blockUser` purges every hug
 * between the pair, and the flow that leads here almost always ends in a
 * block — so the offending content is copied into the report while it still
 * exists. Without that, every report would arrive pointing at a hug that had
 * already been deleted, and there would be nothing to review.
 */
export const reportContent = onCall(async (request) => {
  const uid = request.auth?.uid;
  if (!uid) throw new HttpsError("unauthenticated", "Sign in");

  const reportedId: string | undefined = request.data?.reportedId;
  const hugId: string | undefined = request.data?.hugId;
  const reason: string | undefined = request.data?.reason;
  const rawNote: unknown = request.data?.note;

  if (!reportedId)
    throw new HttpsError("invalid-argument", "reportedId required");
  if (reportedId === uid)
    throw new HttpsError("invalid-argument", "Can't report yourself");
  if (!reason || !REPORT_REASONS.includes(reason as ReportReason))
    throw new HttpsError("invalid-argument", "Unknown reason");

  const note =
    typeof rawNote === "string"
      ? rawNote.trim().slice(0, MAX_REPORT_NOTE) || null
      : null;

  const reportedSnap = await db.doc(`users/${reportedId}`).get();
  if (!reportedSnap.exists) throw new HttpsError("not-found", "No such user");

  await consumeReportQuota(uid);

  let content: Record<string, unknown> | null = null;

  if (hugId) {
    const hugSnap = await db.doc(`hugs/${hugId}`).get();
    if (!hugSnap.exists) throw new HttpsError("not-found", "No such hug");
    const hug = hugSnap.data()!;

    // Only a participant may report a hug. Without this check the callable
    // would hand back the contents of any hug in the database to anyone who
    // guessed an id.
    if (hug.from !== uid && hug.to !== uid)
      throw new HttpsError("permission-denied", "Not your hug");

    // ...and the person being reported has to be the other end of it.
    if (hug.from !== reportedId && hug.to !== reportedId)
      throw new HttpsError(
        "invalid-argument",
        "That hug does not involve that user",
      );

    content = {
      from: hug.from,
      to: hug.to,
      fromName: hug.fromName ?? null,
      note: hug.note ?? null,
      // The image itself lives in Storage, which the purge does not touch,
      // so the path stays resolvable after the hug document is gone.
      imagePath: hug.imagePath ?? null,
      backgroundColor: hug.backgroundColor ?? null,
      hugBacks: hug.hugBacks ?? [],
      createdAt: hug.createdAt ?? null,
    };
  }

  const ref = await db.collection("reports").add({
    reporter: uid,
    reported: reportedId,
    // snapshotted so the report still reads well after a rename
    reportedName: reportedSnap.get("displayName") ?? null,
    reason,
    note,
    hugId: hugId ?? null,
    content,
    status: "open",
    createdAt: FieldValue.serverTimestamp(),
  });

  return { ok: true, reportId: ref.id };
});
