export type Category = "grammar" | "syntax" | "mechanics" | "punctuation" | "style";
export type Severity = "error" | "warning" | "suggestion";
export type ContentMode = "general" | "seo-article" | "linkedin-post" | "internal-doc";

export interface Issue {
  id: string;
  category: Category;
  severity: Severity;
  flaggedText: string;
  occurrenceIndex: number;
  explanation: string;
  suggestion: string;
  rule: string;
}

export interface Scores {
  overall: number;
  grammar: number;
  syntax: number;
  mechanics: number;
  punctuation: number;
  style: number;
}

export interface Stats {
  wordCount: number;
  sentenceCount: number;
  avgSentenceLength: number;
  readabilityGrade: number;
  passiveVoiceCount: number;
  adverbCount: number;
}

export interface AnalysisResult {
  issues: Issue[];
  scores: Scores;
  stats: Stats;
  tone?: string;
}

export interface HistoryEntry {
  id: string;
  timestamp: number;
  preview: string;
  text: string;
  result: AnalysisResult;
  score: number;
}

export interface CheckRequest {
  text: string;
  mode: ContentMode;
}

export type AppStatus = "idle" | "checking" | "done" | "error";

export interface HighlightRange {
  start: number;
  end: number;
  issue: Issue;
}

export const CATEGORY_COLORS: Record<Category, { name: string; dot: string; bg: string; border: string; darkDot: string; darkBg: string }> = {
  grammar: {
    name: "Grammar",
    dot: "bg-red-600",
    bg: "bg-red-600/[0.12]",
    border: "border-red-600",
    darkDot: "bg-red-400",
    darkBg: "bg-red-400/[0.12]",
  },
  syntax: {
    name: "Syntax",
    dot: "bg-orange-600",
    bg: "bg-orange-600/[0.12]",
    border: "border-orange-600",
    darkDot: "bg-orange-400",
    darkBg: "bg-orange-400/[0.12]",
  },
  mechanics: {
    name: "Mechanics",
    dot: "bg-yellow-600",
    bg: "bg-yellow-600/[0.12]",
    border: "border-yellow-600",
    darkDot: "bg-yellow-400",
    darkBg: "bg-yellow-400/[0.12]",
  },
  punctuation: {
    name: "Punctuation",
    dot: "bg-blue-600",
    bg: "bg-blue-600/[0.12]",
    border: "border-blue-600",
    darkDot: "bg-blue-400",
    darkBg: "bg-blue-400/[0.12]",
  },
  style: {
    name: "Style",
    dot: "bg-purple-600",
    bg: "bg-purple-600/[0.12]",
    border: "border-purple-600",
    darkDot: "bg-purple-400",
    darkBg: "bg-purple-400/[0.12]",
  },
};

export const SEVERITY_ORDER: Record<Severity, number> = {
  error: 0,
  warning: 1,
  suggestion: 2,
};

export const SEVERITY_LABELS: Record<Severity, { label: string; color: string; darkColor: string }> = {
  error: { label: "Error", color: "text-red-700 bg-red-100", darkColor: "text-red-300 bg-red-900/40" },
  warning: { label: "Warning", color: "text-amber-700 bg-amber-100", darkColor: "text-amber-300 bg-amber-900/40" },
  suggestion: { label: "Suggestion", color: "text-blue-700 bg-blue-100", darkColor: "text-blue-300 bg-blue-900/40" },
};
