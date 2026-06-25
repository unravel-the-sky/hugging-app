import { auth } from "@/lib/firebaseConfig";
import { getFriendsForCurrentUser } from "@/lib/handleFriends";
import { Timestamp } from "firebase/firestore";
import { useCallback, useEffect, useState } from "react";

export type Friend = {
  uid: string;
  displayName: string;
  avatar?: string;
  addedAt?: Date;
  lastHugAt?: Timestamp | null;
  online?: boolean;
};

export function useFriends() {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    try {
      setIsLoading(true);
      setFriends(await getFriendsForCurrentUser(uid));
    } catch (err) {
      console.error("useFriends:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { friends, isLoading, refresh: load };
}
