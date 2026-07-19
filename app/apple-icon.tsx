import { ImageResponse } from "next/og";
import { createPwaIconArt } from "./_components/pwa-icon-art";

export const size = {
  width: 180,
  height: 180,
};

export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(createPwaIconArt(), size);
}
