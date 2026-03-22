"use client";

import { AppStatus } from "@/lib/types";

interface HeaderProps {
  wordCount: number;
  score: number | null;
  status: AppStatus;
  isDark: boolean;
  onToggleDark: () => void;
  onCheck: () => void;
  canCheck: boolean;
  canUndo: boolean;
  onUndo: () => void;
}

export default function Header({
  wordCount,
  score,
  status,
  isDark,
  onToggleDark,
  onCheck,
  canCheck,
  canUndo,
  onUndo,
}: HeaderProps) {
  const scoreColor =
    score !== null
      ? score >= 80
        ? "text-green-600 dark:text-green-400"
        : score >= 60
          ? "text-yellow-600 dark:text-yellow-400"
          : "text-red-600 dark:text-red-400"
      : "";

  return (
    <header className="flex items-center justify-between px-6 py-3 border-b border-[var(--border-primary)] bg-[var(--bg-card)]">
      {/* Left: Logo */}
      <div className="flex items-center gap-5">
        <h1 className="font-display text-2xl text-[var(--text-primary)] italic">
          Shakespeare
        </h1>
      </div>

      {/* Center: Word count + Score */}
      <div className="flex items-center gap-4">
        <span className="text-sm text-[var(--text-muted)]">
          {wordCount.toLocaleString()} {wordCount === 1 ? "word" : "words"}
        </span>
        {score !== null && (
          <span className={`text-sm font-semibold ${scoreColor}`}>
            Score: {score}
          </span>
        )}
      </div>

      {/* Right: Undo + Dark toggle + Check button */}
      <div className="flex items-center gap-3">
        <button
          onClick={onUndo}
          disabled={!canUndo}
          className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-[var(--bg-secondary)] transition-colors text-[var(--text-muted)] disabled:opacity-30 disabled:cursor-not-allowed"
          aria-label="Undo"
          title="Undo (⌘Z)"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="1 4 1 10 7 10" />
            <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
          </svg>
        </button>

        <button
          onClick={onToggleDark}
          className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-[var(--bg-secondary)] transition-colors text-[var(--text-muted)]"
          aria-label="Toggle dark mode"
        >
          {isDark ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="5" />
              <line x1="12" y1="1" x2="12" y2="3" />
              <line x1="12" y1="21" x2="12" y2="23" />
              <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
              <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
              <line x1="1" y1="12" x2="3" y2="12" />
              <line x1="21" y1="12" x2="23" y2="12" />
              <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
              <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
            </svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
            </svg>
          )}
        </button>

        <button
          onClick={onCheck}
          disabled={!canCheck || status === "checking"}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--accent)] text-[var(--bg-primary)] text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
        >
          {status === "checking" ? (
            <>
              <svg width="16" height="16" viewBox="0 0 16 16" className="spinner">
                <circle cx="8" cy="8" r="6" fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="30" strokeLinecap="round" />
              </svg>
              Checking...
            </>
          ) : (
            <>
              Check writing
              <kbd className="text-[10px] opacity-60 ml-1 px-1 py-0.5 rounded bg-white/20">
                {typeof navigator !== "undefined" && /Mac/.test(navigator.userAgent) ? "⌘" : "Ctrl"}↵
              </kbd>
            </>
          )}
        </button>
      </div>
    </header>
  );
}
