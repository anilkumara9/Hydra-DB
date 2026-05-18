import type {
  WikiEntity,
  WikiInfoboxRow,
  WikiKeyFact,
  WikiPage,
  WikiSection,
  WikiSourceCoverage,
  WikiTimelineEvent,
} from "./types";

const LIMITS = {
  summary: 380,
  paragraph: 280,
  bullet: 120,
  fact: 140,
  evidence: 100,
  entityRole: 80,
  connection: 80,
  maxSections: 4,
  maxBulletsPerSection: 5,
  maxParagraphsPerSection: 1,
  maxKeyFacts: 6,
  maxConcepts: 8,
  maxEntities: 6,
  maxTimeline: 6,
};

function cleanStr(v: unknown, max: number): string {
  if (typeof v !== "string") return "";
  return v.replace(/\s+/g, " ").trim().slice(0, max);
}

function cleanList(v: unknown, maxItems: number, maxLen: number): string[] {
  if (!Array.isArray(v)) return [];
  return v
    .map((x) => cleanStr(x, maxLen))
    .filter(Boolean)
    .slice(0, maxItems);
}

function wordSet(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .split(/\W+/)
      .filter((w) => w.length > 3),
  );
}

function overlapRatio(a: string, b: string): number {
  const A = wordSet(a);
  const B = wordSet(b);
  if (A.size === 0) return 0;
  let inter = 0;
  for (const w of A) if (B.has(w)) inter++;
  return inter / A.size;
}

function truncateToSentences(text: string, maxChars: number): string {
  const t = text.trim();
  if (t.length <= maxChars) return t;
  const slice = t.slice(0, maxChars);
  const lastStop = Math.max(
    slice.lastIndexOf(". "),
    slice.lastIndexOf("! "),
    slice.lastIndexOf("? "),
  );
  if (lastStop > maxChars * 0.5) return `${slice.slice(0, lastStop + 1).trim()}…`;
  return `${slice.trim()}…`;
}

function normalizeEntities(v: unknown): WikiEntity[] {
  if (!Array.isArray(v)) return [];
  return v
    .map((row) => {
      if (!row || typeof row !== "object") return null;
      const o = row as Record<string, unknown>;
      const name = cleanStr(o.name, 80);
      const role = cleanStr(o.role, LIMITS.entityRole);
      if (!name) return null;
      return { name, role: role || "In source" };
    })
    .filter((x): x is WikiEntity => x !== null)
    .slice(0, LIMITS.maxEntities);
}

function normalizeTimeline(v: unknown): WikiTimelineEvent[] {
  if (!Array.isArray(v)) return [];
  return v
    .map((row) => {
      if (!row || typeof row !== "object") return null;
      const o = row as Record<string, unknown>;
      const year = cleanStr(o.year, 24);
      const event = cleanStr(o.event, 160);
      if (!event) return null;
      return { year: year || "—", event };
    })
    .filter((x): x is WikiTimelineEvent => x !== null)
    .slice(0, LIMITS.maxTimeline);
}

function normalizeSections(
  v: unknown,
  summary: string,
): WikiSection[] {
  const sections: WikiSection[] = [];
  if (Array.isArray(v)) {
    for (const row of v) {
      if (!row || typeof row !== "object") continue;
      const o = row as Record<string, unknown>;
      const heading = cleanStr(o.heading, 64);
      let paragraphs = cleanList(
        o.paragraphs,
        LIMITS.maxParagraphsPerSection,
        LIMITS.paragraph,
      ).map((p) => truncateToSentences(p, LIMITS.paragraph));
      let bullets = cleanList(
        o.bullets,
        LIMITS.maxBulletsPerSection,
        LIMITS.bullet,
      );
      if (!heading) continue;

      const body = paragraphs.join(" ");
      if (body && overlapRatio(body, summary) > 0.72) {
        paragraphs = [];
      }

      if (paragraphs.length === 0 && bullets.length === 0) continue;

      sections.push({
        heading,
        paragraphs,
        bullets: bullets.length ? bullets : undefined,
      });
    }
  }

  return sections.slice(0, LIMITS.maxSections);
}

function normalizeInfobox(v: unknown): WikiInfoboxRow[] {
  if (!Array.isArray(v)) return [];
  return v
    .map((row) => {
      if (!row || typeof row !== "object") return null;
      const o = row as Record<string, unknown>;
      const label = cleanStr(o.label, 48);
      const value = cleanStr(o.value, 120);
      if (!label || !value) return null;
      return { label, value };
    })
    .filter((x): x is WikiInfoboxRow => x !== null)
    .slice(0, 6);
}

function normalizeKeyFacts(v: unknown): WikiKeyFact[] {
  if (!Array.isArray(v)) return [];
  return v
    .map((row) => {
      if (!row || typeof row !== "object") return null;
      const o = row as Record<string, unknown>;
      const fact = cleanStr(o.fact, LIMITS.fact);
      const evidence = cleanStr(o.evidence, LIMITS.evidence);
      if (!fact) return null;
      return { fact, evidence: evidence || "From source" };
    })
    .filter((x): x is WikiKeyFact => x !== null)
    .slice(0, LIMITS.maxKeyFacts);
}

function normalizeCoverage(v: unknown, sourceChars: number): WikiSourceCoverage {
  const s = cleanStr(v, 20).toLowerCase();
  if (s === "full" || s === "partial" || s === "minimal") return s;
  if (sourceChars >= 2500) return "full";
  if (sourceChars >= 800) return "partial";
  return "minimal";
}

export function normalizeWikiPage(
  raw: unknown,
  sourceChars: number,
): WikiPage {
  const o =
    raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};

  const title =
    cleanStr(o.title, 120) ||
    cleanStr(o.name, 120) ||
    "Untitled article";

  const summary = truncateToSentences(
    cleanStr(o.summary, 800),
    LIMITS.summary,
  );

  let sections = normalizeSections(o.sections, summary);

  if (sections.length === 0 && summary) {
    sections = [
      {
        heading: "Summary",
        paragraphs: [],
        bullets: summary
          .split(/(?<=[.!?])\s+/)
          .map((s) => cleanStr(s, LIMITS.bullet))
          .filter((s) => s.length > 12)
          .slice(0, 4),
      },
    ];
  }

  const keyConcepts = cleanList(o.keyConcepts, LIMITS.maxConcepts, 48);
  const entities = normalizeEntities(o.entities);
  const timeline = normalizeTimeline(o.timeline);
  const relatedTechnologies = cleanList(
    o.relatedTechnologies,
    6,
    64,
  );
  const inferences = cleanList(o.inferences ?? o.futurePredictions, 3, 160).map(
    (line) =>
      line.toLowerCase().startsWith("inference:")
        ? line
        : `Inference: ${line}`,
  );
  const connections = cleanList(o.connections, 6, LIMITS.connection);
  const infobox = normalizeInfobox(o.infobox);
  const keyFacts = normalizeKeyFacts(o.keyFacts);

  return {
    title,
    summary,
    sections,
    infobox,
    keyFacts,
    keyConcepts,
    entities,
    timeline,
    relatedTechnologies,
    inferences,
    connections,
    sourceCoverage: normalizeCoverage(o.sourceCoverage, sourceChars),
  };
}

export function wikiToSessionContext(wiki: WikiPage, rawPreview?: string): string {
  const sectionText = wiki.sections
    .map((s) => {
      const bullets = s.bullets?.length ? `\n- ${s.bullets.join("\n- ")}` : "";
      const paras = s.paragraphs.length ? s.paragraphs.join(" ") : "";
      return `### ${s.heading}\n${paras}${bullets}`;
    })
    .join("\n\n");

  const facts = wiki.keyFacts.map((f) => `- ${f.fact}`).join("\n");

  return [
    `Title: ${wiki.title}`,
    `Summary: ${wiki.summary}`,
    sectionText,
    facts ? `Key facts:\n${facts}` : "",
    `Concepts: ${wiki.keyConcepts.join(", ")}`,
    `Entities: ${wiki.entities.map((e) => `${e.name} (${e.role})`).join(", ")}`,
    rawPreview ? `Source excerpt: ${rawPreview.slice(0, 400)}` : "",
  ]
    .filter(Boolean)
    .join("\n\n");
}
