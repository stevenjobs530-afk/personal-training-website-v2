import { ImageResponse } from "next/og";
import { createPwaIconArt } from "../../_components/pwa-icon-art";

const supportedSizes = new Set([192, 512]);

type IconRouteContext = {
  params: Promise<{
    size: string;
  }>;
};

export async function GET(_request: Request, context: IconRouteContext) {
  const params = await context.params;
  const iconSize = Number(params.size);

  if (!supportedSizes.has(iconSize)) {
    return new Response("Unsupported icon size", { status: 404 });
  }

  return new ImageResponse(createPwaIconArt(), {
    width: iconSize,
    height: iconSize,
    headers: {
      "cache-control": "public, max-age=31536000, immutable",
    },
  });
}
