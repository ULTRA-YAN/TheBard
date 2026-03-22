"use client";

import { Issue, CATEGORY_COLORS, SEVERITY_LABELS } from "@/lib/types";

interface IssueCardProps {
  issue: Issue;
  isActive: boolean;
  index: number;
  onSelect: (id: string) => void;
  onApplyFix: (issue: Issue) => void;
  onDismiss: (id: string) => void;
}

export default function IssueCard({
  issue,
  isActive,
  index,
  onSelect,
  onApplyFix,
  onDismiss,
}: IssueCardProps) {
  const catColor = CATEGORY_COLORS[issue.category];
  const sevLabel = SEVERITY_LABELS[issue.severity];

  const borderColorMap: Record<string, string> = {
    grammar: "border-l-red-600 dark:border-l-red-400",
    syntax: "border-l-orange-600 dark:border-l-orange-400",
    mechanics: "border-l-yellow-600 dark:border-l-yellow-400",
    punctuation: "border-l-blue-600 dark:border-l-blue-400",
    style: "border-l-purple-600 dark:border-l-purple-400",
  };

  return (
    <div
      className={`card-animate border-l-[3px] rounded-r-lg bg-[var(--bg-card)] border border-[var(--border-primary)] p-4 cursor-pointer transition-all hover:border-[var(--border-secondary)] ${
        borderColorMap[issue.category]
      } ${isActive ? "ring-1 ring-[var(--accent)]" : ""}`}
      style={{ animationDelay: `${index * 50}ms` }}
      onClick={() => onSelect(issue.id)}
      data-issue-id={issue.id}
    >
      {/* Header row */}
      <div className="flex items-center gap-2 mb-2">
        <span className={`w-2.5 h-2.5 rounded-full ${catColor.dot} dark:${catColor.darkDot}`} />
        <span className="text-xs font-medium text-[var(--text-muted)]">
          {catColor.name}
        </span>
        <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${sevLabel.color} dark:${sevLabel.darkColor}`}>
          {sevLabel.label}
        </span>
        <span className="ml-auto text-[10px] text-[var(--text-muted)] font-medium">
          {issue.rule}
        </span>
      </div>

      {/* Flagged text */}
      <div className="text-sm font-mono bg-[var(--bg-secondary)] rounded px-2 py-1.5 mb-2 text-[var(--text-secondary)] break-words">
        &ldquo;{issue.flaggedText}&rdquo;
      </div>

      {/* Suggestion diff */}
      {issue.suggestion && issue.suggestion !== issue.flaggedText && (
        <div className="text-sm mb-2 flex items-center gap-1.5 flex-wrap">
          <span className="line-through text-[var(--text-muted)]">{issue.flaggedText}</span>
          <span className="text-[var(--text-muted)]">&rarr;</span>
          <span className="font-medium text-green-700 dark:text-green-400">{issue.suggestion}</span>
        </div>
      )}

      {/* Explanation */}
      <p className="text-xs text-[var(--text-muted)] mb-3 leading-relaxed">
        {issue.explanation}
      </p>

      {/* Actions */}
      <div className="flex items-center gap-2">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onApplyFix(issue);
          }}
          className="text-xs font-medium px-3 py-1.5 rounded bg-[var(--accent)] text-[var(--bg-primary)] hover:opacity-90 transition-opacity"
        >
          Apply Fix
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDismiss(issue.id);
          }}
          className="text-xs text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors px-2 py-1.5"
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}
