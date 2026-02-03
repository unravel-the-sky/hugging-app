import { db } from "@/lib/firebaseConfig";
import { Hug } from "@/lib/handleHugs";
import {
  collection,
  onSnapshot,
  orderBy,
  query,
  where,
} from "firebase/firestore";
import { useEffect, useState } from "react";

export function useIncomingHugs(uid?: string) {
  const [hugs, setHugs] = useState<Hug[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!uid) return;

    const q = query(
      collection(db, "hugs"),
      where("to", "==", uid),
      orderBy("createdAt", "desc"),
    );

    const unsubscribe = onSnapshot(q, (snap) => {
      setHugs(
        snap.docs.map((doc) => ({
          id: doc.id,
          ...(doc.data() as Omit<Hug, "id">),
        })),
      );
    });

    setIsLoading(false);
    return unsubscribe;
  }, [uid]);

  return { isLoading, hugs };
}
