"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  AppStatus,
  AnalysisResult,
  Issue,
  Category,
  HistoryEntry,
} from "@/lib/types";
import { analyzeText } from "@/lib/gemini";
import Header from "@/components/Header";
import Editor from "@/components/Editor";
import FeedbackPanel from "@/components/FeedbackPanel";

const ALL_CATEGORIES: Category[] = [
  "grammar",
  "syntax",
  "mechanics",
  "punctuation",
  "style",
];

const DRAFT_KEY = "shakespeare-draft";
const DRAFT_TS_KEY = "shakespeare-draft-ts";
const DARK_KEY = "shakespeare-dark-mode";
const GOAL_KEY = "shakespeare-word-goal";
const HISTORY_KEY = "shakespeare-history";
const DRAFT_TTL = 24 * 60 * 60 * 1000; // 24 hours
const MAX_HISTORY = 10;

interface UndoSnapshot {
  text: string;
  issues: Issue[];
  result: AnalysisResult | null;
  status: AppStatus;
}

export default function Home() {
  const [text, setText] = useState("");
  const [status, setStatus] = useState<AppStatus>("idle");
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [activeIssueId, setActiveIssueId] = useState<string | null>(null);
  const [visibleCategories, setVisibleCategories] = useState<Set<Category>>(
    new Set(ALL_CATEGORIES)
  );
  const [isEditing, setIsEditing] = useState(false);
  const [isDark, setIsDark] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [wordGoal, setWordGoal] = useState<number | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const checkAbort = useRef<AbortController | null>(null);

  // Undo history stack
  const undoStack = useRef<UndoSnapshot[]>([]);
  const [canUndo, setCanUndo] = useState(false);

  const pushUndo = useCallback((snapshot: UndoSnapshot) => {
    undoStack.current.push(snapshot);
    if (undoStack.current.length > 50) undoStack.current.shift();
    setCanUndo(true);
  }, []);

  const popUndo = useCallback(() => {
    const snapshot = undoStack.current.pop();
    if (!snapshot) return;
    setText(snapshot.text);
    setIssues(snapshot.issues);
    setResult(snapshot.result);
    setStatus(snapshot.status);
    setActiveIssueId(null);
    setCanUndo(undoStack.current.length > 0);
  }, []);

  // Hydrate from localStorage
  useEffect(() => {
    const dark = localStorage.getItem(DARK_KEY) === "true";
    setIsDark(dark);
    if (dark) document.documentElement.classList.add("dark");

    const savedGoal = localStorage.getItem(GOAL_KEY);
    if (savedGoal) setWordGoal(parseInt(savedGoal, 10));

    try {
      const savedHistory = localStorage.getItem(HISTORY_KEY);
      if (savedHistory) setHistory(JSON.parse(savedHistory));
    } catch { /* ignore */ }

    const savedDraft = localStorage.getItem(DRAFT_KEY);
    const savedTs = localStorage.getItem(DRAFT_TS_KEY);
    if (savedDraft && savedTs) {
      const age = Date.now() - parseInt(savedTs, 10);
      if (age < DRAFT_TTL) {
        setText(savedDraft);
      } else {
        localStorage.removeItem(DRAFT_KEY);
        localStorage.removeItem(DRAFT_TS_KEY);
      }
    }

    setMounted(true);
  }, []);

  // Persist dark mode
  useEffect(() => {
    if (!mounted) return;
    localStorage.setItem(DARK_KEY, String(isDark));
    if (isDark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [isDark, mounted]);

  // Persist draft
  useEffect(() => {
    if (!mounted) return;
    if (text) {
      localStorage.setItem(DRAFT_KEY, text);
      localStorage.setItem(DRAFT_TS_KEY, String(Date.now()));
    }
  }, [text, mounted]);

  const wordCount = text.trim()
    ? text.trim().split(/\s+/).length
    : 0;

  const lastCheckTime = useRef<number>(0);
  const COOLDOWN_MS = 10000; // 10 second cooldown between checks

  const canCheck = text.length >= 10 && status !== "checking";

  const runCheck = useCallback(async () => {
    if (!canCheck) return;

    // Enforce cooldown
    const now = Date.now();
    const elapsed = now - lastCheckTime.current;
    if (elapsed < COOLDOWN_MS) {
      setErrorMessage(`Please wait ${Math.ceil((COOLDOWN_MS - elapsed) / 1000)}s before checking again.`);
      setStatus("error");
      return;
    }
    lastCheckTime.current = now;

    if (checkAbort.current) checkAbort.current.abort();
    const controller = new AbortController();
    checkAbort.current = controller;

    setStatus("checking");
    setErrorMessage(null);
    setIsEditing(false);
    setActiveIssueId(null);

    try {
      const data = await analyzeText(text, "general");
      // Check if aborted while waiting
      if (controller.signal.aborted) return;
      setResult(data);
      setIssues(data.issues);
      setVisibleCategories(new Set(ALL_CATEGORIES));
      setStatus("done");

      // Save to history
      const entry: HistoryEntry = {
        id: Date.now().toString(),
        timestamp: Date.now(),
        preview: text.slice(0, 80).replace(/\n/g, " "),
        text,
        result: data,
        score: data.scores.overall,
      };
      setHistory((prev) => {
        const next = [entry, ...prev].slice(0, MAX_HISTORY);
        localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
        return next;
      });
    } catch (err: unknown) {
      if ((err as Error).name === "AbortError") return;
      setStatus("error");
      setErrorMessage(
        (err as Error).message || "Analysis failed. Try again."
      );
    }
  }, [text, canCheck]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault();
        runCheck();
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "z" && canUndo) {
        // Only intercept undo when we have fix history to undo
        // Don't intercept normal text editing undo
        if (status === "done") {
          e.preventDefault();
          popUndo();
        }
      }
      if (e.key === "Escape") {
        setActiveIssueId(null);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [runCheck, canUndo, popUndo, status]);

  const handleTextChange = useCallback(
    (newText: string) => {
      setText(newText);
      if (status === "done") {
        setStatus("idle");
        setResult(null);
        setIssues([]);
        setActiveIssueId(null);
      }
    },
    [status]
  );

  const handleEditToggle = useCallback(
    (editing: boolean) => {
      setIsEditing(editing);
      if (editing) {
        setStatus("idle");
        setResult(null);
        setIssues([]);
        setActiveIssueId(null);
      }
    },
    []
  );

  const handleApplyFix = useCallback(
    (issue: Issue) => {
      // Save undo snapshot before applying
      pushUndo({ text, issues, result, status });

      let newText = text;
      let searchFrom = 0;
      for (let i = 0; i <= issue.occurrenceIndex; i++) {
        const pos = newText.indexOf(issue.flaggedText, searchFrom);
        if (pos === -1) return;
        if (i === issue.occurrenceIndex) {
          newText =
            newText.slice(0, pos) +
            issue.suggestion +
            newText.slice(pos + issue.flaggedText.length);
          break;
        }
        searchFrom = pos + 1;
      }
      setText(newText);
      setIssues((prev) => prev.filter((i) => i.id !== issue.id));
      setActiveIssueId(null);
    },
    [text, issues, result, status, pushUndo]
  );

  const handleApplyAll = useCallback(() => {
    // Save undo snapshot before applying all
    pushUndo({ text, issues, result, status });

    const sorted = [...issues]
      .map((issue) => {
        let pos = -1;
        let searchFrom = 0;
        for (let i = 0; i <= issue.occurrenceIndex; i++) {
          pos = text.indexOf(issue.flaggedText, searchFrom);
          if (pos === -1) break;
          searchFrom = pos + 1;
        }
        return { ...issue, _pos: pos };
      })
      .filter((i) => i._pos !== -1)
      .sort((a, b) => b._pos - a._pos);

    let newText = text;
    for (const issue of sorted) {
      newText =
        newText.slice(0, issue._pos) +
        issue.suggestion +
        newText.slice(issue._pos + issue.flaggedText.length);
    }

    setText(newText);
    setIssues([]);
    setResult(null);
    setStatus("idle");
    setActiveIssueId(null);
  }, [text, issues, result, status, pushUndo]);

  const handleDismiss = useCallback((id: string) => {
    setIssues((prev) => prev.filter((i) => i.id !== id));
    setActiveIssueId((prev) => (prev === id ? null : prev));
  }, []);

  const handleToggleCategory = useCallback((cat: Category) => {
    setVisibleCategories((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) {
        next.delete(cat);
      } else {
        next.add(cat);
      }
      return next;
    });
  }, []);

  const handleSetWordGoal = useCallback((goal: number | null) => {
    setWordGoal(goal);
    if (goal) {
      localStorage.setItem(GOAL_KEY, String(goal));
    } else {
      localStorage.removeItem(GOAL_KEY);
    }
  }, []);

  const handleLoadHistory = useCallback((entry: HistoryEntry) => {
    setText(entry.text);
    setResult(entry.result);
    setIssues(entry.result.issues);
    setVisibleCategories(new Set(ALL_CATEGORIES));
    setStatus("done");
    setIsEditing(false);
    setActiveIssueId(null);
  }, []);

  const handleSelectIssue = useCallback((id: string | null) => {
    setActiveIssueId(id);
    if (id) {
      setTimeout(() => {
        // Scroll the issue card into view in the feedback panel
        const card = document.querySelector(`[data-issue-id="${id}"]`);
        card?.scrollIntoView({ behavior: "smooth", block: "nearest" });
        // Scroll the highlight into view in the editor
        const mark = document.querySelector(`.editor-overlay mark[data-id="${id}"]`);
        if (mark) {
          mark.scrollIntoView({ behavior: "smooth", block: "center" });
          // Also sync the textarea scroll to match the overlay
          const overlay = mark.closest('.editor-overlay');
          const textarea = overlay?.previousElementSibling as HTMLTextAreaElement | null;
          if (overlay && textarea) {
            textarea.scrollTop = (overlay as HTMLElement).scrollTop;
          }
        }
      }, 50);
    }
  }, []);

  if (!mounted) return null;

  return (
    <div className="h-screen flex flex-col">
      <Header
        wordCount={wordCount}
        score={result?.scores.overall ?? null}
        status={status}
        isDark={isDark}
        onToggleDark={() => setIsDark((d) => !d)}
        onCheck={runCheck}
        canCheck={canCheck}
        canUndo={canUndo}
        onUndo={popUndo}
        hasText={text.length > 0}
        text={text}
        wordGoal={wordGoal}
        onSetWordGoal={handleSetWordGoal}
        history={history}
        onLoadHistory={handleLoadHistory}
      />

      <div className="flex flex-1 min-h-0">
        <Editor
          text={text}
          onTextChange={handleTextChange}
          issues={issues}
          activeIssueId={activeIssueId}
          onSelectIssue={handleSelectIssue}
          visibleCategories={visibleCategories}
          isEditing={isEditing}
          onEditToggle={handleEditToggle}
          hasResults={status === "done"}
        />

        <FeedbackPanel
          result={result}
          issues={issues}
          activeIssueId={activeIssueId}
          onSelectIssue={handleSelectIssue}
          onApplyFix={handleApplyFix}
          onDismiss={handleDismiss}
          onApplyAll={handleApplyAll}
          visibleCategories={visibleCategories}
          onToggleCategory={handleToggleCategory}
          status={status}
          errorMessage={errorMessage}
          onRetry={runCheck}
          text={text}
        />
      </div>
    </div>
  );
}
