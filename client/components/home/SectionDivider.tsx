import Image from "next/image";

export function SectionDivider({ label }: { label: string }) {
  return (
    <div className="relative mx-auto mt-28 max-w-6xl px-4 sm:px-6">
      <div className="relative h-32 overflow-hidden rounded-2xl border border-white/5">
        <Image
          src="/network-bg.jpg"
          alt=""
          fill
          className="object-cover opacity-30"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-neutral-950 via-neutral-950/40 to-neutral-950" />
        <div className="absolute inset-0 flex items-center justify-center">
          <p className="text-[11px] font-medium uppercase tracking-[0.3em] text-white/50">
            {label}
          </p>
        </div>
      </div>
    </div>
  );
}