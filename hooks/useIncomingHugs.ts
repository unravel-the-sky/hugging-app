import { db } from "@/lib/firebaseConfig";
import { Hug } from "@/lib/handleHugs";
import {
  collection,
  onSnapshot,
  orderBy,
  query,
  where,
} from "firebase/firestore";
import { useEffect, useMemo, useState } from "react";
import { useCurrentUser } from "./useCurrentUser";

export type HugDirection = "incoming" | "outgoing";

export function useHugs(direction: HugDirection = "incoming") {
  const [hugs, setHugs] = useState<Hug[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const { authUser, user } = useCurrentUser();
  const uid = authUser?.uid ?? user?.uid; // cached user has the uid too

  useEffect(() => {
    if (!uid) return;

    console.log("hugging uid is: ", uid);

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

const MIN_HUGS = 10;

export function useTopHugger() {
  const { hugs: incomingHugs, isLoading } = useHugs("incoming");

  const topHuggerUid = useMemo(() => {
    const counts = new Map<string, number>();
    for (const h of incomingHugs) {
      counts.set(h.from, (counts.get(h.from) ?? 0) + 1);
    }

    let bestUid: string | null = null;
    let bestCount = 0;
    for (const [uid, count] of counts) {
      if (count > bestCount) {
        bestCount = count;
        bestUid = uid;
      }
    }
    return bestCount > MIN_HUGS ? bestUid : null;
  }, [incomingHugs]);

  return { topHuggerUid, isLoading };
}
