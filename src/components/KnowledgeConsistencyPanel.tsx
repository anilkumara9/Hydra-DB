"use client";

import type { WikiReconciliation } from "@/lib/types";

interface Props {
  reconciliation: WikiReconciliation | null;
}

export function KnowledgeConsistencyPanel({ reconciliation }: Props) {
  if (!reconciliation) return null;

  const { conflicts, entityUpdates, summary } = reconciliation;

  return (
    <section className="feature-card border border-[#353535]">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-display text-sm uppercase tracking-wider text-[#FF571A]">
          Knowledge consistency
        </h3>
        <span className="metric-badge normal-case text-xs">
          {conflicts.length > 0
            ? `${conflicts.length} conflict(s) flagged`
            : "No contradictions"}
        </span>
      </div>
      <p className="hydra-caption mb-4">{summary}</p>

      {conflicts.length > 0 && (
        <ul className="space-y-3">
          {conflicts.map((c) => (
            <li key={c.id} className="inner-card border-l-4 border-l-[#F9C425]">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <span className="font-display text-xs text-white">
                  {c.entityOrTopic}
                </span>
                <span
                  className={
                    c.severity === "high" ? "status-badge" : "metric-badge"
                  }
                >
                  {c.severity}
                </span>
                <span className="hydra-caption text-[#FF571A]">
                  → prefer current upload
                </span>
              </div>
              <p className="text-xs text-[#999999]">
                <span className="text-[#999999]">Prior:</span> {c.priorClaim}
              </p>
              <p className="mt-1 text-xs text-white">
                <span className="text-[#FF571A]">New:</span> {c.newClaim}
              </p>
            </li>
          ))}
        </ul>
      )}

      {entityUpdates.length > 0 && (
        <div className="mt-4">
          <p className="mb-2 font-display text-xs uppercase text-[#FF571A]">
            Entity pages revised
          </p>
          <div className="flex flex-wrap gap-2">
            {entityUpdates.map((e) => (
              <span key={e} className="tag-chip">
                {e}
              </span>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

