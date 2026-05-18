import { HydraDBClient } from "@hydradb/sdk";
import { writeFile, unlink, mkdir } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";
import type { GraphEdge, RecallSource, ReasoningTrace } from "./types";

export const TENANT_ID =
  process.env.HYDRA_TENANT_ID ?? "wiki_mind_hackathon";
export const SUB_TENANT_ID =
  process.env.HYDRA_SUB_TENANT_ID ?? "wikimind_user";

const MIN_KNOWLEDGE_RELEVANCY = 0.38;
const MIN_MEMORY_RELEVANCY = 0.52;
const CHAT_MEMORY_MIN_RELEVANCY = 0.72;

function scoreFromRelevancy(raw: number | null | undefined): number | null {
  if (raw == null || Number.isNaN(raw)) return null;
  return Math.round(raw * 100);
}

function rawRelevancy(score: number | null | undefined): number {
  if (score == null || Number.isNaN(score)) return 0;
  return score > 1 ? score / 100 : score;
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

export interface TopicMemoryOptions {
  generation: number;
  supersedesTitle?: string;
}

/** Canonical topic memory — tagged by generation so recall can prefer fresh state. */
export async function addTopicMemory(
  client: HydraDBClient,
  title: string,
  summary: string,
  concepts?: string[],
  options?: TopicMemoryOptions,
): Promise<void> {
  await ensureTenant(client);
  const gen = options?.generation ?? 1;
  const conceptLine = concepts?.length
    ? ` Concepts: ${concepts.join(", ")}.`
    : "";
  const supersedeLine = options?.supersedesTitle
    ? ` Supersedes prior topic "${options.supersedesTitle}" where facts conflict.`
    : "";
  const stamped = `[wiki-gen:${gen}] [canonical] ${new Date().toISOString()} — `;

  await client.upload.addMemory({
    tenant_id: TENANT_ID,
    sub_tenant_id: SUB_TENANT_ID,
    memories: [
      {
        text: `${stamped}Topic: ${title}. Summary: ${summary}.${conceptLine}${supersedeLine}`,
        infer: true,
      },
    ],
  });
}

export async function addReconciliationMemory(
  client: HydraDBClient,
  generation: number,
  summary: string,
  conflictCount: number,
): Promise<void> {
  if (conflictCount === 0) return;
  await ensureTenant(client);
  await client.upload.addMemory({
    tenant_id: TENANT_ID,
    sub_tenant_id: SUB_TENANT_ID,
    memories: [
      {
        text: `[wiki-gen:${generation}] [reconciliation] ${conflictCount} conflict(s) resolved in favor of upload gen ${generation}. ${summary}`,
        infer: false,
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

type RawChunk = {
  chunk_content?: string;
  source_title?: string;
  relevancy_score?: number;
};

function dedupeChunks(chunks: RawChunk[]): RawChunk[] {
  const seen = new Set<string>();
  const out: RawChunk[] = [];
  for (const c of chunks) {
    const key = c.chunk_content?.slice(0, 80).toLowerCase() ?? "";
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(c);
  }
  return out;
}

export interface RecallOptions {
  thinking?: boolean;
  /** Current wiki session text — treated as authoritative over older HydraDB chunks */
  sessionContext?: string;
  uploadGeneration?: number;
}

export async function recallWithTrace(
  client: HydraDBClient,
  query: string,
  options: RecallOptions = {},
): Promise<{ context: string; trace: ReasoningTrace }> {
  const start = Date.now();
  await ensureTenant(client);
  const thinking = options.thinking ?? false;
  const mode = thinking ? "thinking" : "fast";
  const generation = options.uploadGeneration ?? 1;

  const [knowledge, memories] = await Promise.all([
    client.recall.fullRecall({
      tenant_id: TENANT_ID,
      query,
      max_results: 10,
      mode,
      graph_context: true,
    }),
    client.recall.recallPreferences({
      tenant_id: TENANT_ID,
      sub_tenant_id: SUB_TENANT_ID,
      query,
      mode,
      max_results: 6,
    }),
  ]);

  const allKnowledge = (knowledge.chunks ?? []).filter((c) =>
    c.chunk_content?.trim(),
  ) as RawChunk[];

  let filteredStale = 0;
  const knowledgeFiltered = dedupeChunks(
    allKnowledge
      .filter((c) => {
        const r = rawRelevancy(c.relevancy_score);
        if (r < MIN_KNOWLEDGE_RELEVANCY) {
          filteredStale++;
          return false;
        }
        return true;
      })
      .sort(
        (a, b) =>
          rawRelevancy(b.relevancy_score) - rawRelevancy(a.relevancy_score),
      )
      .slice(0, 5),
  );

  const allMem = (
    (memories as { chunks?: RawChunk[] }).chunks ?? []
  ).filter((c) => c.chunk_content?.trim());

  const memFiltered = allMem
    .filter((c) => {
      const r = rawRelevancy(c.relevancy_score);
      const title = c.source_title?.toLowerCase() ?? "";
      const isChat = title.includes("chat") || c.chunk_content?.includes("Q:");
      if (isChat && r < CHAT_MEMORY_MIN_RELEVANCY) {
        filteredStale++;
        return false;
      }
      if (r < MIN_MEMORY_RELEVANCY) {
        filteredStale++;
        return false;
      }
      return true;
    })
    .sort(
      (a, b) => rawRelevancy(b.relevancy_score) - rawRelevancy(a.relevancy_score),
    )
    .slice(0, 3);

  const sources: RecallSource[] = [];

  if (options.sessionContext?.trim()) {
    sources.push({
      title: `Current wiki (gen ${generation})`,
      excerpt: options.sessionContext.slice(0, 180),
      score: 100,
      kind: "session",
    });
  }

  for (const c of knowledgeFiltered) {
    sources.push({
      title: c.source_title?.trim() || "Knowledge chunk",
      excerpt: c.chunk_content!.slice(0, 180),
      score: scoreFromRelevancy(c.relevancy_score),
      kind: "knowledge",
    });
  }

  for (const c of memFiltered) {
    const isCanonical = c.chunk_content?.includes("[canonical]");
    sources.push({
      title: c.source_title?.trim() || (isCanonical ? "Canonical topic" : "Memory"),
      excerpt: c.chunk_content!.slice(0, 180),
      score: scoreFromRelevancy(c.relevancy_score),
      kind: "memory",
    });
  }

  const graphEdges = extractGraphEdges(knowledge);

  const contextParts: string[] = [];

  if (options.sessionContext?.trim()) {
    contextParts.push(
      `=== CURRENT SESSION (AUTHORITATIVE — upload generation ${generation}) ===\n` +
        `When this conflicts with older HydraDB chunks, prefer CURRENT SESSION.\n\n` +
        options.sessionContext,
    );
  }

  if (graphEdges.length > 0) {
    const paths = graphEdges
      .slice(0, 6)
      .map((e) => `${e.from} → ${e.relation} → ${e.to}`)
      .join("\n");
    contextParts.push(
      `=== HYDRADB CONTEXT GRAPH (relationship-ranked) ===\n${paths}`,
    );
  }

  if (knowledgeFiltered.length) {
    contextParts.push(
      `=== HYDRADB KNOWLEDGE (relevancy-filtered) ===\n${knowledgeFiltered.map((c) => c.chunk_content).join("\n---\n")}`,
    );
  }

  if (memFiltered.length) {
    contextParts.push(
      `=== HYDRADB MEMORIES (high-confidence only) ===\n${memFiltered.map((c) => c.chunk_content).join("\n")}`,
    );
  }

  const scored = sources
    .map((s) => s.score)
    .filter((s): s is number => s !== null && s < 100);
  const confidence =
    scored.length > 0
      ? Math.round(scored.reduce((a, b) => a + b, 0) / scored.length)
      : null;

  const trace: ReasoningTrace = {
    steps: [
      `HydraDB ${mode} recall + native context graph`,
      `Freshness: session gen ${generation} prioritized over stale chunks`,
      `Knowledge kept: ${knowledgeFiltered.length}/${allKnowledge.length} (min ${Math.round(MIN_KNOWLEDGE_RELEVANCY * 100)}% relevancy)`,
      `Memory kept: ${memFiltered.length}/${allMem.length} (chat memories need ${Math.round(CHAT_MEMORY_MIN_RELEVANCY * 100)}%+)`,
      `Graph relations: ${graphEdges.length}`,
      filteredStale > 0
        ? `Filtered ${filteredStale} low-relevancy / stale chunks`
        : "No stale chunks filtered",
      `Latency: ${Date.now() - start}ms`,
    ],
    sources: sources.slice(0, 8),
    graphEdges,
    latencyMs: Date.now() - start,
    confidence,
    mode,
    freshnessPolicy: `Prefer wiki-gen:${generation} and current session; graph-guided retrieval`,
    filteredStaleChunks: filteredStale,
  };

  return { context: contextParts.join("\n\n"), trace };
}

export async function verifyIndexingStatus(
  client: HydraDBClient,
  sourceId: string,
): Promise<{ status: string; ready: boolean; message: string }> {
  await ensureTenant(client);
  try {
    const result = await client.upload.verifyProcessing({
      tenant_id: TENANT_ID,
      sub_tenant_id: SUB_TENANT_ID,
      file_ids: [sourceId],
    });
    const row = result.statuses?.[0];
    const status = row?.indexing_status ?? "unknown";
    const ready = status === "completed" && row?.success !== false;
    return {
      status,
      ready,
      message: ready
        ? "HydraDB indexing complete — full recall enabled"
        : `HydraDB status: ${status}`,
    };
  } catch (e) {
    return {
      status: "unknown",
      ready: false,
      message: e instanceof Error ? e.message : "Could not verify indexing",
    };
  }
}
