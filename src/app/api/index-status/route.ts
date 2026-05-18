import { NextRequest, NextResponse } from "next/server";
import { getHydraClient, verifyIndexingStatus } from "@/lib/hydra";

export async function GET(req: NextRequest) {
  const sourceId = req.nextUrl.searchParams.get("sourceId");
  if (!sourceId) {
    return NextResponse.json({ error: "sourceId required" }, { status: 400 });
  }

  const hydra = getHydraClient();
  if (!hydra) {
    return NextResponse.json(
      { error: "HYDRA_DB_API_KEY not configured" },
      { status: 503 },
    );
  }

  const result = await verifyIndexingStatus(hydra, sourceId);
  return NextResponse.json({
    sourceId,
    status: result.status,
    ready: result.ready,
    message: result.message,
  });
}
