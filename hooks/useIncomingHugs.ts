import { db } from "@/lib/firebaseConfig";
import {
  collection,
  getCountFromServer,
  query,
  where,
} from "firebase/firestore";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useCurrentUser } from "./useCurrentUser";
import { useFriends } from "./useFriends";

const MIN_HUGS = 10;

export function useTopHugger() {
  const { friends, isLoading } = useFriends();

  const topHuggerUid = useMemo(() => {
    let bestUid: string | null = null;
    let bestCount = 0;

    for (const f of friends) {
      const count = f.totalHugsReceived ?? 0;
      if (count > bestCount) {
        bestCount = count;
        bestUid = f.id;
      }
    }

    return bestCount > MIN_HUGS ? bestUid : null;
  }, [friends]);

  return { topHuggerUid, isLoading };
}

export function useHugTotals() {
  const { authUser, user } = useCurrentUser();
  const uid = authUser?.uid ?? user?.uid;
  const [totals, setTotals] = useState<{
    received: number;
    sent: number;
  } | null>(null);

  const refresh = useCallback(async () => {
    if (!uid) return;
    const base = collection(db, "hugs");
    const [received, sent] = await Promise.all([
      getCountFromServer(query(base, where("to", "==", uid))),
      getCountFromServer(query(base, where("from", "==", uid))),
    ]);
    setTotals({
      received: received.data().count,
      sent: sent.data().count,
    });
  }, [uid]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return {
    totals,
    total: totals ? totals.received + totals.sent : null,
    refresh,
  };
}
