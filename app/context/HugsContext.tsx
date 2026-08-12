import { useCurrentUser } from "@/hooks/useCurrentUser";
import { db } from "@/lib/firebaseConfig";
import { Hug } from "@/lib/handleHugs";
import {
  clearCachedHugs,
  readCachedHugs,
  writeCachedHugs,
} from "@/lib/hugs/hugCache";
import { byNewest } from "@/lib/hugs/time";
import {
  collection,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  startAfter,
  where,
} from "firebase/firestore";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

export type HugDirection = "incoming" | "outgoing";

export type HugStream = {
  hugs: Hug[];
  isLoading: boolean;
  isLoadingMore: boolean;
  hasMore: boolean;
  loadMore: () => void;
};

const LIMIT_SIZE = 40;

const EMPTY_STREAM: HugStream = {
  hugs: [],
  isLoading: true,
  isLoadingMore: false,
  hasMore: false,
  loadMore: () => {},
};

const HugsContext = createContext<Record<HugDirection, HugStream>>({
  incoming: EMPTY_STREAM,
  outgoing: EMPTY_STREAM,
});

/**
 * Hugs from someone you blocked are flagged by the server instead of being
 * deleted — the sender's own outbox has to look untouched, or a block would
 * be detectable. Dropping them here is what makes them never land.
 *
 * Filtered client-side rather than in the query: Firestore can't match "no
 * such field", which is every hug ever sent before this existed.
 */
const isDeliverable = (hug: Hug, direction: HugDirection) =>
  direction === "outgoing" || !hug.blockedDelivery;

function useHugStream(
  uid: string | undefined,
  direction: HugDirection,
): HugStream {
  const [liveHugs, setLiveHugs] = useState<Hug[]>([]);
  const [olderHugs, setOlderHugs] = useState<Hug[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const fieldName = direction === "incoming" ? "to" : "from";

  useEffect(() => {
    setLiveHugs([]);
    setOlderHugs([]);
    setHasMore(true);

    // Signed out: nothing to listen for, and nothing left to wait on. The
    // provider outlives sign-out, so this state has to be cleared explicitly
    // or the next user briefly sees the previous one's hugs.
    if (!uid) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    let cancelled = false;
    let hasLiveSnapshot = false;

    // Paint from disk while the listener warms up. A `null` result means
    // nothing was ever cached, so we keep showing the loader rather than
    // flashing an empty state at someone who does have hugs.
    readCachedHugs(uid, direction).then((cached) => {
      if (cancelled || hasLiveSnapshot || !cached) return;
      setLiveHugs(cached);
      setIsLoading(false);
    });

    const q = query(
      collection(db, "hugs"),
      where(fieldName, "==", uid),
      orderBy("createdAt", "desc"),
      limit(LIMIT_SIZE),
    );

    const unsubscribe = onSnapshot(q, (snap) => {
      hasLiveSnapshot = true;
      const next = snap.docs
        .map((d) => ({
          id: d.id,
          ...(d.data() as Omit<Hug, "id">),
        }))
        .filter((h) => isDeliverable(h, direction));
      setLiveHugs(next);
      setIsLoading(false);

      // Only persist server-confirmed snapshots. Firestore also emits from its
      // own in-memory cache, and launching offline can yield an empty one --
      // writing that would clobber a good cache with nothing.
      if (!snap.metadata.fromCache) writeCachedHugs(uid, direction, next);
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [uid, fieldName, direction]);

  const hugs = useMemo(() => {
    const merged = new Map<string, Hug>();
    for (const h of [...liveHugs, ...olderHugs]) merged.set(h.id, h);
    return [...merged.values()].sort(byNewest);
  }, [liveHugs, olderHugs]);

  // loadMore only ever needs the *current* tail, and rebuilding it on every
  // snapshot would churn the context value for all consumers.
  const hugsRef = useRef(hugs);
  hugsRef.current = hugs;

  const loadMore = useCallback(async () => {
    if (!uid || isLoadingMore || !hasMore) return;
    const oldest = hugsRef.current.at(-1);
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
        ...snap.docs
          .map((d) => ({
            id: d.id,
            ...(d.data() as Omit<Hug, "id">),
          }))
          .filter((h) => isDeliverable(h, direction)),
      ]);
      if (snap.docs.length < LIMIT_SIZE) setHasMore(false);
    } finally {
      setIsLoadingMore(false);
    }
  }, [uid, fieldName, direction, isLoadingMore, hasMore]);

  return useMemo(
    () => ({ hugs, isLoading, isLoadingMore, hasMore, loadMore }),
    [hugs, isLoading, isLoadingMore, hasMore, loadMore],
  );
}

export function HugsProvider({ children }: { children: React.ReactNode }) {
  const { authUser, user } = useCurrentUser();
  const uid = authUser?.uid ?? user?.uid;

  const incoming = useHugStream(uid, "incoming");
  const outgoing = useHugStream(uid, "outgoing");

  // `uid` is undefined both before auth resolves and after sign-out; only the
  // second case has a previous uid to clean up after.
  const lastUid = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (lastUid.current && !uid) clearCachedHugs(lastUid.current);
    lastUid.current = uid;
  }, [uid]);

  const value = useMemo(() => ({ incoming, outgoing }), [incoming, outgoing]);

  return <HugsContext.Provider value={value}>{children}</HugsContext.Provider>;
}

export function useHugs(direction: HugDirection = "incoming"): HugStream {
  return useContext(HugsContext)[direction];
}
