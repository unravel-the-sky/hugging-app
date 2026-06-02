import { useHugRoomData, useIncomingInvites } from "@/hooks/useHugRoom";
import { auth } from "@/lib/firebaseConfig";
import {
  acceptHugRoomInvite,
  cancelMyDisconnect,
  declineHugRoomInvite,
  endHugRoom,
  getHugRoomId,
  joinHugRoom,
  leaveHugRoom,
  setPressingButton,
} from "@/lib/handleHugRoom";
import * as Haptics from "expo-haptics";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

const sleep = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

export default function HugRoom() {
  const myId = auth.currentUser?.uid;

  const isPressing = useRef(false);
  const loopTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const timeoutVal = useRef(750);

  const [hugRoomId, setHugRoomId] = useState<string | undefined>(undefined);
  const { invites } = useIncomingInvites(auth.currentUser?.uid || "");

  const { roomParticipants, activeCount, roomStatus, roomInvite } =
    useHugRoomData(hugRoomId);

  const { roomId: roomIdParam, partnerId: partnerIdParam } =
    useLocalSearchParams<{ roomId?: string; partnerId?: string }>();

  useEffect(() => {
    if (roomIdParam) setHugRoomId(roomIdParam);
    if (partnerIdParam) setFromId(partnerIdParam);
  }, [roomIdParam, partnerIdParam]);

  const me = roomParticipants?.find((p) => p.id === myId);
  const imInRoom = me?.inRoom ?? false;
  const partnerInRoom =
    roomParticipants?.some((p) => p.id !== myId && p.inRoom) ?? false;
  const partnerId = roomParticipants?.find((p) => p.id !== myId)?.id;

  const pressProgress = useSharedValue(0);

  const areAllPressing = useMemo(() => {
    if (roomParticipants && roomParticipants.length > 0) {
      return roomParticipants.every((item) => item.pressing);
    }
  }, [roomParticipants]);

  useEffect(() => {
    pressProgress.value = withTiming(areAllPressing ? 1 : 0, { duration: 120 });
    if (areAllPressing) {
      startVibrationLoop();
    } else {
      stopVibrationLoop();
    }
  }, [areAllPressing, pressProgress]);

  const startVibrationLoop = async () => {
    if (!isPressing.current) return;
    // if (timeoutVal.current > 150) timeoutVal.current -= 15;

    try {
      // harder
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      await sleep(160);
      if (!isPressing.current) return;
      // softer
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft);
    } catch (err) {
      console.error("Haptics did not start properly.. Error: ", err);
    }

    if (!isPressing.current) return;
    loopTimeout.current = setTimeout(startVibrationLoop, timeoutVal.current);
  };

  const stopVibrationLoop = () => {
    isPressing.current = false;
    if (loopTimeout.current) {
      clearTimeout(loopTimeout.current);
      loopTimeout.current = null;
    }
  };

  const holdGesture = Gesture.LongPress()
    .runOnJS(true)
    .onBegin(() => {
      isPressing.current = true;

      // pressProgress.value = withTiming(1, { duration: 120 });

      console.log("hug started..");
      if (hugRoomId && myId)
        setPressingButton(hugRoomId, myId, isPressing.current);
    })
    .onFinalize(() => {
      // pressProgress.value = withTiming(0, { duration: 120 });
      stopVibrationLoop();

      console.log("hug ended..");
      if (hugRoomId && myId)
        setPressingButton(hugRoomId, myId, isPressing.current);
    });

  const buttonAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: pressProgress.value * 2 },
      { scale: 1 - pressProgress.value * 0.05 }, // optional: slight shrink, feels squishy
    ],
    shadowOpacity: 0.3 - pressProgress.value * 0.22,
    shadowOffset: { width: 0, height: 10 - pressProgress.value * 9 },
    elevation: 8 - pressProgress.value * 7,
  }));

  const borderColor =
    roomStatus === "active"
      ? "#4CAF50"
      : roomStatus === "waiting"
        ? "#FFD60A"
        : "transparent";

  useEffect(() => {
    console.log("roomInvite status: ", roomInvite?.status);

    if (roomInvite?.status === "declined") {
      handleExitRoom();
    }
  }, [roomInvite]);

  const inviteEntries = Object.entries(invites);

  const [fromId, setFromId] = useState("");

  const handleAceptInvite = (inviterId: string) => {
    if (!myId) return;

    const roomId = joinHugRoom(myId, inviterId);
    acceptHugRoomInvite(roomId);
    setHugRoomId(roomId);
    setFromId(inviterId);
  };

  const handleDeclineInvite = (inviterId: string) => {
    if (!myId) return;

    const roomId = getHugRoomId(myId, inviterId);
    declineHugRoomInvite(roomId);
  };

  const handleJoinAgain = () => {
    if (myId && partnerId) joinHugRoom(myId, partnerId);
  };

  const handleExitRoom = () => {
    if (!myId || !hugRoomId) return;

    if (partnerId) {
      handleDeclineInvite(partnerId);
    }

    leaveHugRoom(hugRoomId, myId);
    setHugRoomId(undefined);
  };

  const handleJoinHugRoom = (inviterId: string) => {
    if (!myId) return;

    const roomId = joinHugRoom(myId, inviterId);
    setHugRoomId(roomId);
    setFromId(inviterId);
  };

  const handleLeaveRoom = () => {
    if (!myId || !hugRoomId) return;

    leaveHugRoom(hugRoomId, myId);
  };

  return (
    <View style={[styles.container, { borderColor }]}>
      <Text style={styles.title}>Send a Real-Time Hug</Text>

      {inviteEntries.length > 0
        ? inviteEntries.map(([roomId, invite]) => (
            <View key={roomId}>
              <Text>invite from: {invite.fromName}</Text>
              <View style={{ flex: 1, flexDirection: "row" }}>
                <Pressable
                  style={styles.hugButton}
                  onPress={() => handleAceptInvite(invite.from)}
                >
                  <Text>join</Text>
                </Pressable>
                <Pressable
                  style={styles.hugButton}
                  onPress={() => handleDeclineInvite(invite.from)}
                >
                  <Text>decline</Text>
                </Pressable>
              </View>
            </View>
          ))
        : !hugRoomId && (
            <View style={{ flex: 1 }}>
              <Pressable
                style={styles.hugButton}
                onPress={() => {
                  router.push("/friend-picker");
                }}
              >
                <Text>Invite a friend to hug</Text>
              </Pressable>
            </View>
          )}

      {hugRoomId && roomParticipants && roomParticipants.length > 0 && (
        <View style={styles.participantList}>
          <Text style={styles.participantHeader}>
            participants ({activeCount} in room)
          </Text>
          {roomParticipants.map((p) => (
            <View key={p.id} style={styles.participantRow}>
              <View
                style={[
                  styles.statusDot,
                  { backgroundColor: p.inRoom ? "#4CAF50" : "#CCC" },
                ]}
              />
              <Text>
                {p.id.slice(0, 4) + "..."} {p.inRoom ? "(in room)" : "(away)"}{" "}
                {p.pressing ? "pressing" : ""}
              </Text>
            </View>
          ))}
        </View>
      )}

      {hugRoomId && fromId && (
        <View style={{ flex: 1 }}>
          <GestureDetector gesture={holdGesture}>
            <Animated.View style={[styles.hugButton, buttonAnimatedStyle]}>
              <Text style={styles.buttonText}>🤗</Text>
              <Text style={styles.subText}>Press & Hold</Text>
            </Animated.View>
          </GestureDetector>
          {hugRoomId && imInRoom && (
            <Pressable style={styles.hugButton} onPress={handleLeaveRoom}>
              <Text>leave room</Text>
            </Pressable>
          )}

          {hugRoomId && !imInRoom && partnerInRoom && (
            <Pressable style={styles.hugButton} onPress={handleJoinAgain}>
              <Text>rejoin hug</Text>
            </Pressable>
          )}

          {hugRoomId && (
            <Pressable style={styles.hugButton} onPress={handleExitRoom}>
              <Text>exit</Text>
            </Pressable>
          )}
          {areAllPressing && (
            <View>
              <Text>yay begge pressinggg</Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFF5F5",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 8,
    borderColor: "transparent",
    borderBottomLeftRadius: 55, // approx iPhone screen corner radius — tune 45–55 to taste
    borderBottomRightRadius: 55, // approx iPhone screen corner radius — tune 45–55 to taste
    borderCurve: "continuous", // iOS superellipse; makes the corners match the device
  },
  participantList: {
    marginVertical: 20,
    alignItems: "flex-start",
  },
  participantHeader: {
    fontWeight: "bold",
    color: "#FF6B6B",
    marginBottom: 8,
  },
  participantRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start",
    width: 300,
    marginBottom: 4,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#FF6B6B",
    marginBottom: 40,
    fontFamily: "System", // Replace with your cartoonish font later
  },
  hugButton: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: "#FF6B6B",
    alignItems: "center",
    justifyContent: "center",
    elevation: 8, // Android shadow
    shadowColor: "#FF6B6B", // iOS shadow
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    borderWidth: 4,
    borderColor: "#FFF",
  },
  buttonText: {
    fontSize: 50,
  },
  subText: {
    color: "#FFF",
    fontWeight: "bold",
    fontSize: 14,
    marginTop: 5,
  },
});
