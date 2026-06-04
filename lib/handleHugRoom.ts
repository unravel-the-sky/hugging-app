import {
  off,
  onDisconnect,
  onValue,
  ref,
  remove,
  serverTimestamp,
  set,
  update,
} from "firebase/database";
import { rtdb } from "./firebaseConfig";

export type HugRoom = {
  participants: Record<string, Participant>;
  active: boolean;
  invite?: HugRoomInvite;
  startAt: number | null;
};

export type HugRoomInvite = {
  from: string;
  to: string;
  fromName: string;
  toName: string;
  status: HugInviteStatus;
  sessionState: HugInviteSessionState;
};

type HugInviteStatus = "pending" | "accepted" | "declined";
type HugInviteSessionState = "ongoing" | "ended" | "pending";

export type Participant = {
  inRoom: boolean;
  pressing: boolean;
  lastActive: number;
};

export const getHugRoomId = (a: string, b: string) => [a, b].sort().join("_");

export const sendHugRoomInvite = async (
  myId: string,
  partnerId: string,
  myName: string,
  partnerName: string,
) => {
  const roomId = getHugRoomId(myId, partnerId);

  try {
    // remove if there is any other room with th esame roomId is there
    await remove(ref(rtdb, `hugRooms/${roomId}/invite`));

    const hugInvite: HugRoomInvite = {
      from: myId,
      to: partnerId,
      fromName: myName,
      toName: partnerName,
      status: "pending",
      sessionState: "pending",
    };
    await set(ref(rtdb, `hugRooms/${roomId}/invite`), {
      ...hugInvite,
      createdAt: serverTimestamp(),
    });

    const participant: Participant = {
      inRoom: true,
      pressing: false,
      lastActive: serverTimestamp() as unknown as number, // fix this later!
    };
    await set(
      ref(rtdb, `hugRooms/${roomId}/participants/${myId}`),
      participant,
    );

    return roomId;
  } catch (err) {
    console.error("Error happened when sending hug room invite: ", err);
  }
};

export const joinHugRoom = (myId: string, partnerId: string) => {
  const roomId = getHugRoomId(myId, partnerId);
  const meRef = ref(rtdb, `hugRooms/${roomId}/participants/${myId}`);
  const inviteRef = ref(rtdb, `hugRooms/${roomId}/invite`);

  // handle disconnect
  onDisconnect(meRef).set({
    inRoom: false,
    pressing: false,
    lastActive: serverTimestamp(),
  });

  onDisconnect(inviteRef).update({ status: "declined" });

  // arrival
  set(meRef, { inRoom: true, pressing: false, lastActive: serverTimestamp() });

  return roomId;
};

export const acceptHugRoomInvite = (roomId: string) => {
  update(ref(rtdb, `hugRooms/${roomId}/invite`), {
    status: "accepted",
  });
};

export const declineHugRoomInvite = (roomId: string) => {
  update(ref(rtdb, `hugRooms/${roomId}/invite`), {
    status: "declined",
  });
};

export const leaveHugRoom = (roomId: string, myId: string) => {
  const meRef = ref(rtdb, `hugRooms/${roomId}/participants/${myId}`);
  onDisconnect(meRef).cancel();

  set(meRef, {
    inRoom: false,
    pressing: false,
    lastActive: serverTimestamp(),
  });
};

export const endHugRoom = (roomId: string, myId: string) => {
  onDisconnect(ref(rtdb, `hugRooms/${roomId}/participants/${myId}`)).cancel();
  return remove(ref(rtdb, `hugRooms/${roomId}`));
};

export const cancelMyDisconnect = (roomId: string, myId: string) =>
  onDisconnect(ref(rtdb, `hugRooms/${roomId}/participants/${myId}`)).cancel();

export const setPressingButton = (
  roomId: string,
  myId: string,
  pressing: boolean,
) => {
  update(ref(rtdb, `hugRooms/${roomId}/participants/${myId}`), {
    pressing,
    lastActive: serverTimestamp(),
  });
};

export const getRoomParticipants = (roomId: string) => {};

export const subscribeToHugRoom = (
  roomId: string,
  cb: (room: HugRoom | null) => void,
) => {
  const roomRef = ref(rtdb, `hugRooms/${roomId}`);
  const unsub = onValue(roomRef, (snap) => cb(snap.val()));
  return () => off(roomRef, "value", unsub);
};
