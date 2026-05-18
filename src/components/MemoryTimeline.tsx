"use client";

import type { LearnedTopic } from "@/lib/types";

interface Props {
  topics: LearnedTopic[];
}

export function MemoryTimeline({ topics }: Props) {
  return (
    <section className="feature-card">
      <div className="mb-6 flex items-center gap-3">
        <span className="step-badge">04</span>
        <h2 className="hydra-h3 font-display">Previously Learned Topics</h2>
      </div>
      <p className="hydra-caption mb-6">
        Persistent contextual memory — evolves with each upload & chat
      </p>

      {topics.length === 0 ? (
        <p className="hydra-caption">No topics yet. Upload knowledge to begin.</p>
      ) : (
        <ul className="space-y-4">
          {topics.map((t) => (
            <li
              key={t.id}
              className="inner-card border-l-4 border-l-[#FF571A] transition hover:border-[#FF571A]"
            >
              <div className="mb-2 flex items-center justify-between gap-2">
                <span className="font-display text-sm text-[#FF571A]">
                  {t.title}
                </span>
                <time className="hydra-caption">
                  {new Date(t.createdAt).toLocaleTimeString()}
                </time>
              </div>
              <p className="line-clamp-2 text-sm text-white">{t.summary}</p>
              {t.concepts && t.concepts.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1">
                  {t.concepts.slice(0, 4).map((c) => (
                    <span key={c} className="tag-chip text-[10px]">
                      {c}
                    </span>
                  ))}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
