import { useCallback, useMemo } from "react";
import { useHugs } from "@/context/HugsContext";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { Hug } from "@/lib/handleHugs";
import { isHugUnread } from "@/lib/hugs/features";
import { Direction } from "@/lib/hugs/groups";
import { byNewest } from "@/lib/hugs/time";

const ms = (h: Hug) => h.createdAt?.toMillis() ?? 0;
const oldest = (hugs: Hug[]) => (hugs.length ? Math.min(...hugs.map(ms)) : 0);

export type HugFilter = "all" | "new" | "received" | "sent" | "pending";

/** Filters that interleave both streams, and so need the watermark. */
const READS_BOTH: ReadonlySet<HugFilter> = new Set<HugFilter>(["all", "new"]);

/**
 * How many hugs are waiting on me. Same rule as the list's NEW pill: a hug I
 * never opened, *or* a hug back on one I sent. Both streams, deduped — a
 * self-hug is in both.
 *
 * Deliberately independent of any `HugFilter`: callers that only want the
 * number (the tab badge, the New pill) shouldn't pay for building and sorting
 * a list they throw away.
 */
export function useUnreadHugsCount(): number {
  const incoming = useHugs("incoming");
  const outgoing = useHugs("outgoing");
  const { user } = useCurrentUser();
  const uid = user?.uid;

  return useMemo(() => {
    if (!uid) return 0;
    const unread = new Set<string>();
    for (const hug of [...incoming.hugs, ...outgoing.hugs]) {
      if (isHugUnread(hug, uid)) unread.add(hug.id);
    }
    return unread.size;
  }, [incoming.hugs, outgoing.hugs, uid]);
}

export function useAllHugs(filter: HugFilter) {
  const incoming = useHugs("incoming");
  const outgoing = useHugs("outgoing");
  const { user } = useCurrentUser();
  const uid = user?.uid;

  // Only the interleaved view needs the watermark; a single-direction filter
  // reads one stream and can safely show everything it has loaded.
  const watermark = useMemo(() => {
    if (!READS_BOTH.has(filter)) return 0;
    const cuts: number[] = [];
    if (incoming.hasMore) cuts.push(oldest(incoming.hugs));
    if (outgoing.hasMore) cuts.push(oldest(outgoing.hugs));
    return cuts.length ? Math.max(...cuts) : 0;
  }, [
    filter,
    incoming.hasMore,
    incoming.hugs,
    outgoing.hasMore,
    outgoing.hugs,
  ]);

  const { hugs, directions } = useMemo(() => {
    const dir = new Map<string, Direction>();
    const merged: Hug[] = [];

    for (const h of incoming.hugs) {
      dir.set(h.id, "incoming");
      merged.push(h);
    }
    for (const h of outgoing.hugs) {
      if (dir.has(h.id)) continue; // self-hug appears in both streams
      dir.set(h.id, "outgoing");
      merged.push(h);
    }

    const keep = merged.filter((h) => {
      if (ms(h) < watermark) return false;
      switch (filter) {
        case "new":
          return !!uid && isHugUnread(h, uid);
        case "received":
          return dir.get(h.id) === "incoming";
        case "sent":
          return dir.get(h.id) === "outgoing";
        case "pending":
          return dir.get(h.id) === "outgoing" && !h.seenAt;
        default:
          return true;
      }
    });

    return { hugs: keep.sort(byNewest), directions: dir };
  }, [incoming.hugs, outgoing.hugs, watermark, filter, uid]);

  const relevant =
    filter === "received"
      ? [incoming]
      : filter === "sent" || filter === "pending"
        ? [outgoing]
        : [incoming, outgoing];

  const loadMore = useCallback(() => {
    relevant.forEach((s) => s.hasMore && s.loadMore());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    filter,
    incoming.hasMore,
    outgoing.hasMore,
    incoming.loadMore,
    outgoing.loadMore,
  ]);

  const unreadHugsCount = useUnreadHugsCount();

  return {
    hugs,
    directions,
    isLoading: relevant.some((s) => s.isLoading),
    isLoadingMore: relevant.some((s) => s.isLoadingMore),
    hasMore: relevant.some((s) => s.hasMore),
    unreadHugsCount,
    loadMore,
  };
}
