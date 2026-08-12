import { useCurrentUser } from "@/hooks/useCurrentUser";
import { BlockedUser, getBlockedUsers } from "@/lib/handleBlocks";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

/**
 * Who you blocked, fetched once per session and refreshed after a block or
 * unblock. There's no live listener because the list only ever changes from
 * this device — the server is the one enforcing the block, this is just so
 * old hugs from a blocked person can be shown under a neutral name.
 */

type BlocksValue = {
  blocked: BlockedUser[];
  /** uids only, for the hot path in list rendering. */
  blockedUids: ReadonlySet<string>;
  isLoading: boolean;
  refresh: () => Promise<void>;
};

const EMPTY: BlocksValue = {
  blocked: [],
  blockedUids: new Set(),
  isLoading: false,
  refresh: async () => {},
};

const BlocksContext = createContext<BlocksValue>(EMPTY);

export function BlocksProvider({ children }: { children: React.ReactNode }) {
  const { authUser, user } = useCurrentUser();
  const uid = authUser?.uid ?? user?.uid;

  const [blocked, setBlocked] = useState<BlockedUser[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!uid) {
      setBlocked([]);
      return;
    }
    setIsLoading(true);
    try {
      setBlocked(await getBlockedUsers());
    } catch (err) {
      // a failed fetch only costs the name masking, so don't surface it
      console.error("Could not load blocked users", err);
    } finally {
      setIsLoading(false);
    }
  }, [uid]);

  useEffect(() => {
    // also clears the previous user's list on sign-out
    refresh();
  }, [refresh]);

  const value = useMemo(
    () => ({
      blocked,
      blockedUids: new Set(blocked.map((b) => b.uid)),
      isLoading,
      refresh,
    }),
    [blocked, isLoading, refresh],
  );

  return (
    <BlocksContext.Provider value={value}>{children}</BlocksContext.Provider>
  );
}

export function useBlocks(): BlocksValue {
  return useContext(BlocksContext);
}
