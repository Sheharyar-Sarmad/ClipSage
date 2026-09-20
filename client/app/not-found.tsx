import type { Metadata } from "next";
import Link from "next/link";
import { Home, Search, ArrowRight } from "lucide-react";

export const metadata: Metadata = {
  title: "Page Not Found · ClipSage",
  description: "The page you're looking for doesn't exist or has been moved.",
};

export default function NotFound() {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 text-white">
      {/* Ambient background glow */}
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute left-1/2 top-1/3 h-[500px] w-[700px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-orange-500/10 blur-[140px]" />
        <div className="absolute bottom-0 right-0 h-[350px] w-[450px] rounded-full bg-red-500/5 blur-[120px]" />
      </div>

      <div className="mx-auto max-w-lg text-center">
        {/* Status badge */}
        <div className="mx-auto mb-8 flex w-fit items-center gap-2 rounded-full border border-orange-500/20 bg-orange-500/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-orange-400">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-orange-500" />
          Node Not Found
        </div>

        {/* Big 404 */}
        <h1 className="bg-gradient-to-r from-orange-400 to-red-500 bg-clip-text text-8xl font-bold tracking-tight text-transparent sm:text-9xl">
          404
        </h1>

        <h2 className="mt-4 text-xl font-bold text-white/90 sm:text-2xl">
          This pipeline led nowhere.
        </h2>

        <p className="mx-auto mt-4 max-w-sm text-sm leading-6 text-white/50 sm:text-base">
          The page you're looking for doesn't exist, was moved, or the media
          node was never processed. Let's get you back on track.
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/"
            className="group flex items-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 to-red-500 px-5 py-3 text-sm font-semibold text-neutral-950 shadow-[0_0_30px_rgba(249,115,22,0.2)] transition hover:brightness-110"
          >
            <Home className="h-4 w-4" />
            Back to Home
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </Link>

          <Link
            href="/#workspace"
            className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold text-white/80 transition hover:bg-white/10"
          >
            <Search className="h-4 w-4" />
            Analyze Media
          </Link>
        </div>

        {/* Decorative wireframe accent, matching hero style */}
        <div className="pointer-events-none absolute -bottom-10 -right-10 -z-10 opacity-20 sm:opacity-30">
          <svg width="220" height="220" viewBox="0 0 220 220" fill="none">
            <polygon
              points="110,10 210,80 170,190 50,190 10,80"
              stroke="#fb923c"
              strokeWidth="1"
              fill="none"
            />
            <polygon
              points="110,50 170,90 150,160 70,160 50,90"
              stroke="#f97316"
              strokeWidth="1"
              fill="none"
            />
          </svg>
        </div>
      </div>
    </div>
  );
}