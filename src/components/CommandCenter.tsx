"use client";

import type { DashboardStats } from "@/lib/types";

interface Props {
  stats: DashboardStats;
  hydraLive: boolean;
  pitchMode: boolean;
}

function fmt(value: number | null, unit = ""): string {
  if (value === null) return "—";
  return `${value}${unit}`;
}

export function CommandCenter({ stats, hydraLive, pitchMode }: Props) {
  const cards = [
    { label: "Topics Learned", value: fmt(stats.topicsLearned) },
    { label: "Concepts (current wiki)", value: fmt(stats.conceptsInWiki) },
    { label: "HydraDB Relations", value: fmt(stats.hydraRelations) },
    { label: "Recall Latency", value: fmt(stats.avgRecallMs, "ms") },
    { label: "Recall Relevance", value: fmt(stats.recallConfidence, "%") },
  ];

  return (
    <section>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {hydraLive && <span className="live-dot" />}
          <h2 className="hydra-h4 font-display uppercase tracking-wider">
            Live Metrics
          </h2>
        </div>
        <span className={hydraLive ? "status-badge" : "metric-badge"}>
          {hydraLive ? "HydraDB Connected" : "HydraDB Not Configured"}
        </span>
      </div>
      <div className={`grid grid-cols-2 gap-4 md:grid-cols-5 ${pitchMode ? "pitch-mode" : ""}`}>
        {cards.map((c) => (
          <div key={c.label} className="stat-card">
            <p className="stat-value tabular-nums">{c.value}</p>
            <p className="stat-label">{c.label}</p>
          </div>
        ))}
      </div>
      <p className="hydra-caption mt-4">
        All values are measured from your uploads and HydraDB recall — no simulated metrics.
      </p>
    </section>
  );
}
