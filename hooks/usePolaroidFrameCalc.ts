import { useWindowDimensions } from "react-native";

export default function usePolaroidFrameCalc() {
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();

  // Polaroid layout
  const frameWidth = screenWidth * 0.88;
  const frameHorizontalPadding = 18;
  const frameTopPadding = 18;
  const frameBottomPadding = 80;
  const photoWidth = frameWidth - frameHorizontalPadding * 2;
  const photoHeight = photoWidth;
  const frameHeight = photoHeight + frameTopPadding + frameBottomPadding;

  const canvasPadding = 10; // for shadow
  const canvasWidth = frameWidth + canvasPadding * 2;
  const canvasHeight = frameHeight + canvasPadding * 2;

  return {
    canvasWidth,
    canvasHeight,
    canvasPadding,
    frameHorizontalPadding,
    frameTopPadding,
    frameWidth,
    frameHeight,
    photoHeight,
    photoWidth,
  };
}
