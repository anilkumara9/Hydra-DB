"use client";

import type { CrossTopicInsight } from "@/lib/types";

interface Props {
  insight: CrossTopicInsight | null;
  loading: boolean;
}

export function CrossTopicInsights({ insight, loading }: Props) {
  if (!loading && !insight) return null;

  return (
    <section className="feature-card border-2 border-[#FF571A]">
      <div className="mb-6 flex items-center gap-3">
        <span className="step-badge">∞</span>
        <h2 className="hydra-h3 font-display">Cross-Topic Intelligence Fusion</h2>
      </div>

      {loading ? (
        <div className="space-y-3">
          <div className="h-6 w-3/4 bg-[#353535]" />
          <div className="h-4 w-full bg-[#2E2E2E]" />
        </div>
      ) : insight ? (
        <>
          <p className="hydra-h4 mb-6 text-[#FF571A]">{insight.headline}</p>
          <div className="mb-6 flex flex-wrap gap-2">
            {insight.bridges.map((b) => (
              <span key={b} className="metric-badge normal-case">
                {b}
              </span>
            ))}
          </div>
          <ul className="mb-6 space-y-2">
            {insight.emergentThemes.map((t) => (
              <li key={t} className="flex gap-2 text-sm text-white">
                <span className="text-[#FF571A]">■</span>
                {t}
              </li>
            ))}
          </ul>
          <blockquote className="info-box border-l-4 border-[#FF571A] text-base not-italic">
            {insight.strategicImplication}
          </blockquote>
        </>
      ) : null}
    </section>
  );
}
