import { primeAvatarInfo } from "@/lib/avatarThumbnail";
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

    const unsub2 = onSnapshot(friendsRef, (snap) => {
      const docs = snap.docs.map((d) => d.data() as UserFriend);

      // A Cloud Function mirrors each friend's avatar into these docs, so this
      // live snapshot is the fastest news we get of someone changing theirs.
      // Feeding it to the avatar cache updates the hug list too — everything
      // resolves through that one cache — with no extra reads.
      for (const friend of docs) {
        primeAvatarInfo(friend.id, {
          avatar: friend.avatar,
          photoThumbPath: friend.photoThumbPath,
        });
      }

      setFriends(docs);
      setIsLoading(false);
    });

    return () => {
      unsub1();
      unsub2();
    };
  }, [uid]);

  return { friends, friendRequests, isLoading };
}
