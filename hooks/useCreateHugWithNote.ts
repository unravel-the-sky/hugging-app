import { Friend } from "@/app/(tabs)/friends";
import { router } from "expo-router";

export default function useCreateHugWithNote() {
  const startHugWithNote = (friend: Friend) => {
    router.push({
      pathname: "/hug-note",
      params: {
        friendName: friend.displayName,
        friendUid: friend.uid,
      },
    });
  };

  return {
    startHugWithNote,
  };
}
