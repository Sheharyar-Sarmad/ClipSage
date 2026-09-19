"use client";

import { useState } from "react";
import { toast } from "react-toastify";
import { InputPanel } from "@/components/home/InputPanel";
import { LoadingSkeleton } from "@/components/shared/LoadingSkeleton";
import { AnalysisView } from "@/components/home/AnalysisView";
import { ChatPanel } from "@/components/home/ChatPanel";
import { processMedia } from "@/lib/api";
import type { ProcessResponse } from "@/lib/types";

export function Workspace() {
  const [session, setSession] = useState<ProcessResponse | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(input: {
    url?: string;
    file?: File;
    title?: string;
  }) {
    setLoading(true);
    setSession(null);
    try {
      const result = await processMedia(input);
      setSession(result);
      toast.success("Analysis ready");
    } catch {
      // toast already fired inside api.ts
    } finally {
      setLoading(false);
    }
  }

  return (
    <section
      id="workspace"
      className="mx-auto max-w-4xl scroll-mt-28 px-4 sm:px-6"
    >
      <InputPanel onSubmit={handleSubmit} loading={loading} />
      {loading && <LoadingSkeleton />}
      {session && (
        <>
          <AnalysisView session={session} />
          <ChatPanel sessionId={session.session_id} />
        </>
      )}
    </section>
  );
}