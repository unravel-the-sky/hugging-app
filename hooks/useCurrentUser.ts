import { User } from "@/lib/createUser";
import { auth, db } from "@/lib/firebaseConfig";
import { registerForPushNotifications } from "@/lib/registerForPushNotifications";
import { onAuthStateChanged, signInAnonymously } from "firebase/auth";
import { doc, getDoc, onSnapshot, updateDoc } from "firebase/firestore";
import { useEffect, useState } from "react";

const savePushTokenOnUser = async (userId: string) => {
  console.log("userId received, registering for push notifications");
  const token = await registerForPushNotifications();
  console.log("returned token is: ", token);
  if (token) {
    console.log("token to be set into user is: ", token);
    await updateDoc(doc(db, "user", userId), {
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
  const [user, setUser] = useState<User | null>();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      console.log("is firebaseUser: ", firebaseUser);
      if (!firebaseUser) {
        const result = await signInAnonymously(auth);
        const currentUser = await getUserFromCollection(result.user.uid);
        console.log("currentUser: ", currentUser);
        if (currentUser) {
          setUser(currentUser);
        }
      } else {
        const currentUser = await getUserFromCollection(firebaseUser.uid);
        console.log("currentUser: ", currentUser);
        if (currentUser) {
          setUser(currentUser);
        }
      }
      setLoading(false);
    });

    return unsub;
  }, []);

  return { user, loading, connected: !!user };
}
