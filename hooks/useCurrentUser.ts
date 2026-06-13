import { User } from "@/lib/createUser";
import { auth, db } from "@/lib/firebaseConfig";
import { registerForPushNotifications } from "@/lib/registerForPushNotifications";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { onAuthStateChanged, User as FirebaseAuthUser } from "firebase/auth";
import { doc, getDoc, onSnapshot, updateDoc } from "firebase/firestore";
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

export async function getUserFromCollection(uid: string) {
  const userRef = doc(db, "users", uid);
  const snap = await getDoc(userRef);

  if (snap.exists()) {
    const userData = snap.data() as User;
    console.log("userdata is: ", userData);

    return userData;
  }

  return null;
}

export function useCurrentUser() {
  const [authUser, setAuthUser] = useState<FirebaseAuthUser | null | undefined>(
    undefined,
  );
  const [user, setUser] = useState<User | null | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    // step 1: instantly check custom local cache
    const checkCache = async () => {
      try {
        const cachedUser = await AsyncStorage.getItem("cached_user");
        if (cachedUser) {
          setUser(JSON.parse(cachedUser));
          setIsInitializing(false);
          // setLoading(false); FIX THIS LATER, use zustand or something for caching the user uid
        }
      } catch (err) {
        console.error("Cache read failed for the auth user, error: ", err);
      }
    };
    checkCache();

    // step 2: get firebase user
    let unsubscribeUserDoc: (() => void) | undefined;

    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      setAuthUser(firebaseUser);

      // Clean up any previous profile listener
      unsubscribeUserDoc?.();
      unsubscribeUserDoc = undefined;

      if (!firebaseUser) {
        setUser(null);
        setLoading(false);
        // Clear cache on logout
        await AsyncStorage.removeItem("cached_user");
        return;
      }

      const userRef = doc(db, "users", firebaseUser.uid);
      unsubscribeUserDoc = onSnapshot(userRef, async (snap) => {
        const userData = snap.exists() ? (snap.data() as User) : null;
        setUser(userData);
        setLoading(false);
        setIsInitializing(false);

        if (userData) {
          try {
            await AsyncStorage.setItem("cached_user", JSON.stringify(userData));
          } catch (err) {
            console.error("Failed to save user data to cache:", err);
          }
        } else {
          await AsyncStorage.removeItem("cached_user");
        }
      });
    });

    return () => {
      unsubscribeAuth();
      unsubscribeUserDoc?.();
    };
  }, []);

  return { user, loading, authUser, isInitializing };
}
