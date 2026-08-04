import { db } from "@/lib/firebaseConfig";
import { Hug } from "@/lib/handleHugs";
import {
  collection,
  getCountFromServer,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  startAfter,
  where,
} from "firebase/firestore";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useCurrentUser } from "./useCurrentUser";
import { useFriends } from "./useFriends";

export type HugDirection = "incoming" | "outgoing";

const LIMIT_SIZE = 40;

export function useHugs(direction: HugDirection = "incoming") {
  const [liveHugs, setLiveHugs] = useState<Hug[]>([]);
  const [olderHugs, setOlderHugs] = useState<Hug[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const { authUser, user } = useCurrentUser();
  const uid = authUser?.uid ?? user?.uid;
  const fieldName = direction === "incoming" ? "to" : "from";

  useEffect(() => {
    if (!uid) return;
    setLiveHugs([]);
    setOlderHugs([]);
    setHasMore(true);
    setIsLoading(true);

    const q = query(
      collection(db, "hugs"),
      where(fieldName, "==", uid),
      orderBy("createdAt", "desc"),
      limit(LIMIT_SIZE),
    );

    return onSnapshot(q, (snap) => {
      setLiveHugs(
        snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Hug, "id">) })),
      );
      setIsLoading(false);
    });
  }, [uid, fieldName]);

  const hugs = useMemo(() => {
    const merged = new Map<string, Hug>();
    for (const h of [...liveHugs, ...olderHugs]) merged.set(h.id, h);
    return [...merged.values()].sort(
      (a, b) => b.createdAt!.toMillis() - a.createdAt!.toMillis(),
    );
  }, [liveHugs, olderHugs]);

  const loadMore = useCallback(async () => {
    if (!uid || isLoadingMore || !hasMore) return;
    const oldest = hugs.at(-1);
    if (!oldest) return;

    setIsLoadingMore(true);
    try {
      const snap = await getDocs(
        query(
          collection(db, "hugs"),
          where(fieldName, "==", uid),
          orderBy("createdAt", "desc"),
          startAfter(oldest.createdAt),
          limit(LIMIT_SIZE),
        ),
      );
      setOlderHugs((prev) => [
        ...prev,
        ...snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<Hug, "id">),
        })),
      ]);
      if (snap.docs.length < LIMIT_SIZE) setHasMore(false);
    } finally {
      setIsLoadingMore(false);
    }
  }, [uid, fieldName, hugs, isLoadingMore, hasMore]);

  return { hugs, isLoading, isLoadingMore, hasMore, loadMore };
}

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
