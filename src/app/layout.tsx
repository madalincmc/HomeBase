import type { Metadata, Viewport } from "next";
import { Geist_Mono, Manrope, Work_Sans } from "next/font/google";
import { AppShell } from "@/components/shell/app-shell";
import "./globals.css";

// Serene Home's dual-font strategy (see the palette comment in globals.css):
// Manrope carries headings — it is wired to --font-heading, which CardTitle
// and DialogTitle already read — and Work Sans carries body copy and the
// dense numeric UI (meter readings, bill amounts, inventory rows) it was
// picked for. Both are variable fonts, so no explicit weight list is needed.
// Geist Mono stays: it is only used for the error digest and chart tooltip
// figures, and Serene Home names no monospace face to replace it with.
const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
});

const workSans = Work_Sans({
  variable: "--font-work-sans",
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
      className={`${workSans.variable} ${manrope.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
