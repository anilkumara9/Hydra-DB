"use client";

import type { GraphEdge } from "@/lib/types";

interface Props {
  connections: string[];
  hydraEdges?: GraphEdge[];
}

export function AdvancedKnowledgeGraph({
  connections,
  hydraEdges = [],
}: Props) {
  const edges = hydraEdges;
  const hasHydraGraph = edges.length > 0;

  const nodes = Array.from(
    new Set(edges.flatMap((e) => [e.from, e.to])),
  ).slice(0, 12);

  return (
    <section className="feature-card overflow-hidden">
      <div className="mb-6 flex items-center gap-3">
        <span className="step-badge">★</span>
        <div>
          <h2 className="hydra-h3 font-display">HydraDB Memory Graph</h2>
          <p className="hydra-caption mt-1">
            {hasHydraGraph
              ? "Entity relationships returned by HydraDB graph traversal"
              : "Graph appears after HydraDB indexes your upload and you run a recall (chat)"}
          </p>
        </div>
      </div>

      {hasHydraGraph ? (
        <>
          <svg
            viewBox="0 0 640 320"
            className="mx-auto w-full max-w-3xl"
            role="img"
            aria-label="HydraDB knowledge graph"
          >
            <defs>
              <linearGradient id="edgeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#FF571A" stopOpacity="0.3" />
                <stop offset="50%" stopColor="#FF571A" stopOpacity="1" />
                <stop offset="100%" stopColor="#FF571A" stopOpacity="0.3" />
              </linearGradient>
            </defs>

            {edges.map((e, i) => {
              const fi = nodes.indexOf(e.from);
              const ti = nodes.indexOf(e.to);
              if (fi < 0 || ti < 0) return null;
              const cx = 320;
              const cy = 160;
              const r = 110;
              const pos = (idx: number) => {
                const a = (idx / nodes.length) * Math.PI * 2 - Math.PI / 2;
                return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
              };
              const f = pos(fi);
              const t = pos(ti);
              const mx = (f.x + t.x) / 2;
              const my = (f.y + t.y) / 2 - 20;
              return (
                <g key={`${e.from}-${e.to}-${i}`}>
                  <path
                    d={`M ${f.x} ${f.y} Q ${mx} ${my} ${t.x} ${t.y}`}
                    fill="none"
                    stroke="url(#edgeGrad)"
                    strokeWidth="2"
                    className="graph-edge-animate"
                  />
                  <text
                    x={mx}
                    y={my}
                    textAnchor="middle"
                    fill="#999999"
                    fontSize="8"
                  >
                    {e.relation.replace(/_/g, " ")}
                  </text>
                </g>
              );
            })}

            {nodes.map((name, i) => {
              const cx = 320;
              const cy = 160;
              const r = 110;
              const a = (i / nodes.length) * Math.PI * 2 - Math.PI / 2;
              const p = { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
              return (
                <g key={name}>
                  <rect
                    x={p.x - 32}
                    y={p.y - 14}
                    width="64"
                    height="28"
                    fill="#000000"
                    stroke="#FF571A"
                    strokeWidth="1.5"
                  />
                  <text
                    x={p.x}
                    y={p.y}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fill="#FFFFFF"
                    fontSize="9"
                    fontFamily="monospace"
                  >
                    {name.length > 10 ? `${name.slice(0, 8)}…` : name}
                  </text>
                </g>
              );
            })}
          </svg>
        </>
      ) : (
        <p className="hydra-caption py-8 text-center">
          No HydraDB graph edges yet. Upload content, wait for indexing, then ask a question.
        </p>
      )}

      {connections.length > 0 && (
        <div className="mt-8 border-t border-[#353535] pt-6">
          <p className="mb-3 font-display text-xs uppercase tracking-wider text-[#999999]">
            Concept chain (from your content analysis)
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            {connections.map((node, i) => (
              <span key={`${node}-${i}`} className="flex items-center gap-1 text-xs">
                <span className="graph-node">{node}</span>
                {i < connections.length - 1 && (
                  <span className="text-[#FF571A]">→</span>
                )}
              </span>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
