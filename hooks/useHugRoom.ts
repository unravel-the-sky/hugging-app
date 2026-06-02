import { rtdb } from "@/lib/firebaseConfig";
import { HugRoomInvite, subscribeToHugRoom } from "@/lib/handleHugRoom";
import { onValue, ref } from "firebase/database";
import { useEffect, useMemo, useState } from "react";

export type RoomParticipant = {
  id: string;
  inRoom: boolean;
  pressing: boolean;
};

export type RoomStatus = "empty" | "waiting" | "active";

export function useHugRoomData(roomId: string | undefined) {
  const [roomParticipants, setRoomParticipants] = useState<
    RoomParticipant[] | undefined
  >(undefined);

  const [roomInvite, setRoomInvite] = useState<HugRoomInvite | undefined>(
    undefined,
  );

  useEffect(() => {
    if (!roomId) {
      setRoomParticipants(undefined);
      return;
    }

    const unsub = subscribeToHugRoom(roomId, (room) => {
      if (!room?.participants) {
        setRoomParticipants([]);
        return;
      }

      const inRoomParticipants = Object.entries(room.participants).map(
        ([id, participant]) => ({
          id: id,
          inRoom: participant.inRoom,
          pressing: participant.pressing,
        }),
      );
      setRoomParticipants(inRoomParticipants);

      setRoomInvite(room.invite);
    });

    return () => unsub?.();
  }, [roomId]);

  const activeCount = useMemo(
    () =>
      roomParticipants?.filter((participant) => participant.inRoom).length ?? 0,
    [roomParticipants],
  );

  const roomStatus: RoomStatus =
    activeCount >= 2 ? "active" : activeCount === 1 ? "waiting" : "empty";

  return {
    roomParticipants,
    activeCount,
    roomStatus,
    roomInvite,
  };
}

export function useIncomingInvites(myId: string) {
  const [invites, setInvites] = useState<Record<string, HugRoomInvite>>({});

  useEffect(() => {
    const invitationsRef = ref(rtdb, `userInvites/${myId}`);
    const unsub = onValue(invitationsRef, (snap) => {
      setInvites(snap.val() ?? {});
    });

    return () => unsub();
  }, [myId]);

  return { invites };
}
