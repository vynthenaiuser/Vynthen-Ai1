import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Vynthen AI — Controlled Intelligence",
  description: "Vynthen AI. Precise. Controlled. Intelligent. Minimal. Calm. Confident.",
  keywords: ["Vynthen", "AI", "Chat", "Intelligence", "Minimal"],
  authors: [{ name: "Vynthen" }],
  icons: {
    icon: "/upload/Vynthen.jpg",
  },
  openGraph: {
    title: "Vynthen AI",
    description: "Controlled Intelligence",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
