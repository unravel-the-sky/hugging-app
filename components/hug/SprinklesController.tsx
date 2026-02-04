import { useEffect, useState } from "react";
import { View } from "react-native";
import Sprinkle from "./Sprinkle";

type SprinklesControllerProps = {
  active: boolean;
};

export default function SprinklesController({
  active,
}: SprinklesControllerProps) {
  const [sprinkles, setSprinkles] = useState<number[]>([]);

  useEffect(() => {
    if (!active) return;

    console.log("sprinkles are calleddd");

    const interval = setInterval(() => {
      setSprinkles((s) => [...s, Date.now()]);
    }, 100);

    return () => clearInterval(interval);
  }, [active]);

  return (
    <View
      pointerEvents="none"
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        alignItems: "center",
        justifyContent: "center",
        width: 50,
        height: 50,
      }}
    >
      {sprinkles.map((id) => (
        <Sprinkle
          key={id}
          onDone={() => setSprinkles((s) => s.filter((x) => x !== id))}
        />
      ))}
    </View>
  );
}
