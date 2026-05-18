import OpenAI from "openai";
import type { CrossTopicInsight, InvestorBrief, LearnedTopic, WikiPage } from "./types";
import { normalizeWikiPage } from "./wiki-normalize";

export function getOpenAI() {
  const key = process.env.OPENAI_API_KEY?.trim();
  if (!key || key.startsWith("sk-your-")) return null;
  return new OpenAI({ apiKey: key });
}

export const WIKI_SYSTEM_PROMPT = `You are a concise Wikipedia-style editor. Output SCANNABLE, SHORT content — never walls of text.

STRICT RULES:
1. Facts ONLY from the source. No invention. Empty [] if not in text.
2. Do NOT repeat the summary inside sections. Each section covers a DISTINCT angle.
3. "summary": exactly 2 short sentences (max ~50 words total).
4. "sections": 2–4 max. Each section: EITHER one "paragraphs" entry (max 2 sentences) OR "bullets" (3–5 items, max 12 words each) — never both long paragraph and bullets.
5. "keyFacts": max 5. "fact" under 15 words; "evidence" under 12 words.
6. "keyConcepts": max 8 short labels. "entities": max 6. "timeline": only explicit dates, max 5.
7. "inferences": max 2, prefix "Inference: ". "connections": max 5 short phrases.
8. "infobox": max 5 rows, brief values.

Return ONLY valid JSON:
{
  "title": string,
  "summary": string,
  "sections": [{"heading": string, "paragraphs": string[], "bullets": string[]}],
  "infobox": [{"label": string, "value": string}],
  "keyFacts": [{"fact": string, "evidence": string}],
  "keyConcepts": string[],
  "entities": [{"name": string, "role": string}],
  "timeline": [{"year": string, "event": string}],
  "relatedTechnologies": string[],
  "inferences": string[],
  "connections": string[],
  "sourceCoverage": "full" | "partial" | "minimal"
}`;

export async function generateWiki(
  client: OpenAI,
  content: string,
  priorTopics?: { title: string; summary: string }[],
): Promise<WikiPage> {
  const sourceChars = content.length;
  const priorHint = priorTopics?.length
    ? `\n\nPreviously stored topics (mention links ONLY if the new content explicitly relates):\n${priorTopics.map((t) => `- ${t.title}: ${t.summary}`).join("\n")}`
    : "";

  const res = await client.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0.15,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: WIKI_SYSTEM_PROMPT },
      {
        role: "user",
        content: `Source length: ${sourceChars} characters.\n\n--- SOURCE TEXT ---\n${content.slice(0, 14000)}\n--- END SOURCE ---${priorHint}`,
      },
    ],
  });

  const raw = res.choices[0]?.message?.content ?? "{}";
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("Wiki generation returned invalid JSON");
  }

  return normalizeWikiPage(parsed, sourceChars);
}

export async function generateCrossTopicInsights(
  client: OpenAI,
  topics: { title: string; summary: string; concepts?: string[] }[],
): Promise<CrossTopicInsight> {
  const res = await client.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0.4,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: `Synthesize connections between the user's uploaded topics only. Do not add outside facts. Return JSON:
{ "headline": string, "bridges": string[], "emergentThemes": string[], "strategicImplication": string }`,
      },
      {
        role: "user",
        content: `Topics:\n${JSON.stringify(topics)}`,
      },
    ],
  });
  return JSON.parse(res.choices[0]?.message?.content ?? "{}") as CrossTopicInsight;
}

export interface ReasoningAnswer {
  answer: string;
  citations: string[];
}

export async function answerWithReasoning(
  client: OpenAI,
  question: string,
  context: string,
  history: { role: "user" | "assistant"; content: string }[],
): Promise<ReasoningAnswer> {
  const res = await client.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0.3,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: `Answer using ONLY the provided context. If insufficient, say so.

FRESHNESS: "CURRENT SESSION" blocks are authoritative. When older HydraDB chunks conflict with CURRENT SESSION, use CURRENT SESSION and note the update.
Return JSON: { "answer": string, "citations": string[] }`,
      },
      {
        role: "user",
        content: `Context:\n${context}\n\nQuestion: ${question}`,
      },
      ...history.slice(-4).map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
    ],
  });

  return JSON.parse(
    res.choices[0]?.message?.content ??
      '{"answer":"Insufficient context to answer.","citations":[]}',
  ) as ReasoningAnswer;
}

export async function streamAnswer(
  client: OpenAI,
  question: string,
  context: string,
): Promise<AsyncIterable<string>> {
  const stream = await client.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0.3,
    stream: true,
    messages: [
      {
        role: "system",
        content:
          "Answer using ONLY the provided context. Prefer CURRENT SESSION over older HydraDB when they conflict. Be concise. If insufficient, say so.",
      },
      {
        role: "user",
        content: `Context:\n${context}\n\nQuestion: ${question}`,
      },
    ],
  });

  async function* iterate() {
    for await (const chunk of stream) {
      const text = chunk.choices[0]?.delta?.content;
      if (text) yield text;
    }
  }
  return iterate();
}

export async function generateInvestorBrief(
  client: OpenAI,
  wiki: WikiPage | null,
  topics: LearnedTopic[],
  metrics?: {
    avgRecallMs?: number | null;
    recallConfidence?: number | null;
    hydraRelations?: number | null;
  },
): Promise<InvestorBrief> {
  const res = await client.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0.5,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: `Create an investor brief using ONLY the provided user data and measured metrics. No fabricated traction numbers.
Return JSON: { "thesis": string, "marketOpportunity": string, "productMoat": string, "tractionSignals": string[], "askStatement": string }`,
      },
      {
        role: "user",
        content: JSON.stringify({ wiki, topics, measuredMetrics: metrics }),
      },
    ],
  });
  return JSON.parse(res.choices[0]?.message?.content ?? "{}") as InvestorBrief;
}
