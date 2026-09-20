import { AudioLines, Users, Target, MessageSquare } from "lucide-react";

const FEATURES = [
  {
    icon: AudioLines,
    title: "Multi-format intake",
    body: "Video, audio, or images. One streamlined endpoint handles all your native local file uploads seamlessly.",
  },
  {
    icon: Users,
    title: "Tone & emotion",
    body: "Beyond transcription — ClipSage reads the emotional texture and behavioural signals of the media.",
  },
  {
    icon: Target,
    title: "Action items",
    body: "Automatically pulls out every task, decision, and commitment mentioned, with clear attribution.",
  },
  {
    icon: MessageSquare,
    title: "Grounded Q&A",
    body: "Ask anything about the media. Answers come from the transcript and analysis — not the internet.",
  },
];

export function Features() {
  return (
    <section className="mx-auto mt-20 max-w-6xl px-4 sm:px-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {FEATURES.map((f, i) => {
          const Icon = f.icon;
          return (
            <div
              key={i}
              className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02] p-5 backdrop-blur transition hover:border-orange-400/30 hover:bg-white/[0.04]"
            >
              <div className="mb-4 grid h-9 w-9 place-items-center rounded-lg border border-white/10 bg-neutral-950/60">
                <Icon className="h-4 w-4 text-orange-400" />
              </div>
              <h3 className="text-sm font-semibold tracking-tight">
                {f.title}
              </h3>
              <p className="mt-2 text-[13px] leading-relaxed text-white/55">
                {f.body}
              </p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
