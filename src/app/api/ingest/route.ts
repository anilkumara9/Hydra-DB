import { NextRequest, NextResponse } from "next/server";
import { fetchUrlText } from "@/lib/extract";
import {
  getHydraClient,
  uploadKnowledgeText,
  addTopicMemory,
} from "@/lib/hydra";
import { generateWiki, getOpenAI } from "@/lib/openai";
import type { IngestMetrics } from "@/lib/types";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const start = Date.now();
  try {
    const hydra = getHydraClient();
    if (!hydra) {
      return NextResponse.json(
        {
          error:
            "HYDRA_DB_API_KEY is required. WikiMind uses real HydraDB memory — no demo fallback.",
        },
        { status: 503 },
      );
    }

    const body = await req.json();
    const { type, content, url, priorTopics } = body as {
      type: "text" | "url";
      content?: string;
      url?: string;
      priorTopics?: { title: string; summary: string }[];
    };

    let rawText = "";
    if (type === "url" && url) {
      rawText = await fetchUrlText(url);
    } else if (type === "text" && content?.trim()) {
      rawText = content.trim().slice(0, 15000);
    } else {
      return NextResponse.json(
        { error: "Provide text content or a URL" },
        { status: 400 },
      );
    }

    if (rawText.length < 30) {
      return NextResponse.json(
        { error: "Not enough content to analyze" },
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

    const sourceId = await uploadKnowledgeText(
      hydra,
      rawText,
      `knowledge-${Date.now()}.txt`,
    );

    const wiki = await generateWiki(openai, rawText, priorTopics);

    await addTopicMemory(hydra, wiki.title, wiki.summary, wiki.keyConcepts);

    const metrics: IngestMetrics = {
      conceptsExtracted: wiki.keyConcepts.length,
      entitiesExtracted: wiki.entities.length,
      memoryCommitted: true,
      hydraSourceId: sourceId,
      processingMs: Date.now() - start,
      uploadGeneration: (priorTopics?.length ?? 0) + 1,
    };

    return NextResponse.json({
      wiki,
      rawPreview: rawText.slice(0, 500),
      hydraEnabled: true,
      metrics,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Ingest failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
