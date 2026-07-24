import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import {
  joinRoom,
  leaveRoom,
  occupants,
  subscribeRoom,
  trackPresence,
  type ParticipantSlot,
  type Room,
  type RoomParticipant,
} from "@/lib/hugroom";
import { colors, font, radius, spacing } from "@/components/ui/squish/theme";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { AvatarBubble, screen } from "@/components/hugroom/HugRoomComponents";
import { HugCanvas } from "@/components/hugroom/HugCanvas";

export default function RoomScreen() {
  const router = useRouter();
  const { user } = useCurrentUser();
  const { code } = useLocalSearchParams<{ code: string }>();

  const [room, setRoom] = useState<Room | null>(null);
  const [slot, setSlot] = useState<ParticipantSlot | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Idempotent: covers both "arrived from create" and "deep-linked straight here".
  useEffect(() => {
    if (!user || !code) return;
    let alive = true;
    joinRoom(code, user)
      .then((s) => alive && setSlot(s))
      .catch(
        (e) => alive && setError(e?.message ?? "couldn't open that room."),
      );
    return () => {
      alive = false;
    };
  }, [code, user]);

  useEffect(() => {
    if (!code) return;
    return subscribeRoom(code, setRoom);
  }, [code]);

  useEffect(() => {
    if (!code || !slot) return;
    return trackPresence(code, slot);
  }, [code, slot]);

  const leave = async () => {
    if (code && slot) await leaveRoom(code, slot).catch(() => {});
    router.replace("/hug-room");
  };

  if (error) {
    return (
      <View style={[screen.root, styles.centered]}>
        <Text style={screen.subtitle}>{error}</Text>
        <Pressable onPress={() => router.replace("/hug-room")} hitSlop={12}>
          <Text style={styles.leave}>back to hug room</Text>
        </Pressable>
      </View>
    );
  }

  const people = occupants(room);
  const others = people.filter((p) => p.uid !== user?.uid);

  const mySlot = slot;
  const theirSlot = mySlot === "a" ? "b" : "a";
  const them = room?.participants?.[theirSlot];

  return (
    <View style={[screen.root, styles.root]}>
      <Stack.Screen options={{ gestureEnabled: false }} />
      <View style={styles.codePill}>
        <Text style={styles.codePillLabel}>ROOM</Text>
        <Text style={styles.codePillCode}>{code}</Text>
      </View>

      {room ? (
        <View style={styles.people}>
          {people.map((p) => (
            <Person key={p.uid} participant={p} isMe={p.uid === user?.uid} />
          ))}
          <Text style={styles.status}>
            {others.length === 0
              ? "waiting for someone to join — share your code"
              : ""}
          </Text>
        </View>
      ) : (
        <ActivityIndicator color={colors.primary} style={styles.people} />
      )}

      {them && mySlot ? (
        <HugCanvas
          code={code}
          mySlot={mySlot}
          myTouch={room?.participants?.[mySlot]?.touch}
          theirTouch={them.touch}
          theirName={them.displayName}
        />
      ) : null}

      <Pressable
        onPress={leave}
        hitSlop={12}
        accessibilityRole="button"
        style={styles.leaveButton}
      >
        <Text style={styles.leave}>leave room</Text>
      </Pressable>
    </View>
  );
}

function Person({
  participant,
  isMe,
}: {
  participant: RoomParticipant;
  isMe: boolean;
}) {
  return (
    <View style={styles.person}>
      <AvatarBubble
        uid={participant.uid}
        displayName={participant.displayName}
        photoThumbURL={participant.photoThumbURL}
        connected={participant.connected}
        size={62}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    alignItems: "center",
    paddingTop: spacing.xl * 4,
    backgroundColor: "green",
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  codePill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    shadowColor: colors.deep,
    shadowOpacity: 0.1,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  codePillLabel: {
    fontFamily: font.uiBold,
    fontSize: 13,
    letterSpacing: 2,
    color: colors.softInk,
    marginRight: spacing.md,
  },
  codePillCode: {
    fontFamily: font.displayBold,
    fontSize: 20,
    letterSpacing: 2,
    color: colors.primary,
  },
  people: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: spacing.xl * 2,
    minHeight: 190,
  },
  person: {
    alignItems: "center",
    marginHorizontal: spacing.lg,
  },
  name: {
    fontFamily: font.displayBold,
    fontSize: 16,
    color: colors.plumInk,
    marginTop: spacing.md,
  },
  presence: {
    fontFamily: font.ui,
    fontSize: 10,
    color: colors.softInk,
    marginTop: 2,
  },
  status: {
    fontFamily: font.ui,
    fontSize: 16,
    lineHeight: 24,
    color: colors.plumInk,
    textAlign: "center",
  },
  leaveButton: { marginTop: "auto", marginBottom: spacing.xl * 2 },
  leave: {
    fontFamily: font.uiBold,
    fontSize: 17,
    color: colors.softInk,
  },
});
