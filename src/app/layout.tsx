import type { Metadata, Viewport } from "next";
import { Manrope, Outfit } from "next/font/google";
import { RealtimeRefresh } from "@/components/realtime-refresh";
import { BRAND } from "@/lib/brand";
import "./globals.css";

const bodyFont = Manrope({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});

const displayFont = Outfit({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: BRAND.productName,
    template: `%s | ${BRAND.name}`,
  },
  description: BRAND.tagline,
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#000000",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${bodyFont.variable} ${displayFont.variable}`}>
      <body>
        <RealtimeRefresh />
        {children}
      </body>
    </html>
  );
}
