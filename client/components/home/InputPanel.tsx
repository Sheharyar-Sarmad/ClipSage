"use client";

import { useRef, useState } from "react";
import { motion } from "framer-motion";
import { Loader2, Upload, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface InputPanelProps {
onSubmit: (input: {
file?: File;
title?: string;
}) => void;
loading: boolean;
}

export function InputPanel({
onSubmit,
loading,
}: InputPanelProps) {
const [file, setFile] = useState<File | null>(null);
const [title, setTitle] = useState("");

const fileInputRef = useRef<HTMLInputElement>(null);

const canSubmit = !loading && file !== null;

function handleSubmit() {
if (!canSubmit || !file) {
return;
}


onSubmit({
  file,
  title: title.trim() || undefined,
});

}

function clearFile() {
setFile(null);

if (fileInputRef.current) {
  fileInputRef.current.value = "";
}

}

function handleFileChange(
event: React.ChangeEvent<HTMLInputElement>
) {
const selectedFile = event.target.files?.[0] ?? null;


setFile(selectedFile);

}

return (
<motion.div
initial={{
opacity: 0,
y: 20,
}}
animate={{
opacity: 1,
y: 0,
}}
transition={{
duration: 0.6,
delay: 0.3,
ease: [0.22, 1, 0.36, 1],
}}
className="relative rounded-2xl border border-white/10 bg-neutral-900/50 p-5 backdrop-blur-xl sm:p-6"
>
{/* Top Glow */} <div className="pointer-events-none absolute -top-px left-1/2 h-px w-1/2 -translate-x-1/2 bg-gradient-to-r from-transparent via-orange-400/60 to-transparent" />


  {/* Header */}
  <div className="mb-4">
    <h2 className="text-lg font-semibold tracking-tight">
      Analyze media
    </h2>

    <p className="mt-1 text-xs text-white/45">
      Upload a file to begin. Processing takes 20–60
      seconds depending on length.
    </p>
  </div>

  {/* File Upload */}
  {file ? (
    <div className="flex items-center justify-between rounded-xl border border-orange-400/30 bg-orange-500/[0.06] px-4 py-3 text-sm">
      <div className="min-w-0">
        <p
          className="truncate text-white/85"
          title={file.name}
        >
          {file.name}
        </p>

        <p className="mt-0.5 text-[11px] text-white/35">
          {(file.size / (1024 * 1024)).toFixed(2)} MB
        </p>
      </div>

      <button
        type="button"
        onClick={clearFile}
        disabled={loading}
        className="ml-3 shrink-0 rounded-md p-1 text-white/50 transition hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
        aria-label="Remove file"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  ) : (
    <label
      className={`flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-white/15 px-4 py-6 text-center text-sm text-white/50 transition ${
        loading
          ? "cursor-not-allowed opacity-50"
          : "hover:border-orange-400/40 hover:bg-white/[0.02] hover:text-white/85"
      }`}
    >
      <Upload className="h-4 w-4 shrink-0" />

      <span>
        Drop or select a video, image, or audio file
      </span>

      <input
        ref={fileInputRef}
        type="file"
        hidden
        accept="audio/*,video/*,image/*"
        onChange={handleFileChange}
        disabled={loading}
      />
    </label>
  )}

  {/* Optional Title */}
  <Input
    placeholder="Optional title"
    value={title}
    onChange={(event) => setTitle(event.target.value)}
    disabled={loading}
    className="mt-4 bg-neutral-950/40"
  />

  {/* Submit */}
  <Button
    type="button"
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
