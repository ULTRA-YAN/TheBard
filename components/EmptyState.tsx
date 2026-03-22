"use client";

const pillars = [
  { name: "Grammar", color: "bg-red-500", desc: "Parts of speech, agreement, common confusions" },
  { name: "Syntax", color: "bg-orange-500", desc: "Sentence structure, fragments, run-ons" },
  { name: "Mechanics", color: "bg-yellow-500", desc: "Spelling, capitalization, formatting" },
  { name: "Punctuation", color: "bg-blue-500", desc: "Commas, semicolons, hyphens, dashes" },
  { name: "Style", color: "bg-purple-500", desc: "Voice, clarity, banned words, readability" },
];

export default function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center h-full px-6 text-center">
      <div className="w-16 h-16 rounded-2xl bg-[var(--bg-tertiary)] flex items-center justify-center mb-6">
        <svg
          width="32"
          height="32"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-[var(--text-muted)]"
        >
          <path d="M12 20h9" />
          <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
        </svg>
      </div>

      <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">
        Paste your text and hit Check
      </h3>
      <p className="text-sm text-[var(--text-muted)] mb-8 max-w-[280px]">
        WriteCheck analyzes your writing across five pillars for grammar, clarity, and style.
      </p>

      <div className="w-full max-w-[300px] space-y-3">
        {pillars.map((p) => (
          <div key={p.name} className="flex items-center gap-3 text-left">
            <span className={`w-2.5 h-2.5 rounded-full ${p.color} shrink-0`} />
            <div>
              <span className="text-sm font-medium text-[var(--text-primary)]">{p.name}</span>
              <span className="text-xs text-[var(--text-muted)] ml-2">{p.desc}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
