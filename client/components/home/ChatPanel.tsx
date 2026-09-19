"use client";

import { useState, useRef, useEffect } from "react";
import { Loader2, Send, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { askQuestion } from "@/lib/api";
import type { ChatTurn } from "@/lib/types";

export function ChatPanel({ sessionId }: { sessionId: string }) {
  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [turns.length, loading]);

  async function submit() {
    const q = question.trim();
    if (!q || loading) return;
    setQuestion("");
    setLoading(true);
    try {
      const answer = await askQuestion(sessionId, q);
      setTurns((t) => [...t, { question: q, answer }]);
    } catch {
      setTurns((t) => [
        ...t,
        { question: q, answer: "Something went wrong. Try again." },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.02] p-5 backdrop-blur">
      <div className="mb-4 flex items-center gap-2">
        <MessageSquare className="h-4 w-4 text-orange-400" />
        <p className="text-sm font-medium">Ask about this media</p>
        <span className="ml-auto rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[10px] uppercase tracking-wider text-white/45">
          Grounded Q&A
        </span>
      </div>

      {/* Turns */}
      {turns.length > 0 && (
        <div
          ref={scrollRef}
          className="mb-4 max-h-80 space-y-4 overflow-y-auto border-t border-white/5 pt-4"
        >
          {turns.map((t, i) => (
            <div key={i} className="space-y-2">
              <p className="flex gap-2 text-sm font-medium text-white/90">
                <span className="shrink-0 text-orange-400">›</span>
                {t.question}
              </p>
              <p className="whitespace-pre-wrap pl-4 text-sm leading-relaxed text-white/70">
                {t.answer}
              </p>
            </div>
          ))}
          {loading && (
            <div className="flex items-center gap-2 pl-4 text-sm text-white/45">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Thinking…
            </div>
          )}
        </div>
      )}

      {/* Input */}
      <div className="flex gap-2">
        <Input
          placeholder="What is the tone? Summarize the key decision..."
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              submit();
            }
          }}
          disabled={loading}
          className="bg-neutral-950/40"
        />
        <Button
          onClick={submit}
          disabled={loading || !question.trim()}
          size="icon"
          className="shrink-0 bg-gradient-to-r from-orange-500 to-red-500 text-neutral-950 hover:brightness-110 disabled:opacity-40"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </div>
    </div>
  );
}