import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { AppShell } from "@/components/shell/app-shell";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "HomeBase",
  description: "A household operating system for utilities, bills, chores, and maintenance.",
  // Emits mobile-web-app-capable, which (alongside the manifest's
  // display: standalone) is what makes an iOS Home Screen icon open as a
  // standalone web app instead of a plain Safari tab.
  appleWebApp: {
    capable: true,
    title: "HomeBase",
  },
};

// viewportFit: "cover" is what makes env(safe-area-inset-*) resolve to real
// pixel values instead of 0 on notched/home-indicator devices — without it,
// the browser reserves a plain rectangle and the page just never learns
// where the unsafe edges are. This is the actual root cause of the mobile
// nav/FAB sitting under the iOS home indicator, not something fixable with
// padding alone. See the safe-area note in AppShell/MobileNav.
export const viewport: Viewport = {
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
