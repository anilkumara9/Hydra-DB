import { NextRequest, NextResponse } from "next/server";
import { generateCrossTopicInsights, getOpenAI } from "@/lib/openai";

export const maxDuration = 45;

export async function POST(req: NextRequest) {
  try {
    const { topics } = (await req.json()) as {
      topics: { title: string; summary: string; concepts?: string[] }[];
    };

    if (!topics || topics.length < 2) {
      return NextResponse.json(
        { error: "Need at least 2 learned topics for cross-topic evolution" },
        { status: 400 },
      );
    }

    const openai = getOpenAI();
    if (!openai) {
      return NextResponse.json(
        { error: "OPENAI_API_KEY is not configured" },
        { status: 500 },
      );
    }

    const insight = await generateCrossTopicInsights(openai, topics);
    return NextResponse.json({ insight });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Evolution failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
