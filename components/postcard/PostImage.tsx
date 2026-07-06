import {
  FilterKey,
  FILTERS,
  lerpMatrix,
  WHITE,
} from "@/constants/postcardConstants";
import usePolaroidFrameCalc from "@/hooks/usePolaroidFrameCalc";
import {
  Canvas,
  ColorMatrix,
  Group,
  Image,
  Rect,
  useCanvasRef,
  useImage,
} from "@shopify/react-native-skia";
import React, { useEffect } from "react";
import {
  Easing,
  useDerivedValue,
  useSharedValue,
  withDelay,
  withTiming,
} from "react-native-reanimated";

export default function PostImage({
  media,
  selected,
}: {
  media: string;
  selected: FilterKey;
}) {
  const image = useImage(media);

  const dropProgress = useSharedValue(0);
  const developProgress = useSharedValue(0);

  useEffect(() => {
    if (image) {
      dropProgress.value = withDelay(
        40,
        withTiming(1, { duration: 900, easing: Easing.out(Easing.back(1.5)) }),
      );
      developProgress.value = withDelay(
        30,
        withTiming(1, { duration: 200, easing: Easing.out(Easing.cubic) }),
      );
    }
  }, [dropProgress, developProgress, image, selected]);

  const canvasRef = useCanvasRef();

  const {
    canvasWidth,
    canvasHeight,
    canvasPadding,
    frameHorizontalPadding,
    frameTopPadding,
    frameHeight,
    frameWidth,
    photoHeight,
    photoWidth,
  } = usePolaroidFrameCalc();

  const frameXLocal = canvasPadding;
  const frameYLocal = canvasPadding;
  const photoXLocal = frameXLocal + frameHorizontalPadding;
  const photoYLocal = frameYLocal + frameTopPadding;

  const centerXLocal = canvasWidth / 2;
  const centerYLocal = canvasHeight / 2;

  // Inert for now — kept so the drop can be re-enabled later.
  const polaroidTransform = useDerivedValue(() => {
    return [];
  });

  const polaroidOpacity = useDerivedValue(() => dropProgress.value);

  const shadowOffsetX = useDerivedValue(
    () => 2 + (1 - dropProgress.value) * 14,
  );
  const shadowOffsetY = useDerivedValue(
    () => 6 + (1 - dropProgress.value) * 22,
  );
  const shadowColor = useDerivedValue(
    () => `rgba(0,0,0,${0.25 + (1 - dropProgress.value) * 0.15})`,
  );
  const shadowX = useDerivedValue(() => frameXLocal + shadowOffsetX.value);
  const shadowY = useDerivedValue(() => frameYLocal + shadowOffsetY.value);

  const animatedMatrix = useDerivedValue(() => {
    const target = FILTERS[selected].matrix;
    return lerpMatrix(WHITE, target, developProgress.value);
  }, [selected]);

  return (
    <Canvas
      style={{ width: canvasWidth, height: canvasHeight }}
      ref={canvasRef}
    >
      <Group
        origin={{ x: centerXLocal, y: centerYLocal }}
        transform={polaroidTransform}
        opacity={polaroidOpacity}
      >
        {/* Shadow */}
        <Rect
          x={shadowX}
          y={shadowY}
          width={frameWidth}
          height={frameHeight}
          color={shadowColor}
        />
        {/* White card */}
        <Rect
          x={frameXLocal}
          y={frameYLocal}
          width={frameWidth}
          height={frameHeight}
          color="white"
        />
        {/* Photo */}
        <Image
          x={photoXLocal}
          y={photoYLocal}
          width={photoWidth}
          height={photoHeight}
          image={image}
          fit="cover"
        >
          <ColorMatrix matrix={animatedMatrix} />
        </Image>
      </Group>
    </Canvas>
  );
}
