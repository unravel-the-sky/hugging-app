import { User } from "@/lib/createUser";
import { auth, db } from "@/lib/firebaseConfig";
import { registerForPushNotifications } from "@/lib/registerForPushNotifications";
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

  useEffect(() => {
    let unsubscribeUserDoc: (() => void) | undefined;

    const unsubscribeAuth = onAuthStateChanged(auth, (firebaseUser) => {
      setAuthUser(firebaseUser);

      // Clean up any previous profile listener
      unsubscribeUserDoc?.();
      unsubscribeUserDoc = undefined;

      if (!firebaseUser) {
        setUser(null);
        setLoading(false);
        return;
      }

      const userRef = doc(db, "users", firebaseUser.uid);
      unsubscribeUserDoc = onSnapshot(userRef, (snap) => {
        setUser(snap.exists() ? (snap.data() as User) : null);
        setLoading(false);
      });
    });

    return () => {
      unsubscribeAuth();
      unsubscribeUserDoc?.();
    };
  }, []);

  return { user, loading, authUser };
}
