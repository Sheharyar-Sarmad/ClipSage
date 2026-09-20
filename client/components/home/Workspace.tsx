"use client";

import { useState, useEffect, useRef } from "react";
import { toast } from "react-toastify";
import { ArrowLeft } from "lucide-react";

import { InputPanel } from "@/components/home/InputPanel";
import { LoadingSkeleton } from "@/components/shared/LoadingSkeleton";
import { AnalysisView } from "@/components/home/AnalysisView";
import { ChatPanel } from "@/components/home/ChatPanel";
import { processMedia } from "@/lib/api";

import type { ProcessResponse } from "@/lib/types";

export function Workspace() {
  const [session, setSession] = useState<ProcessResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [localFile, setLocalFile] = useState<File | null>(null);
  const [localFileUrl, setLocalFileUrl] = useState<string | null>(null);
  const prevUrlRef = useRef<string | null>(null);

  useEffect(() => {
    if (prevUrlRef.current) {
      URL.revokeObjectURL(prevUrlRef.current);
      prevUrlRef.current = null;
    }

    if (localFile) {
      const url = URL.createObjectURL(localFile);
      setLocalFileUrl(url);
      prevUrlRef.current = url;
    } else {
      setLocalFileUrl(null);
    }

    return () => {
      if (prevUrlRef.current) {
        URL.revokeObjectURL(prevUrlRef.current);
        prevUrlRef.current = null;
      }
    };
  }, [localFile]);

  async function handleSubmit(input: { url?: string; file?: File; title?: string }) {
    setLoading(true);
    setSession(null);
    setLocalFile(input.file ?? null);

    try {
      const result = await processMedia(input);
      setSession(result);
      toast.success("Analysis ready");
    } catch (error) {
      console.error("Media processing failed:", error);
      toast.error("Failed to analyze media. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function handleReset() {
    setSession(null);
    setLocalFile(null);
  }

  return (
    <section id="workspace" className="mx-auto max-w-7xl scroll-mt-28 px-4 py-8 sm:px-6">
      {!session && !loading && (
        <div className="mx-auto max-w-xl">
          <InputPanel onSubmit={handleSubmit} loading={loading} />
        </div>
      )}

      {loading && <LoadingSkeleton />}

      {session && (
        <div className="animate-in fade-in slide-in-from-bottom-4 space-y-6 duration-500">
          {/* Reset / Back Button — centered, clear pill style */}
          <div className="flex justify-center">
            <button
              type="button"
              onClick={handleReset}
              className="group flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-5 py-2.5 text-sm font-semibold text-white/80 shadow-sm backdrop-blur-xl transition hover:border-orange-500/40 hover:bg-orange-500/10 hover:text-orange-400"
            >
              <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
              Analyze another file
            </button>
          </div>

          <AnalysisView session={session} localFileUrl={localFileUrl} localFileName={localFile?.name} />

          {/* Floating chat icon + panel */}
          <ChatPanel sessionId={session.session_id} />
        </div>
      )}
    </section>
  );
}