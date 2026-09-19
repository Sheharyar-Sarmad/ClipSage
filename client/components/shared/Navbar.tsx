"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import gsap from "gsap";
import { SiGithub } from "@icons-pack/react-simple-icons";
import { Menu, X } from "lucide-react";

import { LinkedInIcon } from "@/components/shared/icons";

const LINKS = [
  { href: "/", label: "Home" },
  { href: "/about", label: "About" },
];

const GITHUB_URL = "https://github.com/Sheharyar-Sarmad/ClipSage";
const LINKEDIN_URL = "https://www.linkedin.com/in/sheharyar-sarmad-9b7736289/";

export function Navbar() {
  const path = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  const navRef = useRef<HTMLElement>(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null);

  // ─── GSAP: shrink the nav pill on scroll ─────────────────────
  useEffect(() => {
    const nav = navRef.current;
    if (!nav) return;

    // Initial padding (matches py-2.5)
    gsap.set(nav, { paddingTop: 10, paddingBottom: 10 });

    const onScroll = () => {
      const y = window.scrollY;
      gsap.to(nav, {
        paddingTop: y > 20 ? 6 : 10,
        paddingBottom: y > 20 ? 6 : 10,
        duration: 0.35,
        ease: "power2.out",
        overwrite: "auto",
      });
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // ─── GSAP: slide mobile menu in/out ──────────────────────────
  useEffect(() => {
    const el = mobileMenuRef.current;
    if (!el) return;

    if (menuOpen) {
      gsap.set(el, { pointerEvents: "auto" });
      gsap.fromTo(
        el,
        { opacity: 0, y: -16 },
        { opacity: 1, y: 0, duration: 0.35, ease: "power3.out" }
      );
    } else {
      gsap.to(el, {
        opacity: 0,
        y: -16,
        duration: 0.25,
        ease: "power2.in",
        onComplete: () => gsap.set(el, { pointerEvents: "none" }),
      });
    }
  }, [menuOpen]);

  // ─── Close mobile menu on route change ───────────────────────
  useEffect(() => {
    setMenuOpen(false);
  }, [path]);

  return (
    <motion.header
      initial={{ y: -40, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className="fixed top-0 inset-x-0 z-50"
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <nav
          ref={navRef}
          className="mt-4 flex items-center justify-between rounded-2xl border border-white/10 bg-neutral-950/60 px-4 backdrop-blur-xl"
        >
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="relative h-8 w-8 overflow-hidden rounded-lg ring-1 ring-white/10 transition group-hover:ring-orange-400/50">
              <Image
                src="/clipsage-logo.png"
                alt="ClipSage"
                width={32}
                height={32}
                className="object-cover"
                priority
              />
            </div>
            <span className="text-sm font-semibold tracking-tight">
              ClipSage
            </span>
          </Link>

          {/* Desktop nav links + socials */}
          <div className="hidden md:flex items-center gap-1">
            {LINKS.map((l) => {
              const active = path === l.href;
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  className={`relative rounded-lg px-3 py-1.5 text-sm transition-colors ${
                    active ? "text-white" : "text-white/60 hover:text-white"
                  }`}
                >
                  {active && (
                    <motion.span
                      layoutId="nav-active"
                      className="absolute inset-0 -z-10 rounded-lg bg-white/[0.06]"
                      transition={{
                        type: "spring",
                        stiffness: 400,
                        damping: 30,
                      }}
                    />
                  )}
                  {l.label}
                </Link>
              );
            })}

            <span className="mx-2 h-4 w-px bg-white/10" />

            <a
              href={GITHUB_URL}
              target="_blank"
              rel="noreferrer"
              aria-label="GitHub repository"
              className="rounded-lg p-2 text-white/60 transition hover:bg-white/[0.06] hover:text-white"
            >
              <SiGithub size={16} />
            </a>

            <a
              href={LINKEDIN_URL}
              target="_blank"
              rel="noreferrer"
              aria-label="LinkedIn"
              className="rounded-lg p-2 text-white/60 transition hover:bg-white/[0.06] hover:text-white"
            >
              <LinkedInIcon size={16} />
            </a>
          </div>

          {/* Mobile hamburger */}
          <button
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="Toggle menu"
            aria-expanded={menuOpen}
            className="md:hidden rounded-lg p-2 text-white/70 transition hover:bg-white/[0.06] hover:text-white"
          >
            {menuOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </button>
        </nav>

        {/* Mobile menu (GSAP animated) */}
        <div
          ref={mobileMenuRef}
          className="md:hidden mt-2 rounded-2xl border border-white/10 bg-neutral-950/90 p-4 backdrop-blur-xl"
          style={{ opacity: 0, pointerEvents: "none" }}
        >
          <div className="flex flex-col gap-1">
            {LINKS.map((l) => {
              const active = path === l.href;
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  className={`rounded-lg px-3 py-2 text-sm transition-colors ${
                    active
                      ? "bg-white/[0.06] text-white"
                      : "text-white/70 hover:bg-white/[0.04] hover:text-white"
                  }`}
                >
                  {l.label}
                </Link>
              );
            })}

            <div className="my-2 h-px bg-white/10" />

            <div className="flex items-center gap-2">
              <a
                href={GITHUB_URL}
                target="_blank"
                rel="noreferrer"
                aria-label="GitHub"
                className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-white/[0.04] px-3 py-2 text-sm text-white/70 transition hover:bg-white/[0.08] hover:text-white"
              >
                <SiGithub size={16} />
                <span>GitHub</span>
              </a>
              <a
                href={LINKEDIN_URL}
                target="_blank"
                rel="noreferrer"
                aria-label="LinkedIn"
                className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-white/[0.04] px-3 py-2 text-sm text-white/70 transition hover:bg-white/[0.08] hover:text-white"
              >
                <LinkedInIcon size={16} />
                <span>LinkedIn</span>
              </a>
            </div>
          </div>
        </div>
      </div>
    </motion.header>
  );
}