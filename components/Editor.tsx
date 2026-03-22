"use client";

import { useRef, useCallback, useEffect, useState } from "react";
import { Issue, Category, HighlightRange, SEVERITY_ORDER } from "@/lib/types";

interface EditorProps {
  text: string;
  onTextChange: (text: string) => void;
  issues: Issue[];
  activeIssueId: string | null;
  onSelectIssue: (id: string | null) => void;
  visibleCategories: Set<Category>;
  isEditing: boolean;
  onEditToggle: (editing: boolean) => void;
  hasResults: boolean;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function findNthOccurrence(text: string, search: string, n: number): number {
  let index = -1;
  for (let i = 0; i <= n; i++) {
    index = text.indexOf(search, index + 1);
    if (index === -1) return -1;
  }
  return index;
}

function computeHighlightRanges(
  text: string,
  issues: Issue[],
  visibleCategories: Set<Category>
): HighlightRange[] {
  const ranges: HighlightRange[] = [];

  for (const issue of issues) {
    if (!visibleCategories.has(issue.category)) continue;

    const pos = findNthOccurrence(text, issue.flaggedText, issue.occurrenceIndex);
    if (pos === -1) continue;

    ranges.push({
      start: pos,
      end: pos + issue.flaggedText.length,
      issue,
    });
  }

  // Sort by start position, then by severity (errors first)
  ranges.sort((a, b) => {
    if (a.start !== b.start) return a.start - b.start;
    return SEVERITY_ORDER[a.issue.severity] - SEVERITY_ORDER[b.issue.severity];
  });

  // Remove overlaps — keep the first (higher priority)
  const filtered: HighlightRange[] = [];
  let lastEnd = -1;
  for (const range of ranges) {
    if (range.start >= lastEnd) {
      filtered.push(range);
      lastEnd = range.end;
    }
  }

  return filtered;
}

function buildHighlightedHtml(
  text: string,
  ranges: HighlightRange[],
  activeIssueId: string | null
): string {
  if (ranges.length === 0) return escapeHtml(text);

  let html = "";
  let cursor = 0;

  for (const range of ranges) {
    // Add text before this range
    if (range.start > cursor) {
      html += escapeHtml(text.slice(cursor, range.start));
    }

    const isActive = range.issue.id === activeIssueId;
    html += `<mark class="editor-highlight${isActive ? " active" : ""}" data-category="${range.issue.category}" data-id="${range.issue.id}">${escapeHtml(text.slice(range.start, range.end))}</mark>`;

    cursor = range.end;
  }

  // Remaining text
  if (cursor < text.length) {
    html += escapeHtml(text.slice(cursor));
  }

  return html;
}

export default function Editor({
  text,
  onTextChange,
  issues,
  activeIssueId,
  onSelectIssue,
  visibleCategories,
  isEditing,
  onEditToggle,
  hasResults,
}: EditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isMac, setIsMac] = useState(false);

  useEffect(() => {
    setIsMac(/Mac/.test(navigator.userAgent));
  }, []);

  const syncScroll = useCallback(() => {
    if (textareaRef.current && overlayRef.current) {
      overlayRef.current.scrollTop = textareaRef.current.scrollTop;
      overlayRef.current.scrollLeft = textareaRef.current.scrollLeft;
    }
  }, []);

  const handleOverlayClick = useCallback(
    (e: React.MouseEvent) => {
      const target = e.target as HTMLElement;
      const mark = target.closest("[data-id]") as HTMLElement | null;
      if (mark) {
        const id = mark.getAttribute("data-id");
        onSelectIssue(id);
      }
    },
    [onSelectIssue]
  );

  const showOverlay = hasResults && !isEditing;

  const ranges = computeHighlightRanges(text, issues, visibleCategories);
  const highlightedHtml = buildHighlightedHtml(text, ranges, activeIssueId);

  return (
    <div ref={containerRef} className="relative flex-1 flex flex-col min-w-0 h-full">
      {/* Textarea — always present but sometimes transparent */}
      <textarea
        ref={textareaRef}
        value={text}
        onChange={(e) => onTextChange(e.target.value)}
        onScroll={syncScroll}
        onFocus={() => {
          if (hasResults && !isEditing) {
            onEditToggle(true);
          }
        }}
        spellCheck={false}
        placeholder={`Paste your article here...\n\nShakespeare analyzes your writing across five pillars:\n\n  Grammar — parts of speech, agreement, confusions\n  Syntax — sentence structure, fragments, run-ons\n  Mechanics — spelling, capitalization, formatting\n  Punctuation — commas, semicolons, dashes\n  Style — voice, clarity, banned words, readability\n\nHit "${isMac ? "⌘" : "Ctrl"}+Enter" or click "Check writing" to analyze.`}
        className={`absolute inset-0 w-full h-full resize-none p-6 font-mono text-[15px] leading-relaxed bg-transparent border-none outline-none custom-scrollbar text-[var(--text-primary)] placeholder:text-[var(--text-muted)] placeholder:opacity-60 ${
          showOverlay ? "text-transparent caret-transparent" : ""
        }`}
        style={{ zIndex: showOverlay ? 1 : 2 }}
      />

      {/* Highlight overlay */}
      {showOverlay && (
        <div
          ref={overlayRef}
          onClick={handleOverlayClick}
          className="editor-overlay absolute inset-0 w-full h-full p-6 font-mono text-[15px] leading-relaxed overflow-auto whitespace-pre-wrap break-words custom-scrollbar text-[var(--text-primary)] pointer-events-auto"
          style={{ zIndex: 2 }}
          dangerouslySetInnerHTML={{ __html: highlightedHtml }}
        />
      )}

      {/* Edit toggle button */}
      {hasResults && !isEditing && (
        <button
          onClick={() => onEditToggle(true)}
          className="absolute bottom-4 right-4 z-10 text-xs text-[var(--text-muted)] hover:text-[var(--text-secondary)] bg-[var(--bg-card)] border border-[var(--border-primary)] rounded-md px-3 py-1.5 shadow-sm transition-colors"
        >
          Click to edit
        </button>
      )}
    </div>
  );
}
