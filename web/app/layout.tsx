import "./globals.css";

import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { connection } from "next/server";

import { Providers } from "@/components/providers";
import { PageTransition } from "@/components/shell/page-transition";
import { TopBar } from "@/components/shell/top-bar";

const sans = localFont({
  src: "./fonts/Inter-Variable.woff2",
  variable: "--font-sans",
  display: "swap",
  weight: "100 900",
});

const mono = localFont({
  src: "./fonts/JetBrainsMono-Variable.woff2",
  variable: "--font-mono",
  display: "swap",
  weight: "100 800",
  preload: false,
});

export const metadata: Metadata = {
  title: { default: "Alkira | Brief Generator", template: "Alkira | %s" },
  description: "Research any company and score your account list for Alkira fit.",
};

export const viewport: Viewport = {
  themeColor: "#F5F5F3",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Every page carries a per-request script nonce (see proxy.ts), so nothing can be prerendered.
  await connection();

  return (
    <html lang="en" className={`${sans.variable} ${mono.variable}`}>
      <body>
        <Providers>
          <TopBar />
          <main id="main">
            <PageTransition>{children}</PageTransition>
          </main>
        </Providers>
      </body>
    </html>
  );
}
