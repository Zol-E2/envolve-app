import type { MetadataRoute } from "next";

/**
 * Lets students add eNvolve to their phone's home screen, where it opens
 * full screen like an app, with the eNvolve icon and colours.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "eNvolve",
    short_name: "eNvolve",
    description: "Tanulj beszélgetve egy AI-tanárral. / Learn by talking with an AI tutor.",
    start_url: "/",
    display: "standalone",
    background_color: "#fbf6ee",
    theme_color: "#ffffff",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
