import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Forge Gym",
    short_name: "Forge",
    description:
      "Partner gyms, trainers, and members on one hub — train, track, and grow with Forge.",
    start_url: "/",
    display: "standalone",
    background_color: "#0D0D0D",
    theme_color: "#EF1111",
    orientation: "portrait-primary",
    categories: ["fitness", "health", "lifestyle"],
    icons: [
      {
        src: "/forge-mark.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/forge-mark.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/forge-mark.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
