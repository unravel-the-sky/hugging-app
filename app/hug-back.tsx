import { colors } from "@/components/ui/squish";
import { useHugDraft } from "@/hooks/useHugDraft";
import { sendHugBack } from "@/lib/handleHugs";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { use, useEffect, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { TabBarContext } from "./context/TabBarContext";
import { PlushButton } from "@/components/ui/squish/PlushButton";

const QUICK_NOTES = [
  "good morning!",
  "sleep tight",
  "whatever",
  "miss you",
  "hug received",
  "love you",
  "thank you",
  "hug",
];
const MAX_LEN = 140;

type HugBackProps = {
  visible: boolean;
  toName: string;
  sending?: boolean;
  onCancel: () => void;
  onSend: (note: string) => void;
};

const SHOW_QUICK_REPLIES = false;

export default function HugBackSheet() {
  const [note, setNote] = useState("");
  const [sending, setSending] = useState(false);
  const { hugId, toName } = useLocalSearchParams<{
    hugId: string;
    toName: string;
  }>();

  console.log("HUGBACK hugId: ", hugId);

  const canSend = note.trim().length > 0 && !sending;

  const handleSend = async () => {
    if (!canSend) return;
    try {
      setSending(true);
      await sendHugBack(hugId, note.trim());
      router.back();
    } catch (e) {
      setSending(false);
      console.error("error happened while hugging back: ", e);
      // your error toast
    }
  };

  const { setIsTabBarHidden } = use(TabBarContext);

  useFocusEffect(() => {
    setIsTabBarHidden(true);
    return () => setIsTabBarHidden(false);
  });

  return (
    <View style={styles.sheet}>
      <View style={styles.header}>
        <View style={styles.heartBadge}>
          <Text style={styles.heartBadgeIcon}>♥</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>hug {toName} back</Text>
          <Text style={styles.subtitle}>send a hug back message</Text>
        </View>
        <Pressable
          onPress={() => router.back()}
          hitSlop={12}
          style={styles.close}
        >
          <Text style={styles.closeIcon}>✕</Text>
        </Pressable>
      </View>

      <View style={styles.inputWrap}>
        <TextInput
          value={note}
          onChangeText={(t) => setNote(t.slice(0, MAX_LEN))}
          placeholder="write something soft…"
          placeholderTextColor="#B4A7D6"
          multiline
          maxLength={MAX_LEN}
          style={styles.input}
          // autoFocus
        />
        <Text style={styles.counter}>
          {note.length}/{MAX_LEN}
        </Text>
      </View>

      <PlushButton
        label={sending ? "sending" : "hug back"}
        onPress={handleSend}
        disabled={!canSend}
        variant="blush"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  sheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 20,
    paddingBottom: 0,
    gap: 16,
  },
  header: { flexDirection: "row", alignItems: "center", gap: 12 },
  heartBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#EC7FA9",
    alignItems: "center",
    justifyContent: "center",
  },
  heartBadgeIcon: { color: "#fff", fontSize: 20 },
  title: { fontSize: 18, fontWeight: "700", color: "#3A2E5C" },
  subtitle: { fontSize: 13, color: "#8A5CB0", fontStyle: "italic" },
  close: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#EFEAFB",
    alignItems: "center",
    justifyContent: "center",
  },
  closeIcon: { color: "#6B5B95", fontSize: 15 },
  inputWrap: {
    backgroundColor: "#F5F2FC",
    borderRadius: 18,
    padding: 16,
    minHeight: 120,
  },
  input: { fontSize: 16, color: "#3A2E5C", flex: 1, textAlignVertical: "top" },
  counter: { alignSelf: "flex-end", fontSize: 12, color: "#B4A7D6" },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  chip: {
    backgroundColor: "#EFEAFB",
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  chipText: { color: "#6B5B95", fontSize: 14 },
  sendBtn: {
    backgroundColor: "#EC7FA9",
    borderRadius: 999,
    paddingVertical: 16,
    alignItems: "center",
  },
  sendBtnDisabled: { opacity: 0.5 },
  sendText: { color: "#fff", fontSize: 17, fontWeight: "700" },
});
