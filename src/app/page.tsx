"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { UploadPanel } from "@/components/UploadPanel";
import { WikiView } from "@/components/WikiView";
import { AdvancedKnowledgeGraph } from "@/components/AdvancedKnowledgeGraph";
import { ChatPanel } from "@/components/ChatPanel";
import { MemoryTimeline } from "@/components/MemoryTimeline";
import { CommandCenter } from "@/components/CommandCenter";
import { EvolutionPipeline } from "@/components/EvolutionPipeline";
import { ReasoningPanel } from "@/components/ReasoningPanel";
import { CrossTopicInsights } from "@/components/CrossTopicInsights";
import { IndexingStatus } from "@/components/IndexingStatus";
import { MemorySearch } from "@/components/MemorySearch";
import { InvestorBriefPanel } from "@/components/InvestorBriefPanel";
import { KnowledgeConsistencyPanel } from "@/components/KnowledgeConsistencyPanel";
import type {
  ChatMessage,
  CrossTopicInsight,
  DashboardStats,
  IngestMetrics,
  LearnedTopic,
  ReasoningTrace,
  WikiPage,
  WikiReconciliation,
} from "@/lib/types";
import { wikiToSessionContext } from "@/lib/wiki-normalize";

const TOPICS_KEY = "wiki-mind-topics";
const CONTEXT_KEY = "wiki-mind-context";

export default function Home() {
  const [wiki, setWiki] = useState<WikiPage | null>(null);
  const [sessionContext, setSessionContext] = useState("");
  const [ingestLoading, setIngestLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [topics, setTopics] = useState<LearnedTopic[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<IngestMetrics | null>(null);
  const [lastTrace, setLastTrace] = useState<ReasoningTrace | null>(null);
  const [lastCitations, setLastCitations] = useState<string[]>([]);
  const [crossInsight, setCrossInsight] = useState<CrossTopicInsight | null>(null);
  const [evolveLoading, setEvolveLoading] = useState(false);
  const [pitchMode, setPitchMode] = useState(false);
  const [hydraLive, setHydraLive] = useState(false);
  const [avgRecallMs, setAvgRecallMs] = useState<number | null>(null);
  const [systemReady, setSystemReady] = useState<boolean | null>(null);
  const [hydraSourceId, setHydraSourceId] = useState<string | null>(null);
  const [sourcePreview, setSourcePreview] = useState<string | null>(null);
  const [reconciliation, setReconciliation] =
    useState<WikiReconciliation | null>(null);
  const [uploadGeneration, setUploadGeneration] = useState(1);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(TOPICS_KEY);
      if (raw) setTopics(JSON.parse(raw));
      const ctx = localStorage.getItem(CONTEXT_KEY);
      if (ctx) setSessionContext(ctx);
    } catch {
      /* ignore */
    }
    fetch("/api/status")
      .then((r) => r.json())
      .then((d) => {
        setHydraLive(d.hydra);
        setSystemReady(d.ready);
      })
      .catch(() => setSystemReady(false));
  }, []);

  const warmRecall = useCallback(async (query: string) => {
    try {
      const res = await fetch("/api/warm-recall", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query,
          sessionContext,
          uploadGeneration,
        }),
      });
      const data = await res.json();
      if (res.ok && data.reasoning) {
        setLastTrace(data.reasoning);
        setAvgRecallMs(data.reasoning.latencyMs);
      }
    } catch {
      /* optional prefetch */
    }
  }, [sessionContext, uploadGeneration]);

  const fetchCrossTopic = useCallback(async (topicList: LearnedTopic[]) => {
    if (topicList.length < 2) return;
    setEvolveLoading(true);
    try {
      const res = await fetch("/api/evolve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topics: topicList.slice(0, 5) }),
      });
      const data = await res.json();
      if (res.ok) setCrossInsight(data.insight);
    } catch {
      /* optional */
    } finally {
      setEvolveLoading(false);
    }
  }, []);

  const chatSuggestions = useMemo(() => {
    if (!wiki?.keyConcepts.length) return [];
    return wiki.keyConcepts.slice(0, 3).map((c) => `How does ${c} connect to the rest?`);
  }, [wiki]);

  const stats: DashboardStats = useMemo(
    () => ({
      topicsLearned: topics.length,
      conceptsInWiki: wiki ? wiki.keyConcepts.length : null,
      hydraRelations: lastTrace?.graphEdges.length ?? null,
      avgRecallMs,
      recallConfidence: lastTrace?.confidence ?? null,
      chunksRetrieved: lastTrace?.sources.length ?? null,
    }),
    [topics, wiki, lastTrace, avgRecallMs],
  );

  const handleIngest = async (payload: {
    type: "text" | "url";
    content?: string;
    url?: string;
  }) => {
    setError(null);
    setIngestLoading(true);
    setWiki(null);
    setCrossInsight(null);
    setLastTrace(null);
    setHydraSourceId(null);
    setSourcePreview(null);
    setReconciliation(null);
    try {
      const res = await fetch("/api/ingest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload, priorTopics: topics }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Ingest failed");

      setWiki(data.wiki);
      setMetrics(data.metrics);
      setHydraLive(data.hydraEnabled);
      setHydraSourceId(data.metrics?.hydraSourceId ?? null);
      setSourcePreview(data.rawPreview ?? null);
      setReconciliation(data.reconciliation ?? null);
      setUploadGeneration(data.metrics?.uploadGeneration ?? 1);

      const ctx = wikiToSessionContext(data.wiki, data.rawPreview);
      setSessionContext(ctx);
      localStorage.setItem(CONTEXT_KEY, ctx);

      setTopics((prev) => {
        const updated = [
          {
            id: crypto.randomUUID(),
            title: data.wiki.title,
            summary: data.wiki.summary,
            createdAt: new Date().toISOString(),
            concepts: data.wiki.keyConcepts,
            generation: data.metrics?.uploadGeneration,
            sourceId: data.metrics?.hydraSourceId,
          },
          ...prev.filter((t) => t.title !== data.wiki.title),
        ].slice(0, 15);
        localStorage.setItem(TOPICS_KEY, JSON.stringify(updated));
        if (updated.length >= 2) fetchCrossTopic(updated);
        return updated;
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setIngestLoading(false);
    }
  };

  const handleAsk = async (
    question: string,
    thinking: boolean,
    useStream: boolean,
  ) => {
    setError(null);
    setMessages((m) => [...m, { role: "user", content: question }]);

    if (useStream) {
      setMessages((m) => [...m, { role: "assistant", content: "" }]);
      try {
        const res = await fetch("/api/chat/stream", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            question,
            sessionContext,
            thinkingMode: thinking,
            uploadGeneration,
          }),
        });
        if (!res.ok || !res.body) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error ?? "Stream failed");
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let fullAnswer = "";
        let trace: ReasoningTrace | undefined;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n\n");
          buffer = lines.pop() ?? "";
          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            let payload: {
              type: string;
              text?: string;
              reasoning?: ReasoningTrace;
              message?: string;
            };
            try {
              payload = JSON.parse(line.slice(6));
            } catch {
              continue;
            }
            if (payload.type === "meta" && payload.reasoning) {
              trace = payload.reasoning;
              setLastTrace(trace);
              setAvgRecallMs(trace.latencyMs);
            }
            if (payload.type === "token" && payload.text) {
              fullAnswer += payload.text;
              setMessages((m) => {
                const copy = [...m];
                copy[copy.length - 1] = {
                  role: "assistant",
                  content: fullAnswer,
                  reasoning: trace,
                };
                return copy;
              });
            }
            if (payload.type === "error") {
              throw new Error(payload.message ?? "Stream error");
            }
          }
        }

        if (trace?.sources?.length) {
          setLastCitations(trace.sources.map((s) => s.title));
        }
        return { answer: fullAnswer, reasoning: trace };
      } catch (e) {
        setMessages((m) =>
          m.filter(
            (_, i) =>
              i !== m.length - 1 || m[m.length - 1].role !== "assistant",
          ),
        );
        setError(e instanceof Error ? e.message : "Chat failed");
        throw e;
      }
    }

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question,
          sessionContext,
          history: messages,
          thinkingMode: thinking,
          uploadGeneration,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Chat failed");

      if (data.reasoning) {
        setLastTrace(data.reasoning);
        setAvgRecallMs(data.reasoning.latencyMs);
      }

      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          content: data.answer,
          reasoning: data.reasoning,
        },
      ]);
      if (data.citations?.length) setLastCitations(data.citations);

      return {
        answer: data.answer,
        citations: data.citations,
        reasoning: data.reasoning,
      };
    } catch (e) {
      setMessages((m) => m.filter((_, i) => i !== m.length - 1 || m[m.length - 1].role !== "assistant"));
      setError(e instanceof Error ? e.message : "Chat failed");
      throw e;
    }
  };

  return (
    <div
      className={`relative min-h-screen bg-black ${pitchMode ? "pitch-mode" : ""}`}
    >
      <div className="grid-bg pointer-events-none fixed inset-0 hidden md:block" aria-hidden />

      <header className="hydra-nav relative z-10">
        <div className="mx-auto flex h-16 max-w-[1440px] items-center justify-between px-4 md:px-10">
          <span>
            <p className="hydra-caption uppercase tracking-[0.2em] text-[#FF571A]">
              Powered by HydraDB
            </p>
            <h1 className="font-display text-lg text-white md:text-xl">
              WIKIMIND
            </h1>
          </span>
          <nav className="flex items-center gap-4">
            <span className="hydra-caption hidden text-[#999999] sm:inline">
              Agentic Memory Infrastructure
            </span>
            <button
              type="button"
              onClick={() => setPitchMode((p) => !p)}
              className={pitchMode ? "btn-primary text-xs" : "btn-ghost text-xs"}
            >
              {pitchMode ? "PITCH ON" : "Pitch Mode"}
            </button>
          </nav>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-[1440px] space-y-8 px-4 py-8 md:space-y-12 md:px-10 md:py-12">
        <section>
          <h2 className="hydra-hero mb-2">Self-Evolving AI Wikipedia</h2>
          <p className="hydra-body max-w-2xl text-[20px] leading-6 text-white">
            Parallel ingest · live HydraDB indexing · streamed reasoning · investor-grade
            intelligence — zero demo data.
          </p>
        </section>

        {systemReady === false && (
          <div className="info-box text-sm text-white">
            Configure OPENAI_API_KEY and HYDRA_DB_API_KEY in .env.local, then restart
            the dev server.
          </div>
        )}

        {error && <div className="alert-error">{error}</div>}

        <CommandCenter stats={stats} hydraLive={hydraLive} pitchMode={pitchMode} />

        <EvolutionPipeline
          active={ingestLoading}
          generation={metrics?.uploadGeneration ?? (topics.length || 1)}
        />

        <IndexingStatus
          sourceId={hydraSourceId}
          onReady={() => wiki && warmRecall(wiki.title)}
        />

        <UploadPanel onIngest={handleIngest} loading={ingestLoading} />

        <WikiView
          wiki={wiki}
          loading={ingestLoading}
          sourcePreview={sourcePreview}
        />

        <KnowledgeConsistencyPanel reconciliation={reconciliation} />

        {wiki && (
          <AdvancedKnowledgeGraph
            connections={wiki.connections}
            hydraEdges={lastTrace?.graphEdges}
          />
        )}

        <MemorySearch disabled={!hydraLive} />

        {(crossInsight || evolveLoading) && topics.length >= 2 && (
          <CrossTopicInsights insight={crossInsight} loading={evolveLoading} />
        )}

        <InvestorBriefPanel
          wiki={wiki}
          topics={topics}
          stats={stats}
          disabled={!wiki && topics.length === 0}
        />

        <div className="grid items-start gap-8 lg:grid-cols-2">
          <ChatPanel
            disabled={!sessionContext || !hydraLive}
            suggestions={chatSuggestions}
            onAsk={handleAsk}
            messages={messages}
          />
          <MemoryTimeline topics={topics} />
        </div>

        <ReasoningPanel trace={lastTrace} citations={lastCitations} />
      </main>
    </div>
  );
}
