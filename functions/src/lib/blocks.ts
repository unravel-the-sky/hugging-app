/* ------------------------------------------------------------------ */
/* Blocking                                                            */
/* ------------------------------------------------------------------ */

import { db } from "../firebase";

/**
 * A block lives at `blocks/{blockerUid}_{blockedUid}`. The deterministic id
 * means any check is a direct get instead of a query, and the pair can only
 * ever be blocked once.
 *
 * The blocked person must never learn they were blocked, so nothing about a
 * block is ever exposed to them: security rules keep this collection
 * server-only, and everything the client needs goes through the callables in
 * `callables/blocks.ts`.
 */
const blockDocId = (blocker: string, blocked: string) =>
  `${blocker}_${blocked}`;

export const blockRef = (blocker: string, blocked: string) =>
  db.doc(`blocks/${blockDocId(blocker, blocked)}`);

/**
 * True if either side has blocked the other. Contact is cut in both
 * directions: a blocker doesn't want to hear from the person they blocked
 * either.
 */
export async function isBlockedEitherWay(
  a: string,
  b: string,
): Promise<boolean> {
  const [ab, ba] = await db.getAll(blockRef(a, b), blockRef(b, a));
  return ab.exists || ba.exists;
}
