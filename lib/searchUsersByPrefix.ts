import {
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
} from "firebase/firestore";
import { auth, db } from "./firebaseConfig";
import { AvatarType } from "@/components/user/Avatar";

export type UserSearchResult = {
  uid: string;
  displayName: string;
  avatar?: AvatarType | null;
};

/**
 * Prefix search on displayName. Firestore can't do contains/fuzzy —
 * this matches names that START WITH `term` (case-sensitive).
 * If your displayNames aren't lowercased, query a `displayName_lower`
 * field instead and lowercase `term` here.
 */
export async function searchUsersByPrefix(
  term: string,
  max = 10,
): Promise<UserSearchResult[]> {
  const me = auth.currentUser;
  const trimmed = term.trim();
  if (trimmed.length < 3) return [];

  const end = trimmed + "\uf8ff"; // high codepoint -> catches all prefixes

  const q = query(
    collection(db, "users"),
    where("displayName", ">=", trimmed),
    where("displayName", "<=", end),
    orderBy("displayName"),
    limit(max),
  );

  const snap = await getDocs(q);

  return (
    snap.docs
      .map((d) => ({
        uid: d.id,
        displayName: d.get("displayName") ?? "",
        avatar: d.get("avatar") ?? null,
      }))
      // never show yourself in results
      .filter((u) => u.uid !== me?.uid)
  );
}
