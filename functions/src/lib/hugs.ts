/* ------------------------------------------------------------------ */
/* Hug threads                                                         */
/* ------------------------------------------------------------------ */

import { db } from "../firebase";

export const DAY_MS = 24 * 60 * 60 * 1000;

/** Keep in sync with lib/hugs/thread.ts. */
export const MAX_HUG_BACKS = 6;

/** Keep in sync with MAX_HUG_BACKS_PER_PERSON in lib/hugs/thread.ts. */
export const MAX_HUG_BACKS_PER_PERSON = MAX_HUG_BACKS / 2;

/** Keep in sync with MAX_LEN in lib/handleHugs.ts. */
export const MAX_HUG_BACK_LEN = 140;

export type HugBackItem = {
  from: string;
  note: string;
  createdAt: FirebaseFirestore.Timestamp;
};

export const threadOf = (
  data: FirebaseFirestore.DocumentData,
): HugBackItem[] =>
  Array.isArray(data.hugBacks) ? (data.hugBacks as HugBackItem[]) : [];

/**
 * Delete every hug doc between two users, both directions.
 * Paginated so it stays safe even for long friendships.
 * Assumes hugs have `from` and `to` fields.
 */
export async function purgeHugsBetween(a: string, b: string) {
  const pairs = [
    { from: a, to: b },
    { from: b, to: a },
  ];

  for (const { from, to } of pairs) {
    // page through in chunks of 300 to respect the 500-op batch limit
    // and avoid loading an unbounded set into memory at once
    while (true) {
      const snap = await db
        .collection("hugs")
        .where("from", "==", from)
        .where("to", "==", to)
        .limit(300)
        .get();

      if (snap.empty) break;

      const batch = db.batch();
      snap.docs.forEach((d) => batch.delete(d.ref));
      await batch.commit();

      if (snap.size < 300) break; // last page
    }
  }
}
