import { NextRequest } from "next/server";
import { getHydraClient, recallWithTrace, addTopicMemory } from "@/lib/hydra";
import { getOpenAI, streamAnswer } from "@/lib/openai";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const { question, sessionContext, thinkingMode } = (await req.json()) as {
    question?: string;
    sessionContext?: string;
    thinkingMode?: boolean;
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

  const recalled = await recallWithTrace(hydra, question, thinkingMode);
  const context = [sessionContext, recalled.context].filter(Boolean).join("\n\n");

  if (!context.trim()) {
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
        const tokens = await streamAnswer(openai, question, context);
        for await (const token of tokens) {
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ type: "token", text: token })}\n\n`,
            ),
          );
        }
        await addTopicMemory(
          hydra,
          "Chat interaction",
          `Q: ${question.slice(0, 120)}`,
        );
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
