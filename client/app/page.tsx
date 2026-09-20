import type { Metadata } from "next";

import { Hero } from "@/components/home/Hero";
import { Workspace } from "@/components/home/Workspace";
import { Features } from "@/components/home/Features";
import { Showcase } from "@/components/home/Showcase";
import { SectionDivider } from "@/components/home/SectionDivider";

export const metadata: Metadata = {
  title: "ClipSage — AI Media Intelligence",
  description:
    "Turn audio, video, and images into structured notes with AI-powered transcription, analysis, summarization, and conversational Q&A.",

  openGraph: {
    title: "ClipSage — AI Media Intelligence",
    description:
      "Turn audio, video, and images into structured notes with AI-powered media intelligence.",
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

export default function Home() {
  return (
    <div className="relative">
      <Hero />
      <Workspace />

      <SectionDivider label="What ClipSage does" />

      <Features />
      <Showcase />
    </div>
  );
}