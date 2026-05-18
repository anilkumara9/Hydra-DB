"use client";

import type { ReasoningTrace } from "@/lib/types";

interface Props {
  trace: ReasoningTrace | null;
  citations?: string[];
}

export function ReasoningPanel({ trace, citations }: Props) {
  if (!trace) return null;

  return (
    <section className="feature-card">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <span className="flex items-center gap-3">
          <span className="step-badge">⚡</span>
          <h2 className="hydra-h3 font-display">HydraDB Recall Trace</h2>
        </span>
        <div className="flex flex-wrap gap-2">
          <span className="metric-badge">{trace.latencyMs}ms measured</span>
          {trace.confidence != null && (
            <span className="metric-badge">{trace.confidence}% avg relevance</span>
          )}
          <span className="status-badge">{trace.mode}</span>
        </div>
      </div>

      <div className="mb-8 grid gap-8 md:grid-cols-2">
        <div>
          <h3 className="mb-4 font-display text-xs uppercase tracking-wider text-[#FF571A]">
            Pipeline (factual)
          </h3>
          <ol className="space-y-3">
            {trace.steps.map((step, i) => (
              <li
                key={i}
                className="flex gap-3 text-sm text-white animate-fade-in"
                style={{ animationDelay: `${i * 80}ms` }}
              >
                <span className="font-display text-[#FF571A]">{i + 1}</span>
                {step}
              </li>
            ))}
          </ol>
        </div>
        <div>
          <h3 className="mb-4 font-display text-xs uppercase tracking-wider text-[#FF571A]">
            Retrieved chunks
          </h3>
          {trace.sources.length === 0 ? (
            <p className="hydra-caption">
              No chunks returned — HydraDB may still be indexing your upload
            </p>
          ) : (
            <ul className="space-y-3">
              {trace.sources.map((s, i) => (
                <li key={i} className="inner-card">
                  <div className="flex justify-between text-xs">
                    <span className="font-medium text-white">{s.title}</span>
                    <span className="text-[#FF571A]">
                      {s.score != null ? `${s.score}%` : "—"}
                    </span>
                  </div>
                  <p className="mt-2 line-clamp-2 hydra-caption">{s.excerpt}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {citations && citations.length > 0 && (
        <div className="mb-8">
          <h3 className="mb-4 font-display text-xs uppercase tracking-wider text-[#FF571A]">
            LLM citations (from context above)
          </h3>
          <div className="flex flex-wrap gap-2">
            {citations.map((c) => (
              <span key={c} className="tag-chip">
                {c}
              </span>
            ))}
          </div>
        </div>
      )}

      {trace.graphEdges.length > 0 && (
        <div>
          <h3 className="mb-4 font-display text-xs uppercase tracking-wider text-[#FF571A]">
            Graph paths (from HydraDB)
          </h3>
          <div className="flex flex-wrap gap-2">
            {trace.graphEdges.map((e, i) => (
              <span key={i} className="metric-badge normal-case">
                {e.from} → {e.relation} → {e.to}
              </span>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
