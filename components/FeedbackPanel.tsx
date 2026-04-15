"use client";

import { useState } from "react";
import { Issue, AnalysisResult, Category, CATEGORY_COLORS, SEVERITY_ORDER } from "@/lib/types";
import ScoreRing from "./ScoreRing";
import IssueCard from "./IssueCard";
import EmptyState from "./EmptyState";

interface FeedbackPanelProps {
  result: AnalysisResult | null;
  issues: Issue[];
  activeIssueId: string | null;
  onSelectIssue: (id: string | null) => void;
  onApplyFix: (issue: Issue) => void;
  onDismiss: (id: string) => void;
  onApplyAll: () => void;
  visibleCategories: Set<Category>;
  onToggleCategory: (cat: Category) => void;
  status: "idle" | "checking" | "done" | "error";
  errorMessage: string | null;
  onRetry: () => void;
  text: string;
}

const ALL_CATEGORIES: Category[] = ["grammar", "syntax", "mechanics", "punctuation", "style"];

function getReadabilityLabel(grade: number): string {
  if (grade <= 6) return "Very easy";
  if (grade <= 8) return "Easy to read";
  if (grade <= 10) return "Moderate";
  if (grade <= 12) return "Difficult";
  return "Very difficult";
}

const categoryScoreBarColors: Record<Category, string> = {
  grammar: "bg-red-500",
  syntax: "bg-orange-500",
  mechanics: "bg-yellow-500",
  punctuation: "bg-blue-500",
  style: "bg-purple-500",
};

function buildMarkdownReport(text: string, result: AnalysisResult, issues: Issue[]): string {
  const lines: string[] = [];
  lines.push("# Writing Analysis Report\n");
  lines.push(`**Overall Score: ${result.scores.overall}/100**\n`);
  lines.push("## Scores\n");
  lines.push(`| Category | Score |`);
  lines.push(`| --- | --- |`);
  for (const cat of ALL_CATEGORIES) {
    lines.push(`| ${CATEGORY_COLORS[cat].name} | ${result.scores[cat]}/100 |`);
  }
  lines.push("");
  lines.push("## Stats\n");
  lines.push(`- **Words:** ${result.stats.wordCount}`);
  lines.push(`- **Sentences:** ${result.stats.sentenceCount}`);
  lines.push(`- **Avg sentence length:** ${result.stats.avgSentenceLength.toFixed(1)}`);
  lines.push(`- **Readability:** Grade ${result.stats.readabilityGrade.toFixed(1)} — ${getReadabilityLabel(result.stats.readabilityGrade)}`);
  lines.push(`- **Passive voice:** ${result.stats.passiveVoiceCount}`);
  lines.push(`- **Adverbs:** ${result.stats.adverbCount}`);
  if (result.tone) lines.push(`- **Tone:** ${result.tone}`);
  lines.push("");

  if (issues.length > 0) {
    lines.push(`## Issues (${issues.length})\n`);
    for (const issue of issues) {
      const severity = issue.severity.charAt(0).toUpperCase() + issue.severity.slice(1);
      lines.push(`### ${CATEGORY_COLORS[issue.category].name} — ${severity}`);
      lines.push(`- **Flagged:** "${issue.flaggedText}"`);
      lines.push(`- **Suggestion:** ${issue.suggestion}`);
      lines.push(`- **Why:** ${issue.explanation}`);
      lines.push("");
    }
  } else {
    lines.push("## Issues\n");
    lines.push("No issues found.\n");
  }

  lines.push("---\n");
  lines.push("## Original Text\n");
  lines.push(text);

  return lines.join("\n");
}

export default function FeedbackPanel({
  result,
  issues,
  activeIssueId,
  onSelectIssue,
  onApplyFix,
  onDismiss,
  onApplyAll,
  visibleCategories,
  onToggleCategory,
  status,
  errorMessage,
  onRetry,
  text,
}: FeedbackPanelProps) {
  const [copiedMd, setCopiedMd] = useState(false);

  const handleCopyMd = async () => {
    if (!result) return;
    const md = buildMarkdownReport(text, result, issues);
    await navigator.clipboard.writeText(md);
    setCopiedMd(true);
    setTimeout(() => setCopiedMd(false), 2000);
  };
  if (status === "error" && errorMessage) {
    return (
      <div className="w-[420px] shrink-0 h-full border-l border-[var(--border-primary)] bg-[var(--bg-secondary)] flex flex-col items-center justify-center px-6 text-center">
        <div className="w-12 h-12 rounded-xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center mb-4">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-red-600 dark:text-red-400">
            <circle cx="12" cy="12" r="10" />
            <line x1="15" y1="9" x2="9" y2="15" />
            <line x1="9" y1="9" x2="15" y2="15" />
          </svg>
        </div>
        <p className="text-sm text-[var(--text-secondary)] mb-4">{errorMessage}</p>
        <button
          onClick={onRetry}
          className="text-sm font-medium px-4 py-2 rounded-lg bg-[var(--accent)] text-[var(--bg-primary)] hover:opacity-90 transition-opacity"
        >
          Try Again
        </button>
      </div>
    );
  }

  if (status === "checking") {
    return (
      <div className="w-[420px] shrink-0 h-full border-l border-[var(--border-primary)] bg-[var(--bg-secondary)] flex flex-col items-center justify-center">
        <svg width="32" height="32" viewBox="0 0 32 32" className="spinner text-[var(--text-muted)] mb-4">
          <circle cx="16" cy="16" r="12" fill="none" stroke="currentColor" strokeWidth="3" strokeDasharray="60" strokeLinecap="round" />
        </svg>
        <p className="text-sm text-[var(--text-muted)]">Analyzing your writing...</p>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="w-[420px] shrink-0 h-full border-l border-[var(--border-primary)] bg-[var(--bg-secondary)]">
        <EmptyState />
      </div>
    );
  }

  // Filter and sort visible issues
  const visibleIssues = issues
    .filter((i) => visibleCategories.has(i.category))
    .sort((a, b) => {
      const sevDiff = SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity];
      if (sevDiff !== 0) return sevDiff;
      return 0; // maintain original order (position-based from API)
    });

  // Count issues per category
  const categoryCounts: Record<Category, number> = {
    grammar: 0, syntax: 0, mechanics: 0, punctuation: 0, style: 0,
  };
  for (const issue of issues) {
    categoryCounts[issue.category]++;
  }

  return (
    <div className="w-[420px] shrink-0 h-full border-l border-[var(--border-primary)] bg-[var(--bg-secondary)] flex flex-col">
      {/* Score breakdown */}
      <div className="p-5 border-b border-[var(--border-primary)]">
        <div className="flex items-start gap-5">
          <ScoreRing score={result.scores.overall} />
          <div className="flex-1 space-y-2 pt-1">
            {ALL_CATEGORIES.map((cat) => (
              <div key={cat} className="flex items-center gap-2">
                <span className="text-xs text-[var(--text-muted)] w-20">
                  {CATEGORY_COLORS[cat].name}
                </span>
                <div className="flex-1 h-1.5 rounded-full bg-[var(--border-primary)]">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${categoryScoreBarColors[cat]}`}
                    style={{ width: `${result.scores[cat]}%` }}
                  />
                </div>
                <span className="text-xs font-medium text-[var(--text-secondary)] w-7 text-right">
                  {result.scores[cat]}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Readability + Tone */}
        <div className="flex items-center gap-3 mt-4 pt-3 border-t border-[var(--border-primary)]">
          <div className="flex-1 px-3 py-2 rounded-lg bg-[var(--bg-primary)]">
            <div className="text-xs font-semibold text-[var(--text-primary)]">
              Grade {result.stats.readabilityGrade.toFixed(1)} — {getReadabilityLabel(result.stats.readabilityGrade)}
            </div>
            <div className="text-[10px] text-[var(--text-muted)]">Readability</div>
          </div>
          {result.tone && (
            <div className="px-3 py-2 rounded-lg bg-purple-100 dark:bg-purple-900/30">
              <div className="text-xs font-semibold text-purple-700 dark:text-purple-300">{result.tone}</div>
              <div className="text-[10px] text-purple-500 dark:text-purple-400">Tone</div>
            </div>
          )}
        </div>

        {/* Quick stats */}
        <div className="flex items-center gap-4 mt-3 pt-3 border-t border-[var(--border-primary)]">
          <div className="text-center">
            <div className="text-xs font-semibold text-[var(--text-primary)]">
              {result.stats.passiveVoiceCount}
            </div>
            <div className="text-[10px] text-[var(--text-muted)]">Passive</div>
          </div>
          <div className="text-center">
            <div className="text-xs font-semibold text-[var(--text-primary)]">
              {result.stats.adverbCount}
            </div>
            <div className="text-[10px] text-[var(--text-muted)]">Adverbs</div>
          </div>
          <div className="text-center">
            <div className="text-xs font-semibold text-[var(--text-primary)]">
              {result.stats.avgSentenceLength.toFixed(1)}
            </div>
            <div className="text-[10px] text-[var(--text-muted)]">Avg len</div>
          </div>
          <button
            onClick={handleCopyMd}
            className="ml-auto flex items-center gap-1.5 text-xs font-medium text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
            title={copiedMd ? "Copied!" : "Copy report as Markdown"}
          >
            {copiedMd ? (
              <>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-green-500">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                Copied!
              </>
            ) : (
              <>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                </svg>
                Copy MD
              </>
            )}
          </button>
        </div>
      </div>

      {/* Filter toggles */}
      <div className="px-5 py-3 border-b border-[var(--border-primary)] flex items-center gap-2 flex-wrap">
        {ALL_CATEGORIES.map((cat) => {
          const active = visibleCategories.has(cat);
          const dotColor = categoryScoreBarColors[cat];
          return (
            <button
              key={cat}
              onClick={() => onToggleCategory(cat)}
              className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-full border transition-all ${
                active
                  ? "border-[var(--border-secondary)] bg-[var(--bg-card)] text-[var(--text-primary)]"
                  : "border-transparent bg-transparent text-[var(--text-muted)] opacity-50"
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${dotColor}`} />
              {CATEGORY_COLORS[cat].name}
              <span className="text-[var(--text-muted)]">{categoryCounts[cat]}</span>
            </button>
          );
        })}

        {issues.length > 0 && (
          <button
            onClick={onApplyAll}
            className="ml-auto text-[10px] font-medium text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
          >
            Apply All
          </button>
        )}
      </div>

      {/* Issue cards */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-3">
        {visibleIssues.length === 0 ? (
          <div className="text-center text-sm text-[var(--text-muted)] pt-8">
            {issues.length === 0 ? "No issues found!" : "No issues in selected categories."}
          </div>
        ) : (
          visibleIssues.map((issue, i) => (
            <IssueCard
              key={issue.id}
              issue={issue}
              isActive={issue.id === activeIssueId}
              index={i}
              onSelect={onSelectIssue}
              onApplyFix={onApplyFix}
              onDismiss={onDismiss}
            />
          ))
        )}
      </div>
    </div>
  );
}
