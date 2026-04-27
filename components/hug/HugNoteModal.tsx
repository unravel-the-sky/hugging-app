import type { BottomSheetBackdropProps } from "@gorhom/bottom-sheet";
import BottomSheet, {
  BottomSheetBackdrop,
  BottomSheetTextInput,
  BottomSheetView,
  useBottomSheetSpringConfigs,
} from "@gorhom/bottom-sheet";
import React, {
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import {
  Keyboard,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

export interface HugNoteModalRef {
  open: () => void;
  close: () => void;
}

interface HugNoteModalProps {
  ref?: React.Ref<HugNoteModalRef>;
  friendName: string;
  friendUid: string;
  onContinue: (friendName: string, friendUid: string, note: string) => void;
  onCancel: () => void;
}

export default function HugNoteModal({
  ref,
  friendName,
  friendUid,
  onContinue,
  onCancel,
}: HugNoteModalProps) {
  const [note, setNote] = useState("");
  const sheetRef = useRef<BottomSheet>(null);
  const maxLength = 256;

  const animationConfigs = useBottomSheetSpringConfigs({
    damping: 80,
    overshootClamping: true,
    stiffness: 500,
  });

  useImperativeHandle(ref, () => ({
    open: () => sheetRef.current?.expand(),
    close: () => sheetRef.current?.close(),
  }));

  const handleContinue = () => {
    onContinue(friendName, friendUid, note.trim());
    setNote("");
    sheetRef.current?.close();
  };

  const handleSheetChanges = useCallback(
    (index: number) => {
      if (index === -1) {
        console.log("Sheet closed, resetting note and calling onCancel");
        Keyboard.dismiss();
        setNote("");
        onCancel();
      }
    },
    [onCancel],
  );

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop
        {...props}
        appearsOnIndex={0}
        disappearsOnIndex={-1}
        opacity={0.5}
      />
    ),
    [],
  );

  return (
    <BottomSheet
      ref={sheetRef}
      index={-1}
      enableDynamicSizing
      enablePanDownToClose
      onChange={handleSheetChanges}
      backdropComponent={renderBackdrop}
      animationConfigs={animationConfigs}
      backgroundStyle={styles.sheetBackground}
      handleIndicatorStyle={styles.handle}
      keyboardBehavior="interactive"
      keyboardBlurBehavior="restore"
      android_keyboardInputMode="adjustResize"
    >
      <BottomSheetView style={styles.contentContainer}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.emoji}>💌</Text>
          <Text style={styles.title}>Send a Hug</Text>
          <Text style={styles.subtitle}>to @{friendName}</Text>
        </View>

        {/* Note Input */}
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Add a note (optional)</Text>
          <BottomSheetTextInput
            style={styles.textInput}
            placeholder="Write something nice..."
            placeholderTextColor="#999"
            value={note}
            onChangeText={setNote}
            multiline
            maxLength={maxLength}
            textAlignVertical="top"
          />
          <Text style={styles.characterCountText}>
            {note.length} / {maxLength}
          </Text>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionsContainer}>
          <TouchableOpacity
            style={[styles.button, styles.cancelButton]}
            onPress={() => sheetRef.current?.close()}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.continueButton]}
            onPress={handleContinue}
          >
            <Text style={styles.continueButtonText}>Continue</Text>
          </TouchableOpacity>
        </View>
      </BottomSheetView>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  sheetBackground: {
    backgroundColor: "#FAFAFA",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
  },
  handle: {
    backgroundColor: "#DDD",
    width: 40,
    height: 4,
  },
  contentContainer: {
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: Platform.OS === "ios" ? 40 : 24,
  },
  header: {
    alignItems: "center",
    marginBottom: 24,
  },
  emoji: {
    fontSize: 56,
    marginBottom: 12,
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#1A1A1A",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: "#666",
  },
  inputContainer: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1A1A1A",
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: "#FFF",
    borderWidth: 2,
    borderColor: "#FFE8E8",
    borderRadius: 16,
    padding: 16,
    fontSize: 16,
    color: "#1A1A1A",
    minHeight: 80,
    maxHeight: 160,
  },
  characterCountText: {
    fontSize: 12,
    color: "#999",
    alignSelf: "flex-end",
    marginTop: 8,
  },
  actionsContainer: {
    flexDirection: "row",
    gap: 12,
  },
  button: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
  },
  cancelButton: {
    backgroundColor: "#F0F0F0",
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#666",
  },
  continueButton: {
    backgroundColor: "#FF6B6B",
    shadowColor: "#FF6B6B",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  continueButtonText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#FFF",
  },
});
