"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import {
  Sparkles,
  Workflow,
  Mic,
  Brain,
  Database,
  Server,
  Layers,
  Zap,
  Video,
  FileText,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";
import { GithubIcon, LinkedInIcon } from "@/components/shared/icons";
import { useEffect, useRef } from "react";
import gsap from "gsap";

// ---------------------------------------------------------------------------
// Static content
// ---------------------------------------------------------------------------

const PIPELINE_STEPS = [
  {
    icon: Video,
    title: "Ingest",
    description:
      "Upload a video, audio file, or image directly, or drop in a URL — ClipSage fetches and normalizes the source via yt-dlp and ffmpeg.",
  },
  {
    icon: Mic,
    title: "Transcribe",
    description:
      "Spoken audio is transcribed using Groq-hosted Whisper, with timestamped segments for downstream context.",
  },
  {
    icon: Brain,
    title: "Analyze",
    description:
      "LangChain orchestrates the analysis pipeline to extract tone, sentiment, topics, emotional signals, and behavioural cues.",
  },
  {
    icon: FileText,
    title: "Summarize",
    description:
      "A structured summarization layer turns the transcript into a TL;DR, key points, and a complete narrative overview.",
  },
  {
    icon: Database,
    title: "Sessionize",
    description:
      "Each analysis is assigned a UUID and kept in a lightweight in-memory session store, so the chat endpoint can reuse the same context without re-uploading media.",
  },
  {
    icon: Sparkles,
    title: "Interact",
    description:
      "A grounded Q&A chat lets you ask follow-up questions about your media, with voice input and narrated answers built in.",
  },
];

const TECH_STACK = [
  {
    category: "Backend",
    icon: Server,
    items: [
      "FastAPI",
      "Uvicorn",
      "Pydantic Settings",
      "python-multipart",
      "Python 3.12+",
    ],
  },
  {
    category: "AI / Orchestration",
    icon: Brain,
    items: [
      "LangChain",
      "LangChain Groq",
      "Groq Whisper",
      "LangChain Community",
    ],
  },
  {
    category: "Media Processing",
    icon: Video,
    items: ["ffmpeg", "imageio-ffmpeg", "yt-dlp"],
  },
  {
    category: "Session Layer",
    icon: Database,
    items: [
      "In-memory dict store",
      "UUID-keyed sessions",
      "Thread-safe (RLock)",
    ],
  },
  {
    category: "Frontend",
    icon: Layers,
    items: [
      "Next.js",
      "React",
      "TypeScript",
      "Tailwind CSS",
      "Framer Motion",
    ],
  },
  {
    category: "Intelligence Features",
    icon: Zap,
    items: [
      "Web Speech Synthesis",
      "Web Speech Recognition",
      "Grounded Q&A Chat",
    ],
  },
];

const PRINCIPLES = [
  "Every analysis is grounded in the actual transcript and available media context.",
  "Local files preview instantly in the browser without unnecessary round trips.",
  "The pipeline is modular, keeping ingestion, transcription, analysis, summarization, and sessions separated.",
  "Sessions are intentionally lightweight and ephemeral — restarting the API clears them, keeping the demo stateless.",
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function AboutWrapper() {
  const heroRef = useRef<HTMLElement>(null);
  const heroBadgeRef = useRef<HTMLDivElement>(null);
  const heroTitleRef = useRef<HTMLHeadingElement>(null);
  const heroTextRef = useRef<HTMLParagraphElement>(null);
  const heroActionsRef = useRef<HTMLDivElement>(null);

  // -------------------------------------------------------------------------
  // GSAP hero animation
  // -------------------------------------------------------------------------

  useEffect(() => {
    const ctx = gsap.context(() => {
      const timeline = gsap.timeline({
        defaults: {
          ease: "power3.out",
        },
      });

      timeline
        .fromTo(
          heroBadgeRef.current,
          { opacity: 0, y: 20, scale: 0.96 },
          { opacity: 1, y: 0, scale: 1, duration: 0.7 },
        )
        .fromTo(
          heroTitleRef.current,
          { opacity: 0, y: 35, filter: "blur(8px)" },
          {
            opacity: 1,
            y: 0,
            filter: "blur(0px)",
            duration: 0.9,
          },
          "-=0.4",
        )
        .fromTo(
          heroTextRef.current,
          { opacity: 0, y: 20 },
          { opacity: 1, y: 0, duration: 0.7 },
          "-=0.5",
        )
        .fromTo(
          heroActionsRef.current,
          { opacity: 0, y: 20, scale: 0.97 },
          { opacity: 1, y: 0, scale: 1, duration: 0.6 },
          "-=0.4",
        );
    }, heroRef);

    return () => ctx.revert();
  }, []);

  return (
    <div className="relative min-h-screen overflow-x-hidden text-white">
      <div className="mx-auto max-w-6xl px-4 pb-20 pt-32 sm:px-6 lg:px-8">
        {/* ================================================================ */}
        {/* Hero */}
        {/* ================================================================ */}

        <section ref={heroRef} className="mx-auto max-w-3xl text-center">
          <div
            ref={heroBadgeRef}
            className="mx-auto mb-6 flex w-fit items-center gap-2 rounded-full border border-orange-500/20 bg-orange-500/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-orange-400"
          >
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-orange-500" />
            About ClipSage
          </div>

          <h1
            ref={heroTitleRef}
            className="bg-gradient-to-r from-white via-white to-white/60 bg-clip-text text-4xl font-bold tracking-tight text-transparent sm:text-5xl"
          >
            Media intelligence,
            <br />
            <span className="bg-gradient-to-r from-orange-400 to-red-500 bg-clip-text text-transparent">
              built for clarity.
            </span>
          </h1>

          <p
            ref={heroTextRef}
            className="mx-auto mt-6 max-w-2xl text-base leading-7 text-white/60 sm:text-lg"
          >
            ClipSage takes raw video, audio, or images and turns them into
            structured, queryable knowledge — transcribed, summarized, and
            ready to talk to. No manual note-taking, no re-watching, no
            guesswork.
          </p>

          <div
            ref={heroActionsRef}
            className="mt-8 flex flex-wrap items-center justify-center gap-3"
          >
            <Link
              href="/#workspace"
              className="group flex items-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 to-red-500 px-5 py-3 text-sm font-semibold text-neutral-950 shadow-[0_0_30px_rgba(249,115,22,0.2)] transition hover:brightness-110"
            >
              Try ClipSage

              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>

            <a
              href="https://github.com/Sheharyar-Sarmad/ClipSage"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold text-white/80 transition hover:bg-white/10"
            >
              <GithubIcon size={16} />
              View Source
            </a>
          </div>
        </section>

        {/* ================================================================ */}
        {/* Pipeline */}
        {/* ================================================================ */}

        <motion.section
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="mt-32"
        >
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="mb-10 flex items-center gap-2"
          >
            <Workflow className="h-5 w-5 text-orange-400" />

            <h2 className="text-xs font-bold uppercase tracking-widest text-white/50">
              How the pipeline works
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {PIPELINE_STEPS.map((step, index) => {
              const Icon = step.icon;

              return (
                <motion.div
                  key={step.title}
                  initial={{ opacity: 0, y: 35, scale: 0.97 }}
                  whileInView={{ opacity: 1, y: 0, scale: 1 }}
                  viewport={{ once: true, margin: "-60px" }}
                  transition={{
                    duration: 0.55,
                    delay: index * 0.08,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                  whileHover={{ y: -6, transition: { duration: 0.2 } }}
                  className="group relative overflow-hidden rounded-2xl border border-white/10 bg-neutral-900/40 p-5 backdrop-blur-xl transition-colors duration-300 hover:border-orange-500/30 hover:bg-orange-500/[0.04]"
                >
                  <div className="absolute right-4 top-4 text-4xl font-bold text-white/[0.04] transition-all duration-300 group-hover:text-orange-500/[0.08]">
                    {String(index + 1).padStart(2, "0")}
                  </div>

                  <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl border border-orange-500/20 bg-orange-500/10 text-orange-400 transition-transform duration-300 group-hover:scale-110">
                    <Icon className="h-5 w-5" />
                  </div>

                  <h3 className="mb-2 text-sm font-semibold text-white/90">
                    {step.title}
                  </h3>

                  <p className="text-sm leading-6 text-white/55">
                    {step.description}
                  </p>
                </motion.div>
              );
            })}
          </div>
        </motion.section>

        {/* ================================================================ */}
        {/* Tech Stack */}
        {/* ================================================================ */}

        <motion.section
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="mt-32"
        >
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="mb-10 flex items-center gap-2"
          >
            <Layers className="h-5 w-5 text-orange-400" />

            <h2 className="text-xs font-bold uppercase tracking-widest text-white/50">
              Under the hood
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {TECH_STACK.map((group, index) => {
              const Icon = group.icon;

              return (
                <motion.div
                  key={group.category}
                  initial={{ opacity: 0, y: 35, scale: 0.97 }}
                  whileInView={{ opacity: 1, y: 0, scale: 1 }}
                  viewport={{ once: true, margin: "-60px" }}
                  transition={{
                    duration: 0.55,
                    delay: index * 0.07,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                  whileHover={{ y: -5, transition: { duration: 0.2 } }}
                  className="group rounded-2xl border border-white/10 bg-neutral-900/40 p-5 backdrop-blur-xl transition-colors duration-300 hover:border-orange-500/20 hover:bg-orange-500/[0.03]"
                >
                  <div className="mb-4 flex items-center gap-2.5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/5 text-orange-400 transition-transform duration-300 group-hover:rotate-3 group-hover:scale-110">
                      <Icon className="h-4 w-4" />
                    </div>

                    <h3 className="text-sm font-semibold text-white/85">
                      {group.category}
                    </h3>
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {group.items.map((item, itemIndex) => (
                      <motion.span
                        key={item}
                        initial={{ opacity: 0, scale: 0.9 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        viewport={{ once: true }}
                        transition={{
                          duration: 0.25,
                          delay: index * 0.07 + itemIndex * 0.035,
                        }}
                        className="rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1 text-[11px] font-medium text-white/60 transition-colors duration-200 hover:border-orange-500/20 hover:text-orange-300"
                      >
                        {item}
                      </motion.span>
                    ))}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </motion.section>

        {/* ================================================================ */}
        {/* Principles */}
        {/* ================================================================ */}

        <motion.section
          initial={{ opacity: 0, y: 50, scale: 0.98 }}
          whileInView={{ opacity: 1, y: 0, scale: 1 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="mt-32 rounded-3xl border border-orange-500/20 bg-orange-500/5 p-8 shadow-[0_0_40px_rgba(249,115,22,0.05)] sm:p-10"
        >
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="mb-8 flex items-center gap-2"
          >
            <Sparkles className="h-5 w-5 text-orange-400" />

            <h2 className="text-xs font-bold uppercase tracking-widest text-orange-400">
              Design principles
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {PRINCIPLES.map((principle, index) => (
              <motion.div
                key={principle}
                initial={{ opacity: 0, x: index % 2 === 0 ? -20 : 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.08 }}
                className="flex items-start gap-3"
              >
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-orange-400" />

                <p className="text-sm leading-6 text-white/75">
                  {principle}
                </p>
              </motion.div>
            ))}
          </div>
        </motion.section>

        {/* ================================================================ */}
        {/* Closing CTA */}
        {/* ================================================================ */}

        <motion.section
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="mt-32 flex flex-col items-center gap-6 border-t border-white/5 pt-16 text-center"
        >
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-2xl font-bold text-white/90 sm:text-3xl"
          >
            Built to make media{" "}
            <span className="text-orange-400">understandable.</span>
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="max-w-xl text-sm leading-6 text-white/50"
          >
            Whether it's a meeting recording, a fan-made edit, or a stack of
            interview clips — ClipSage gives you the structure to actually use
            what's inside them.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 15, scale: 0.96 }}
            whileInView={{ opacity: 1, y: 0, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="flex items-center gap-3"
          >
            <Link
              href="/#workspace"
              className="group flex items-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 to-red-500 px-5 py-3 text-sm font-semibold text-neutral-950 transition hover:brightness-110"
            >
              Get Started

              <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
            </Link>

            <a
              href="https://www.linkedin.com/in/sheharyar-sarmad-9b7736289/"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="LinkedIn"
              className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white/60 transition hover:bg-white/10 hover:text-orange-400"
            >
              <LinkedInIcon size={16} />
            </a>

            <a
              href="https://github.com/Sheharyar-Sarmad"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="GitHub"
              className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white/60 transition hover:bg-white/10 hover:text-orange-400"
            >
              <GithubIcon size={16} />
            </a>
          </motion.div>
        </motion.section>
      </div>
    </div>
  );
}