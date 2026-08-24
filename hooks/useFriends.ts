import { db } from "@/lib/firebaseConfig";
import { FriendshipRequest, UserFriend } from "@/lib/handleFriends";
import {
  collection,
  onSnapshot,
  orderBy,
  query,
  Timestamp,
  where,
} from "firebase/firestore";
import { create } from "zustand";
import { getCurrentUser, subscribeToCurrentUser } from "./useCurrentUser";

export type Friend = {
  uid: string;
  displayName: string;
  avatar?: string;
  addedAt?: Date;
  lastHugAt?: Timestamp | null;
  online?: boolean;
};

type FriendsState = {
  friends: UserFriend[];
  friendRequests: FriendshipRequest[];
  /** True until the first friends snapshot lands, or until we know there is no user. */
  isLoading: boolean;
};

/**
 * One store, one pair of listeners, for the whole app — the same treatment
 * `useCurrentUser` already got, and for the same reason.
 *
 * This used to be a plain hook holding its own state, so every caller opened
 * its own `friendshipRequests` query and its own `users/{uid}/friends`
 * listener: the tab layout, the friends screen, `useTopHugger` *inside* that
 * same screen, and the add-friend modal — four copies of one list. The SDK
 * canonicalizes identical query targets, so the duplicates mostly rode one
 * watch stream rather than billing four times over, but any window where the
 * layout's copy was unmounted (the sign-in hand-off, chiefly) dropped the
 * target and paid to re-read the whole subcollection on the next attach.
 *
 * As with the user store, the listeners below are deliberately never torn
 * down while someone is signed in. Keeping the target alive is what stops a
 * re-attach — and Firestore's local cache is memory-only here (see
 * lib/firebaseConfig.ts), so a re-attach means re-reading every friend doc
 * from the server, not resuming from a token.
 */
const useFriendsStore = create<FriendsState>(() => ({
  friends: [],
  friendRequests: [],
  isLoading: true,
}));

const set = useFriendsStore.setState;

let unsubscribeRequests: (() => void) | undefined;
let unsubscribeFriends: (() => void) | undefined;

function detach() {
  unsubscribeRequests?.();
  unsubscribeFriends?.();
  unsubscribeRequests = undefined;
  unsubscribeFriends = undefined;
}

function attach(uid: string) {
  const friendshipRequestsQuery = query(
    collection(db, "friendshipRequests"),
    where("to", "==", uid),
    where("status", "==", "pending"),
    orderBy("createdAt", "desc"),
  );

  unsubscribeRequests = onSnapshot(friendshipRequestsQuery, (snap) =>
    set({
      friendRequests: snap.docs.map(
        (d) => ({ ...d.data(), id: d.id }) as FriendshipRequest,
      ),
    }),
  );

  unsubscribeFriends = onSnapshot(
    collection(db, "users", uid, "friends"),
    (snap) =>
      set({
        friends: snap.docs.map((d) => d.data() as UserFriend),
        isLoading: false,
      }),
  );
}

type UserState = ReturnType<typeof getCurrentUser>;

/** `undefined` both before auth resolves and after sign-out. */
const uidOf = (s: UserState) => s.authUser?.uid ?? s.user?.uid; // the cached user carries the uid too

let currentUid: string | undefined;

function syncTo(state: UserState) {
  const uid = uidOf(state);

  // Auth landing on `null` is a real answer, not a pending one: without this,
  // a signed-out session never leaves the loading state, because the uid is
  // `undefined` before auth resolves and `undefined` after it resolves to
  // nobody — the check below can't tell those two apart on its own.
  if (!uid && state.authUser === null) set({ isLoading: false });

  if (uid === currentUid) return;
  currentUid = uid;

  detach();

  if (!uid) {
    // The store outlives sign-out, so this has to be cleared explicitly or the
    // next user briefly sees the previous one's friends.
    set({ friends: [], friendRequests: [], isLoading: false });
    return;
  }

  set({ isLoading: true });
  attach(uid);
}

// `subscribe` only reports future changes, and the user store hydrates from
// disk as soon as it loads — so the current value has to be read once here or
// a uid that resolved before this module ran would never attach.
syncTo(getCurrentUser());
subscribeToCurrentUser(syncTo);

/**
 * Each field is selected separately rather than as one object: zustand v5
 * compares snapshots by reference, so a selector building `{ friends, ... }`
 * would return a fresh object every render and never settle.
 */
export function useFriends() {
  const friends = useFriendsStore((s) => s.friends);
  const friendRequests = useFriendsStore((s) => s.friendRequests);
  const isLoading = useFriendsStore((s) => s.isLoading);
  return { friends, friendRequests, isLoading };
}

/** Reads the friends list outside React — no subscription, no re-render. */
export const getFriendsState = () => useFriendsStore.getState();
