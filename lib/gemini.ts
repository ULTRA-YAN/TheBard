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

export async function analyzeText(
  text: string,
  mode: ContentMode
): Promise<AnalysisResult> {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_API_KEY;
  if (!apiKey) {
    throw new Error("API key not configured. Set NEXT_PUBLIC_GOOGLE_API_KEY in your environment.");
  }

  // Call the REST API directly — the SDK's .text() method can corrupt
  // JSON when Gemini includes unescaped quotes in string values.
  // The REST API returns properly structured JSON parts we can use directly.
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

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
      maxOutputTokens: 65536,
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
    if (res.status === 429) throw Object.assign(new Error("Rate limited"), { status: 429 });
    if (res.status === 401 || res.status === 403) throw Object.assign(new Error("Invalid API key"), { status: 401 });
    throw new Error(`Gemini API error ${res.status}: ${errBody.slice(0, 200)}`);
  }

  const data = await res.json();

  // The response structure: data.candidates[0].content.parts[0].text
  // When responseMimeType is "application/json", the parts contain JSON text.
  const candidate = data.candidates?.[0];
  if (!candidate?.content?.parts?.[0]?.text) {
    throw new Error("Empty response from Gemini");
  }

  // Check if response was truncated
  const finishReason = candidate.finishReason;
  let rawJson: string = candidate.content.parts[0].text;

  let parsed: AnalysisResult;
  try {
    parsed = JSON.parse(rawJson);
  } catch {
    // Try fixing unescaped quotes
    try {
      const fixed = fixBrokenJsonStrings(rawJson);
      parsed = JSON.parse(fixed);
    } catch {
      // Response may be truncated (hit token limit). Try to salvage it
      // by closing all open JSON structures.
      const repaired = repairTruncatedJson(rawJson);
      try {
        parsed = JSON.parse(repaired);
      } catch (finalErr) {
        console.error("All JSON parse attempts failed. finishReason:", finishReason);
        console.error("Raw length:", rawJson.length, "Last 100 chars:", rawJson.slice(-100));
        throw finalErr;
      }
    }
  }

  return validateAndClean(parsed, text);
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
