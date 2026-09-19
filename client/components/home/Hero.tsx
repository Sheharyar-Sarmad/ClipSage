"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import gsap from "gsap";
import { ArrowRight, Sparkles } from "lucide-react";

export function Hero() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const ctx = gsap.context(() => {
      gsap.from(".hero-item", {
        y: 40,
        opacity: 0,
        duration: 1,
        stagger: 0.1,
        ease: "power3.out",
      });
    }, el);

    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={ref}
      className="mx-auto max-w-6xl px-4 pt-36 pb-16 text-center sm:px-6 sm:pt-44"
    >
      {/* Pill */}
      <div className="hero-item mx-auto mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-orange-300/90 backdrop-blur">
        <span className="h-1.5 w-1.5 rounded-full bg-orange-400 shadow-[0_0_8px_rgba(251,146,60,0.8)]" />
        AI media intelligence
      </div>

      {/* Headline */}
      <h1 className="hero-item text-5xl font-semibold tracking-tight text-balance sm:text-6xl md:text-7xl">
        Turn any media into{" "}
        <span className="bg-gradient-to-r from-orange-400 to-red-500 bg-clip-text text-transparent">
          structured notes.
        </span>
      </h1>

      {/* Subtitle */}
      <p className="hero-item mx-auto mt-6 max-w-2xl text-base leading-relaxed text-white/60 sm:text-lg">
        Paste a YouTube link, upload an audio file, or drop an image. ClipSage
        transcribes, analyzes tone and emotion, extracts action items, and lets
        you ask anything about the media — grounded in the transcript, not the
        internet.
      </p>

      {/* CTAs */}
      <div className="hero-item mt-9 flex flex-wrap items-center justify-center gap-3">
        <Link
          href="#workspace"
          className="group inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 to-red-500 px-5 py-2.5 text-sm font-semibold text-neutral-950 transition hover:brightness-110"
        >
          Try ClipSage
          <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
        </Link>
        <Link
          href="/about"
          className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-5 py-2.5 text-sm text-white/80 backdrop-blur transition hover:border-white/25 hover:text-white"
        >
          <Sparkles className="h-3.5 w-3.5" />
          How it works
        </Link>
      </div>

      {/* Micro trust row */}
      <p className="hero-item mx-auto mt-8 text-xs text-white/35">
        Powered by Groq Whisper · LangChain · FastAPI · Next.js
      </p>
    </section>
  );
}