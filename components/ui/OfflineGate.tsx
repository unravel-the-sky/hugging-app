import { Modal } from "react-native";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import OfflineScreen from "./OfflineScreen";

export function OfflineGate() {
  const { isOnline, recheck } = useOnlineStatus();

  return (
    <Modal
      visible={isOnline === false}
      animationType="fade"
      presentationStyle="overFullScreen"
      transparent={false}
      // Android hardware back shouldn't dismiss it
      onRequestClose={() => {}}
    >
      <OfflineScreen onRetry={recheck} />
    </Modal>
  );
}
