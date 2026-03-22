import { ContentMode } from "@/lib/types";

export const BANNED_WORDS: string[] = [
  "streamline", "leverage", "cutting-edge", "revolutionize", "game-changer",
  "synergy", "paradigm", "holistic", "ecosystem", "seamless", "seamlessly",
  "robust", "scalable", "innovative", "next-generation", "state-of-the-art",
  "best-in-class", "world-class", "empower", "harness", "unlock", "elevate",
  "spearhead", "navigate", "landscape", "foster", "cultivate", "bolster",
  "delve", "utilize", "facilitate", "optimize", "boasts", "plethora",
  "myriad", "comprehensive", "testament",
];

export const BANNED_PHRASES: string[] = [
  "Moreover", "Furthermore", "In conclusion", "To summarize",
  "in today's digital age", "in today's fast-paced world",
  "at the end of the day", "it goes without saying", "needless to say",
  "it's worth noting", "it's important to note", "look no further",
  "without further ado", "dive in", "deep dive", "buckle up",
  "let's face it", "the bottom line", "moving forward", "circle back",
  "low-hanging fruit",
];

export interface ModeConfig {
  label: string;
  maxSentenceLength: number;
  readabilityGrade: number;
  extraRules: string[];
}

export const MODE_CONFIGS: Record<ContentMode, ModeConfig> = {
  general: {
    label: "General",
    maxSentenceLength: 25,
    readabilityGrade: 8,
    extraRules: [],
  },
  "seo-article": {
    label: "SEO Article",
    maxSentenceLength: 22,
    readabilityGrade: 7,
    extraRules: [
      "Paragraphs should be 2-3 sentences max. Flag paragraphs longer than 4 sentences.",
      "Subheadings should use sentence case (not title case).",
    ],
  },
  "linkedin-post": {
    label: "LinkedIn Post",
    maxSentenceLength: 18,
    readabilityGrade: 6,
    extraRules: [
      "Paragraphs should be 1-2 sentences.",
      "Flag overly formal language — LinkedIn posts should feel conversational.",
      "Flag hashtag stuffing (more than 5 hashtags).",
    ],
  },
  "internal-doc": {
    label: "Internal Doc",
    maxSentenceLength: 30,
    readabilityGrade: 10,
    extraRules: [
      "Technical jargon is acceptable if defined on first use.",
      "Acronyms must be spelled out on first use.",
    ],
  },
};
