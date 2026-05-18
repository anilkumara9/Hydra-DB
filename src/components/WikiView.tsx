"use client";

import { useMemo, useState } from "react";
import type { WikiPage } from "@/lib/types";
import { downloadMarkdown } from "@/lib/wiki-export";

interface Props {
  wiki: WikiPage | null;
  loading: boolean;
  sourcePreview?: string | null;
}

type WikiTab = "overview" | "facts" | "reference";

const COVERAGE_LABEL: Record<WikiPage["sourceCoverage"], string> = {
  full: "High fidelity",
  partial: "Partial coverage",
  minimal: "Add more source text",
};

export function WikiView({ wiki, loading, sourcePreview }: Props) {
  const [tab, setTab] = useState<WikiTab>("overview");
  const [expandedLead, setExpandedLead] = useState(false);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});
  const [showSource, setShowSource] = useState(false);

  const defaultOpen = useMemo(() => {
    if (!wiki) return {};
    const first = wiki.sections[0]?.heading;
    return first ? { [first]: true } : {};
  }, [wiki]);

  const sectionOpen = (heading: string) =>
    openSections[heading] ?? defaultOpen[heading] ?? false;

  const toggleSection = (heading: string) => {
    setOpenSections((prev) => ({
      ...prev,
      [heading]: !sectionOpen(heading),
    }));
  };

  if (loading) {
    return (
      <section className="feature-card wiki-article wiki-article-compact">
        <WikiHeader loading />
        <div className="space-y-3 p-4">
          <div className="wiki-skeleton h-8 w-2/3" />
          <div className="wiki-skeleton h-3 w-full" />
          <div className="wiki-skeleton h-24 w-full" />
          <p className="hydra-caption">Building concise article from your source…</p>
        </div>
      </section>
    );
  }

  if (!wiki) {
    return (
      <section className="feature-card wiki-article wiki-article-compact flex min-h-[280px] items-center justify-center text-center">
        <div className="p-6">
          <span className="step-badge mb-4 inline-block">02</span>
          <p className="hydra-caption max-w-md">
            Upload source text to generate a compact, structured wiki — no
            preloaded content.
          </p>
        </div>
      </section>
    );
  }

  const leadLong = wiki.summary.length > 160;

  return (
    <section className="feature-card wiki-article wiki-article-compact">
      <WikiHeader
        wiki={wiki}
        coverageLabel={COVERAGE_LABEL[wiki.sourceCoverage]}
        onExport={() => downloadMarkdown(wiki)}
      />

      {wiki.keyConcepts.length > 0 && (
        <div className="wiki-chips">
          {wiki.keyConcepts.map((c) => (
            <span key={c} className="tag-chip">
              {c}
            </span>
          ))}
        </div>
      )}

      <div className="wiki-tabs" role="tablist">
        {(
          [
            ["overview", "Overview"],
            ["facts", `Facts (${wiki.keyFacts.length})`],
            ["reference", "Reference"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            className={`wiki-tab ${tab === id ? "active" : ""}`}
            onClick={() => setTab(id)}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="wiki-tab-panel">
        {tab === "overview" && (
          <div className="wiki-overview">
            {wiki.infobox.length > 0 && (
              <aside className="wiki-infobox-inline">
                <h3 className="wiki-infobox-title font-display">At a glance</h3>
                <dl>
                  {wiki.infobox.map((row) => (
                    <div key={row.label} className="wiki-infobox-row">
                      <dt>{row.label}</dt>
                      <dd>{row.value}</dd>
                    </div>
                  ))}
                </dl>
              </aside>
            )}

            {wiki.summary && (
              <p
                className={`wiki-lead-compact ${!expandedLead && leadLong ? "wiki-lead-clamped" : ""}`}
              >
                {wiki.summary}
              </p>
            )}
            {leadLong && (
              <button
                type="button"
                className="wiki-expand-btn"
                onClick={() => setExpandedLead((e) => !e)}
              >
                {expandedLead ? "Show less" : "Show full summary"}
              </button>
            )}

            <div className="wiki-accordion">
              {wiki.sections.map((section) => {
                const open = sectionOpen(section.heading);
                return (
                  <div key={section.heading} className="wiki-accordion-item">
                    <button
                      type="button"
                      className="wiki-accordion-trigger"
                      onClick={() => toggleSection(section.heading)}
                      aria-expanded={open}
                    >
                      <span className="font-display text-sm">{section.heading}</span>
                      <span className="wiki-accordion-icon">{open ? "−" : "+"}</span>
                    </button>
                    {open && (
                      <div className="wiki-accordion-body">
                        {section.paragraphs.map((p, i) => (
                          <p key={i} className="wiki-paragraph-compact">
                            {p}
                          </p>
                        ))}
                        {section.bullets && section.bullets.length > 0 && (
                          <ul className="wiki-list-compact">
                            {section.bullets.map((b) => (
                              <li key={b}>{b}</li>
                            ))}
                          </ul>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {tab === "facts" && (
          <div className="wiki-facts-panel">
            {wiki.keyFacts.length === 0 ? (
              <p className="hydra-caption">No discrete facts extracted — see Overview.</p>
            ) : (
              <ul className="wiki-facts-list">
                {wiki.keyFacts.map((f) => (
                  <li key={f.fact} className="wiki-fact-row">
                    <span className="wiki-fact-dot" aria-hidden />
                    <div>
                      <p className="wiki-fact-text">{f.fact}</p>
                      <p className="wiki-fact-evidence">{f.evidence}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {tab === "reference" && (
          <div className="wiki-ref-grid">
            <RefBlock title="Entities" empty="None in source." hasItems={wiki.entities.length > 0}>
              {wiki.entities.map((e) => (
                <div key={e.name} className="wiki-ref-row">
                  <span className="text-white">{e.name}</span>
                  <span className="hydra-caption">{e.role}</span>
                </div>
              ))}
            </RefBlock>
            <RefBlock title="Timeline" empty="No dates in source." hasItems={wiki.timeline.length > 0}>
              {wiki.timeline.map((t) => (
                <div key={`${t.year}-${t.event}`} className="wiki-ref-row">
                  <span className="text-[#FF571A] font-display text-xs">{t.year}</span>
                  <span className="text-sm text-white">{t.event}</span>
                </div>
              ))}
            </RefBlock>
            <RefBlock title="Technologies" empty="None listed." hasItems={wiki.relatedTechnologies.length > 0}>
              {wiki.relatedTechnologies.map((t) => (
                <span key={t} className="tag-chip">
                  {t}
                </span>
              ))}
            </RefBlock>
            <RefBlock title="Relationships" empty="None extracted." hasItems={wiki.connections.length > 0}>
              {wiki.connections.map((c) => (
                <span key={c} className="metric-badge normal-case text-xs">
                  {c}
                </span>
              ))}
            </RefBlock>
            {wiki.inferences.length > 0 && (
              <RefBlock title="Inferences" empty="" hasItems className="wiki-ref-full">
                {wiki.inferences.map((p) => (
                  <p key={p} className="info-box text-xs">
                    {p}
                  </p>
                ))}
              </RefBlock>
            )}
          </div>
        )}
      </div>

      {sourcePreview && (
        <footer className="wiki-footer">
          <button
            type="button"
            onClick={() => setShowSource((s) => !s)}
            className="btn-ghost text-xs"
          >
            {showSource ? "Hide source" : "Verify against source"}
          </button>
          {showSource && (
            <pre className="wiki-source-text">{sourcePreview.slice(0, 600)}</pre>
          )}
        </footer>
      )}
    </section>
  );
}

function WikiHeader({
  wiki,
  coverageLabel,
  onExport,
  loading,
}: {
  wiki?: WikiPage;
  coverageLabel?: string;
  onExport?: () => void;
  loading?: boolean;
}) {
  return (
    <header className="wiki-header-compact">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="flex items-center gap-3">
          <span className="step-badge">02</span>
          <h2 className="hydra-h3 font-display">Living Wikipedia</h2>
        </span>
        {!loading && wiki && (
          <div className="flex items-center gap-2">
            <span className="metric-badge normal-case text-xs">{coverageLabel}</span>
            <button type="button" onClick={onExport} className="btn-ghost text-xs">
              Export
            </button>
          </div>
        )}
      </div>
      {!loading && wiki && (
        <h1 className="wiki-title-compact font-display">{wiki.title}</h1>
      )}
    </header>
  );
}

function RefBlock({
  title,
  empty,
  hasItems,
  children,
  className = "",
}: {
  title: string;
  empty: string;
  hasItems: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`wiki-ref-block ${className}`}>
      <h4 className="wiki-ref-title font-display">{title}</h4>
      {hasItems ? (
        <div className="wiki-ref-content">{children}</div>
      ) : (
        <p className="hydra-caption">{empty}</p>
      )}
    </div>
  );
}

