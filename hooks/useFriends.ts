import { db } from "@/lib/firebaseConfig";
import { FriendshipRequest, UserFriend } from "@/lib/handleFriends";
import {
  collection,
  onSnapshot,
  orderBy,
  query,
  Timestamp,
  where,
} from "firebase/firestore";
import { useEffect, useState } from "react";
import { useCurrentUser } from "./useCurrentUser";

export type Friend = {
  uid: string;
  displayName: string;
  avatar?: string;
  addedAt?: Date;
  lastHugAt?: Timestamp | null;
  online?: boolean;
};

export function useFriends() {
  const [friends, setFriends] = useState<UserFriend[]>([]);
  const [friendRequests, setFriendRequests] = useState<FriendshipRequest[]>([]);

  const [isLoading, setIsLoading] = useState(true);

  const { authUser, user } = useCurrentUser();
  const uid = authUser?.uid ?? user?.uid; // cached user has the uid too

  useEffect(() => {
    console.log("im here now and uid is: ", uid);
    if (!uid) return;

    const friendshipRequestsQuery = query(
      collection(db, "friendshipRequests"),
      where("to", "==", uid),
      where("status", "==", "pending"),
      orderBy("createdAt", "desc"),
    );

    const friendsRef = collection(db, "users", uid, "friends");

    const unsub1 = onSnapshot(friendshipRequestsQuery, (snap) =>
      setFriendRequests(
        snap.docs.map((d) => ({ ...d.data(), id: d.id }) as FriendshipRequest),
      ),
    );

    console.log("fetching friends..");

    const unsub2 = onSnapshot(friendsRef, (snap) =>
      setFriends(snap.docs.map((d) => d.data() as UserFriend)),
    );

    setIsLoading(false);

    return () => {
      unsub1();
      unsub2();
    };
  }, [uid]);

  return { friends, friendRequests, isLoading };
}
