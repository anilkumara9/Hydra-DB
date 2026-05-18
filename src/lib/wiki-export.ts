import type { WikiPage } from "./types";

export function wikiToMarkdown(wiki: WikiPage): string {
  const lines = [
    `# ${wiki.title}`,
    "",
    `> Coverage: ${wiki.sourceCoverage}`,
    "",
    wiki.summary,
    "",
  ];

  for (const section of wiki.sections) {
    lines.push(`## ${section.heading}`, "");
    for (const p of section.paragraphs) lines.push(p, "");
    if (section.bullets?.length) {
      lines.push(...section.bullets.map((b) => `- ${b}`), "");
    }
  }

  if (wiki.keyFacts.length) {
    lines.push("## Verified facts", "");
    for (const f of wiki.keyFacts) {
      lines.push(`- ${f.fact} *(${f.evidence})*`);
    }
    lines.push("");
  }

  lines.push(
    "## Key concepts",
    ...wiki.keyConcepts.map((c) => `- ${c}`),
    "",
    "## Entities",
    ...(wiki.entities.length
      ? wiki.entities.map((e) => `- **${e.name}** — ${e.role}`)
      : ["- _None_"]),
    "",
    "---",
    `*WikiMind · ${new Date().toISOString()}*`,
  );

  return lines.join("\n");
}

export function downloadMarkdown(wiki: WikiPage) {
  const md = wikiToMarkdown(wiki);
  const blob = new Blob([md], { type: "text/markdown" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${wiki.title.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.md`;
  a.click();
  URL.revokeObjectURL(url);
}
