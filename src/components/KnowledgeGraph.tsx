"use client";

interface Props {
  connections: string[];
}

export function KnowledgeGraph({ connections }: Props) {
  if (!connections.length) return null;

  return (
    <section className="glass-panel p-6">
      <div className="mb-4 flex items-center gap-2">
        <span className="step-badge wow">★</span>
        <h2 className="text-lg font-semibold text-white">Knowledge Connections</h2>
      </div>
      <p className="mb-6 text-sm text-slate-400">
        Self-organizing memory graph — dynamic reasoning pathways
      </p>

      <div className="flex flex-wrap items-center justify-center gap-2 overflow-x-auto py-4">
        {connections.map((node, i) => (
          <div key={`${node}-${i}`} className="flex items-center gap-2">
            <div className="graph-node">{node}</div>
            {i < connections.length - 1 && (
              <span className="text-xl text-cyan-400/80">→</span>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
