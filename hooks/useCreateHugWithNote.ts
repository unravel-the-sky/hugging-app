import { Friend } from "@/app/(tabs)/friends";
import { router } from "expo-router";
import { useState } from "react";

export default function useCreateHugWithNote() {
  const [selectedFriend, setSelectedFriend] = useState<Friend | null>(null);

  const startHuggingFlow = (friend: Friend) => {
    setSelectedFriend(friend);
  };

  const continueHuggingFlow = (
    friendName: string,
    friendUid: string,
    note?: string,
  ) => {
    router.push({
      pathname: "/(tabs)",
      params: {
        toUid: friendUid,
        toName: friendName,
        note,
      },
    });
    setSelectedFriend(null);
  };

  const cancelHug = () => {
    setSelectedFriend(null);
  };

  return {
    selectedFriend,
    startHuggingFlow,
    continueHuggingFlow,
    cancelHug,
  };
}
