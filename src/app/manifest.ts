import type { MetadataRoute } from "next";

// Minimal manifest — metadata only, NO service worker (that's the real PWA
// work, deliberately out of scope). Its only job right now is to make iOS
// "Add to Home Screen" launch in standalone mode, which is a precondition
// for the Notification API existing there at all. Without this, a home
// screen icon on iOS just opens a normal Safari tab and the notification
// test can only ever report "unsupported".
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "HomeBase",
    short_name: "HomeBase",
    description: "A household operating system for utilities, bills, chores, and maintenance.",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#ffffff",
    icons: [
      {
        src: "/favicon.ico",
        sizes: "any",
        type: "image/x-icon",
      },
    ],
  };
}
