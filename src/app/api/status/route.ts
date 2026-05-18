import { NextResponse } from "next/server";
import { getOpenAI } from "@/lib/openai";
import { isHydraConfigured } from "@/lib/hydra";

export async function GET() {
  return NextResponse.json({
    openai: Boolean(getOpenAI()),
    hydra: isHydraConfigured(),
    ready: Boolean(getOpenAI()) && isHydraConfigured(),
  });
}
