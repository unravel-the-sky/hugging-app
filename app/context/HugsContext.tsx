import { useBlocks } from "@/hooks/useBlocks";
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
  onSnapshotsInSync,
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

/**
 * Longest we leave a pull-to-refresh spinner up waiting for the sync ping,
 * and the shortest we show it — resolving instantly reads as a dropped
 * gesture rather than a finished one.
 */
const REFRESH_TIMEOUT_MS = 4000;
const REFRESH_MIN_MS = 500;

type HugsContextValue = Record<HugDirection, HugStream> & {
  refresh: () => Promise<void>;
};

const HugsContext = createContext<HugsContextValue>({
  incoming: EMPTY_STREAM,
  outgoing: EMPTY_STREAM,
  refresh: async () => {},
});

const counterpartyUid = (hug: Hug, direction: HugDirection) =>
  direction === "incoming" ? hug.from : hug.to;

/**
 * Blocking someone deletes every hug between you, server-side and for both
 * sides. This filter covers the gap: the purge pages through a long history,
 * and a cold start can still paint deleted hugs from the disk cache before
 * the first snapshot lands.
 *
 * Hugs a blocked person sent *after* the block carry the server's
 * `blockedDelivery` flag. They're flagged rather than deleted so the sender's
 * own outbox looks untouched — a hug vanishing from their list would tell
 * them they'd been blocked. Dropping them here is what makes them never land.
 *
 * Both are filtered client-side rather than in the query: Firestore can't
 * match "no such field", which is every hug sent before this existed, and
 * `not-in` caps out at ten values.
 */
const isVisible = (
  hug: Hug,
  direction: HugDirection,
  blockedUids: ReadonlySet<string>,
) => {
  if (blockedUids.has(counterpartyUid(hug, direction))) return false;
  return direction === "outgoing" || !hug.blockedDelivery;
};

function useHugStream(
  uid: string | undefined,
  direction: HugDirection,
  blockedUids: ReadonlySet<string>,
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
      const next = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<Hug, "id">),
      }));
      setLiveHugs(next);
      setIsLoading(false);

      if (next.length < LIMIT_SIZE) setHasMore(false);

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

  // Everything fetched so far, hidden or not. Paging walks this list rather
  // than the visible one, so a run of blocked hugs at the tail can't turn
  // into a cursor that re-reads pages already seen.
  const fetched = useMemo(() => {
    const merged = new Map<string, Hug>();
    for (const h of [...liveHugs, ...olderHugs]) merged.set(h.id, h);
    return [...merged.values()].sort(byNewest);
  }, [liveHugs, olderHugs]);

  // Kept out of the query so blocking or unblocking re-filters what's already
  // loaded, with no refetch.
  const hugs = useMemo(
    () => fetched.filter((h) => isVisible(h, direction, blockedUids)),
    [fetched, direction, blockedUids],
  );

  // loadMore only ever needs the *current* tail, and rebuilding it on every
  // snapshot would churn the context value for all consumers.
  const hugsRef = useRef(fetched);
  hugsRef.current = fetched;

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
        ...snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<Hug, "id">),
        })),
      ]);
      if (snap.docs.length < LIMIT_SIZE) setHasMore(false);
    } finally {
      setIsLoadingMore(false);
    }
  }, [uid, fieldName, isLoadingMore, hasMore]);

  return useMemo(
    () => ({ hugs, isLoading, isLoadingMore, hasMore, loadMore }),
    [hugs, isLoading, isLoadingMore, hasMore, loadMore],
  );
}

export function HugsProvider({ children }: { children: React.ReactNode }) {
  const { authUser, user } = useCurrentUser();
  const uid = authUser?.uid ?? user?.uid;
  const blockedUids = useBlocks((s) => s.blockedUids);

  const incoming = useHugStream(uid, "incoming", blockedUids);
  const outgoing = useHugStream(uid, "outgoing", blockedUids);

  // `uid` is undefined both before auth resolves and after sign-out; only the
  // second case has a previous uid to clean up after.
  const lastUid = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (lastUid.current && !uid) clearCachedHugs(lastUid.current);
    lastUid.current = uid;
  }, [uid]);

  /**
   * Pull-to-refresh. Both streams are live listeners, so there is nothing to
   * refetch — re-reading would cost a full page of documents per stream per
   * pull and hand back data we already have. Instead we wait for Firestore to
   * report the listeners in sync with the server, which costs no reads and is
   * a real answer to the question the gesture asks ("am I up to date?") —
   * most of all just after a reconnect.
   */
  const refresh = useCallback(
    () =>
      new Promise<void>((resolve) => {
        const startedAt = Date.now();
        let unsubscribe: (() => void) | undefined;
        let timer: ReturnType<typeof setTimeout> | undefined;
        let settled = false;

        const finish = () => {
          if (settled) return;
          settled = true;
          unsubscribe?.();
          if (timer) clearTimeout(timer);
          const elapsed = Date.now() - startedAt;
          setTimeout(resolve, Math.max(0, REFRESH_MIN_MS - elapsed));
        };

        unsubscribe = onSnapshotsInSync(db, finish);
        timer = setTimeout(finish, REFRESH_TIMEOUT_MS);
        // onSnapshotsInSync can fire before the assignment above lands
        if (settled) unsubscribe();
      }),
    [],
  );

  const value = useMemo(
    () => ({ incoming, outgoing, refresh }),
    [incoming, outgoing, refresh],
  );

  return <HugsContext.Provider value={value}>{children}</HugsContext.Provider>;
}

export function useHugs(direction: HugDirection = "incoming"): HugStream {
  return useContext(HugsContext)[direction];
}

/** Resolves once the live listeners are confirmed in sync with the server. */
export function useRefreshHugs(): () => Promise<void> {
  return useContext(HugsContext).refresh;
}
