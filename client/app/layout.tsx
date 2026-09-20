import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

import "./globals.css";
import { Navbar } from "@/components/shared/Navbar";
import { Footer } from "@/components/shared/Footer";
import { SmoothScroll } from "@/components/shared/SmoothScroll";
import { ThreeBackground } from "@/components/shared/ThreeBackground";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ClipSage — AI Media Intelligence",
  description:
    "Turn audio, video, and images into structured notes: transcripts, summaries, key points, action items, tone, emotions, and follow-up Q&A.",
  authors: [{ name: "Sheharyar Sarmad" }],

  icons: {
    icon: "/clipsage-meta-logo.png",
    apple: "/clipsage-meta-logo.png",
  },

  openGraph: {
    title: "ClipSage — AI Media Intelligence",
    description:
      "Turn audio, video, and images into structured notes with AI-powered transcription, analysis, summarization, and conversational Q&A.",
    type: "website",
    siteName: "ClipSage",
    images: [
      {
        url: "/clipsage-meta-home-banner.png",
        width: 1200,
        height: 630,
        alt: "ClipSage — AI Media Intelligence",
      },
    ],
  },

  twitter: {
    card: "summary_large_image",
    title: "ClipSage — AI Media Intelligence",
    description:
      "Turn audio, video, and images into structured notes with AI-powered media intelligence.",
    images: ["/clipsage-meta-home-banner.png"],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${jetbrainsMono.variable} dark h-full antialiased`}
    >
      <body className="min-h-screen flex flex-col bg-neutral-950 text-white selection:bg-orange-500/30">
        {/* Fixed background layer — solid black + orange glow + particles */}
        <div className="fixed inset-0 -z-10 pointer-events-none overflow-hidden">
          {/* Base: pure dark */}
          <div className="absolute inset-0 bg-neutral-950" />

          {/* Soft orange radial glow */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(251,146,60,0.18),transparent_65%)]" />

          {/* Particle field on top */}
          <ThreeBackground />
        </div>

        <SmoothScroll>
          <Navbar />
          <main className="relative flex-1">{children}</main>
          <Footer />
        </SmoothScroll>

        <ToastContainer
          position="bottom-right"
          theme="dark"
          toastClassName="!bg-neutral-900 !border !border-white/10 !text-white !rounded-xl"
          autoClose={4000}
          hideProgressBar
        />
      </body>
    </html>
  );
}