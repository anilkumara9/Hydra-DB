"use client";

import { useState } from "react";
import type { DashboardStats, InvestorBrief, LearnedTopic, WikiPage } from "@/lib/types";

interface Props {
  wiki: WikiPage | null;
  topics: LearnedTopic[];
  stats: DashboardStats;
  disabled: boolean;
}

export function InvestorBriefPanel({ wiki, topics, stats, disabled }: Props) {
  const [brief, setBrief] = useState<InvestorBrief | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generate = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/investor-brief", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          wiki,
          topics,
          metrics: {
            avgRecallMs: stats.avgRecallMs,
            recallConfidence: stats.recallConfidence,
            hydraRelations: stats.hydraRelations,
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      setBrief(data.brief);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="feature-card border-2 border-[#FF571A]">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="step-badge">$</span>
          <h2 className="hydra-h3 font-display">Investor Intelligence Brief</h2>
        </div>
        <button
          type="button"
          onClick={generate}
          disabled={disabled || loading}
          className="btn-primary text-xs"
        >
          {loading ? "Synthesizing…" : "Generate Brief"}
        </button>
      </div>
      <p className="hydra-caption mb-4">
        AI-generated funding narrative from your real uploads and measured HydraDB metrics only
      </p>
      {error && <p className="mb-3 text-sm text-[#F9C425]">{error}</p>}
      {brief && (
        <div className="space-y-4">
          <div className="info-box text-white">{brief.thesis}</div>
          <div>
            <h4 className="mb-2 font-display text-xs uppercase text-[#FF571A]">
              Market
            </h4>
            <p className="text-sm text-white">{brief.marketOpportunity}</p>
          </div>
          <div>
            <h4 className="mb-2 font-display text-xs uppercase text-[#FF571A]">Moat</h4>
            <p className="text-sm text-white">{brief.productMoat}</p>
          </div>
          <div>
            <h4 className="mb-2 font-display text-xs uppercase text-[#FF571A]">
              Traction (from your session)
            </h4>
            <ul className="space-y-1 text-sm text-white">
              {brief.tractionSignals.map((t) => (
                <li key={t} className="flex gap-2">
                  <span className="text-[#FF571A]">▸</span>
                  {t}
                </li>
              ))}
            </ul>
          </div>
          <blockquote className="border-l-4 border-[#FF571A] bg-[#FF571A]/5 p-4 text-sm text-white">
            {brief.askStatement}
          </blockquote>
        </div>
      )}
    </section>
  );
}
