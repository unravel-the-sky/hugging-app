import { getFunctions, httpsCallable } from "firebase/functions";
import { app } from "./firebaseConfig";
import { AvatarType } from "./createUser";

export type UserSearchResult = {
  uid: string;
  displayName: string;
  avatar?: AvatarType | null;
};

const searchUsersFn = httpsCallable(getFunctions(app), "searchUsers");

/**
 * Prefix search on displayName. Firestore can't do contains/fuzzy —
 * this matches names that START WITH `term` (case-sensitive).
 *
 * Runs on the server so it can drop anyone on either side of a block:
 * hiding a blocker from the person they blocked is only possible if the
 * client never sees the block list.
 */
export async function searchUsersByPrefix(
  term: string,
): Promise<UserSearchResult[]> {
  const trimmed = term.trim();
  if (trimmed.length < 3) return [];

  const result = await searchUsersFn({ term: trimmed });
  return (result.data as { users: UserSearchResult[] }).users;
}
