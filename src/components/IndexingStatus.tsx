"use client";

import { useEffect, useState } from "react";
import type { IndexingStatus as IndexStatus } from "@/lib/types";

interface Props {
  sourceId: string | null;
  onReady?: () => void;
}

export function IndexingStatus({ sourceId, onReady }: Props) {
  const [status, setStatus] = useState<IndexStatus | null>(null);

  useEffect(() => {
    if (!sourceId) {
      setStatus(null);
      return;
    }

    let cancelled = false;
    let attempts = 0;
    const maxAttempts = 24;

    const poll = async () => {
      if (cancelled || attempts >= maxAttempts) return;
      attempts += 1;
      try {
        const res = await fetch(
          `/api/index-status?sourceId=${encodeURIComponent(sourceId)}`,
        );
        const data = await res.json();
        if (!res.ok) return;
        const next: IndexStatus = {
          sourceId,
          status: data.status,
          ready: data.ready,
          message: data.message,
        };
        setStatus(next);
        if (data.ready) {
          onReady?.();
          return;
        }
      } catch {
        /* retry */
      }
      setTimeout(poll, 5000);
    };

    poll();
    return () => {
      cancelled = true;
    };
  }, [sourceId, onReady]);

  if (!sourceId || !status) return null;

  return (
    <section className="feature-card border border-[#353535]">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="font-display text-sm uppercase tracking-wider text-[#FF571A]">
          HydraDB Index Monitor
        </h3>
        <span className={status.ready ? "status-badge" : "metric-badge"}>
          {status.status}
        </span>
      </div>
      <p className="hydra-caption">{status.message}</p>
      {!status.ready && (
        <div className="mt-3 flex items-center gap-2 hydra-caption">
          <span className="pulse-dot" />
          Polling real indexing status every 5s…
        </div>
      )}
    </section>
  );
}
