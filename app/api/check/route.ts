import { NextRequest, NextResponse } from "next/server";
import { analyzeText } from "@/lib/gemini";
import { CheckRequest, ContentMode } from "@/lib/types";

export const maxDuration = 30;

const VALID_MODES: ContentMode[] = ["general", "seo-article", "linkedin-post", "internal-doc"];

export async function POST(request: NextRequest) {
  try {
    const body: CheckRequest = await request.json();

    if (!body.text || typeof body.text !== "string") {
      return NextResponse.json(
        { error: "Text is required" },
        { status: 400 }
      );
    }

    if (body.text.length < 10) {
      return NextResponse.json(
        { error: "Text must be at least 10 characters" },
        { status: 400 }
      );
    }

    // Rough token estimate: ~1.3 tokens per word, ~5 chars per word
    const estimatedWords = body.text.split(/\s+/).length;
    if (estimatedWords > 30000) {
      return NextResponse.json(
        { error: "Text is too long. Keep it under ~30,000 words." },
        { status: 400 }
      );
    }

    const mode: ContentMode = VALID_MODES.includes(body.mode) ? body.mode : "general";

    if (!process.env.GOOGLE_API_KEY) {
      return NextResponse.json(
        { error: "GOOGLE_API_KEY not configured. Add it to .env.local" },
        { status: 500 }
      );
    }

    const result = await analyzeText(body.text, mode);
    return NextResponse.json(result);
  } catch (error: unknown) {
    const err = error as { status?: number; message?: string };

    if (err.status === 429 || err.message?.includes("429")) {
      return NextResponse.json(
        { error: "Rate limit reached. Free tier: 10 req/min, 250 req/day. Wait a moment." },
        { status: 429 }
      );
    }

    if (err.status === 401 || err.message?.includes("API key")) {
      return NextResponse.json(
        { error: "Invalid API key. Check your GOOGLE_API_KEY in .env.local" },
        { status: 401 }
      );
    }

    console.error("Check API error:", err.message || error);
    console.error("Full error:", JSON.stringify(error, Object.getOwnPropertyNames(error as object)));
    return NextResponse.json(
      { error: (err.message || "Analysis failed. Try again.") },
      { status: 500 }
    );
  }
}
