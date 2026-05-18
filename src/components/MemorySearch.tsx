"use client";

import { useState } from "react";
import type { MemorySearchHit } from "@/lib/types";

interface Props {
  disabled: boolean;
}

export function MemorySearch({ disabled }: Props) {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [hits, setHits] = useState<MemorySearchHit[]>([]);
  const [latencyMs, setLatencyMs] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const search = async () => {
    if (!query.trim() || loading) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/memory-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Search failed");
      setHits(data.hits ?? []);
      setLatencyMs(data.latencyMs ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Search failed");
      setHits([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="feature-card">
      <div className="mb-4 flex items-center gap-3">
        <span className="step-badge">⌕</span>
        <h2 className="hydra-h3 font-display">Global Memory Search</h2>
      </div>
      <p className="hydra-caption mb-4">
        Search your entire HydraDB knowledge + memory store — live recall, no cached demo results
      </p>
      <div className="flex gap-3">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          disabled={disabled || loading}
          placeholder="Search all learned knowledge..."
          className="input-field flex-1"
          onKeyDown={(e) => e.key === "Enter" && search()}
        />
        <button
          type="button"
          onClick={search}
          disabled={disabled || loading || !query.trim()}
          className="btn-primary shrink-0"
        >
          {loading ? "..." : "Search"}
        </button>
      </div>
      {error && <p className="mt-3 text-sm text-[#F9C425]">{error}</p>}
      {latencyMs != null && hits.length > 0 && (
        <p className="mt-3 hydra-caption">{hits.length} hits · {latencyMs}ms HydraDB recall</p>
      )}
      {hits.length > 0 && (
        <ul className="mt-4 space-y-2">
          {hits.map((h, i) => (
            <li key={i} className="inner-card">
              <div className="flex justify-between text-xs">
                <span className="text-white">{h.title}</span>
                <span className="text-[#FF571A]">
                  {h.score != null ? `${h.score}%` : "—"}
                </span>
              </div>
              <p className="mt-1 hydra-caption line-clamp-2">{h.excerpt}</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
