import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Navbar from "@/components/navbar";
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
  title: "FinVIDIA",
  description: "Comprehensive multi-creator movie reaction hub and master film directory.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-[#09090b] text-zinc-100 min-h-screen flex flex-col justify-between`}
      >
        <Navbar />
        <main className="flex-1">{children}</main>
        <footer className="border-t border-zinc-800/80 py-6 text-center text-xs text-zinc-500 bg-zinc-950">
          <p>© 2026 FinVIDIA. All rights reserved.</p>
        </footer>
      </body>
    </html>
  );
}