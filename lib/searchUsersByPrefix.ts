import { getFunctions, httpsCallable } from "firebase/functions";
import { app } from "./firebaseConfig";
import { AvatarType } from "./createUser";
import { normalizeUsername } from "./util";

export type UserSearchResult = {
  uid: string;
  displayName: string;
  avatar?: AvatarType | null;
};

const searchUsersFn = httpsCallable(getFunctions(app), "searchUsers");

/**
 * Prefix search on displayName. Firestore can't do contains/fuzzy —
 * this matches names that START WITH `term`.
 *
 * The term is normalised the same way usernames are when they're claimed:
 * the range query underneath is byte-ordered, so a stray capital doesn't
 * merely rank a match lower — every uppercase letter sorts before every
 * lowercase one, and "Sadan" finds nobody at all.
 *
 * Runs on the server so it can drop anyone on either side of a block:
 * hiding a blocker from the person they blocked is only possible if the
 * client never sees the block list.
 */
export async function searchUsersByPrefix(
  term: string,
): Promise<UserSearchResult[]> {
  const normalized = normalizeUsername(term);
  if (normalized.length < 3) return [];

  const result = await searchUsersFn({ term: normalized });
  return (result.data as { users: UserSearchResult[] }).users;
}
