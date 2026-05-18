import type { KnowledgeConflict, LearnedTopic, WikiPage, WikiReconciliation } from "./types";
import type OpenAI from "openai";

export async function reconcileWithPriorKnowledge(
  client: OpenAI,
  newWiki: WikiPage,
  priorTopics: LearnedTopic[],
  sourcePreview: string,
  uploadGeneration: number,
): Promise<WikiReconciliation> {
  if (priorTopics.length === 0) {
    return {
      conflicts: [],
      entityUpdates: [],
      summary: "First upload — no prior knowledge to reconcile.",
    };
  }

  const res = await client.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0.1,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: `You detect contradictions between NEW upload (generation ${uploadGeneration}, authoritative) and PRIOR topics.

Rules:
- Only flag REAL contradictions (conflicting numbers, dates, definitions, mutually exclusive claims).
- Do NOT flag mere additions or deeper detail.
- resolution is always "prefer_new_upload" for factual conflicts (new upload wins).
- Use "coexist" only if topics are clearly unrelated overlaps.
- entityUpdates: list entity names whose role/description should be revised in the wiki (short phrases).
- Max 5 conflicts. Empty arrays if none.

Return JSON:
{
  "conflicts": [{"entityOrTopic": string, "priorClaim": string, "newClaim": string, "resolution": "prefer_new_upload"|"coexist"|"needs_review", "severity": "high"|"medium"}],
  "entityUpdates": string[],
  "summary": string
}`,
      },
      {
        role: "user",
        content: JSON.stringify({
          newWiki: {
            title: newWiki.title,
            summary: newWiki.summary,
            entities: newWiki.entities,
            keyFacts: newWiki.keyFacts,
          },
          priorTopics: priorTopics.map((t) => ({
            title: t.title,
            summary: t.summary,
            generation: t.generation ?? 1,
          })),
          sourceExcerpt: sourcePreview.slice(0, 1200),
        }),
      },
    ],
  });

  const raw = JSON.parse(res.choices[0]?.message?.content ?? "{}") as {
    conflicts?: Omit<KnowledgeConflict, "id">[];
    entityUpdates?: string[];
    summary?: string;
  };

  const conflicts: KnowledgeConflict[] = (raw.conflicts ?? []).slice(0, 5).map(
    (c, i) => ({
      id: `conflict-${uploadGeneration}-${i}`,
      entityOrTopic: c.entityOrTopic ?? "Topic",
      priorClaim: c.priorClaim ?? "",
      newClaim: c.newClaim ?? "",
      resolution: c.resolution ?? "prefer_new_upload",
      severity: c.severity ?? "medium",
    }),
  );

  return {
    conflicts,
    entityUpdates: raw.entityUpdates ?? [],
    summary:
      raw.summary ??
      (conflicts.length
        ? `${conflicts.length} contradiction(s) detected — current upload takes precedence.`
        : "No contradictions with prior topics."),
  };
}
