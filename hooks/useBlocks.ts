import { BlockedUser, getBlockedUsers } from "@/lib/handleBlocks";
import { create } from "zustand";

/**
 * Who you blocked. Fetched on sign-in and refreshed after a block or unblock
 * — there's no live listener because the list only ever changes from this
 * device, and the server is the one enforcing the block. This copy is what
 * keeps a blocked person's hugs out of your lists.
 */

type BlocksState = {
  blocked: BlockedUser[];
  /** uids only, for the hot path in list filtering. */
  blockedUids: ReadonlySet<string>;
  isLoading: boolean;
  refresh: () => Promise<void>;
  /** Signing out: the next user must not inherit this list. */
  clear: () => void;
};

const NONE: ReadonlySet<string> = new Set();

export const useBlocks = create<BlocksState>((set) => ({
  blocked: [],
  blockedUids: NONE,
  isLoading: false,

  refresh: async () => {
    set({ isLoading: true });
    try {
      const blocked = await getBlockedUsers();
      set({ blocked, blockedUids: new Set(blocked.map((b) => b.uid)) });
    } catch (err) {
      // the server still enforces the block either way; a failed fetch only
      // means their old hugs stay listed, so don't surface it
      console.error("Could not load blocked users", err);
    } finally {
      set({ isLoading: false });
    }
  },

  clear: () => set({ blocked: [], blockedUids: NONE, isLoading: false }),
}));
