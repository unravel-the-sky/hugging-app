import { TiltRef } from "@/hooks/useTilt";
import { useEffect, useState } from "react";
import { Text } from "react-native";

export default function TiltRefDebug({ tiltRef }: { tiltRef: TiltRef }) {
  const [dbg, setDbg] = useState({ x: 0, y: 0 });
  useEffect(() => {
    const id = setInterval(() => {
      setDbg({ x: tiltRef.current.x, y: tiltRef.current.y });
    }, 150);
    return () => clearInterval(id);
  }, [tiltRef]);
  return (
    <Text
      style={{
        position: "absolute",
        top: 60,
        left: 16,
        color: "#fff",
        zIndex: 999,
        fontSize: 16,
      }}
    >
      useTilt ref → x:{dbg.x.toFixed(2)} y:{dbg.y.toFixed(2)}
    </Text>
  );
}
