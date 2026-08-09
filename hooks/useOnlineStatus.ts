import NetInfo from "@react-native-community/netinfo";
import { useEffect, useRef, useState } from "react";

// null = unknown yet. Don't render the fallback on null.
export type OnlineStatus = boolean | null;

const OFFLINE_GRACE_MS = 1500;

export function useOnlineStatus(): {
  isOnline: OnlineStatus;
  recheck: () => Promise<void>;
} {
  const [isOnline, setIsOnline] = useState<OnlineStatus>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const apply = (next: OnlineStatus) => {
      if (timer.current) clearTimeout(timer.current);

      if (next === false) {
        // Debounce only the offline direction — brief blips are common
        // when switching wifi→cellular, and a flashing overlay is worse
        // than 1.5s of a spinner.
        timer.current = setTimeout(() => setIsOnline(false), OFFLINE_GRACE_MS);
      } else {
        setIsOnline(next);
      }
    };

    const unsub = NetInfo.addEventListener((s) => {
      // isInternetReachable can be null while NetInfo is still probing.
      apply(s.isConnected === false ? false : s.isInternetReachable);
    });

    return () => {
      unsub();
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  const recheck = async () => {
    const s = await NetInfo.refresh();
    setIsOnline(s.isConnected === false ? false : s.isInternetReachable);
  };

  return { isOnline, recheck };
}
