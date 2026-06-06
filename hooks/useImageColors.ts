import { useEffect, useState } from "react";
import { getColors, ImageColorsResult } from "react-native-image-colors";

const initialState = {
  colorOne: { value: "", name: "" },
  colorTwo: { value: "", name: "" },
  colorThree: { value: "", name: "" },
  colorFour: { value: "", name: "" },
  rawResult: "",
};

export const useImageColors = (imageUrl: string) => {
  const [colors, setColors] = useState<typeof initialState | undefined>(
    undefined,
  );
  const [loading, setLoading] = useState(false);

  const fetchColors = async (imageUrl: string) => {
    setLoading(true);
    const result = await getColors(imageUrl, {
      fallback: "#228B22",
      pixelSpacing: 5,
    });

    switch (result.platform) {
      case "android":
      case "web":
        setColors({
          colorOne: { value: result.lightVibrant, name: "lightVibrant" },
          colorTwo: { value: result.dominant, name: "dominant" },
          colorThree: { value: result.vibrant, name: "vibrant" },
          colorFour: { value: result.darkVibrant, name: "darkVibrant" },
          rawResult: JSON.stringify(result),
        });
        break;
      case "ios":
        setColors({
          colorOne: { value: result.background, name: "background" },
          colorTwo: { value: result.detail, name: "detail" },
          colorThree: { value: result.primary, name: "primary" },
          colorFour: { value: result.secondary, name: "secondary" },
          rawResult: JSON.stringify(result),
        });
        break;
      default:
        throw new Error("Unexpected platform");
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchColors(imageUrl);
  }, [imageUrl]);

  return {
    colors,
    loading,
  };
};
