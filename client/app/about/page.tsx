import type { Metadata } from "next";
import { AboutWrapper } from "@/components/about/AboutWrapper";

export const metadata: Metadata = {
  title: "About ClipSage — Media Intelligence, Built for Clarity",
  description:
    "Learn how ClipSage transforms video, audio, images, and links into transcripts, summaries, insights, persistent knowledge, and conversational Q&A.",

  openGraph: {
    title: "About ClipSage — Media Intelligence, Built for Clarity",
    description:
      "Explore the AI architecture behind ClipSage, from media ingestion and transcription to analysis, summarization, persistent knowledge, and conversational Q&A.",
    type: "website",
    siteName: "ClipSage",
    images: [
      {
        url: "/clipsage-meta-about-banner.png",
        width: 1200,
        height: 630,
        alt: "About ClipSage — Media Intelligence, Built for Clarity",
      },
    ],
  },

  twitter: {
    card: "summary_large_image",
    title: "About ClipSage — Media Intelligence, Built for Clarity",
    description:
      "Explore the AI architecture behind ClipSage.",
    images: ["/clipsage-meta-about-banner.png"],
  },
};

export default function AboutPage() {
  return <AboutWrapper />;
}