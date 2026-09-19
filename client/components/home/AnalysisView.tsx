"use client";

import { motion } from "framer-motion";
import {
  Quote,
  Sparkles,
  Target,
  Users,
  Activity,
  FileText,
} from "lucide-react";
import type { ProcessResponse } from "@/lib/types";
import { Badge } from "@/components/ui/badge";

export function AnalysisView({ session }: { session: ProcessResponse }) {
  const a = session.analysis;

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className="mt-12 space-y-4"
    >
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <h2 className="truncate text-2xl font-semibold tracking-tight sm:text-3xl">
            {session.title}
          </h2>
          <p className="mt-1 text-xs uppercase tracking-wider text-white/45">
            {session.kind} · {session.source_type}
            {session.duration ? ` · ${Math.round(session.duration)}s` : ""}
            {session.language ? ` · ${session.language}` : ""}
          </p>
        </div>
      </div>

      {/* TL;DR — hero card */}
      <div className="relative overflow-hidden rounded-2xl border border-orange-400/20 bg-orange-500/[0.05] p-5 backdrop-blur">
        <div className="pointer-events-none absolute -top-16 -right-16 h-40 w-40 rounded-full bg-orange-500/20 blur-3xl" />
        <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-orange-300/90">
          <Sparkles className="h-3.5 w-3.5" />
          TL;DR
        </div>
        <p className="relative text-base leading-relaxed text-white/95">
          {a.tldr}
        </p>
      </div>

      {/* Overview + content */}
      <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 backdrop-blur">
        <p className="leading-relaxed text-white/90">{a.overview}</p>
        <p className="mt-3 text-sm leading-relaxed text-white/60">
          {a.content_summary}
        </p>
      </div>

      {/* Key points + action items */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 backdrop-blur">
          <div className="mb-3 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-white/45">
            <Target className="h-3.5 w-3.5" />
            Key points
          </div>
          <ul className="space-y-2 text-sm">
            {a.key_points.map((p, i) => (
              <li key={i} className="flex gap-2.5">
                <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-orange-400" />
                <span className="text-white/85">{p}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 backdrop-blur">
          <div className="mb-3 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-white/45">
            <Activity className="h-3.5 w-3.5" />
            Action items
          </div>
          {a.action_items.length ? (
            <ul className="space-y-2 text-sm">
              {a.action_items.map((p, i) => (
                <li key={i} className="flex gap-2.5">
                  <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-red-400" />
                  <span className="text-white/85">{p}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-white/40">None mentioned</p>
          )}
        </div>
      </div>

      {/* Tone / emotions / topics */}
      <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 backdrop-blur">
        <div className="mb-3 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-white/45">
          <Users className="h-3.5 w-3.5" />
          Signal
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge
            variant="outline"
            className="border-orange-400/30 bg-orange-500/10 text-orange-200"
          >
            Tone · {a.tone}
          </Badge>
          <Badge variant="outline" className="border-white/15">
            Sentiment · {a.sentiment}
          </Badge>
          {a.emotions.map((e, i) => (
            <Badge key={i} variant="secondary" className="bg-white/[0.05]">
              {e}
            </Badge>
          ))}
          {a.topics.map((t, i) => (
            <Badge key={i} variant="secondary" className="bg-white/[0.05]">
              {t}
            </Badge>
          ))}
        </div>
      </div>

      {/* Behaviour notes */}
      {a.behaviour_notes.length > 0 && (
        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 backdrop-blur">
          <div className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-white/45">
            Behaviour
          </div>
          <ul className="space-y-2 text-sm text-white/80">
            {a.behaviour_notes.map((n, i) => (
              <li key={i} className="flex gap-2.5">
                <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-white/40" />
                <span>{n}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Quotes */}
      {a.notable_quotes.length > 0 && (
        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 backdrop-blur">
          <div className="mb-3 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-white/45">
            <Quote className="h-3.5 w-3.5" />
            Notable quotes
          </div>
          <ul className="space-y-3 text-sm italic text-white/70">
            {a.notable_quotes.map((q, i) => (
              <li key={i} className="border-l-2 border-orange-400/40 pl-3">
                {q}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Transcript */}
      {session.transcript && (
        <details className="group rounded-2xl border border-white/10 bg-white/[0.02] p-5 backdrop-blur">
          <summary className="flex cursor-pointer list-none items-center gap-2 text-sm text-white/60 transition hover:text-white">
            <FileText className="h-4 w-4" />
            <span>Show transcript</span>
            <span className="ml-auto text-xs text-white/35">
              {session.transcript.length.toLocaleString()} chars
            </span>
          </summary>
          <pre className="mt-4 max-h-96 overflow-auto whitespace-pre-wrap rounded-lg bg-neutral-950/60 p-4 font-mono text-[13px] leading-relaxed text-white/70">
            {session.transcript}
          </pre>
        </details>
      )}
    </motion.div>
  );
}