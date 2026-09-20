This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
# ClipSage — Frontend

Next.js (App Router) frontend for **ClipSage** — an AI media intelligence app that turns any video, audio, or image into structured, interactive notes.

## Tech Stack

- **Framework:** Next.js 14+ (App Router)
- **Styling:** Tailwind CSS
- **UI Components:** Shadcn UI (Radix primitives)
- **Icons & Effects:** Lucide React, custom SmoothScroll + ThreeBackground

## Getting Started

First, install dependencies and run the development server:

```bash
pnpm install
# or
npm install
```

Then start the dev server:

```bash
pnpm dev
# or
npm run dev
# or
yarn dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Environment Variables (`.env.local`)

```env
NEXT_PUBLIC_API_URL=https://clipsage-1t7l.onrender.com
```

> Locally, you can point this to `http://localhost:8000` if running the FastAPI backend on your machine.

## Project Structure

```
client/
├── app/                 # Next.js App Router
│   ├── about/           # About page
│   ├── layout.tsx       # Root layout
│   ├── page.tsx         # Home page
│   ├── not-found.tsx    # 404 page
│   └── globals.css      # Global styles
├── components/
│   ├── about/           # About page components
│   ├── home/            # Hero, InputPanel, ChatPanel, AnalysisView, Workspace, Showcase, Features
│   ├── shared/          # Navbar, Footer, SmoothScroll, ThreeBackground, LoadingSkeleton, icons
│   └── ui/              # Shadcn base components (button, card, input, badge, etc.)
├── lib/                 # Utilities
├── public/              # Static assets
└── next.config.mjs      # Next.js config
```

## Key Components

- **`Hero.tsx`** — Landing hero with animated 3D background.
- **`InputPanel.tsx`** — Media upload (video / audio / image).
- **`AnalysisView.tsx`** — Displays structured notes, transcriptions, and insights.
- **`ChatPanel.tsx`** — Chat interface to interact with processed media.
- **`ThreeBackground.tsx`** — WebGL / animated geometric backdrop.

## Deploy on Vercel

The frontend is deployed on Vercel:

- **Live App:** [https://clipsage-gamma.vercel.app](https://clipsage-gamma.vercel.app)

To deploy your own:

```bash
vercel
```

Or use the [Vercel Platform](https://vercel.com/new) — remember to add `NEXT_PUBLIC_API_URL` in the project's environment settings.

## Links

- **Live App:** [https://clipsage-gamma.vercel.app](https://clipsage-gamma.vercel.app)
- **Backend API:** [https://clipsage-1t7l.onrender.com](https://clipsage-1t7l.onrender.com)
- **Repo:** [github.com/Sheharyar-Sarmad/ClipSage](https://github.com/Sheharyar-Sarmad/ClipSage)
- **GitHub:** [github.com/Sheharyar-Sarmad](https://github.com/Sheharyar-Sarmad/)
- **LinkedIn:** [linkedin.com/in/sheharyar-sarmad](https://www.linkedin.com/in/sheharyar-sarmad/)