"use client";

import { useEffect, useState } from "react";

const STAGES = [
  { id: 1, label: "Ingest", desc: "Parsing multimodal knowledge" },
  { id: 2, label: "Embed", desc: "Vector + graph embedding" },
  { id: 3, label: "Graph", desc: "Entity-relationship extraction" },
  { id: 4, label: "Memory", desc: "HydraDB persistent commit" },
  { id: 5, label: "Evolve", desc: "Living wiki synthesis" },
];

interface Props {
  active: boolean;
  generation: number;
}

export function EvolutionPipeline({ active, generation }: Props) {
  const [stage, setStage] = useState(0);

  useEffect(() => {
    if (!active) {
      setStage(0);
      return;
    }
    setStage(1);
    const timers = STAGES.slice(1).map((_, i) =>
      setTimeout(() => setStage(i + 2), (i + 1) * 900),
    );
    return () => timers.forEach(clearTimeout);
  }, [active]);

  if (!active && stage === 0) return null;

  return (
    <section className="feature-card">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="hydra-h4 font-display uppercase tracking-wider">
          Knowledge Evolution Pipeline
        </h2>
        <span className="metric-badge">Gen {generation}</span>
      </div>
      <div className="flex flex-col gap-3 md:flex-row md:gap-4">
        {STAGES.map((s, i) => {
          const done = stage > i;
          const current = stage === i + 1;
          return (
            <div
              key={s.id}
              className={`pipeline-stage ${current ? "active" : ""} ${done ? "done" : ""}`}
            >
              <span className="mb-2 flex items-center gap-2">
                <span className="stage-num">{done ? "✓" : s.id}</span>
                <span className="font-display text-sm text-white">{s.label}</span>
              </span>
              <p className="hydra-caption">{s.desc}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
