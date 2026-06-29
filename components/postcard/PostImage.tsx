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

  // 0 = mid-drop (scaled up, tilted), 1 = landed
  const dropProgress = useSharedValue(0);
  // 0 = pure white, 1 = fully developed
  const developProgress = useSharedValue(0);

  useEffect(() => {
    if (image) {
      dropProgress.value = withDelay(
        40,
        withTiming(1, {
          duration: 900,
          easing: Easing.out(Easing.back(1.5)),
        }),
      );
      // Start developing slightly before the drop fully settles
      developProgress.value = withDelay(
        30,
        withTiming(1, {
          duration: 200,
          easing: Easing.out(Easing.cubic),
        }),
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

  const scaleVal = 1.55;
  const rotateVal = -10;
  const translateYVal = -10;
  const polaroidTransform = useDerivedValue(() => {
    const t = dropProgress.value;
    const scale = scaleVal + (1 - scaleVal) * t; // scaleVal -> 1
    const rotate = ((rotateVal * Math.PI) / 180) * (1 - t); // 10deg -> 0
    return [];
  });

  const opacityVal = 0;
  const polaroidOpacity = useDerivedValue(() => {
    const t = dropProgress.value;
    const opacity = opacityVal + (1 - opacityVal) * t; // scaleVal -> 1
    return opacity;
  });

  // Shadow follows the drop: larger offset and softer when "in air"
  const shadowOffsetX = useDerivedValue(
    () => 2 + (1 - dropProgress.value) * 14,
  );
  const shadowOffsetY = useDerivedValue(
    () => 6 + (1 - dropProgress.value) * 22,
  );
  const shadowOpacity = useDerivedValue(
    () => `rgba(0,0,0,${0.25 + (1 - dropProgress.value) * 0.15})`,
  );

  // Shadow rect position needs to be a SharedValue too since it depends on dropProgress
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
          color={shadowOpacity}
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
