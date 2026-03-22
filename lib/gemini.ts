import { AnalysisResult, ContentMode } from "@/lib/types";
import { buildSystemPrompt, buildUserPrompt } from "@/lib/prompt";

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function validateAndClean(result: AnalysisResult, inputText: string): AnalysisResult {
  const validIssues = (result.issues || []).filter((issue) => {
    if (!issue.flaggedText || typeof issue.flaggedText !== "string") return false;
    return inputText.includes(issue.flaggedText);
  });

  const reindexed = validIssues.map((issue, i) => ({
    ...issue,
    id: `issue_${i + 1}`,
  }));

  const scores = {
    overall: clamp(result.scores?.overall ?? 50, 0, 100),
    grammar: clamp(result.scores?.grammar ?? 50, 0, 100),
    syntax: clamp(result.scores?.syntax ?? 50, 0, 100),
    mechanics: clamp(result.scores?.mechanics ?? 50, 0, 100),
    punctuation: clamp(result.scores?.punctuation ?? 50, 0, 100),
    style: clamp(result.scores?.style ?? 50, 0, 100),
  };

  return {
    issues: reindexed,
    scores,
    stats: {
      wordCount: result.stats?.wordCount ?? 0,
      sentenceCount: result.stats?.sentenceCount ?? 0,
      avgSentenceLength: result.stats?.avgSentenceLength ?? 0,
      readabilityGrade: result.stats?.readabilityGrade ?? 0,
      passiveVoiceCount: result.stats?.passiveVoiceCount ?? 0,
      adverbCount: result.stats?.adverbCount ?? 0,
    },
  };
}

const RESPONSE_SCHEMA = {
  type: "OBJECT" as const,
  properties: {
    issues: {
      type: "ARRAY" as const,
      items: {
        type: "OBJECT" as const,
        properties: {
          id: { type: "STRING" as const },
          category: { type: "STRING" as const },
          severity: { type: "STRING" as const },
          flaggedText: { type: "STRING" as const },
          occurrenceIndex: { type: "NUMBER" as const },
          explanation: { type: "STRING" as const },
          suggestion: { type: "STRING" as const },
          rule: { type: "STRING" as const },
        },
        required: ["id", "category", "severity", "flaggedText", "occurrenceIndex", "explanation", "suggestion", "rule"],
      },
    },
    scores: {
      type: "OBJECT" as const,
      properties: {
        overall: { type: "NUMBER" as const },
        grammar: { type: "NUMBER" as const },
        syntax: { type: "NUMBER" as const },
        mechanics: { type: "NUMBER" as const },
        punctuation: { type: "NUMBER" as const },
        style: { type: "NUMBER" as const },
      },
      required: ["overall", "grammar", "syntax", "mechanics", "punctuation", "style"],
    },
    stats: {
      type: "OBJECT" as const,
      properties: {
        wordCount: { type: "NUMBER" as const },
        sentenceCount: { type: "NUMBER" as const },
        avgSentenceLength: { type: "NUMBER" as const },
        readabilityGrade: { type: "NUMBER" as const },
        passiveVoiceCount: { type: "NUMBER" as const },
        adverbCount: { type: "NUMBER" as const },
      },
      required: ["wordCount", "sentenceCount", "avgSentenceLength", "readabilityGrade", "passiveVoiceCount", "adverbCount"],
    },
  },
  required: ["issues", "scores", "stats"],
};

// Use gemini-2.0-flash for speed (3-4x faster than 2.5-flash for this task)
const MODEL = "gemini-2.0-flash";
const CHUNK_WORD_LIMIT = 1500; // Split articles larger than this into parallel chunks

export async function analyzeText(
  text: string,
  mode: ContentMode
): Promise<AnalysisResult> {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_API_KEY;
  if (!apiKey) {
    throw new Error("API key not configured. Set NEXT_PUBLIC_GOOGLE_API_KEY in your environment.");
  }

  const wordCount = text.trim().split(/\s+/).length;

  // For short texts, single call. For long texts, split into chunks and run in parallel.
  if (wordCount <= CHUNK_WORD_LIMIT) {
    return callGemini(apiKey, text, mode);
  }

  // Split text into chunks at paragraph boundaries
  const chunks = splitIntoChunks(text, CHUNK_WORD_LIMIT);

  // Run all chunks in parallel
  const results = await Promise.all(
    chunks.map((chunk) => callGemini(apiKey, chunk, mode))
  );

  // Merge results
  return mergeResults(results, text);
}

function splitIntoChunks(text: string, maxWords: number): string[] {
  const paragraphs = text.split(/\n\s*\n/);
  const chunks: string[] = [];
  let current = "";
  let currentWords = 0;

  for (const para of paragraphs) {
    const paraWords = para.trim().split(/\s+/).length;
    if (currentWords + paraWords > maxWords && current.length > 0) {
      chunks.push(current.trim());
      current = para;
      currentWords = paraWords;
    } else {
      current += (current ? "\n\n" : "") + para;
      currentWords += paraWords;
    }
  }
  if (current.trim()) chunks.push(current.trim());

  return chunks;
}

function mergeResults(results: AnalysisResult[], fullText: string): AnalysisResult {
  // Combine all issues, re-index IDs
  const allIssues = results.flatMap((r) => r.issues);
  const reindexed = allIssues.map((issue, i) => ({ ...issue, id: `issue_${i + 1}` }));

  // Average scores weighted by chunk size
  const totalIssues = allIssues.length;
  const avgScores = {
    overall: Math.round(results.reduce((s, r) => s + r.scores.overall, 0) / results.length),
    grammar: Math.round(results.reduce((s, r) => s + r.scores.grammar, 0) / results.length),
    syntax: Math.round(results.reduce((s, r) => s + r.scores.syntax, 0) / results.length),
    mechanics: Math.round(results.reduce((s, r) => s + r.scores.mechanics, 0) / results.length),
    punctuation: Math.round(results.reduce((s, r) => s + r.scores.punctuation, 0) / results.length),
    style: Math.round(results.reduce((s, r) => s + r.scores.style, 0) / results.length),
  };

  // Sum stats
  const stats = {
    wordCount: results.reduce((s, r) => s + r.stats.wordCount, 0),
    sentenceCount: results.reduce((s, r) => s + r.stats.sentenceCount, 0),
    avgSentenceLength: Math.round(results.reduce((s, r) => s + r.stats.avgSentenceLength, 0) / results.length),
    readabilityGrade: Math.round(results.reduce((s, r) => s + r.stats.readabilityGrade, 0) / results.length * 10) / 10,
    passiveVoiceCount: results.reduce((s, r) => s + r.stats.passiveVoiceCount, 0),
    adverbCount: results.reduce((s, r) => s + r.stats.adverbCount, 0),
  };

  return validateAndClean({ issues: reindexed, scores: avgScores, stats }, fullText);
}

async function callGemini(
  apiKey: string,
  text: string,
  mode: ContentMode
): Promise<AnalysisResult> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${apiKey}`;

  const body = {
    systemInstruction: {
      parts: [{ text: buildSystemPrompt(mode) }],
    },
    contents: [
      {
        role: "user",
        parts: [{ text: buildUserPrompt(text) }],
      },
    ],
    generationConfig: {
      temperature: 0.1,
      topP: 0.95,
      maxOutputTokens: 8192,
      responseMimeType: "application/json",
      responseSchema: RESPONSE_SCHEMA,
    },
  };

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errBody = await res.text();
    if (res.status === 429) throw Object.assign(new Error("Rate limited. Wait a moment and try again."), { status: 429 });
    if (res.status === 401 || res.status === 403) throw Object.assign(new Error("Invalid API key"), { status: 401 });
    throw new Error(`Gemini API error ${res.status}: ${errBody.slice(0, 200)}`);
  }

  const data = await res.json();

  const candidate = data.candidates?.[0];
  const parts = candidate?.content?.parts;
  if (!parts || parts.length === 0) {
    throw new Error("Empty response from Gemini");
  }

  let rawJson: string = parts.map((p: { text?: string }) => p.text || "").join("");
  rawJson = rawJson.replace(/^```(?:json)?\s*\n?/i, "").replace(/\n?```\s*$/i, "").trim();

  let parsed: AnalysisResult;
  try {
    parsed = JSON.parse(rawJson);
  } catch {
    try {
      parsed = JSON.parse(fixBrokenJsonStrings(rawJson));
    } catch {
      try {
        parsed = JSON.parse(repairTruncatedJson(rawJson));
      } catch {
        try {
          parsed = extractPartialResult(rawJson);
        } catch {
          throw new Error("Analysis failed — try again.");
        }
      }
    }
  }

  return validateAndClean(parsed, text);
}

/**
 * Last resort: use regex to extract individual issue objects from broken JSON.
 * Even if the overall JSON is malformed, individual objects are often valid.
 */
function extractPartialResult(raw: string): AnalysisResult {
  const issuePattern = /\{[^{}]*"id"\s*:\s*"[^"]*"[^{}]*"category"\s*:\s*"[^"]*"[^{}]*"flaggedText"\s*:\s*"[^"]*"[^{}]*\}/g;
  const matches = raw.match(issuePattern) || [];

  const issues = [];
  for (const m of matches) {
    try {
      const obj = JSON.parse(m);
      if (obj.id && obj.category && obj.flaggedText) {
        issues.push(obj);
      }
    } catch {
      // skip malformed individual objects
    }
  }

  // Try to extract scores
  const scoresMatch = raw.match(/"scores"\s*:\s*(\{[^{}]+\})/);
  let scores = { overall: 50, grammar: 50, syntax: 50, mechanics: 50, punctuation: 50, style: 50 };
  if (scoresMatch) {
    try { scores = { ...scores, ...JSON.parse(scoresMatch[1]) }; } catch { /* use defaults */ }
  }

  // Try to extract stats
  const statsMatch = raw.match(/"stats"\s*:\s*(\{[^{}]+\})/);
  let stats = { wordCount: 0, sentenceCount: 0, avgSentenceLength: 0, readabilityGrade: 0, passiveVoiceCount: 0, adverbCount: 0 };
  if (statsMatch) {
    try { stats = { ...stats, ...JSON.parse(statsMatch[1]) }; } catch { /* use defaults */ }
  }

  if (issues.length === 0) throw new Error("No valid issues extracted");

  return { issues, scores, stats };
}

/**
 * Attempt to repair truncated JSON by:
 * 1. Removing any trailing incomplete value
 * 2. Closing all open brackets/braces
 * 3. Ensuring we have valid issues array + scores + stats
 */
function repairTruncatedJson(raw: string): string {
  let s = raw.trim();

  // If truncated mid-string, find the last complete key-value pair
  // by looking for the last complete object in the issues array
  const issuesStart = s.indexOf('"issues"');
  if (issuesStart === -1) throw new Error("No issues array found in response");

  // Find the last complete object boundary: "},"  or "}" followed by "]"
  // Walk backwards to find the last cleanly closed object
  let lastGoodPos = -1;
  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (escaped) { escaped = false; continue; }
    if (ch === '\\' && inString) { escaped = true; continue; }
    if (ch === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (ch === '{' || ch === '[') depth++;
    if (ch === '}' || ch === ']') {
      depth--;
      if (depth === 1 && ch === '}') {
        // Just closed an issue object at depth 1 (inside the issues array)
        lastGoodPos = i;
      }
    }
  }

  if (lastGoodPos > 0) {
    // Cut after last complete issue object, close the array + add default scores/stats
    s = s.slice(0, lastGoodPos + 1);
    s += '], "scores": {"overall": 50, "grammar": 50, "syntax": 50, "mechanics": 50, "punctuation": 50, "style": 50}, "stats": {"wordCount": 0, "sentenceCount": 0, "avgSentenceLength": 0, "readabilityGrade": 0, "passiveVoiceCount": 0, "adverbCount": 0}}';
    return s;
  }

  // Fallback: just close all open structures
  // Count open braces/brackets
  let opens = 0;
  let openBrackets = 0;
  inString = false;
  escaped = false;
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (escaped) { escaped = false; continue; }
    if (ch === '\\' && inString) { escaped = true; continue; }
    if (ch === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (ch === '{') opens++;
    if (ch === '}') opens--;
    if (ch === '[') openBrackets++;
    if (ch === ']') openBrackets--;
  }

  // If we're still inside a string, close it
  if (inString) s += '"';

  // Remove trailing comma
  s = s.replace(/,\s*$/, '');

  for (let i = 0; i < openBrackets; i++) s += ']';
  for (let i = 0; i < opens; i++) s += '}';

  return s;
}

/**
 * Walk through JSON character by character.
 * When inside a string value, escape any unescaped double quote that
 * isn't the closing quote (detected by checking if the next non-whitespace
 * char is , or } or ] or :).
 */
function fixBrokenJsonStrings(raw: string): string {
  const chars = raw.split("");
  const out: string[] = [];
  let i = 0;

  while (i < chars.length) {
    if (chars[i] === '"') {
      // Start of a string — find the real end
      out.push('"');
      i++;
      while (i < chars.length) {
        if (chars[i] === '\\') {
          // Already escaped character — pass through
          out.push(chars[i], chars[i + 1] || "");
          i += 2;
          continue;
        }
        if (chars[i] === '"') {
          // Is this the closing quote? Look ahead past whitespace.
          let peek = i + 1;
          while (peek < chars.length && (chars[peek] === ' ' || chars[peek] === '\n' || chars[peek] === '\r' || chars[peek] === '\t')) {
            peek++;
          }
          const next = chars[peek];
          if (next === ',' || next === '}' || next === ']' || next === ':' || next === undefined) {
            // This is the real closing quote
            out.push('"');
            i++;
            break;
          } else {
            // This is an unescaped quote inside the string — escape it
            out.push('\\"');
            i++;
            continue;
          }
        }
        // Handle unescaped newlines inside strings
        if (chars[i] === '\n') { out.push('\\n'); i++; continue; }
        if (chars[i] === '\r') { out.push('\\r'); i++; continue; }
        if (chars[i] === '\t') { out.push('\\t'); i++; continue; }
        out.push(chars[i]);
        i++;
      }
    } else {
      out.push(chars[i]);
      i++;
    }
  }

  return out.join("");
}
