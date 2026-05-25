import {
  DimensionValue,
  FlexAlignType,
  LayoutChangeEvent,
  Pressable,
  Text,
} from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
} from "react-native-reanimated";

export default function DraggableText({
  item = "",
  onPressed,
}: {
  item: string;
  onPressed: () => void;
}) {
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);

  const rotation = useSharedValue(0);
  const savedRotation = useSharedValue(0);

  const scale = useSharedValue(1);
  const offsetScale = useSharedValue(1);

  const textWidth = useSharedValue(0);

  type AlignSelfType = "auto" | FlexAlignType | undefined;
  const alignSelfValue = useSharedValue<AlignSelfType>("center");
  const draggingWidth = useSharedValue<DimensionValue | undefined>("100%");

  const drag = Gesture.Pan()
    .onChange((event) => {
      translateX.value += event.changeX;
      translateY.value += event.changeY;
      // alignSelfValue.value = "auto";
      draggingWidth.value = "100%";
    })
    .onEnd(() => {
      draggingWidth.value = "auto";
    });

  const pinch = Gesture.Pinch()
    .onUpdate((event) => {
      scale.value = offsetScale.value * event.scale;
    })
    .onEnd(() => {
      offsetScale.value = scale.value;
    });

  const rotate = Gesture.Rotation()
    .onUpdate((e) => {
      rotation.value = savedRotation.value + e.rotation;
    })
    .onEnd(() => {
      savedRotation.value = rotation.value;
    });

  const mergedGesture = Gesture.Simultaneous(drag, pinch, rotate);

  const containerStyle = useAnimatedStyle(() => {
    return {
      alignSelf: alignSelfValue.value,
      width: draggingWidth.value,
      transform: [
        {
          translateX: translateX.value,
        },
        {
          translateY: translateY.value,
        },
        {
          rotateZ: `${(rotation.value / Math.PI) * 180}deg`,
        },
        {
          scale: scale.value,
        },
      ],
    };
  });

  const handleLayout = (event: LayoutChangeEvent) => {
    const { width, height, x, y } = event.nativeEvent.layout;
    textWidth.value = width;
  };

  return (
    <GestureDetector gesture={mergedGesture}>
      <Animated.View
        style={[
          containerStyle,
          {
            alignItems: "center",
            // backgroundColor: "green",
          },
        ]}
      >
        <Pressable onPress={onPressed}>
          <Text
            onLayout={handleLayout}
            style={{ fontSize: 36, fontFamily: "CuteFont" }}
          >
            {item}
          </Text>
        </Pressable>
      </Animated.View>
    </GestureDetector>
  );
}
