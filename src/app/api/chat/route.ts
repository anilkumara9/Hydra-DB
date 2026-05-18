import { NextRequest, NextResponse } from "next/server";
import { getHydraClient, recallWithTrace, addTopicMemory } from "@/lib/hydra";
import { answerWithReasoning, getOpenAI } from "@/lib/openai";
import type { ChatMessage } from "@/lib/types";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const { question, sessionContext, history, thinkingMode, uploadGeneration } =
      (await req.json()) as {
        question: string;
        sessionContext?: string;
        history?: ChatMessage[];
        thinkingMode?: boolean;
        uploadGeneration?: number;
      };

    if (!question?.trim()) {
      return NextResponse.json({ error: "Question required" }, { status: 400 });
    }

    const hydra = getHydraClient();
    if (!hydra) {
      return NextResponse.json(
        {
          error:
            "HYDRA_DB_API_KEY is required for recall. Configure HydraDB to enable agentic memory.",
        },
        { status: 503 },
      );
    }

    const openai = getOpenAI();
    if (!openai) {
      return NextResponse.json(
        { error: "OPENAI_API_KEY is not configured" },
        { status: 500 },
      );
    }

    const recalled = await recallWithTrace(hydra, question, {
      thinking: thinkingMode,
      sessionContext,
      uploadGeneration: uploadGeneration ?? 1,
    });

    if (!recalled.context.trim()) {
      return NextResponse.json(
        {
          error:
            "HydraDB returned no context yet. Upload knowledge and wait ~30–60s for indexing, then ask again.",
        },
        { status: 400 },
      );
    }

    const { answer, citations } = await answerWithReasoning(
      openai,
      question,
      recalled.context,
      history ?? [],
    );

    return NextResponse.json({
      answer,
      citations,
      reasoning: recalled.trace,
      usedHydra: true,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Chat failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
