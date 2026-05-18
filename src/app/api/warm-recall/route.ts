import { NextRequest, NextResponse } from "next/server";
import { getHydraClient, recallWithTrace } from "@/lib/hydra";

export const maxDuration = 45;

export async function POST(req: NextRequest) {
  try {
    const { query, sessionContext, uploadGeneration } = (await req.json()) as {
      query?: string;
      sessionContext?: string;
      uploadGeneration?: number;
    };
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

    const { trace } = await recallWithTrace(hydra, query.trim(), {
      thinking: false,
      sessionContext,
      uploadGeneration,
    });
    return NextResponse.json({ reasoning: trace });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Warm recall failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
