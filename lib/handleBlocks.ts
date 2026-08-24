import { getFunctions, httpsCallable } from "firebase/functions";
import { app } from "./firebaseConfig";

/**
 * Blocking is entirely server-side: the `blocks` collection is not readable
 * from the client, so the only way in or out is through these callables.
 * That's deliberate — it's what keeps the blocked person from ever finding
 * out they were blocked.
 */

export type BlockedUser = {
  uid: string;
  displayName: string;
  /** ms epoch, or null for blocks written before the timestamp landed. */
  blockedAt: number | null;
};

const functions = getFunctions(app);

const blockUserFn = httpsCallable(functions, "blockUser");
const unblockUserFn = httpsCallable(functions, "unblockUser");
const getBlockedUsersFn = httpsCallable(functions, "getBlockedUsers");

/** Blocks someone and removes the friendship. Throws so the UI can react. */
export const blockUser = async (targetId: string): Promise<void> => {
  await blockUserFn({ targetId });
};

/** Lifts a block. Does not restore the friendship. */
export const unblockUser = async (targetId: string): Promise<void> => {
  await unblockUserFn({ targetId });
};

/** The people you blocked, newest first. */
export const getBlockedUsers = async (): Promise<BlockedUser[]> => {
  const result = await getBlockedUsersFn({});
  const { users } = result.data as { users: BlockedUser[] };
  return [...users].sort((a, b) => (b.blockedAt ?? 0) - (a.blockedAt ?? 0));
};
