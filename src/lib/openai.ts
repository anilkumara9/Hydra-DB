import OpenAI from "openai";
import type { CrossTopicInsight, WikiPage } from "./types";

export function getOpenAI() {
  const key = process.env.OPENAI_API_KEY?.trim();
  if (!key || key.startsWith("sk-your-")) return null;
  return new OpenAI({ apiKey: key });
}

export const WIKI_SYSTEM_PROMPT = `You are an AI Wikipedia engine. Analyze ONLY the provided content — do not invent facts not supported by the text.

Return ONLY valid JSON:
{
  "title": string,
  "summary": string (2-3 sentences grounded in the content),
  "keyConcepts": string[] (from content only),
  "entities": [{"name": string, "role": string}],
  "timeline": [{"year": string, "event": string}],
  "relatedTechnologies": string[],
  "futurePredictions": string[] (clearly framed as inference from content),
  "connections": string[] (entity chain extracted from content relationships)
}`;

export async function generateWiki(
  client: OpenAI,
  content: string,
  priorTopics?: { title: string; summary: string }[],
): Promise<WikiPage> {
  const priorHint = priorTopics?.length
    ? `\n\nPreviously stored topics (connect only if the new content supports it):\n${priorTopics.map((t) => `- ${t.title}: ${t.summary}`).join("\n")}`
    : "";

  const res = await client.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0.4,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: WIKI_SYSTEM_PROMPT },
      {
        role: "user",
        content: `Analyze this content:\n\n${content.slice(0, 12000)}${priorHint}`,
      },
    ],
  });

  const raw = res.choices[0]?.message?.content ?? "{}";
  return JSON.parse(raw) as WikiPage;
}

export async function generateCrossTopicInsights(
  client: OpenAI,
  topics: { title: string; summary: string; concepts?: string[] }[],
): Promise<CrossTopicInsight> {
  const res = await client.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0.5,
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
        content: `Answer using ONLY the provided HydraDB/session context. If context is insufficient, say so explicitly.
Return JSON: { "answer": string, "citations": string[] } where each citation labels a real chunk you used.`,
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
