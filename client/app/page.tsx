import { Hero } from "@/components/home/Hero";
import { Workspace } from "@/components/home/Workspace";
import { Features } from "@/components/home/Features";
import { Showcase } from "@/components/home/Showcase";
import { SectionDivider } from "@/components/home/SectionDivider";

export default function Home() {
  return (
    <div className="relative">
      <Hero />
      <Workspace />
      <SectionDivider label="What ClipSage does" />
      <Features />
      <Showcase />
    </div>
  );
}