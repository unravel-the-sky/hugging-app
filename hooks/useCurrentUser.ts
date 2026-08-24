import { User } from "@/lib/createUser";
import { auth, db } from "@/lib/firebaseConfig";
import { registerForPushNotifications } from "@/lib/registerForPushNotifications";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { User as FirebaseAuthUser, onAuthStateChanged } from "firebase/auth";
import { doc, onSnapshot, updateDoc } from "firebase/firestore";
import { create } from "zustand";

const CACHE_KEY = "cached_user";

export const savePushTokenOnUser = async (userId: string) => {
  console.log("userId received, registering for push notifications");
  const token = await registerForPushNotifications();
  console.log("returned token is: ", token);
  if (token) {
    console.log("token to be set into user is: ", token);
    await updateDoc(doc(db, "users", userId), { pushToken: token });
  }
};

type CurrentUserState = {
  /** The Firestore profile. `undefined` until resolved, `null` when signed out. */
  user: User | null | undefined;
  /** The Firebase auth record. `undefined` until resolved, `null` when signed out. */
  authUser: FirebaseAuthUser | null | undefined;
  /** Gates the loader: true until the disk cache has been consulted. */
  isHydrating: boolean;
  /** Background only: true until the first server snapshot lands. */
  isSyncing: boolean;
};

/**
 * One store, one pair of listeners, for the whole app.
 *
 * This used to be a `useState` hook, which meant each of its ~18 callers
 * opened its own auth listener, its own user-document listener and its own
 * cache read — eighteen copies of one user. The listeners below are started
 * once when this module loads and deliberately never torn down: they live as
 * long as the app does, and sign-out arrives through `onAuthStateChanged`
 * rather than through unsubscribing.
 */
const useCurrentUserStore = create<CurrentUserState>(() => ({
  user: undefined,
  authUser: undefined,
  isHydrating: true,
  isSyncing: true,
}));

const set = useCurrentUserStore.setState;

// Paint from the disk cache before auth resolves, so a returning user sees
// their profile instead of a loader. A miss still clears `isHydrating` —
// we can render either way.
AsyncStorage.getItem(CACHE_KEY)
  .then((cached) => {
    // A real snapshot may have landed first; it must win over stale disk.
    if (cached && useCurrentUserStore.getState().user === undefined) {
      set({ user: JSON.parse(cached) });
    }
  })
  .catch((err) => console.error("Cache read failed:", err))
  .finally(() => set({ isHydrating: false }));

let unsubscribeUserDoc: (() => void) | undefined;

onAuthStateChanged(auth, (firebaseUser) => {
  set({ authUser: firebaseUser });
  unsubscribeUserDoc?.();
  unsubscribeUserDoc = undefined;

  if (!firebaseUser) {
    set({ user: null, isSyncing: false });
    AsyncStorage.removeItem(CACHE_KEY);
    return;
  }

  unsubscribeUserDoc = onSnapshot(doc(db, "users", firebaseUser.uid), (snap) => {
    const userData = snap.exists()
      ? ({ ...snap.data(), uid: snap.id } as User)
      : null;
    set({ user: userData, isSyncing: false });
    if (userData) {
      AsyncStorage.setItem(CACHE_KEY, JSON.stringify(userData)).catch(() => {});
    } else {
      AsyncStorage.removeItem(CACHE_KEY);
    }
  });
});

/**
 * Each field is selected separately rather than as one object: zustand v5
 * compares snapshots by reference, so a selector building `{ user, ... }`
 * would return a fresh object every render and never settle.
 */
export function useCurrentUser() {
  const user = useCurrentUserStore((s) => s.user);
  const authUser = useCurrentUserStore((s) => s.authUser);
  const isHydrating = useCurrentUserStore((s) => s.isHydrating);
  const isSyncing = useCurrentUserStore((s) => s.isSyncing);
  return { user, authUser, isHydrating, isSyncing };
}

/** Reads the user outside React — no subscription, no re-render. */
export const getCurrentUser = () => useCurrentUserStore.getState();

/** Subscribe to the user from outside React (other stores, listeners). */
export const subscribeToCurrentUser = useCurrentUserStore.subscribe;
