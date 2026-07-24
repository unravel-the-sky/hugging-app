import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { BackLink, screen } from "@/components/hugroom/HugRoomComponents";
import { PlushButton } from "@/components/ui/squish/PlushButton";
import { colors, font, radius, spacing } from "@/components/ui/squish/theme";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { joinRoom } from "@/lib/hugroom";
import {
  isCompleteRoomCode,
  normalizeRoomCode,
  ROOM_CODE_LENGTH,
} from "@/lib/hugroom/roomcodeGenerator";

export default function JoinRoomScreen() {
  const router = useRouter();
  const { user, isHydrating } = useCurrentUser();

  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ready = isCompleteRoomCode(code) && !busy && !!user;

  const submit = async () => {
    if (!ready || !user) return;
    setBusy(true);
    setError(null);
    try {
      await joinRoom(code, user);
      router.replace(`/hugroom/${code}`);
    } catch (e: any) {
      setError(e?.message ?? "Couldn't join that room.");
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={screen.root}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <BackLink />

      <View style={styles.body}>
        <Text style={screen.title}>Join a room</Text>
        <Text style={screen.subtitle}>
          enter the {ROOM_CODE_LENGTH}-character code your friend shared with
          you.
        </Text>

        <View style={[screen.card, styles.card]}>
          <TextInput
            value={code}
            onChangeText={(t) => {
              setCode(normalizeRoomCode(t));
              setError(null);
            }}
            placeholder="ABCDEF"
            placeholderTextColor={colors.lilac}
            autoCapitalize="characters"
            autoCorrect={false}
            autoComplete="off"
            maxLength={ROOM_CODE_LENGTH}
            returnKeyType="go"
            onSubmitEditing={submit}
            editable={!busy}
            style={styles.input}
            accessibilityLabel="Room code"
          />
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <PlushButton
          label={busy ? "joining…" : "join room"}
          variant="primary"
          fullWidth
          height={58}
          disabled={!ready}
          style={styles.joinButton}
          onPress={submit}
        />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  body: { flex: 1, justifyContent: "center", paddingBottom: spacing.xl * 3 },
  card: { marginTop: spacing.xl * 2, paddingVertical: spacing.lg },
  input: {
    fontFamily: font.displayBold,
    fontSize: 34,
    letterSpacing: 8,
    color: colors.primary,
    textAlign: "center",
    paddingVertical: spacing.md,
    borderRadius: radius.md,
  },
  error: {
    fontFamily: font.ui,
    fontSize: 15,
    color: colors.blush,
    textAlign: "center",
    marginTop: spacing.lg,
  },
  joinButton: { marginTop: spacing.xl },
});
