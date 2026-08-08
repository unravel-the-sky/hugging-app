import { useCallback, useMemo } from "react";
import { useHugs } from "@/hooks/useIncomingHugs";
import { Hug } from "@/lib/handleHugs";
import { Direction } from "@/lib/hugs/groups";
import { byNewest } from "@/lib/hugs/time";

const ms = (h: Hug) => h.createdAt?.toMillis() ?? 0;
const oldest = (hugs: Hug[]) => (hugs.length ? Math.min(...hugs.map(ms)) : 0);

export type HugFilter = "all" | "received" | "sent" | "pending";

export function useAllHugs(filter: HugFilter) {
  const incoming = useHugs("incoming");
  const outgoing = useHugs("outgoing");

  // Only the interleaved view needs the watermark; a single-direction filter
  // reads one stream and can safely show everything it has loaded.
  const watermark = useMemo(() => {
    if (filter !== "all") return 0;
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
  }, [incoming.hugs, outgoing.hugs, watermark, filter]);

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

  return {
    hugs,
    directions,
    isLoading: relevant.some((s) => s.isLoading),
    isLoadingMore: relevant.some((s) => s.isLoadingMore),
    hasMore: relevant.some((s) => s.hasMore),
    loadMore,
  };
}
