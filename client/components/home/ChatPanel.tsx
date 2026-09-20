"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Loader2,
  Send,
  MessageSquare,
  X,
  Download,
  Sparkles,
  Volume2,
  Pause,
  Square,
  Mic,
  MicOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { askQuestion } from "@/lib/api";
import type { ChatTurn } from "@/lib/types";

type PlaybackState = "idle" | "playing" | "paused";

// Strips markdown-style formatting and stray special characters so answers
// render and are spoken as clean plain text.
function sanitizeText(raw: string): string {
  return raw
    .replace(/\*\*(.*?)\*\*/g, "$1") // **bold**
    .replace(/\*(.*?)\*/g, "$1") // *italic*
    .replace(/__(.*?)__/g, "$1") // __bold__
    .replace(/_(.*?)_/g, "$1") // _italic_
    .replace(/`{1,3}([^`]*)`{1,3}/g, "$1") // `code` / ```code```
    .replace(/#{1,6}\s?/g, "") // # headings
    .replace(/^\s*[-•]\s+/gm, "") // leading bullet markers
    .replace(/\[(.*?)\]\((.*?)\)/g, "$1") // [text](links)
    .replace(/[~^]/g, "")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

// Minimal typing for the non-standard SpeechRecognition API.
interface SpeechRecognitionResultLike {
  transcript: string;
}
interface SpeechRecognitionEventLike extends Event {
  results: { [index: number]: { [index: number]: SpeechRecognitionResultLike; isFinal?: boolean }; length: number };
}

export function ChatPanel({ sessionId }: { sessionId: string }) {
  const [open, setOpen] = useState(false);
  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);

  const [speakingIndex, setSpeakingIndex] = useState<number | null>(null);
  const [playbackState, setPlaybackState] = useState<PlaybackState>("idle");
  const [voicesReady, setVoicesReady] = useState(false);

  const [isListening, setIsListening] = useState(false);
  const [micSupported, setMicSupported] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const recognitionRef = useRef<any>(null);

  // ---------------------------------------------------------------------------
  // Speech synthesis setup / teardown
  // ---------------------------------------------------------------------------

  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;

    const loadVoices = () => {
      if (window.speechSynthesis.getVoices().length > 0) setVoicesReady(true);
    };

    loadVoices();
    window.speechSynthesis.addEventListener("voiceschanged", loadVoices);
    return () => window.speechSynthesis.removeEventListener("voiceschanged", loadVoices);
  }, []);

  const stopSpeaking = useCallback(() => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    setSpeakingIndex(null);
    setPlaybackState("idle");
    utteranceRef.current = null;
  }, []);

  useEffect(() => {
    if (!open) stopSpeaking();
  }, [open, stopSpeaking]);

  useEffect(() => {
    return () => {
      stopSpeaking();
      recognitionRef.current?.stop?.();
    };
  }, [stopSpeaking]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [turns.length, loading]);

  // ---------------------------------------------------------------------------
  // Speech-to-text (mic) setup
  // ---------------------------------------------------------------------------

  useEffect(() => {
    if (typeof window === "undefined") return;
    const SpeechRecognitionCtor =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognitionCtor) {
      setMicSupported(false);
      return;
    }

    setMicSupported(true);
    const recognition = new SpeechRecognitionCtor();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onresult = (event: SpeechRecognitionEventLike) => {
      let transcript = "";
      for (let i = 0; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }
      setQuestion(transcript);
    };

    recognition.onerror = () => {
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;

    return () => {
      recognition.onresult = null;
      recognition.onerror = null;
      recognition.onend = null;
      recognition.stop?.();
    };
  }, []);

  function handleToggleMic() {
    if (!micSupported || !recognitionRef.current) return;

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
      return;
    }

    // Stop any narration before listening to avoid audio feedback.
    stopSpeaking();
    setQuestion("");
    try {
      recognitionRef.current.start();
      setIsListening(true);
    } catch {
      // start() throws if called while already active; ignore.
    }
  }

  // ---------------------------------------------------------------------------
  // Playback controls (per-answer)
  // ---------------------------------------------------------------------------

  function handleToggleSpeak(index: number, text: string) {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;

    const isThisTurn = speakingIndex === index;

    if (isThisTurn && playbackState === "playing") {
      window.speechSynthesis.pause();
      setPlaybackState("paused");
      return;
    }

    if (isThisTurn && playbackState === "paused") {
      window.speechSynthesis.resume();
      setPlaybackState("playing");
      return;
    }

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(sanitizeText(text));
    utterance.rate = 1;
    utterance.pitch = 1;
    utterance.volume = 1;

    const voices = window.speechSynthesis.getVoices();
    const preferred = voices.find((v) => v.lang?.startsWith("en")) || voices[0];
    if (preferred) utterance.voice = preferred;

    utterance.onend = () => {
      setSpeakingIndex(null);
      setPlaybackState("idle");
      utteranceRef.current = null;
    };
    utterance.onerror = () => {
      setSpeakingIndex(null);
      setPlaybackState("idle");
      utteranceRef.current = null;
    };

    utteranceRef.current = utterance;
    setSpeakingIndex(index);
    setPlaybackState("playing");
    window.speechSynthesis.speak(utterance);
  }

  function handleStopSpeak() {
    stopSpeaking();
  }

  // ---------------------------------------------------------------------------
  // Ask / submit
  // ---------------------------------------------------------------------------

  async function submit() {
    const q = question.trim();
    if (!q || loading) return;
    setQuestion("");
    setLoading(true);
    try {
      const answer = await askQuestion(sessionId, q);
      setTurns((t) => [...t, { question: sanitizeText(q), answer: sanitizeText(answer) }]);
    } catch {
      setTurns((t) => [...t, { question: sanitizeText(q), answer: "Something went wrong. Try again." }]);
    } finally {
      setLoading(false);
    }
  }

  function handleDownloadChat() {
    try {
      const lines = turns.map((t, i) => `### Q${i + 1}: ${t.question}\n\n${t.answer}\n`).join("\n---\n\n");
      const markdown = `# ClipSage Chat Transcript

Session: ${sessionId}
Exported: ${new Date().toLocaleString()}

---

${lines || "_No messages yet._"}`.trim();

      const blob = new Blob([markdown], { type: "text/markdown" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `chat_${sessionId}.md`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Chat download failed:", error);
    }
  }

  const speechSupported = typeof window !== "undefined" && "speechSynthesis" in window;

  return (
    <>
      {/* Floating toggle icon */}
      <motion.button
        type="button"
        onClick={() => setOpen((o) => !o)}
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 260, damping: 20, delay: 0.3 }}
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.94 }}
        aria-label={open ? "Close chat" : "Open chat"}
        className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-r from-orange-500 to-red-500 text-neutral-950 shadow-[0_0_30px_rgba(249,115,22,0.4)]"
      >
        <AnimatePresence mode="wait" initial={false}>
          {open ? (
            <motion.span
              key="close"
              initial={{ rotate: -90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: 90, opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <X className="h-6 w-6 stroke-[2.5]" />
            </motion.span>
          ) : (
            <motion.span
              key="chat"
              initial={{ rotate: 90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: -90, opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="relative"
            >
              <MessageSquare className="h-6 w-6 stroke-[2.5]" />
              <span className="absolute -right-1 -top-1 h-2.5 w-2.5 animate-ping rounded-full bg-orange-300" />
              <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-orange-300" />
            </motion.span>
          )}
        </AnimatePresence>
      </motion.button>

      {/* Chat panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 300, damping: 28 }}
            style={{ maxHeight: "calc(100vh - 120px)" }}
            className="fixed bottom-24 right-6 z-50 flex w-[92vw] max-w-sm flex-col overflow-hidden rounded-2xl border border-white/10 bg-neutral-950/95 shadow-2xl backdrop-blur-xl sm:w-96"
          >
            {/* Header */}
            <div className="flex items-center gap-2 border-b border-white/10 bg-white/[0.02] px-4 py-3">
              <Sparkles className="h-4 w-4 text-orange-400" />
              <p className="text-sm font-semibold text-white/90">Ask about this media</p>
              <span className="ml-auto rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[9px] uppercase tracking-wider text-white/45">
                Grounded Q&A
              </span>
              <button
                type="button"
                onClick={handleDownloadChat}
                disabled={turns.length === 0}
                title="Download chat"
                className="ml-1 rounded-lg border border-white/10 bg-white/5 p-1.5 text-white/60 transition hover:bg-white/10 hover:text-orange-400 disabled:cursor-not-allowed disabled:opacity-30"
              >
                <Download className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* Turns */}
            <div ref={scrollRef} className="flex-1 min-h-[240px] space-y-4 overflow-y-auto px-4 py-4">
              {turns.length === 0 && !loading && (
                <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
                  <MessageSquare className="h-6 w-6 text-white/20" />
                  <p className="text-xs text-white/35">
                    Ask anything about the tone, key decisions, or details of this media.
                  </p>
                </div>
              )}

              {turns.map((t, i) => {
                const isThisTurnSpeaking = speakingIndex === i;
                const isPlaying = isThisTurnSpeaking && playbackState === "playing";
                const isPaused = isThisTurnSpeaking && playbackState === "paused";

                return (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25 }}
                    className="space-y-2"
                  >
                    {/* Question bubble */}
                    <div className="flex justify-end">
                      <div className="max-w-[85%] rounded-2xl rounded-tr-sm bg-gradient-to-r from-orange-500 to-red-500 px-3.5 py-2 text-sm font-medium text-neutral-950 shadow-sm">
                        {t.question}
                      </div>
                    </div>

                    {/* Answer bubble */}
                    <div className="flex justify-start">
                      <div
                        className={`relative max-w-[90%] rounded-2xl rounded-tl-sm border px-3.5 py-2.5 text-sm leading-relaxed transition-colors ${
                          isThisTurnSpeaking
                            ? "border-orange-500/30 bg-orange-500/[0.06] text-white/85"
                            : "border-white/10 bg-white/[0.04] text-white/75"
                        }`}
                      >
                        <p className="whitespace-pre-wrap pr-1">{t.answer}</p>

                        {speechSupported && (
                          <div className="mt-2 flex items-center gap-1.5 border-t border-white/5 pt-2">
                            <button
                              type="button"
                              onClick={() => handleToggleSpeak(i, t.answer)}
                              disabled={!voicesReady && !isThisTurnSpeaking}
                              title={isPlaying ? "Pause" : isPaused ? "Resume" : "Listen to answer"}
                              className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-[10px] font-semibold text-white/60 transition hover:bg-white/10 hover:text-orange-400 disabled:cursor-not-allowed disabled:opacity-40"
                            >
                              {isPlaying ? (
                                <>
                                  <Pause className="h-3 w-3" />
                                  Pause
                                </>
                              ) : isPaused ? (
                                <>
                                  <Volume2 className="h-3 w-3" />
                                  Resume
                                </>
                              ) : (
                                <>
                                  <Volume2 className="h-3 w-3" />
                                  Listen
                                </>
                              )}
                            </button>

                            {isThisTurnSpeaking && (
                              <button
                                type="button"
                                onClick={handleStopSpeak}
                                title="Stop"
                                className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-[10px] font-semibold text-white/50 transition hover:bg-white/10 hover:text-red-400"
                              >
                                <Square className="h-2.5 w-2.5 fill-current" />
                                Stop
                              </button>
                            )}

                            {isPlaying && (
                              <span className="ml-auto flex items-center gap-0.5">
                                <span className="h-2.5 w-0.5 animate-pulse rounded-full bg-orange-400" />
                                <span className="h-3.5 w-0.5 animate-pulse rounded-full bg-orange-400 [animation-delay:150ms]" />
                                <span className="h-2 w-0.5 animate-pulse rounded-full bg-orange-400 [animation-delay:300ms]" />
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}

              {loading && (
                <div className="flex justify-start">
                  <div className="flex items-center gap-2 rounded-2xl rounded-tl-sm border border-white/10 bg-white/[0.04] px-3.5 py-2.5 text-sm text-white/45">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Thinking…
                  </div>
                </div>
              )}
            </div>

            {/* Input */}
            <div className="flex gap-2 border-t border-white/10 bg-white/[0.02] p-3">
              {micSupported && (
                <button
                  type="button"
                  onClick={handleToggleMic}
                  title={isListening ? "Stop listening" : "Ask by voice"}
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border transition ${
                    isListening
                      ? "border-orange-500/40 bg-orange-500/15 text-orange-400"
                      : "border-white/10 bg-white/5 text-white/60 hover:bg-white/10 hover:text-orange-400"
                  }`}
                >
                  {isListening ? (
                    <span className="relative flex h-3.5 w-3.5 items-center justify-center">
                      <Mic className="h-3.5 w-3.5 animate-pulse" />
                      <span className="absolute -inset-1.5 -z-10 animate-ping rounded-full bg-orange-500/30" />
                    </span>
                  ) : (
                    <Mic className="h-3.5 w-3.5" />
                  )}
                </button>
              )}

              <Input
                placeholder={isListening ? "Listening…" : "What is the tone? Summarize..."}
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    submit();
                  }
                }}
                disabled={loading}
                className="bg-neutral-950/60"
              />
              <Button
                onClick={submit}
                disabled={loading || !question.trim()}
                size="icon"
                className="shrink-0 bg-gradient-to-r from-orange-500 to-red-500 text-neutral-950 hover:brightness-110 disabled:opacity-40"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}