import { useEffect, useState } from "react";
import { Text } from "react-native";
import { DeviceMotion } from "expo-sensors";

export default function TiltDebug() {
  const [avail, setAvail] = useState<string>("checking…");
  const [vals, setVals] = useState({ x: 0, y: 0 });
  useEffect(() => {
    DeviceMotion.isAvailableAsync().then((a) => setAvail(String(a)));
    DeviceMotion.setUpdateInterval(100);
    const sub = DeviceMotion.addListener((d) => {
      const r = d.rotation ?? { beta: 0, gamma: 0 };
      setVals({ x: r.beta ?? 0, y: r.gamma ?? 0 });
    });
    return () => sub.remove();
  }, []);
  return (
    <Text
      style={{
        position: "absolute",
        top: 60,
        left: 16,
        color: "#fff",
        zIndex: 999,
      }}
    >
      avail: {avail}
      {"\n"}x: {vals.x.toFixed(2)} y: {vals.y.toFixed(2)}
    </Text>
  );
}
