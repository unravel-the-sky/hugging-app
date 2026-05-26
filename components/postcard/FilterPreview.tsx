import {
  Canvas,
  ColorMatrix,
  Image,
  SkImage,
} from "@shopify/react-native-skia";

const FILTER_PREVIEW_SIZE = 48;

type FilterPreviewProps = {
  image: SkImage;
  matrix: readonly number[];
};

export default function FilterPreview({ image, matrix }: FilterPreviewProps) {
  return (
    <Canvas style={{ width: FILTER_PREVIEW_SIZE, height: FILTER_PREVIEW_SIZE }}>
      <Image
        x={0}
        y={0}
        width={FILTER_PREVIEW_SIZE}
        height={FILTER_PREVIEW_SIZE}
        image={image}
        fit="cover"
      >
        <ColorMatrix matrix={[...matrix]} />
      </Image>
    </Canvas>
  );
}
