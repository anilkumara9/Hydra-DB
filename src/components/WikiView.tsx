"use client";

import type { WikiPage } from "@/lib/types";

interface Props {
  wiki: WikiPage | null;
  loading: boolean;
}

export function WikiView({ wiki, loading }: Props) {
  if (loading) {
    return (
      <section className="feature-card">
        <div className="mb-6 flex items-center gap-3">
          <span className="step-badge">02</span>
          <h2 className="hydra-h3 font-display">AI Wiki Generation</h2>
        </div>
        <div className="space-y-3">
          <div className="h-8 w-2/3 bg-[#353535]" />
          <div className="h-4 w-full bg-[#2E2E2E]" />
          <div className="h-24 w-full bg-[#2E2E2E]" />
        </div>
      </section>
    );
  }

  if (!wiki) {
    return (
      <section className="feature-card flex min-h-[320px] items-center justify-center text-center">
        <div>
          <span className="step-badge mb-4 inline-block">02</span>
          <p className="hydra-caption">
            Upload knowledge to generate your living Wikipedia page
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="feature-card">
      <div className="mb-6 flex items-center gap-3">
        <span className="step-badge">02</span>
        <h2 className="hydra-h3 font-display">AI Wiki Generation</h2>
      </div>

      <h3 className="hydra-h2 mb-4 font-display text-[#FF571A]">{wiki.title}</h3>
      <p className="hydra-body mb-8 text-[20px] leading-6">{wiki.summary}</p>

      <div className="mb-8 grid gap-4 sm:grid-cols-2">
        <Card title="Key Concepts">
          <ul className="flex flex-wrap gap-2">
            {wiki.keyConcepts.map((c) => (
              <li key={c} className="tag-chip">
                {c}
              </li>
            ))}
          </ul>
        </Card>
        <Card title="Important Entities">
          <ul className="space-y-3">
            {wiki.entities.map((e) => (
              <li key={e.name} className="flex justify-between gap-2 text-sm">
                <span className="font-medium text-white">{e.name}</span>
                <span className="hydra-caption">{e.role}</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <Card title="Timeline" className="mb-8">
        <ol className="timeline-line space-y-4">
          {wiki.timeline.map((t) => (
            <li key={`${t.year}-${t.event}`} className="relative">
              <span className="timeline-dot" />
              <span className="font-display text-xs text-[#FF571A]">{t.year}</span>
              <p className="hydra-body mt-1 text-sm">{t.event}</p>
            </li>
          ))}
        </ol>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card title="Related Technologies">
          <ul className="list-inside list-disc space-y-1 text-sm text-white">
            {wiki.relatedTechnologies.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
        </Card>
        <Card title="Future Predictions">
          <ul className="space-y-2">
            {wiki.futurePredictions.map((p) => (
              <li key={p} className="info-box text-sm">
                {p}
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </section>
  );
}

function Card({
  title,
  children,
  className = "",
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`inner-card ${className}`}>
      <h4 className="mb-4 font-display text-xs uppercase tracking-wider text-[#FF571A]">
        {title}
      </h4>
      {children}
    </div>
  );
}
