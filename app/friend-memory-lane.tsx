import AvatarImage from "@/components/avatar/AvatarImage";
import {
  colors,
  font,
  LabeledDivider,
  radius,
  shadow,
  spacing,
} from "@/components/ui/squish";
import { FriendAvatar } from "@/components/ui/squish/FriendAvatar";
import { PlushButton } from "@/components/ui/squish/PlushButton";
import RoundIconButton from "@/components/ui/squish/RountIconButton";
import { useAvatarThumb } from "@/hooks/useAvatarThumbnail";
import useCreateHugWithNote from "@/hooks/useCreateHugWithNote";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useGetDownloadUrl } from "@/hooks/useGetDownloadUrl";
import { auth, db } from "@/lib/firebaseConfig";
import { UserFriend } from "@/lib/handleFriends";
import { getHugsWith, Hug } from "@/lib/handleHugs";
import { threadOf } from "@/lib/hugs/thread";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import { doc, getDoc } from "firebase/firestore";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

function formatMemoryDate(d: Date): string {
  const hh = d.getHours().toString().padStart(2, "0");
  const mm = d.getMinutes().toString().padStart(2, "0");
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}, ${hh}:${mm}`;
}

export default function FriendMemoryLane() {
  const { friendId } = useLocalSearchParams<{ friendId: string }>();
  const { user, isHydrating } = useCurrentUser();
  const { startHugWithNote } = useCreateHugWithNote();

  const [friend, setFriend] = useState<UserFriend | null>(null);
  const [hugs, setHugs] = useState<Hug[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const me = auth.currentUser;
    if (!me || !friendId) {
      setError(true);
      setLoading(false);
      return;
    }

    const friendRef = doc(db, "users", me.uid, "friends", friendId);

    Promise.all([getDoc(friendRef), getHugsWith(friendId)])
      .then(([snap, sharedHugs]) => {
        if (snap.exists()) setFriend(snap.data() as UserFriend);
        setHugs(sharedHugs.filter((hug) => hug.seenAt));
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [friendId]);

  const friendPhotoUrl = useAvatarThumb(friend?.id);
  const myPhotoUrl = useAvatarThumb(user?.uid);
  const insets = useSafeAreaInsets();

  if (loading || isHydrating || !user) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.emptyText}>Could not load your memories..</Text>
      </View>
    );
  }

  const name = friend?.displayName ?? "your friend";

  return (
    <View style={styles.screen}>
      {/* header */}
      <View style={styles.header}>
        <RoundIconButton icon="chevron-back" onPress={() => router.back()} />
        <View style={styles.headerText}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            Memories
          </Text>
          <Text style={styles.headerSub} numberOfLines={1}>
            with {name} · {hugs.length} hug{hugs.length === 1 ? "" : "s"}{" "}
            together
          </Text>
        </View>
        <Pressable
          onPress={() => {
            router.push({
              pathname: "/friend-stats",
              params: {
                friendId: friend?.id,
              },
            });
          }}
        >
          <FriendAvatar name={name} photoUri={friendPhotoUrl} />
        </Pressable>
        {/* <Avatar size={36} /> */}
      </View>

      {hugs.length === 0 ? (
        <View style={styles.emptyLane}>
          <Ionicons name="heart-outline" size={40} color={colors.lilac} />
          <Text style={styles.emptyText}>
            No hugs yet — send the first one 🫂
          </Text>
        </View>
      ) : (
        <ScrollView
          style={styles.lane}
          contentContainerStyle={styles.laneContent}
          showsVerticalScrollIndicator={false}
        >
          {hugs.map((h) => {
            const senderIsMe = h.from === user?.uid;
            const thread = threadOf(h);
            const createdAt = h.createdAt?.toDate();

            return (
              <View key={h.id}>
                <LabeledDivider
                  label={createdAt ? formatMemoryDate(createdAt) : "—"}
                  style={styles.divider}
                />

                <MemRow
                  side={h.from === user?.uid ? "right" : "left"}
                  avatar={
                    <AvatarImage
                      avatar={
                        h.from === user?.uid
                          ? user.avatar
                          : h.fromAvatar || undefined
                      }
                      photoURL={
                        h.from === user?.uid ? myPhotoUrl : friendPhotoUrl
                      }
                      name={h.fromName}
                      size="s"
                    />
                  }
                >
                  {h.imagePath ? (
                    <MemImage imagePath={h.imagePath} caption={h.note} />
                  ) : null}
                  {h.note && !h.imagePath ? (
                    <MemNote text={h.note} side="left" mine={senderIsMe} />
                  ) : null}
                  {!h.imagePath && !h.note ? (
                    <MemPill label="🫂 a hug" />
                  ) : null}
                </MemRow>

                {thread.map((back, i) => {
                  const backIsMine = back.from === user?.uid;
                  const backAuthorName = backIsMine
                    ? "You"
                    : back.from === h.from
                      ? h.fromName
                      : h.toName;

                  return (
                    <MemRow
                      key={`${back.from}-${back.createdAt.toMillis()}-${i}`}
                      side={backIsMine ? "right" : "left"}
                      avatar={
                        <AvatarImage
                          avatar={
                            backIsMine
                              ? user?.avatar
                              : h.from === user?.uid
                                ? undefined
                                : h.fromAvatar || undefined
                          }
                          photoURL={backIsMine ? myPhotoUrl : friendPhotoUrl}
                          name={backAuthorName}
                          size="s"
                        />
                      }
                      caption={`${backAuthorName} hugged back 🫂`}
                    >
                      <MemNote
                        text={back.note}
                        side="right"
                        mine={backIsMine}
                      />
                    </MemRow>
                  );
                })}
              </View>
            );
          })}

          {/* first hug end cap */}
          <View style={styles.endCap}>
            <View style={styles.firstHugPill}>
              <Ionicons name="heart" size={16} color={colors.blush} />
              <Text style={styles.firstHugText}>first hug</Text>
            </View>
            <Text style={styles.endCapCaption}>where it all began</Text>
          </View>
        </ScrollView>
      )}

      {friend?.displayName && friend.id && (
        <View
          style={[
            styles.footer,
            { paddingBottom: Math.max(insets.bottom, spacing.lg) },
          ]}
          pointerEvents="box-none"
        >
          <LinearGradient
            colors={[
              "rgba(246,243,251,0)",
              "rgba(246,243,251,0.85)",
              colors.mistBg,
            ]}
            locations={[0, 0.95, 1]}
            style={StyleSheet.absoluteFill}
            pointerEvents="none"
          />
          <PlushButton
            label="hug!"
            variant="primary"
            height={64}
            borderRadius={radius.pill}
            onPress={() =>
              startHugWithNote({
                displayName: friend?.displayName,
                uid: friend?.id,
              })
            }
            style={styles.fab}
          />
        </View>
      )}
    </View>
  );
}

/* ── pieces ──────────────────────────────────────────────────────────── */

function MemRow({
  side,
  avatar,
  caption,
  children,
}: {
  side: "left" | "right";
  avatar: React.ReactNode;
  caption?: string;
  children: React.ReactNode;
}) {
  const right = side === "right";
  return (
    <View style={[styles.row, right && styles.rowRight]}>
      <View style={styles.rowAvatar}>{avatar}</View>
      <View style={[styles.rowBody, right && styles.rowBodyRight]}>
        {children}
        {caption ? <Text style={styles.rowCaption}>{caption}</Text> : null}
      </View>
    </View>
  );
}

const SPRING = { damping: 18, stiffness: 140, mass: 0.6 };

function MemImage({
  imagePath,
  caption,
}: {
  imagePath: string;
  caption?: string;
}) {
  const { downloadUrl, failed } = useGetDownloadUrl(imagePath);

  const turn = useSharedValue(0); // -1 = flipped left, 0 = front, +1 = flipped right
  const base = useSharedValue(0);
  const width = useSharedValue(1);

  const pan = Gesture.Pan()
    .activeOffsetX([-12, 12])
    .failOffsetY([-10, 10])
    .onBegin(() => {
      base.value = turn.value;
    })
    .onUpdate((e) => {
      const next = base.value + e.translationX / width.value;
      turn.value = Math.min(1, Math.max(-1, next));
    })
    .onEnd((e) => {
      const flung = Math.abs(e.velocityX) > 500;
      const dir = e.velocityX < 0 ? -1 : 1;
      const target = flung
        ? Math.min(1, Math.max(-1, Math.round(turn.value + dir * 0.5)))
        : Math.abs(turn.value) > 0.5
          ? Math.sign(turn.value)
          : 0;
      turn.value = withSpring(target, SPRING);
    });

  const tap = Gesture.Tap().onEnd(() => {
    turn.value = withSpring(Math.abs(turn.value) > 0.5 ? 0 : -1, SPRING);
  });

  const gesture = Gesture.Exclusive(pan, tap);

  // avoid a backfaceVisibility dependency — Android has historically been flaky with it
  const showBack = useDerivedValue(() => Math.abs(turn.value) > 0.5);

  const frontStyle = useAnimatedStyle(() => ({
    opacity: showBack.value ? 0 : 1,
    transform: [{ perspective: 900 }, { rotateY: `${turn.value * 180}deg` }],
  }));

  const backStyle = useAnimatedStyle(() => ({
    opacity: showBack.value ? 1 : 0,
    transform: [
      { perspective: 900 },
      { rotateY: `${turn.value * 180 + 180}deg` },
    ],
  }));

  if (failed) {
    return (
      <View style={styles.photoCard}>
        <View style={styles.photoPlaceholder}>
          <Ionicons name="image-outline" size={26} color={colors.lilac} />
          {caption ? (
            <Text style={styles.photoCaption} numberOfLines={2}>
              {caption}
            </Text>
          ) : null}
        </View>
      </View>
    );
  }

  return (
    <GestureDetector gesture={gesture}>
      <View
        style={styles.flipWrap}
        onLayout={(e) => {
          width.value = e.nativeEvent.layout.width || 1;
        }}
      >
        <Animated.View style={[StyleSheet.absoluteFill, frontStyle]}>
          <Image
            source={downloadUrl}
            style={styles.photoImage}
            contentFit="cover"
            transition={200}
            cachePolicy="memory-disk"
            placeholder={{ blurhash: "L6PZfSi_.AyE_3t7t7R**0o#DgR4" }}
          />
        </Animated.View>

        <Animated.View
          style={[StyleSheet.absoluteFill, styles.cardBack, backStyle]}
        >
          <Text style={styles.backNote}>{caption ?? "asdf"}</Text>
        </Animated.View>
      </View>
    </GestureDetector>
  );
}

function MemNote({
  text,
  side,
  mine,
}: {
  text: string;
  side: "left" | "right";
  mine: boolean;
}) {
  const right = side === "right";
  return (
    <View
      style={[
        styles.note,
        mine ? styles.noteMine : styles.noteTheirs,
        right ? styles.noteTailRight : styles.noteTailLeft,
      ]}
    >
      <Text style={styles.noteText}>{text}</Text>
    </View>
  );
}

function MemPill({ label }: { label: string }) {
  return (
    <View style={styles.memPill}>
      <Text style={styles.memPillText}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.mistBg,
    marginTop: spacing.xl * 2,
  },
  footer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 160,
    justifyContent: "flex-end",
    alignItems: "flex-end",
    paddingHorizontal: spacing.lg,
  },
  fab: {
    ...shadow,
    shadowOpacity: 0.28,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.mistBg,
    padding: spacing.xl,
  },
  emptyText: {
    color: colors.softInk,
    fontSize: 16,
    fontFamily: font.ui,
    textAlign: "center",
  },
  emptyLane: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.md,
    padding: spacing.xl,
  },

  /* header */
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
  },
  roundBtn: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: colors.deep,
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  headerText: { flex: 1, minWidth: 0 },
  headerTitle: {
    fontFamily: font.display,
    fontSize: 19,
    color: colors.plumInk,
  },
  headerSub: {
    fontFamily: font.uiBold,
    fontSize: 12,
    color: colors.softInk,
    marginTop: 1,
  },

  /* lane */
  lane: {
    flex: 1,
  },
  laneContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: 140,
  },
  /* divider */
  divider: {
    paddingTop: spacing.xl,
    paddingBottom: spacing.sm,
  },

  /* row */
  row: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  rowRight: { flexDirection: "row-reverse" },
  rowAvatar: { flexShrink: 0 },
  rowBody: {
    maxWidth: "72%",
    alignItems: "flex-start",
    gap: spacing.xs,
  },
  rowBodyRight: { alignItems: "flex-end" },
  rowCaption: {
    fontFamily: font.uiBold,
    fontSize: 10,
    letterSpacing: 0.2,
    color: colors.softInk,
    paddingHorizontal: spacing.xs,
  },

  /* photo card */
  photoCard: {
    overflow: "hidden",
    ...shadow,
    shadowOpacity: 0.05,
  },
  photoImage: {
    width: "100%",
    height: "100%",
    borderRadius: radius.sm,
  },
  photoPlaceholder: {
    width: 220,
    aspectRatio: 3 / 4,
    borderRadius: 17,
    backgroundColor: colors.soft,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  photoCaption: {
    fontFamily: font.hand,
    fontSize: 18,
    color: colors.plumInk,
    textAlign: "center",
  },
  flipWrap: {
    width: "100%",
    aspectRatio: 4 / 5,
    marginVertical: 16,
    ...shadow,
    shadowOpacity: 0.05,
  },
  cardBack: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    width: "100%",
    backgroundColor: colors.surface,
    borderRadius: radius.sm,
    borderWidth: 1.5,
    borderColor: "#F0EAFB",
    padding: spacing.lg,
  },
  backNote: {
    fontFamily: font.hand,
    fontSize: 22,
    lineHeight: 28,
    color: colors.plumInk,
  },

  /* note bubble */
  note: {
    paddingVertical: 10,
    paddingHorizontal: 15,
    shadowColor: colors.deep,
    shadowOpacity: 0.07,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 1,
  },
  noteMine: { backgroundColor: colors.soft },
  noteTheirs: {
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: "#F0EAFB",
  },
  noteTailLeft: {
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    borderBottomRightRadius: 18,
    borderBottomLeftRadius: 6,
  },
  noteTailRight: {
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    borderBottomRightRadius: 6,
    borderBottomLeftRadius: 18,
  },
  noteText: {
    fontFamily: font.display,
    fontSize: 21,
    lineHeight: 23,
    color: colors.plumInk,
  },

  /* note-less hug pill */
  memPill: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: radius.pill,
    backgroundColor: colors.soft,
  },
  memPillText: {
    fontFamily: font.uiBold,
    fontSize: 14,
    color: colors.primary,
  },

  /* end cap */
  endCap: {
    alignItems: "center",
    gap: spacing.xs,
    paddingTop: spacing.xl,
    paddingBottom: spacing.md,
  },
  firstHugPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: 9,
    paddingHorizontal: 18,
    borderRadius: radius.pill,
    backgroundColor: colors.soft,
  },
  firstHugText: {
    fontFamily: font.display,
    fontSize: 14.5,
    color: colors.deep,
  },
  endCapCaption: {
    fontFamily: font.hand,
    fontSize: 19,
    color: colors.softInk,
  },
});
