"use client";

import { useState, useRef, useEffect } from "react";
import { AppStatus, HistoryEntry } from "@/lib/types";

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
  hasText: boolean;
  text: string;
  wordGoal: number | null;
  onSetWordGoal: (goal: number | null) => void;
  history: HistoryEntry[];
  onLoadHistory: (entry: HistoryEntry) => void;
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
  hasText,
  text,
  wordGoal,
  onSetWordGoal,
  history,
  onLoadHistory,
}: HeaderProps) {
  const [copied, setCopied] = useState(false);
  const [showGoalInput, setShowGoalInput] = useState(false);
  const [goalValue, setGoalValue] = useState("");
  const [showHistory, setShowHistory] = useState(false);
  const goalRef = useRef<HTMLDivElement>(null);
  const historyRef = useRef<HTMLDivElement>(null);

  const scoreColor =
    score !== null
      ? score >= 80
        ? "text-green-600 dark:text-green-400"
        : score >= 60
          ? "text-yellow-600 dark:text-yellow-400"
          : "text-red-600 dark:text-red-400"
      : "";

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleGoalSubmit = () => {
    const num = parseInt(goalValue, 10);
    if (num > 0) {
      onSetWordGoal(num);
    } else {
      onSetWordGoal(null);
    }
    setShowGoalInput(false);
    setGoalValue("");
  };

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (goalRef.current && !goalRef.current.contains(e.target as Node)) setShowGoalInput(false);
      if (historyRef.current && !historyRef.current.contains(e.target as Node)) setShowHistory(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const goalProgress = wordGoal ? Math.min(wordCount / wordGoal, 1) : 0;
  const goalMet = wordGoal ? wordCount >= wordGoal : false;

  return (
    <div>
      <header className="flex items-center justify-between px-6 py-3 border-b border-[var(--border-primary)] bg-[var(--bg-card)]">
        {/* Left: Logo */}
        <div className="flex items-center gap-5">
          <h1 className="font-display text-2xl text-[var(--text-primary)] italic">
            Shakespeare
          </h1>
        </div>

        {/* Center: Word count + Score */}
        <div className="flex items-center gap-4">
          <div className="relative" ref={goalRef}>
            <button
              onClick={() => { setShowGoalInput(!showGoalInput); setGoalValue(wordGoal ? String(wordGoal) : ""); }}
              className="text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
              title="Click to set word goal"
            >
              {wordGoal ? (
                <span className={goalMet ? "text-green-600 dark:text-green-400 font-medium" : ""}>
                  {wordCount.toLocaleString()} / {wordGoal.toLocaleString()} words
                </span>
              ) : (
                <span>{wordCount.toLocaleString()} {wordCount === 1 ? "word" : "words"}</span>
              )}
            </button>
            {showGoalInput && (
              <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 bg-[var(--bg-card)] border border-[var(--border-primary)] rounded-lg shadow-lg p-3 z-50 w-48">
                <label className="text-xs text-[var(--text-muted)] block mb-1.5">Word goal</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={goalValue}
                    onChange={(e) => setGoalValue(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleGoalSubmit()}
                    placeholder="e.g. 1500"
                    className="flex-1 text-sm px-2 py-1 rounded border border-[var(--border-primary)] bg-[var(--bg-primary)] text-[var(--text-primary)] outline-none w-20"
                    autoFocus
                  />
                  <button onClick={handleGoalSubmit} className="text-xs font-medium px-2 py-1 rounded bg-[var(--accent)] text-[var(--bg-primary)]">
                    Set
                  </button>
                </div>
                {wordGoal && (
                  <button onClick={() => { onSetWordGoal(null); setShowGoalInput(false); }} className="text-[10px] text-[var(--text-muted)] mt-2 hover:text-[var(--text-primary)]">
                    Clear goal
                  </button>
                )}
              </div>
            )}
          </div>
          {score !== null && (
            <span className={`text-sm font-semibold ${scoreColor}`}>
              Score: {score}
            </span>
          )}
        </div>

        {/* Right: History + Copy + Undo + Dark toggle + Check button */}
        <div className="flex items-center gap-3">
          {/* History */}
          <div className="relative" ref={historyRef}>
            <button
              onClick={() => setShowHistory(!showHistory)}
              disabled={history.length === 0}
              className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-[var(--bg-secondary)] transition-colors text-[var(--text-muted)] disabled:opacity-30 disabled:cursor-not-allowed"
              aria-label="History"
              title="Check history"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
            </button>
            {showHistory && history.length > 0 && (
              <div className="absolute top-full mt-2 right-0 bg-[var(--bg-card)] border border-[var(--border-primary)] rounded-lg shadow-lg z-50 w-72 max-h-80 overflow-y-auto custom-scrollbar">
                <div className="p-3 border-b border-[var(--border-primary)]">
                  <span className="text-xs font-medium text-[var(--text-muted)]">Recent checks</span>
                </div>
                {history.map((entry) => (
                  <button
                    key={entry.id}
                    onClick={() => { onLoadHistory(entry); setShowHistory(false); }}
                    className="w-full text-left px-3 py-2.5 hover:bg-[var(--bg-secondary)] transition-colors border-b border-[var(--border-primary)] last:border-0"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-xs font-semibold ${
                        entry.score >= 80 ? "text-green-600 dark:text-green-400" :
                        entry.score >= 60 ? "text-yellow-600 dark:text-yellow-400" :
                        "text-red-600 dark:text-red-400"
                      }`}>
                        Score: {entry.score}
                      </span>
                      <span className="text-[10px] text-[var(--text-muted)]">
                        {new Date(entry.timestamp).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                        {" "}
                        {new Date(entry.timestamp).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}
                      </span>
                    </div>
                    <p className="text-xs text-[var(--text-secondary)] truncate">{entry.preview}</p>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Copy text */}
          <button
            onClick={handleCopy}
            disabled={!hasText}
            className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-[var(--bg-secondary)] transition-colors text-[var(--text-muted)] disabled:opacity-30 disabled:cursor-not-allowed"
            aria-label="Copy text"
            title={copied ? "Copied!" : "Copy text"}
          >
            {copied ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-green-500">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
              </svg>
            )}
          </button>

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

      {/* Word goal progress bar */}
      {wordGoal && (
        <div className="h-1 bg-[var(--border-primary)]">
          <div
            className={`h-full transition-all duration-300 ${goalMet ? "bg-green-500" : "bg-[var(--accent)]"}`}
            style={{ width: `${goalProgress * 100}%` }}
          />
        </div>
      )}
    </div>
  );
}
