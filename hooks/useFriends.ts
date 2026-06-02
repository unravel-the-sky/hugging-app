import { User } from "@/lib/createUser";
import { auth, db } from "@/lib/firebaseConfig";
import { getFriendsForCurrentUser } from "@/lib/handleFriends";
import { Hug } from "@/lib/handleHugs";
import {
  collection,
  onSnapshot,
  orderBy,
  query,
  where,
} from "firebase/firestore";
import { useEffect, useState } from "react";

export type Friend = {
  uid: string;
  displayName: string;
  avatar?: string;
  addedAt?: Date;
};

export function useFriends(uid?: string) {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;

    const handleFriends = async (uid: string) => {
      try {
        setIsLoading(true);
        const list = await getFriendsForCurrentUser(uid);
        setFriends(list);
      } catch (err) {
        console.error("error while fethcing friends for friend-picker: ", err);
      } finally {
        setIsLoading(false);
      }
    };

    handleFriends(uid);
  }, []);

  return {
    friends,
    isLoading,
  };
}
