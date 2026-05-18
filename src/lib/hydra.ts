import { HydraDBClient } from "@hydradb/sdk";
import { writeFile, unlink, mkdir } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";
import type { GraphEdge, RecallSource, ReasoningTrace } from "./types";

export const TENANT_ID =
  process.env.HYDRA_TENANT_ID ?? "wiki_mind_hackathon";
export const SUB_TENANT_ID =
  process.env.HYDRA_SUB_TENANT_ID ?? "wikimind_user";

function scoreFromRelevancy(raw: number | null | undefined): number | null {
  if (raw == null || Number.isNaN(raw)) return null;
  return Math.round(raw * 100);
}

export function getHydraClient(): HydraDBClient | null {
  const token = process.env.HYDRA_DB_API_KEY?.trim();
  if (!token || token.includes("your_hydradb")) return null;
  return new HydraDBClient({ token });
}

export function isHydraConfigured(): boolean {
  return getHydraClient() !== null;
}

let tenantReady = false;

export async function ensureTenant(client: HydraDBClient): Promise<void> {
  if (tenantReady) return;
  try {
    await client.tenant.create({ tenant_id: TENANT_ID });
  } catch {
    /* tenant may already exist */
  }
  tenantReady = true;
}

export async function uploadKnowledgeText(
  client: HydraDBClient,
  text: string,
  filename: string,
): Promise<string | null> {
  await ensureTenant(client);
  const dir = join(tmpdir(), "wiki-mind");
  await mkdir(dir, { recursive: true });
  const path = join(dir, filename);
  await writeFile(path, text, "utf-8");

  try {
    const result = await client.upload.knowledge({
      tenant_id: TENANT_ID,
      files: [
        {
          path,
          filename,
          contentType: "text/plain",
        },
      ],
    });
    return result.results?.[0]?.source_id ?? null;
  } finally {
    await unlink(path).catch(() => undefined);
  }
}

export async function addTopicMemory(
  client: HydraDBClient,
  title: string,
  summary: string,
  concepts?: string[],
): Promise<void> {
  await ensureTenant(client);
  const conceptLine = concepts?.length
    ? ` Key concepts: ${concepts.join(", ")}.`
    : "";
  await client.upload.addMemory({
    tenant_id: TENANT_ID,
    sub_tenant_id: SUB_TENANT_ID,
    memories: [
      {
        text: `Learned topic: ${title}. Summary: ${summary}.${conceptLine}`,
        infer: true,
      },
    ],
  });
}

function extractGraphEdges(knowledge: {
  graph_context?: {
    query_paths?: {
      triplets?: {
        source?: { name?: string };
        relation?: { canonical_predicate?: string };
        target?: { name?: string };
      }[];
    }[];
  };
}): GraphEdge[] {
  const paths = knowledge.graph_context?.query_paths ?? [];
  return paths
    .flatMap((p) => p.triplets ?? [])
    .filter((t) => t.source?.name && t.target?.name)
    .map((t) => ({
      from: t.source!.name!,
      to: t.target!.name!,
      relation: t.relation?.canonical_predicate ?? "RELATES_TO",
    }))
    .slice(0, 12);
}

export async function recallWithTrace(
  client: HydraDBClient,
  query: string,
  thinking = false,
): Promise<{ context: string; trace: ReasoningTrace }> {
  const start = Date.now();
  await ensureTenant(client);
  const mode = thinking ? "thinking" : "fast";

  const [knowledge, memories] = await Promise.all([
    client.recall.fullRecall({
      tenant_id: TENANT_ID,
      query,
      max_results: 8,
      mode,
      graph_context: true,
    }),
    client.recall.recallPreferences({
      tenant_id: TENANT_ID,
      sub_tenant_id: SUB_TENANT_ID,
      query,
      mode,
      max_results: 4,
    }),
  ]);

  const chunks = (knowledge.chunks ?? []).filter((c) => c.chunk_content?.trim());
  const memChunks = (
    (memories as {
      chunks?: {
        chunk_content?: string;
        source_title?: string;
        relevancy_score?: number;
      }[];
    }).chunks ?? []
  ).filter((c) => c.chunk_content?.trim());

  const sources: RecallSource[] = [
    ...chunks.map((c) => ({
      title: c.source_title?.trim() || "Knowledge chunk",
      excerpt: c.chunk_content!.slice(0, 180),
      score: scoreFromRelevancy(c.relevancy_score),
    })),
    ...memChunks.map((c) => ({
      title: c.source_title?.trim() || "User memory",
      excerpt: c.chunk_content!.slice(0, 180),
      score: scoreFromRelevancy(c.relevancy_score),
    })),
  ].slice(0, 6);

  const graphEdges = extractGraphEdges(knowledge);
  const contextParts = [
    chunks.length
      ? `Knowledge:\n${chunks.map((c) => c.chunk_content).join("\n---\n")}`
      : "",
    memChunks.length
      ? `Memories:\n${memChunks.map((c) => c.chunk_content).join("\n")}`
      : "",
  ].filter(Boolean);

  const scored = sources
    .map((s) => s.score)
    .filter((s): s is number => s !== null);
  const confidence =
    scored.length > 0
      ? Math.round(scored.reduce((a, b) => a + b, 0) / scored.length)
      : null;

  const trace: ReasoningTrace = {
    steps: [
      `HydraDB ${mode} recall executed`,
      `Knowledge chunks: ${chunks.length}`,
      `Memory nodes: ${memChunks.length}`,
      `Graph relations from HydraDB: ${graphEdges.length}`,
      `Measured latency: ${Date.now() - start}ms`,
    ],
    sources,
    graphEdges,
    latencyMs: Date.now() - start,
    confidence,
    mode,
  };

  return { context: contextParts.join("\n\n"), trace };
}
