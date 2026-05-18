import { NextRequest, NextResponse } from "next/server";
import { fetchUrlText } from "@/lib/extract";
import {
  getHydraClient,
  uploadKnowledgeText,
  addTopicMemory,
  addReconciliationMemory,
} from "@/lib/hydra";
import { generateWiki, getOpenAI } from "@/lib/openai";
import { reconcileWithPriorKnowledge } from "@/lib/knowledge-consistency";
import type { IngestMetrics, LearnedTopic } from "@/lib/types";

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
      priorTopics?: LearnedTopic[];
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

    if (rawText.length < 200) {
      return NextResponse.json(
        {
          error:
            "Upload at least ~200 characters for an accurate structured wiki (short snippets produce minimal coverage).",
        },
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

    const uploadGeneration = (priorTopics?.length ?? 0) + 1;
    const priorForWiki = priorTopics?.map((t) => ({
      title: t.title,
      summary: t.summary,
    }));
    const filename = `knowledge-gen${uploadGeneration}-${Date.now()}.txt`;

    const [sourceId, wiki] = await Promise.all([
      uploadKnowledgeText(hydra, rawText, filename),
      generateWiki(openai, rawText, priorForWiki),
    ]);

    const rawPreview = rawText.slice(0, 500);
    const reconciliation = await reconcileWithPriorKnowledge(
      openai,
      wiki,
      priorTopics ?? [],
      rawPreview,
      uploadGeneration,
    );

    const matchingPrior = priorTopics?.find(
      (t) => t.title.toLowerCase() === wiki.title.toLowerCase(),
    );

    await addTopicMemory(hydra, wiki.title, wiki.summary, wiki.keyConcepts, {
      generation: uploadGeneration,
      supersedesTitle: matchingPrior?.title,
    });

    await addReconciliationMemory(
      hydra,
      uploadGeneration,
      reconciliation.summary,
      reconciliation.conflicts.length,
    );

    const metrics: IngestMetrics = {
      conceptsExtracted: wiki.keyConcepts.length,
      entitiesExtracted: wiki.entities.length,
      memoryCommitted: true,
      hydraSourceId: sourceId,
      processingMs: Date.now() - start,
      uploadGeneration,
      sourceChars: rawText.length,
      conflictsDetected: reconciliation.conflicts.length,
    };

    return NextResponse.json({
      wiki,
      rawPreview,
      hydraEnabled: true,
      metrics,
      reconciliation,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Ingest failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
