import { NextRequest, NextResponse } from "next/server";
import { generateInvestorBrief, getOpenAI } from "@/lib/openai";
import type { LearnedTopic, WikiPage } from "@/lib/types";

export const maxDuration = 45;

export async function POST(req: NextRequest) {
  try {
    const { wiki, topics, metrics } = (await req.json()) as {
      wiki: WikiPage | null;
      topics: LearnedTopic[];
      metrics?: {
        avgRecallMs?: number | null;
        recallConfidence?: number | null;
        hydraRelations?: number | null;
      };
    };

    if (!wiki && topics.length === 0) {
      return NextResponse.json(
        { error: "Upload knowledge first to generate an investor brief" },
        { status: 400 },
      );
    }

    const openai = getOpenAI();
    if (!openai) {
      return NextResponse.json(
        { error: "OPENAI_API_KEY not configured" },
        { status: 500 },
      );
    }

    const brief = await generateInvestorBrief(openai, wiki, topics, metrics);
    return NextResponse.json({ brief });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Brief generation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
