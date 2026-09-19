import Image from "next/image";
import { Mail } from "lucide-react";
import { SiGithub } from "@icons-pack/react-simple-icons";

import { LinkedInIcon } from "@/components/shared/icons";

const GITHUB_URL = "https://github.com/Sheharyar-Sarmad";
const REPO_URL = "https://github.com/Sheharyar-Sarmad/ClipSage";
const LINKEDIN_URL = "https://www.linkedin.com/in/sheharyar-sarmad-9b7736289/";
const EMAIL = "developersheharyar2010@gmail.com";
const GMAIL_COMPOSE_URL =
  "https://mail.google.com/mail/u/0/?fs=1&to=developersheharyar2010@gmail.com&tf=cm";

export function Footer() {
  return (
    <footer className="relative mt-32 border-t border-white/5">
      <div className="mx-auto max-w-6xl px-6 py-12">
        <div className="flex flex-col gap-10 md:flex-row md:items-start md:justify-between">
          {/* Brand */}
          <div className="space-y-3">
            <div className="flex items-center gap-2.5">
              <div className="relative h-7 w-7 overflow-hidden rounded-lg ring-1 ring-white/10">
                <Image
                  src="/clipsage-logo.png"
                  alt="ClipSage"
                  width={28}
                  height={28}
                  className="object-cover"
                />
              </div>
              <span className="text-sm font-semibold tracking-tight">
                ClipSage
              </span>
            </div>
            <p className="max-w-xs text-sm text-white/50">
              AI-powered media intelligence. Turn audio, video, and images into
              structured notes you can query.
            </p>
          </div>

          {/* Links */}
          <div className="grid grid-cols-2 gap-10 sm:gap-16">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-white/40">
                Project
              </p>
              <ul className="mt-4 space-y-2 text-sm">
                <li>
                  <a
                    href={REPO_URL}
                    target="_blank"
                    rel="noreferrer"
                    className="text-white/60 transition hover:text-white"
                  >
                    Source code
                  </a>
                </li>
                <li>
                  <a
                    href={`${REPO_URL}#readme`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-white/60 transition hover:text-white"
                  >
                    Documentation
                  </a>
                </li>
                <li>
                  <a
                    href={`${REPO_URL}/issues`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-white/60 transition hover:text-white"
                  >
                    Report an issue
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-white/40">
                Connect
              </p>
              <ul className="mt-4 space-y-2 text-sm">
                <li>
                  <a
                    href={LINKEDIN_URL}
                    target="_blank"
                    rel="noreferrer"
                    className="text-white/60 transition hover:text-white"
                  >
                    LinkedIn
                  </a>
                </li>
                <li>
                  <a
                    href={GITHUB_URL}
                    target="_blank"
                    rel="noreferrer"
                    className="text-white/60 transition hover:text-white"
                  >
                    GitHub
                  </a>
                </li>
                <li>
                  <a
                    href={`https://mail.google.com/mail/u/0/?fs=1&to=developersheharyar2010@gmail.com&tf=cm`}
                    className="text-white/60 transition hover:text-white"
                  >
                    Email
                  </a>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-10 flex flex-col items-center justify-between gap-4 border-t border-white/5 pt-6 sm:flex-row">
          <p className="text-xs text-white/40">
            © {new Date().getFullYear()} Sheharyar Sarmad · All rights reserved
          </p>

          <div className="flex items-center gap-1">
            <a
              href={GITHUB_URL}
              target="_blank"
              rel="noreferrer"
              aria-label="GitHub"
              className="rounded-lg p-2 text-white/50 transition hover:bg-white/[0.06] hover:text-white"
            >
              <SiGithub size={16} />
            </a>
            <a
              href={LINKEDIN_URL}
              target="_blank"
              rel="noreferrer"
              aria-label="LinkedIn"
              className="rounded-lg p-2 text-white/50 transition hover:bg-white/[0.06] hover:text-white"
            >
              <LinkedInIcon size={16} />
            </a>
            <a
              href={GMAIL_COMPOSE_URL}
              target="_blank"
              rel="noreferrer"
              aria-label="Email"
              className="rounded-lg p-2 text-white/50 transition hover:bg-white/[0.06] hover:text-white"
            >
              <Mail className="h-4 w-4" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}