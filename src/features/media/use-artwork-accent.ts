import { useEffect, useState } from "react";

const FALLBACK_ACCENT = "106, 156, 255";

export function useArtworkAccent(artwork: string | null | undefined, enabled: boolean) {
  const [accent, setAccent] = useState(FALLBACK_ACCENT);
  useEffect(() => {
    if (!artwork || !enabled) return;
    const image = new Image();
    image.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = 12; canvas.height = 12;
      const context = canvas.getContext("2d", { willReadFrequently: true });
      if (!context) return;
      context.drawImage(image, 0, 0, 12, 12);
      const pixels = context.getImageData(0, 0, 12, 12).data;
      let red = 0, green = 0, blue = 0, count = 0;
      for (let index = 0; index < pixels.length; index += 16) {
        if (pixels[index + 3] <= 100) continue;
        red += pixels[index]; green += pixels[index + 1]; blue += pixels[index + 2]; count++;
      }
      if (count) setAccent(`${Math.round(red / count)}, ${Math.round(green / count)}, ${Math.round(blue / count)}`);
    };
    image.src = artwork;
  }, [artwork, enabled]);
  return accent;
}
