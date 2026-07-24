import { useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { colors, font, radius, spacing } from "@/components/ui/squish/theme";
import { BackLink, screen } from "@/components/hugroom/HugRoomComponents";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { createRoom } from "@/lib/hugroom";
import * as Clipboard from "expo-clipboard";
import { PlushButton } from "@/components/ui/squish/PlushButton";

export default function CreateRoomScreen() {
  const router = useRouter();
  const { user, isHydrating } = useCurrentUser();

  const [code, setCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Guards against the effect running twice and creating two rooms.
  const started = useRef(false);

  useEffect(() => {
    if (started.current || !user) return;
    started.current = true;

    createRoom(user)
      .then(setCode)
      .catch((e) => setError(e?.message ?? "Couldn't open a room."));
  }, [user]);

  const copy = async () => {
    if (!code) return;
    await Clipboard.setStringAsync(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <View style={screen.root}>
      <BackLink />

      <View style={styles.body}>
        <Text style={screen.title}>Your room is ready</Text>
        <Text style={screen.subtitle}>
          share this code so a friend can join your hug.
        </Text>

        <View style={[screen.card, styles.card]}>
          <Text style={styles.cardLabel}>ROOM CODE</Text>

          {code ? (
            <View style={styles.tiles}>
              {code.split("").map((char, i) => (
                <View key={`${char}-${i}`} style={styles.tile}>
                  <Text style={styles.tileChar}>{char}</Text>
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.tilesLoading}>
              {error ? (
                <Text style={styles.error}>{error}</Text>
              ) : (
                <ActivityIndicator color={colors.primary} />
              )}
            </View>
          )}

          <PlushButton
            label={copied ? "copied" : "copy code"}
            variant="soft"
            fullWidth
            height={48}
            disabled={!code}
            onPress={copy}
            style={styles.copyButton}
          />
        </View>

        <PlushButton
          label="enter the room"
          variant="primary"
          fullWidth
          height={58}
          disabled={!code}
          style={styles.enterButton}
          onPress={() => code && router.replace(`/hugroom/${code}`)}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  body: { flex: 1, justifyContent: "center", paddingBottom: spacing.xl * 3 },
  card: { marginTop: spacing.xl * 2 },
  cardLabel: {
    fontFamily: font.uiBold,
    fontSize: 13,
    letterSpacing: 2,
    color: colors.softInk,
    textAlign: "center",
  },
  tiles: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: spacing.lg,
  },
  tilesLoading: {
    height: 72,
    marginTop: spacing.lg,
    alignItems: "center",
    justifyContent: "center",
  },
  tile: {
    flex: 1,
    aspectRatio: 0.86,
    marginHorizontal: 3,
    borderRadius: radius.sm,
    backgroundColor: colors.soft,
    alignItems: "center",
    justifyContent: "center",
  },
  tileChar: {
    fontFamily: font.displayBold,
    fontSize: 26,
    color: colors.primary,
  },
  copyButton: { marginTop: spacing.lg },
  enterButton: { marginTop: spacing.xl },
  error: {
    fontFamily: font.ui,
    fontSize: 15,
    color: colors.softInk,
    textAlign: "center",
  },
});
