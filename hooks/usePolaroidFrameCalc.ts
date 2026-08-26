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

  // Middle of the polaroid's white caption strip, as an offset from the canvas
  // centre — which is the origin overlays position themselves against.
  //
  //   caption centre = canvasPadding + frameTopPadding + photoHeight
  //                    + frameBottomPadding / 2
  //   canvas centre  = canvasHeight / 2
  //
  // The paddings cancel down to this, independent of screen size.
  const captionOffsetY = (frameTopPadding + photoHeight) / 2;

  return {
    canvasWidth,
    canvasHeight,
    canvasPadding,
    frameHorizontalPadding,
    frameTopPadding,
    frameBottomPadding,
    frameWidth,
    frameHeight,
    photoHeight,
    photoWidth,
    captionOffsetY,
  };
}
