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

export type HugDirection = "incoming" | "outgoing";

export function useHugs(
  uid: string | undefined,
  direction: HugDirection = "incoming",
) {
  const [hugs, setHugs] = useState<Hug[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!uid) return;

    const fieldName = direction === "incoming" ? "to" : "from";

    const q = query(
      collection(db, "hugs"),
      where(fieldName, "==", uid),
      orderBy("createdAt", "desc"),
    );

    const unsubscribe = onSnapshot(q, (snap) => {
      setHugs(
        snap.docs.map((doc) => ({
          id: doc.id,
          ...(doc.data() as Omit<Hug, "id">),
        })),
      );
      setIsLoading(false);
    });

    return unsubscribe;
  }, [uid, direction]);

  return { isLoading, hugs };
}
