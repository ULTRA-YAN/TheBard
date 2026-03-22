# WriteCheck

A personal grammar, style, and readability editor. Paste an article, run a single Gemini API call, and get back inline highlighted errors with a feedback panel — like a Grammarly + Hemingway hybrid built for your personal writing standards.

![WriteCheck Screenshot](screenshot-placeholder.png)

## Setup

```bash
git clone <repo-url>
cd writecheck
npm install
```

Create `.env.local`:

```
GOOGLE_API_KEY=your_google_api_key_here
```

Get a free API key from [Google AI Studio](https://aistudio.google.com/apikey).

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Deploy to Vercel

1. Push to GitHub
2. Import the repo on [vercel.com](https://vercel.com)
3. Add `GOOGLE_API_KEY` as an environment variable
4. Deploy

## The Five Checking Pillars

| Pillar | Color | What it checks |
|--------|-------|----------------|
| **Grammar** | Red | Parts of speech, agreement, common confusions (their/there/they're, etc.) |
| **Syntax** | Orange | Sentence structure, fragments, run-ons, dangling modifiers |
| **Mechanics** | Yellow | Spelling, capitalization, formatting consistency |
| **Punctuation** | Blue | Commas, semicolons, hyphens, dashes, apostrophes |
| **Style** | Purple | Passive voice, banned words, readability, sentence length |

## Content Modes

- **General** — 25-word max sentence, grade 8 readability
- **SEO Article** — 22-word max, grade 7, short paragraphs
- **LinkedIn Post** — 18-word max, grade 6, conversational tone
- **Internal Doc** — 30-word max, grade 10, technical jargon OK

## Customize Style Rules

Edit `config/style-rules.ts` to modify:
- Banned words and phrases
- Mode-specific settings (sentence length, readability targets)
- Extra rules per content mode

## Free Tier Limits

Google Gemini 2.5 Flash free tier: **10 requests/minute**, **250 requests/day**. More than enough for personal use.

## Tech Stack

- Next.js 14 (App Router) + TypeScript
- Tailwind CSS (light + dark mode)
- Google Gemini 2.5 Flash via `@google/generative-ai`
- Deployed on Vercel (free hobby tier)
