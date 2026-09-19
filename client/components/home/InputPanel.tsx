"use client";

import { useRef, useState } from "react";
import { motion } from "framer-motion";
import { Link2, Loader2, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface Props {
  onSubmit: (input: { url?: string; file?: File; title?: string }) => void;
  loading: boolean;
}

export function InputPanel({ onSubmit, loading }: Props) {
  const [url, setUrl] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const canSubmit = !loading && (url.trim().length > 0 || !!file);

  function handleSubmit() {
    if (!canSubmit) return;
    onSubmit({
      url: url.trim() || undefined,
      file: file ?? undefined,
      title: title.trim() || undefined,
    });
  }

  function clearFile() {
    setFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
      className="relative rounded-2xl border border-white/10 bg-neutral-900/50 p-5 backdrop-blur-xl sm:p-6"
    >
      {/* Soft top glow */}
      <div className="pointer-events-none absolute -top-px left-1/2 h-px w-1/2 -translate-x-1/2 bg-gradient-to-r from-transparent via-orange-400/60 to-transparent" />

      <div className="mb-4">
        <h2 className="text-lg font-semibold tracking-tight">Analyze media</h2>
        <p className="mt-1 text-xs text-white/45">
          Paste a link or upload a file. Processing takes 20–60 seconds
          depending on length.
        </p>
      </div>

      {/* URL */}
      <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-neutral-950/40 px-3 transition focus-within:border-orange-400/40">
        <Link2 className="h-4 w-4 shrink-0 text-white/35" />
        <Input
          placeholder="https://youtube.com/watch?v=..."
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          disabled={!!file || loading}
          className="border-0 bg-transparent shadow-none focus-visible:ring-0"
        />
      </div>

      {/* Divider */}
      <div className="my-3 flex items-center gap-3 text-[11px] uppercase tracking-wider text-white/25">
        <span className="h-px flex-1 bg-white/10" />
        or
        <span className="h-px flex-1 bg-white/10" />
      </div>

      {/* File */}
      {file ? (
        <div className="flex items-center justify-between rounded-xl border border-orange-400/30 bg-orange-500/[0.06] px-4 py-3 text-sm">
          <span className="truncate text-white/85">{file.name}</span>
          <button
            onClick={clearFile}
            className="ml-3 rounded-md p-1 text-white/50 transition hover:bg-white/10 hover:text-white"
            aria-label="Remove file"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-white/15 px-4 py-6 text-sm text-white/50 transition hover:border-orange-400/40 hover:bg-white/[0.02] hover:text-white/85">
          <Upload className="h-4 w-4" />
          Drop or select an audio / video / image
          <input
            ref={fileInputRef}
            type="file"
            hidden
            accept="audio/*,video/*,image/*"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            disabled={loading || !!url.trim()}
          />
        </label>
      )}

      {/* Title */}
      <Input
        placeholder="Optional title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        disabled={loading}
        className="mt-4 bg-neutral-950/40"
      />

      {/* Submit */}
      <Button
        onClick={handleSubmit}
        disabled={!canSubmit}
        className="mt-5 h-11 w-full bg-gradient-to-r from-orange-500 to-red-500 font-semibold text-neutral-950 hover:brightness-110 disabled:opacity-40"
      >
        {loading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Analyzing…
          </>
        ) : (
          "Analyze"
        )}
      </Button>
    </motion.div>
  );
}