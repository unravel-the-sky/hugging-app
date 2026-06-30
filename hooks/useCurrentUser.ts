import { User } from "@/lib/createUser";
import { auth, db } from "@/lib/firebaseConfig";
import { registerForPushNotifications } from "@/lib/registerForPushNotifications";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { User as FirebaseAuthUser, onAuthStateChanged } from "firebase/auth";
import { doc, onSnapshot, updateDoc } from "firebase/firestore";
import { useEffect, useState } from "react";

export const savePushTokenOnUser = async (userId: string) => {
  console.log("userId received, registering for push notifications");
  const token = await registerForPushNotifications();
  console.log("returned token is: ", token);
  if (token) {
    console.log("token to be set into user is: ", token);
    await updateDoc(doc(db, "users", userId), {
      pushToken: token,
    });
  }
};

export function useCurrentUser() {
  const [authUser, setAuthUser] = useState<FirebaseAuthUser | null | undefined>(
    undefined,
  );
  const [user, setUser] = useState<User | null | undefined>(undefined);
  // const [loading, setLoading] = useState(true);
  // const [isInitializing, setIsInitializing] = useState(true);
  const [isHydrating, setIsHydrating] = useState(true); // gates the loader
  const [isSyncing, setIsSyncing] = useState(true); // background only

  useEffect(() => {
    // step 1: instantly check custom local cache
    const checkCache = async () => {
      try {
        const cached = await AsyncStorage.getItem("cached_user");
        if (cached) setUser(JSON.parse(cached));
      } catch (err) {
        console.error("Cache read failed:", err);
      } finally {
        setIsHydrating(false); // we can render now — cached or not
      }
    };
    checkCache();

    // step 2: get firebase user
    let unsubscribeUserDoc: (() => void) | undefined;

    const unsubscribeAuth = onAuthStateChanged(auth, (firebaseUser) => {
      setAuthUser(firebaseUser);
      unsubscribeUserDoc?.();
      unsubscribeUserDoc = undefined;

      if (!firebaseUser) {
        setUser(null);
        setIsSyncing(false);
        AsyncStorage.removeItem("cached_user");
        return;
      }

      const userRef = doc(db, "users", firebaseUser.uid);
      unsubscribeUserDoc = onSnapshot(userRef, (snap) => {
        const userData = snap.exists()
          ? ({ ...snap.data(), uid: snap.id } as User)
          : null;
        setUser(userData);
        setIsSyncing(false);
        if (userData) {
          AsyncStorage.setItem("cached_user", JSON.stringify(userData)).catch(
            () => {},
          );
        } else {
          AsyncStorage.removeItem("cached_user");
        }
      });
    });

    return () => {
      unsubscribeAuth();
      unsubscribeUserDoc?.();
    };
  }, []);

  return { user, authUser, isHydrating, isSyncing };
}
