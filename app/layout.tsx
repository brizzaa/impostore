import type { Metadata } from "next";
import { Patrick_Hand, Caveat_Brush } from "next/font/google";
import "./globals.css";

const patrick = Patrick_Hand({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-hand",
  display: "swap",
});

const caveat = Caveat_Brush({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-brush",
  display: "swap",
});

export const metadata: Metadata = {
  title: "L'Impostore — Trova chi non sa la parola",
  description: "Gioco dell'impostore multiplayer in italiano",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="it" className={`h-full antialiased ${patrick.variable} ${caveat.variable}`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
