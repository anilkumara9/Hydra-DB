import { NextRequest } from "next/server";
import { getHydraClient, recallWithTrace } from "@/lib/hydra";
import { getOpenAI, streamAnswer } from "@/lib/openai";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const { question, sessionContext, thinkingMode, uploadGeneration } =
    (await req.json()) as {
      question?: string;
      sessionContext?: string;
      thinkingMode?: boolean;
      uploadGeneration?: number;
    };

  if (!question?.trim()) {
    return new Response(JSON.stringify({ error: "Question required" }), {
      status: 400,
    });
  }

  const hydra = getHydraClient();
  const openai = getOpenAI();
  if (!hydra || !openai) {
    return new Response(JSON.stringify({ error: "API keys not configured" }), {
      status: 503,
    });
  }

  const recalled = await recallWithTrace(hydra, question, {
    thinking: thinkingMode,
    sessionContext,
    uploadGeneration: uploadGeneration ?? 1,
  });

  if (!recalled.context.trim()) {
    return new Response(
      JSON.stringify({
        error: "No HydraDB context yet. Wait for indexing after upload.",
      }),
      { status: 400 },
    );
  }

  const encoder = new TextEncoder();
  const trace = recalled.trace;

  const stream = new ReadableStream({
    async start(controller) {
      controller.enqueue(
        encoder.encode(
          `data: ${JSON.stringify({ type: "meta", reasoning: trace })}\n\n`,
        ),
      );
      try {
        const tokens = await streamAnswer(openai, question, recalled.context);
        for await (const token of tokens) {
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ type: "token", text: token })}\n\n`,
            ),
          );
        }
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ type: "done" })}\n\n`),
        );
      } catch (e) {
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({
              type: "error",
              message: e instanceof Error ? e.message : "Stream failed",
            })}\n\n`,
          ),
        );
      }
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
