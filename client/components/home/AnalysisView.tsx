"use client";

import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import {
  Sparkles,
  Target,
  Users,
  FileText,
  Volume2,
  Download,
  Play,
  Pause,
  Video,
  Image as ImageIcon,
  Headphones,
  Gauge,
  Music2,
  Sliders,
} from "lucide-react";

import type { ProcessResponse } from "@/lib/types";
import { Badge } from "@/components/ui/badge";

const AVAILABLE_VOICES = [
  { id: "voice-1", name: "Premium Narrator (Male)", lang: "en-US" },
  { id: "voice-2", name: "Tech Advisor (Female)", lang: "en-GB" },
  { id: "voice-3", name: "AI Studio Core (Synthetic)", lang: "en-AU" },
];

// Best-effort extraction of a remote/backend-provided media URL, used only
// as a fallback when no local file object URL is available (e.g. the
// session was restored without the original File in memory).
function resolveRemoteMediaUrl(session: ProcessResponse): string | undefined {
  const s = session as any;
  return (
    s.video_info?.url ||
    s.video_info?.file_url ||
    s.video_info?.src ||
    s.audio_info?.url ||
    s.audio_info?.file_url ||
    s.source_url ||
    s.file_url ||
    s.media_url ||
    s.url
  );
}

export function AnalysisView({
  session,
  localFileUrl,
  localFileName,
}: {
  session: ProcessResponse;
  localFileUrl?: string | null;
  localFileName?: string;
}) {
  const a = session.analysis;

  const [selectedVoice, setSelectedVoice] = useState(AVAILABLE_VOICES[0].id);
  const [isPlayingVoice, setIsPlayingVoice] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  // Voice power controls
  const [rate, setRate] = useState(1);
  const [pitch, setPitch] = useState(1);
  const [volume, setVolume] = useState(1);

  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Prefer the locally selected file (instant preview) over any remote URL.
  const mediaSrc = localFileUrl || resolveRemoteMediaUrl(session);
const imageInfo = (session as any).image_info;

const imageSrc =
  localFileUrl ||
  imageInfo?.url ||
  imageInfo?.file_url ||
  imageInfo?.src ||
  imageInfo?.transcript ||
  "/clipsage-dashboard-mockup.jpg";

  useEffect(() => {
    // Stop any playback if the underlying media changes.
    return () => {
      window.speechSynthesis.cancel();
    };
  }, [mediaSrc]);

  // ---------------------------------------------------------------------------
  // Download Markdown Summary
  // ---------------------------------------------------------------------------

  const handleDownloadSummaryFile = () => {
    try {
      const markdownReport = `
# ClipSage Intelligence Analysis Document

**File Name Target:** ${session.title}
**Media Classification Category:** ${session.kind}
**Processing Timeline Data:** ${new Date().toLocaleDateString()}

---

## 1. TL;DR Summary Block

${a.tldr}

## 2. Exhaustive Workspace Overview Analysis

${a.overview}

## 3. Structural Content Summary Paragraph

${a.content_summary}

## 4. Key Point Indicators Mapped

${a.key_points.map((point) => `* ${point}`).join("\n")}

## 5. Architectural Signal Attributes Metadata

* **Primary Vibe/Tone:** ${a.tone}
* **Algorithmic Sentiment Evaluation:** ${a.sentiment}
* **Thematic Topic Tags Applied:** ${a.topics.join(", ")}
* **Contextual Emotional Signatures:** ${a.emotions.join(", ")}

${
  a.behaviour_notes?.length
    ? `## 6. Non-Verbal / Behavioural Notes

${a.behaviour_notes.map((note) => `* ${note}`).join("\n")}

`
    : ""
}---

*Report exported via ClipSage AI full-stack media parsing engine.*
      `.trim();

      const textBlob = new Blob([markdownReport], { type: "text/markdown" });
      const objectUrl = URL.createObjectURL(textBlob);
      const downloadLink = document.createElement("a");

      downloadLink.href = objectUrl;
      downloadLink.download = `${session.title.replace(/\s+/g, "_")}_AI_Summary.md`;

      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);

      URL.revokeObjectURL(objectUrl);
    } catch (error) {
      console.error("Markdown file downloader routine interrupted:", error);
    }
  };

  // ---------------------------------------------------------------------------
  // Browser Text-to-Speech (with voice power controls)
  // ---------------------------------------------------------------------------

  const buildUtterance = () => {
    const compiledVoicePayloadText = `${a.tldr}. Here is the complete overview analysis summary: ${a.overview}`;
    const utterance = new SpeechSynthesisUtterance(compiledVoicePayloadText);

    const browserVoices = window.speechSynthesis.getVoices();
    const selectedVoiceConfig = AVAILABLE_VOICES.find((v) => v.id === selectedVoice);
    const matchedVoice = browserVoices.find((v) => v.lang === selectedVoiceConfig?.lang);

    if (matchedVoice) utterance.voice = matchedVoice;

    utterance.rate = rate;
    utterance.pitch = pitch;
    utterance.volume = volume;

    utterance.onend = () => {
      setIsPlayingVoice(false);
      setIsPaused(false);
    };
    utterance.onerror = () => {
      setIsPlayingVoice(false);
      setIsPaused(false);
    };

    return utterance;
  };

  const handleNarratorSpeechPlayback = () => {
    if (isPlayingVoice && !isPaused) {
      // Pause
      window.speechSynthesis.pause();
      setIsPaused(true);
      return;
    }

    if (isPlayingVoice && isPaused) {
      // Resume
      window.speechSynthesis.resume();
      setIsPaused(false);
      return;
    }

    // Fresh start
    window.speechSynthesis.cancel();
    const utterance = buildUtterance();
    utteranceRef.current = utterance;
    setIsPlayingVoice(true);
    setIsPaused(false);
    window.speechSynthesis.speak(utterance);
  };

  const handleStopSpeech = () => {
    window.speechSynthesis.cancel();
    setIsPlayingVoice(false);
    setIsPaused(false);
  };

  // Live-update rate/pitch/volume mid-utterance isn't supported by the Web
  // Speech API, so changing a slider while speaking restarts playback with
  // the new settings for a responsive feel.
  const restartIfPlaying = () => {
    if (isPlayingVoice) {
      window.speechSynthesis.cancel();
      const utterance = buildUtterance();
      utteranceRef.current = utterance;
      setIsPaused(false);
      window.speechSynthesis.speak(utterance);
    }
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className="w-[100vw] min-h-screen px-4 py-6 space-y-6 bg-neutral-950/20 text-white sm:px-8 lg:px-12"
    >
      {/* Header / Toolbar */}
      <div className="flex flex-col gap-4 border-b border-white/5 pb-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h2 className="truncate bg-gradient-to-r from-white via-white to-white/70 bg-clip-text text-2xl font-bold tracking-tight text-transparent sm:text-3xl">
            {session.title}
          </h2>

          <p className="mt-1 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-orange-400/80">
            <span className="h-1.5 w-1.5 rounded-full bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.8)]" />
            {session.kind} Node · {session.source_type} Pipeline
            {session.duration ? ` · ${Math.round(session.duration)}s Length` : ""}
            {session.language ? ` · ${session.language.toUpperCase()}` : ""}
          </p>

          {localFileName && (
            <p className="mt-1 truncate text-[11px] text-white/35">
              Local source: <span className="text-white/55">{localFileName}</span>
            </p>
          )}
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleDownloadSummaryFile}
            className="flex h-10 items-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 to-red-500 px-4 text-xs font-semibold text-neutral-950 shadow-[0_0_20px_rgba(249,115,22,0.15)] transition hover:brightness-110"
          >
            <Download className="h-4 w-4 stroke-[2.5]" />
            Download Summary (.MD)
          </button>
        </div>
      </div>

      {/* Main Two-Column Layout */}
      <div className="grid w-full grid-cols-1 items-start gap-8 lg:grid-cols-12">
        {/* Left Sidebar */}
        <div className="space-y-4 lg:sticky lg:top-6 lg:col-span-4">
          {/* Media Player */}
          <div className="space-y-3 rounded-2xl border border-white/10 bg-neutral-900/40 p-4 backdrop-blur-xl">
            <div className="flex items-center justify-between gap-2 text-[10px] font-bold uppercase tracking-widest text-white/40">
              <div className="flex items-center gap-2">
                {session.kind === "video" && <Video className="h-3.5 w-3.5 text-orange-400" />}
                {session.kind === "image" && <ImageIcon className="h-3.5 w-3.5 text-orange-400" />}
                {session.kind === "audio" && <Headphones className="h-3.5 w-3.5 text-orange-400" />}
                Active Media Presentation Source File Player
              </div>

              
            </div>

            <div className="relative flex min-h-[220px] w-full flex-col items-center justify-center overflow-hidden rounded-xl border border-white/5 bg-neutral-950 shadow-inner">
              {/* Video */}
              {session.kind === "video" &&
                (mediaSrc ? (
                  <video
                    key={mediaSrc}
                    src={mediaSrc}
                    controls
                    preload="metadata"
                    className="h-auto max-h-[360px] w-full rounded-lg object-contain"
                  >
                    Your browser does not support the HTML5 video player.
                  </video>
                ) : (
                  <div className="p-8 text-center text-xs text-white/35">
                    No playable video source. Re-select the file from your
                    device to preview it, or ensure the backend returns a
                    media URL.
                  </div>
                ))}

              {/* Image */}
              {session.kind === "image" && (
                <div className="flex w-full justify-center p-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={imageSrc}
                    alt="Uploaded source"
                    className="h-auto max-h-[320px] w-full rounded-lg border border-white/5 object-cover opacity-90 transition duration-300 hover:opacity-100"
                    onError={(event) => {
                      event.currentTarget.src = "/clipsage-dashboard-mockup.jpg";
                    }}
                  />
                </div>
              )}

              {/* Audio */}
              {session.kind === "audio" && (
                <div className="w-full space-y-4 p-6 text-center">
                  <div className="mx-auto flex h-12 w-12 animate-pulse items-center justify-center rounded-full border border-orange-500/20 bg-orange-500/10">
                    <Headphones className="h-5 w-5 text-orange-400" />
                  </div>

                  {mediaSrc ? (
                    <audio key={mediaSrc} src={mediaSrc} controls className="h-10 w-full px-2 accent-orange-500" />
                  ) : (
                    <p className="text-xs text-white/35">
                      No playable audio source. Re-select the file from your
                      device to preview it.
                    </p>
                  )}
                </div>
              )}

              {/* Unknown */}
              {session.kind === "unknown" && (
                <div className="p-8 text-center text-xs text-white/35">
                  Multi-modal format rendering bypassed for unsupported media packages.
                </div>
              )}
            </div>
          </div>

          {/* AI Voice Narration + Voice Power Controls */}
          <div className="space-y-4 rounded-2xl border border-white/10 bg-neutral-900/40 p-4 shadow-md backdrop-blur-xl">
            <div className="flex items-center gap-2">
              <Volume2 className="h-4 w-4 text-orange-400" />
              <p className="text-[10px] font-bold uppercase tracking-widest text-white/40">
                AI Voice Narration Synthesis Center
              </p>
            </div>

            <div className="flex flex-col gap-2.5">
              <select
                value={selectedVoice}
                onChange={(event) => {
                  window.speechSynthesis.cancel();
                  setIsPlayingVoice(false);
                  setIsPaused(false);
                  setSelectedVoice(event.target.value);
                }}
                className="h-9 w-full cursor-pointer rounded-lg border border-white/10 bg-neutral-950 px-3 text-xs font-medium text-white/80 transition focus:border-orange-500/50 focus:outline-none"
              >
                {AVAILABLE_VOICES.map((voice) => (
                  <option key={voice.id} value={voice.id}>
                    {voice.name}
                  </option>
                ))}
              </select>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleNarratorSpeechPlayback}
                  className="flex h-9 flex-1 items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 text-xs font-semibold transition hover:bg-white/10"
                >
                  {isPlayingVoice && !isPaused ? (
                    <Pause className="h-3.5 w-3.5 fill-current text-white" />
                  ) : (
                    <Play
                      className={`h-3.5 w-3.5 fill-current text-white transition-transform duration-300 ${
                        isPlayingVoice ? "scale-90 opacity-70" : ""
                      }`}
                    />
                  )}
                  {isPlayingVoice && !isPaused
                    ? "Pause"
                    : isPlayingVoice && isPaused
                      ? "Resume"
                      : "Synthesize Summary Audio"}
                </button>

                {isPlayingVoice && (
                  <button
                    type="button"
                    onClick={handleStopSpeech}
                    className="flex h-9 items-center justify-center rounded-lg border border-white/10 bg-white/5 px-3 text-xs font-semibold text-white/60 transition hover:bg-white/10 hover:text-red-400"
                  >
                    Stop
                  </button>
                )}
              </div>
            </div>

            {/* Voice Power Controls */}
            <div className="space-y-3 border-t border-white/5 pt-3">
              <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-white/35">
                <Sliders className="h-3.5 w-3.5 text-orange-400" />
                Voice Power
              </div>

              {/* Rate */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[11px] text-white/50">
                  <span className="flex items-center gap-1.5">
                    <Gauge className="h-3 w-3" /> Speed
                  </span>
                  <span className="text-white/70">{rate.toFixed(1)}x</span>
                </div>
                <input
                  type="range"
                  min={0.5}
                  max={2}
                  step={0.1}
                  value={rate}
                  onChange={(e) => {
                    setRate(parseFloat(e.target.value));
                  }}
                  onMouseUp={restartIfPlaying}
                  onTouchEnd={restartIfPlaying}
                  className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-white/10 accent-orange-500"
                />
              </div>

              {/* Pitch */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[11px] text-white/50">
                  <span className="flex items-center gap-1.5">
                    <Music2 className="h-3 w-3" /> Pitch
                  </span>
                  <span className="text-white/70">{pitch.toFixed(1)}</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={2}
                  step={0.1}
                  value={pitch}
                  onChange={(e) => {
                    setPitch(parseFloat(e.target.value));
                  }}
                  onMouseUp={restartIfPlaying}
                  onTouchEnd={restartIfPlaying}
                  className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-white/10 accent-orange-500"
                />
              </div>

              {/* Volume */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[11px] text-white/50">
                  <span className="flex items-center gap-1.5">
                    <Volume2 className="h-3 w-3" /> Volume
                  </span>
                  <span className="text-white/70">{Math.round(volume * 100)}%</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={volume}
                  onChange={(e) => {
                    setVolume(parseFloat(e.target.value));
                  }}
                  onMouseUp={restartIfPlaying}
                  onTouchEnd={restartIfPlaying}
                  className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-white/10 accent-orange-500"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right Dashboard Body */}
        <div className="space-y-5 lg:col-span-8">
          {/* TL;DR */}
          <div className="rounded-2xl border border-orange-500/20 bg-orange-500/5 p-5 shadow-[0_0_30px_rgba(249,115,22,0.05)]">
            <div className="mb-3 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-orange-400" />
              <h3 className="text-xs font-bold uppercase tracking-widest text-orange-400">Executive TL;DR</h3>
            </div>
            <p className="text-sm leading-7 text-white/80">{a.tldr}</p>
          </div>

          {/* Overview */}
          <div className="rounded-2xl border border-white/10 bg-neutral-900/40 p-5 backdrop-blur-xl">
            <div className="mb-3 flex items-center gap-2">
              <FileText className="h-4 w-4 text-orange-400" />
              <h3 className="text-xs font-bold uppercase tracking-widest text-white/50">
                Thematic Workspace Overview Analysis
              </h3>
            </div>
            <p className="text-sm leading-7 text-white/75">{a.overview}</p>
            <div className="mt-4 border-t border-white/5 pt-4">
              <p className="text-sm leading-7 text-white/70">{a.content_summary}</p>
            </div>
          </div>

          {/* Key Points */}
          <div className="rounded-2xl border border-white/10 bg-neutral-900/40 p-5 backdrop-blur-xl">
            <div className="mb-4 flex items-center gap-2">
              <Target className="h-4 w-4 text-orange-400" />
              <h3 className="text-xs font-bold uppercase tracking-widest text-white/50">
                Primary Extract Insights Key Points
              </h3>
            </div>
            <div className="space-y-3">
              {a.key_points.map((pointText, index) => (
                <div key={`${index}-${pointText}`} className="flex items-start gap-3">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-orange-500" />
                  <p className="text-sm leading-6 text-white/75">{pointText}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Metadata */}
          <div className="rounded-2xl border border-white/10 bg-neutral-900/40 p-5 backdrop-blur-xl">
            <div className="mb-4 flex items-center gap-2">
              <Users className="h-4 w-4 text-orange-400" />
              <h3 className="text-xs font-bold uppercase tracking-widest text-white/50">
                Structural Metadata Signal Tag Matrices
              </h3>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge className="border border-white/10 bg-white/5 text-white/70">Tone · {a.tone}</Badge>
              <Badge className="border border-white/10 bg-white/5 text-white/70">
                Sentiment · {a.sentiment}
              </Badge>
              {a.emotions?.map((emotion, index) => (
                <Badge
                  key={`emotion-${index}-${emotion}`}
                  className="border border-orange-500/20 bg-orange-500/10 text-orange-300"
                >
                  {emotion}
                </Badge>
              ))}
              {a.topics?.map((topic, index) => (
                <Badge key={`topic-${index}-${topic}`} className="border border-white/10 bg-white/5 text-white/60">
                  #{topic.toLowerCase().replace(/\s+/g, "")}
                </Badge>
              ))}
            </div>
          </div>

          {/* Behaviour Notes */}
          {a.behaviour_notes && a.behaviour_notes.length > 0 && (
            <div className="rounded-2xl border border-white/10 bg-neutral-900/40 p-5 backdrop-blur-xl">
              <div className="mb-4 flex items-center gap-2">
                <Volume2 className="h-4 w-4 text-orange-400" />
                <h3 className="text-xs font-bold uppercase tracking-widest text-white/50">
                  Non-Verbal Cues / Rhythmic Behaviour Notes
                </h3>
              </div>
              <div className="space-y-3">
                {a.behaviour_notes.map((note, index) => (
                  <div key={`${index}-${note}`} className="flex items-start gap-3">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-orange-500" />
                    <p className="text-sm leading-6 text-white/70">{note}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Transcript */}
          {session.transcript && (
            <details className="overflow-hidden rounded-2xl border border-white/10 bg-neutral-900/40 backdrop-blur-xl">
              <summary className="flex cursor-pointer list-none items-center justify-between p-5 transition hover:bg-white/[0.02]">
                <div className="flex items-center gap-3">
                  <FileText className="h-4 w-4 text-orange-400" />
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-widest text-white/60">
                      Expand Full Text Transcript Logs
                    </h3>
                    <p className="mt-1 text-xs text-white/35">
                      {session.transcript.length.toLocaleString()} characters
                    </p>
                  </div>
                </div>
                <span className="text-xs text-white/30">Expand</span>
              </summary>
              <div className="border-t border-white/5 p-5">
                <pre className="whitespace-pre-wrap break-words font-sans text-xs leading-6 text-white/60">
                  {session.transcript}
                </pre>
              </div>
            </details>
          )}
        </div>
      </div>
    </motion.div>
  );
}