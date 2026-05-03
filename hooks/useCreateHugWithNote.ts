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
  // const [selectedFriend, setSelectedFriend] = useState<Friend | null>(null);

  // const startHuggingFlow = (friend: Friend) => {
  //   setSelectedFriend(friend);
  // };

  // const continueHuggingFlow = (
  //   friendName: string,
  //   friendUid: string,
  //   note?: string,
  // ) => {
  //   router.push({
  //     pathname: "/(tabs)",
  //     params: {
  //       toUid: friendUid,
  //       toName: friendName,
  //       note,
  //     },
  //   });
  //   setSelectedFriend(null);
  // };

  // const cancelHug = () => {
  //   setSelectedFriend(null);
  // };

  // return {
  //   selectedFriend,
  //   startHuggingFlow,
  //   continueHuggingFlow,
  //   cancelHug,
  // };
}
