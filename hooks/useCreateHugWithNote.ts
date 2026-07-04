import { router } from "expo-router";
import { Friend } from "./useFriends";
import { useHugDraft } from "./useHugDraft";

export default function useCreateHugWithNote() {
  const setTo = useHugDraft((s) => s.setTo);
  const setToName = useHugDraft((s) => s.setToName);

  const startHugWithNote = (friend: Friend) => {
    setTo(friend.uid);
    setToName(friend.displayName);
    router.push({
      pathname: "/hug-note",
    });
  };

  return {
    startHugWithNote,
  };
}
