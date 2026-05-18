import { NextRequest, NextResponse } from "next/server";
import { getHydraClient, recallWithTrace } from "@/lib/hydra";

export const maxDuration = 45;

export async function POST(req: NextRequest) {
  try {
    const { query } = (await req.json()) as { query?: string };
    if (!query?.trim()) {
      return NextResponse.json({ error: "Query required" }, { status: 400 });
    }

    const hydra = getHydraClient();
    if (!hydra) {
      return NextResponse.json(
        { error: "HYDRA_DB_API_KEY required" },
        { status: 503 },
      );
    }

    const { trace } = await recallWithTrace(hydra, query.trim(), false);
    return NextResponse.json({
      hits: trace.sources,
      graphEdges: trace.graphEdges,
      latencyMs: trace.latencyMs,
      confidence: trace.confidence,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Search failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
