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
import { Pressable, StyleSheet, Text, View } from "react-native";
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
import { LinearGradient } from "expo-linear-gradient";
import MaskedView from "@react-native-masked-view/masked-view";

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export default function HugRoom() {
  const myId = auth.currentUser?.uid;

  const [hugRoomId, setHugRoomId] = useState<string>();
  const [partnerId, setPartnerId] = useState<string>();

  const { roomId: roomIdParam, partnerId: partnerIdParam } =
    useLocalSearchParams<{ roomId?: string; partnerId?: string }>();

  useEffect(() => {
    if (roomIdParam) setHugRoomId(roomIdParam);
    if (partnerIdParam) setPartnerId(partnerIdParam);
  }, [roomIdParam, partnerIdParam]);

  const { invites } = useIncomingInvites(myId ?? "");
  const { roomParticipants, activeCount, roomStatus, roomInvite } =
    useHugRoomData(hugRoomId);

  // only one invite shown at a time for now, later make a ui for multiple invites
  const incomingInvite = useMemo(() => {
    const first = Object.values(invites ?? {})[0];
    return first?.status === "pending" && first?.sessionState === "ongoing"
      ? first
      : undefined;
  }, [invites]);

  const imInRoom =
    roomParticipants?.find((p) => p.id === myId)?.inRoom ?? false;
  const partnerInRoom =
    roomParticipants?.some((p) => p.id !== myId && p.inRoom) ?? false;

  // "pressing" only counts people actually in the room; a hug needs both
  const present = roomParticipants?.filter((p) => p.inRoom) ?? [];
  const areAllPressing =
    present.length >= 2 && present.every((p) => p.pressing);
  const areSomePressing = present.some((p) => p.pressing);

  const borderColor =
    roomStatus === "active"
      ? "#4caf4f93"
      : roomStatus === "waiting"
        ? "#FFD60A"
        : "transparent";

  const pressProgress = useSharedValue(0); // 0 idle · 0.2 one pressing · 1 both
  const pulse = useSharedValue(0);

  const buttonAnimatedStyle = useAnimatedStyle(() => {
    const pressedScale = 1 - 0.1 * pressProgress.value;
    return {
      transform: [
        { translateY: pressProgress.value * 2 },
        { scale: pressedScale * (1 + pulse.value) },
      ],
      shadowOpacity: 0.3 - pressProgress.value * 0.22,
      shadowOffset: { width: 0, height: 10 - pressProgress.value * 9 },
      elevation: 8 - pressProgress.value * 7,
    };
  });

  // ── haptics loop (decoupled from the gesture) ────────────────────
  const vibrating = useRef(false);
  const loopTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const timeoutVal = useRef(750);

  const vibrationLoop = async () => {
    if (!vibrating.current) return;
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      await sleep(160);
      if (!vibrating.current) return;
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft);
    } catch (err) {
      console.error("Haptics error:", err);
    }
    if (!vibrating.current) return;
    loopTimeout.current = setTimeout(vibrationLoop, timeoutVal.current);
  };
  const startVibration = () => {
    if (vibrating.current) return;
    vibrating.current = true;
    vibrationLoop();
  };
  const stopVibration = () => {
    vibrating.current = false;
    if (loopTimeout.current) clearTimeout(loopTimeout.current);
    loopTimeout.current = null;
  };

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
      startVibration();
      return;
    }
    cancelAnimation(pulse);
    pulse.value = withTiming(0, { duration: 150 });
    pressProgress.value = withTiming(areSomePressing ? 0.2 : 0, {
      duration: 150,
    });
    stopVibration();
  }, [areAllPressing, areSomePressing]);

  // ── gesture: report MY pressing to rtdb, nothing else ────────────
  const isPressing = useRef(false);
  const holdGesture = Gesture.LongPress()
    .runOnJS(true)
    .onBegin(() => {
      isPressing.current = true;
      if (hugRoomId && myId) setPressingButton(hugRoomId, myId, true);
    })
    .onFinalize(() => {
      isPressing.current = false;
      if (hugRoomId && myId) setPressingButton(hugRoomId, myId, false);
    });

  // ── actions ──────────────────────────────────────────────────────
  const handleAcceptInvite = (inviterId: string) => {
    if (!myId) return;
    const roomId = joinHugRoom(myId, inviterId);
    acceptHugRoomInvite(roomId);
    setHugRoomId(roomId);
    setPartnerId(inviterId);
  };

  const handleDeclineInvite = (inviterId: string) => {
    if (!myId) return;
    declineHugRoomInvite(getHugRoomId(myId, inviterId));
  };

  const handleJoinAgain = () => {
    if (myId && partnerId) joinHugRoom(myId, partnerId);
  };

  const handleLeaveRoom = () => {
    if (myId && hugRoomId) leaveHugRoom(hugRoomId, myId);
  };

  const handleExitRoom = () => {
    if (!myId || !hugRoomId) return;
    if (partnerId) handleDeclineInvite(partnerId);
    leaveHugRoom(hugRoomId, myId);
    setHugRoomId(undefined);
    setPartnerId(undefined);
  };

  // partner ended the session
  useEffect(() => {
    if (roomInvite?.status === "declined") handleExitRoom();
  }, [roomInvite]);

  return (
    <View style={[styles.container, { borderColor }]} collapsable={false}>
      <HeartParticles active={areAllPressing} />
      <Text style={styles.title}>Send a Real-Time Hug</Text>

      {!hugRoomId &&
        (incomingInvite ? (
          <View style={{ gap: 12, alignItems: "center" }}>
            <Text>invite from: {incomingInvite.fromName}</Text>
            <View style={{ flexDirection: "row", gap: 8 }}>
              <Pressable
                style={styles.hugButton}
                onPress={() => handleAcceptInvite(incomingInvite.from)}
              >
                <Text style={styles.buttonLabel}>join</Text>
              </Pressable>
              <Pressable
                style={styles.hugButton}
                onPress={() => handleDeclineInvite(incomingInvite.from)}
              >
                <Text style={styles.buttonLabel}>decline</Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <Pressable
            style={styles.hugButton}
            onPress={() => router.push("/friend-picker")}
          >
            <Text style={styles.buttonLabel}>Invite</Text>
          </Pressable>
        ))}

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
                {p.id.slice(0, 4)}... {p.inRoom ? "(in room)" : "(away)"}{" "}
                {p.pressing ? "pressing" : ""}
              </Text>
            </View>
          ))}
        </View>
      )}

      {hugRoomId && (
        <View style={{ flex: 1 }}>
          <View style={styles.hugButtonArea}>
            <GestureDetector gesture={holdGesture}>
              <Animated.View
                style={[styles.mainHugButton, buttonAnimatedStyle]}
              >
                <MaskedView
                  style={styles.maskedView}
                  maskElement={
                    <View
                      style={{
                        backgroundColor: "transparent",
                        flex: 1,
                        justifyContent: "center",
                        alignItems: "center",
                      }}
                    >
                      <Ionicons
                        name="heart"
                        size={200}
                        color={roomStatus === "waiting" ? "#969696" : "#FF6B6B"}
                      />
                    </View>
                  }
                >
                  <LinearGradient
                    // Define the gradient colors from start to finish
                    colors={["#FF6B6B", "#ff7b7b", "#ffabab"]}
                    // Optional: Control the direction of the gradient
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={StyleSheet.absoluteFill}
                  />
                </MaskedView>
              </Animated.View>
            </GestureDetector>
          </View>

          <View style={styles.roomActions}>
            {imInRoom && (
              <Pressable style={styles.hugButton} onPress={handleLeaveRoom}>
                <Text style={styles.buttonLabel}>leave room</Text>
              </Pressable>
            )}
            {!imInRoom && partnerInRoom && (
              <Pressable style={styles.hugButton} onPress={handleJoinAgain}>
                <Text style={styles.buttonLabel}>rejoin hug</Text>
              </Pressable>
            )}
            <Pressable style={styles.hugButton} onPress={handleExitRoom}>
              <Text style={styles.buttonLabel}>exit</Text>
            </Pressable>
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
    borderBottomLeftRadius: 55,
    borderBottomRightRadius: 55,
    borderCurve: "continuous",
  },
  hugButtonArea: { flex: 4, justifyContent: "center", alignItems: "center" },
  gradient: {
    padding: 15,
    alignItems: "center",
    borderRadius: 8, // Crucial: put your border radius here
  },
  maskedView: {
    // You must match the width and height to your icon size
    width: 260,
    height: 260,
  },
  roomActions: {
    flex: 3,
    padding: 12,
    gap: 6,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  participantList: { marginVertical: 20, alignItems: "flex-start" },
  participantHeader: { fontWeight: "bold", color: "#FF6B6B", marginBottom: 8 },
  participantRow: {
    flexDirection: "row",
    alignItems: "center",
    width: 300,
    marginBottom: 4,
  },
  statusDot: { width: 10, height: 10, borderRadius: 5, marginRight: 8 },
  title: {
    fontSize: 34,
    fontWeight: "bold",
    color: "#FF6B6B",
    marginBottom: 40,
    fontFamily: "CuteFont",
  },
  mainHugButton: {
    transform: [{ rotate: "-5deg" }],
    elevation: 8,
    shadowColor: "#FF6B6B",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  hugButton: {
    width: 140,
    height: 50,
    borderRadius: 20,
    backgroundColor: "#FF6B6B",
    alignItems: "center",
    justifyContent: "center",
    elevation: 8,
    shadowColor: "#FF6B6B",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  buttonLabel: { color: "#fff", fontFamily: "SpaceMono" },
});
