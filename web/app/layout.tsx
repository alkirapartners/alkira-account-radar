import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Alkira | Account Radar",
  description: "Score up to 40 accounts at a time for Alkira fit",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
