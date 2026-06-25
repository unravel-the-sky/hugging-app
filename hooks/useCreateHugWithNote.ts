import { router } from "expo-router";
import { Friend } from "./useFriends";

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
