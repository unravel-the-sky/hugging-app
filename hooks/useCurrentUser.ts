import { User } from "@/lib/createUser";
import { auth, db } from "@/lib/firebaseConfig";
import { registerForPushNotifications } from "@/lib/registerForPushNotifications";
import { onAuthStateChanged } from "firebase/auth";
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
  const [user, setUser] = useState<User | null | undefined>(undefined);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubscribeUserDoc: (() => void) | undefined;
    let missingTimeout: number | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, (firebaseUser) => {
      console.log("firebaseUser: ", firebaseUser?.uid);
      if (!firebaseUser) {
        setUser(null);
        setLoading(false);
        return;
      }

      const userRef = doc(db, "users", firebaseUser.uid);

      unsubscribeUserDoc = onSnapshot(userRef, (snap) => {
        if (snap.exists()) {
          console.log("snap exists");
          setUser(snap.data() as User);
        } else {
          console.log("snap does not exist");
          setUser(null);
        }
        setLoading(false);
      });
    });

    return () => {
      unsubscribeAuth();
      unsubscribeUserDoc?.();
      if (missingTimeout) clearTimeout(missingTimeout);
    };
  }, []);

  return { user, loading };
}
