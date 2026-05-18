export async function fetchUrlText(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: { "User-Agent": "WikiMind/1.0" },
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) throw new Error(`Failed to fetch URL (${res.status})`);
  const html = await res.text();
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 15000);
}

export async function readUploadText(file: File): Promise<string> {
  if (file.type === "application/pdf") {
    throw new Error(
      "PDF parsing skipped for speed — paste text or upload .txt/.md",
    );
  }
  return (await file.text()).slice(0, 15000);
}
