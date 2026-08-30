import type { Metadata, Viewport } from "next";
import { Manrope, Space_Grotesk } from "next/font/google";
import "./globals.css";

const bodyFont = Manrope({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});

const displayFont = Space_Grotesk({
  weight: "700",
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Draki — 8x Hackathons",
    template: "%s | Draki by 8x",
  },
  description: "The 8x command center for running hackathons end to end.",
  icons: { icon: "/brand/8x-icon.svg" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0a0a0b",
  colorScheme: "dark",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`antialiased ${bodyFont.variable} ${displayFont.variable}`}
    >
      <body>{children}</body>
    </html>
  );
}
