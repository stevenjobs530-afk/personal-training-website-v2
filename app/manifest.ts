import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Personal Training",
    short_name: "Training",
    description: "Private strength, cardio and recovery tracking.",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    background_color: "#f7f9fd",
    theme_color: "#f7f8fb",
    categories: ["fitness", "health"],
    icons: [
      {
        src: "/pwa-icon/192",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/pwa-icon/512",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
