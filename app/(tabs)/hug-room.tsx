import HeartbeatOverlay from "@/components/hug/HeartBeatOverlay";
import HeartParticles from "@/components/hug/HeartParticles";
import { useHugRoomData, useIncomingInvites } from "@/hooks/useHugRoom";
import { auth } from "@/lib/firebaseConfig";
import {
  acceptHugRoomInvite,
  declineHugRoomInvite,
  getHugRoomId,
  joinHugRoom,
  leaveHugRoom,
  setPressingButton,
} from "@/lib/handleHugRoom";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
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

  const areSomePressing = useMemo(() => {
    if (roomParticipants && roomParticipants.length > 0) {
      return roomParticipants.some((item) => item.pressing);
    }
  }, [roomParticipants]);

  const pulse = useSharedValue(0);

  useEffect(() => {
    if (areAllPressing) {
      pressProgress.value = withTiming(1, { duration: 120 });

      pulse.value = withDelay(
        150,
        withRepeat(
          withSequence(
            withTiming(0.06, { duration: 130 }),
            withTiming(0.0, { duration: 130 }),
            withTiming(0.035, { duration: 110 }),
            withTiming(0.0, { duration: 140 }),
            withTiming(0.0, { duration: 450 }),
          ),
          -1,
          false,
        ),
      );
    } else {
      cancelAnimation(pulse);
      pulse.value = withTiming(0, { duration: 150 });
      pressProgress.value = withTiming(0, { duration: 150 });
    }

    if (areSomePressing) {
      pressProgress.value = withTiming(0.2, { duration: 150 });
    }
    if (areAllPressing) {
      console.log("all pressing yayy");
      startVibrationLoop();
    } else {
      stopVibrationLoop();
    }
  }, [areAllPressing, areSomePressing]);

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

  const buttonAnimatedStyle = useAnimatedStyle(() => {
    const pressedScale = 1 - 0.1 * pressProgress.value;
    return {
      transform: [
        { translateY: pressProgress.value * 2 },
        { scale: pressedScale * (1 + pulse.value) }, // optional: slight shrink, feels squishy
      ],
      shadowOpacity: 0.3 - pressProgress.value * 0.22,
      shadowOffset: { width: 0, height: 10 - pressProgress.value * 9 },
      elevation: 8 - pressProgress.value * 7,
    };
  });

  const borderColor =
    roomStatus === "active"
      ? "#4caf4f93"
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

  const { width, height } = useWindowDimensions();

  return (
    <View style={[styles.container, { borderColor }]} collapsable={false}>
      <HeartParticles active={!!areAllPressing} />
      <Text style={styles.title}>Send a Real-Time Hug</Text>

      {inviteEntries.length > 0
        ? inviteEntries.map(([roomId, invite]) => (
            <View key={roomId} style={{ flex: 1, gap: 12 }}>
              <Text>invite from: {invite.fromName}</Text>
              <View
                style={{
                  flexDirection: "row",
                  gap: 8,
                  alignItems: "flex-end",
                  height: "75%",
                }}
              >
                <Pressable
                  style={styles.hugButton}
                  onPress={() => handleAceptInvite(invite.from)}
                >
                  <Text style={{ color: "#fff", fontFamily: "SpaceMono" }}>
                    join
                  </Text>
                </Pressable>
                <Pressable
                  style={styles.hugButton}
                  onPress={() => handleDeclineInvite(invite.from)}
                >
                  <Text style={{ color: "#fff", fontFamily: "SpaceMono" }}>
                    decline
                  </Text>
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
                <Text style={{ color: "#fff", fontFamily: "SpaceMono" }}>
                  Invite
                </Text>
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
          <View
            style={{
              flex: 4,
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <GestureDetector gesture={holdGesture}>
              <Animated.View
                style={[styles.mainHugButton, buttonAnimatedStyle]}
              >
                <Ionicons
                  name="heart"
                  size={200}
                  color="#FF6B6B"
                  style={[
                    roomStatus === "waiting"
                      ? styles.disabledButton
                      : styles.mainHugButton,
                  ]}
                />
                {/* <Text style={styles.subText}>Press & Hold</Text> */}
              </Animated.View>
            </GestureDetector>
            {/* {areAllPressing && (
              <View
                style={{
                  flex: 1,
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
                <Text style={{ color: "#fff" }}>yay begge pressinggg</Text>
              </View>
            )} */}
          </View>
          <View
            style={{
              flex: 3,
              padding: 12,
              gap: 6,
              flexDirection: "row",
              justifyContent: "space-between",
            }}
          >
            {hugRoomId && imInRoom && (
              <Pressable style={styles.hugButton} onPress={handleLeaveRoom}>
                <Text style={{ color: "#fff", fontFamily: "SpaceMono" }}>
                  leave room
                </Text>
              </Pressable>
            )}

            {hugRoomId && !imInRoom && partnerInRoom && (
              <Pressable style={styles.hugButton} onPress={handleJoinAgain}>
                <Text style={{ color: "#fff", fontFamily: "SpaceMono" }}>
                  rejoin hug
                </Text>
              </Pressable>
            )}

            {hugRoomId && (
              <Pressable style={styles.hugButton} onPress={handleExitRoom}>
                <Text style={{ color: "#fff", fontFamily: "SpaceMono" }}>
                  exit
                </Text>
              </Pressable>
            )}
          </View>
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
    fontSize: 34,
    fontWeight: "bold",
    color: "#FF6B6B",
    marginBottom: 40,
    fontFamily: "CuteFont",
  },
  mainHugButton: {
    // width: 120,
    // height: 120,
    // borderRadius: 500,
    // backgroundColor: "#ff6b6b",
    // alignItems: "center",
    // justifyContent: "center",
    transform: [{ rotate: "-5deg" }],
    elevation: 8, // Android shadow
    shadowColor: "#FF6B6B", // iOS shadow
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  disabledButton: {
    // backgroundColor: "#969696",
    color: "#969696",
    shadowColor: "#969696", // iOS shadow
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
  },
  hugButton: {
    width: 140,
    height: 50,
    borderRadius: 20,
    backgroundColor: "#FF6B6B",
    alignItems: "center",
    justifyContent: "center",
    elevation: 8, // Android shadow
    shadowColor: "#FF6B6B", // iOS shadow
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  buttonText: {
    fontSize: 50,
  },
});
