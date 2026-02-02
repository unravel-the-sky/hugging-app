import { db } from "@/lib/firebaseConfig";
import { User } from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";
import { useEffect, useState } from "react";

export function useCurrentUser(userId: string) {
  const [user, setUser] = useState<User | null>();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log("userId is: ", userId);

    if (!userId) return;

    const ref = doc(db, "users", userId);

    const unsubcribe = onSnapshot(ref, (snap) => {
      if (snap.exists()) {
        setUser(snap.data() as User);
      }
      setLoading(false);
    });

    return unsubcribe;
  }, [userId]);

  return { user, loading, connected: !!user };
}
