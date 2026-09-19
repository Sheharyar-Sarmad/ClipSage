import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";

const BULLETS = [
  "Transcript with the full text of every word",
  "TL;DR, key points, and action items as JSON",
  "Tone, emotions, behaviour notes, and quotes",
  "Ask follow-up questions grounded in the media",
];

export function Showcase() {
  return (
    <section className="mx-auto mt-28 max-w-6xl px-4 sm:px-6">
      <div className="grid items-center gap-12 lg:grid-cols-2">
        {/* Text */}
        <div>
          <p className="mb-3 text-[11px] font-medium uppercase tracking-[0.22em] text-orange-300/80">
            The output
          </p>
          <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            Clean structured data from messy inputs.
          </h2>
          <p className="mt-4 leading-relaxed text-white/60">
            Every media file becomes a structured note: transcript, TL;DR, key
            points, action items, tone and emotion, notable quotes — all stored
            as JSON so your downstream tools can use it.
          </p>

          <ul className="mt-6 space-y-3">
            {BULLETS.map((b, i) => (
              <li key={i} className="flex items-start gap-3 text-sm">
                <span className="mt-[2px] grid h-4 w-4 shrink-0 place-items-center rounded-full bg-orange-500/15">
                  <Check className="h-2.5 w-2.5 text-orange-400" />
                </span>
                <span className="text-white/75">{b}</span>
              </li>
            ))}
          </ul>

          <Link
            href="#workspace"
            className="group mt-8 inline-flex items-center gap-2 text-sm font-medium text-orange-300 transition hover:text-orange-200"
          >
            Try it now
            <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
          </Link>
        </div>

        {/* Image */}
        <div className="relative">
          <div className="pointer-events-none absolute -inset-4 rounded-3xl bg-gradient-to-tr from-orange-500/10 via-transparent to-red-500/10 blur-2xl" />
          <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02] backdrop-blur">
            <Image
              src="/clipsage-dashboard-mockup.jpg"
              alt="ClipSage analysis dashboard"
              width={1400}
              height={900}
              className="h-auto w-full object-cover"
            />
          </div>
        </div>
      </div>
    </section>
  );
}