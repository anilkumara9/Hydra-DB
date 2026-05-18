"use client";

import { useEffect, useRef, useState } from "react";
import type { ChatMessage, ReasoningTrace } from "@/lib/types";

interface Props {
  disabled: boolean;
  suggestions?: string[];
  onAsk: (
    question: string,
    thinking: boolean,
    useStream: boolean,
  ) => Promise<{
    answer: string;
    citations?: string[];
    reasoning?: ReasoningTrace;
  }>;
  messages: ChatMessage[];
}

export function ChatPanel({
  disabled,
  suggestions = [],
  onAsk,
  messages,
}: Props) {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [thinkingMode, setThinkingMode] = useState(false);
  const [streamMode, setStreamMode] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  const send = async (q: string) => {
    if (!q.trim() || loading) return;
    setInput("");
    setLoading(true);
    try {
      await onAsk(q, thinkingMode, streamMode);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages, loading]);

  return (
    <section className="feature-card chat-panel">
      <header className="chat-panel-header">
        <span className="flex items-center gap-3">
          <span className="step-badge">03</span>
          <h2 className="hydra-h3 font-display">Contextual Reasoning</h2>
        </span>
        <div className="chat-panel-toggles">
          <label className="chat-toggle">
            <input
              type="checkbox"
              checked={streamMode}
              onChange={(e) => setStreamMode(e.target.checked)}
              className="hydra-checkbox"
            />
            Stream
          </label>
          <label className="chat-toggle">
            <input
              type="checkbox"
              checked={thinkingMode}
              onChange={(e) => setThinkingMode(e.target.checked)}
              className="hydra-checkbox"
            />
            Thinking
          </label>
        </div>
      </header>

      {suggestions.length > 0 && (
        <div className="chat-suggestions">
          {suggestions.map((s) => (
            <button
              key={s}
              type="button"
              disabled={disabled || loading}
              onClick={() => send(s)}
              className="tab-btn text-left normal-case disabled:opacity-40"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      <div className="chat-body">
        <div ref={scrollRef} className="chat-messages">
          {messages.length === 0 && !loading && (
            <div className="chat-empty">
              <p className="font-display text-sm text-[#FF571A]">Ready to reason</p>
              <p className="hydra-caption mt-2 max-w-xs">
                Ask anything about your uploaded knowledge. Answers use HydraDB recall
                from your real data.
              </p>
            </div>
          )}

          {messages.map((m, i) => (
            <div key={i} className="chat-message-group">
              <div
                className={
                  m.role === "user"
                    ? "chat-bubble chat-bubble-user"
                    : "chat-bubble chat-bubble-assistant"
                }
              >
                <span className="chat-bubble-label">
                  {m.role === "user" ? "You" : "WikiMind"}
                </span>
                <p className="chat-bubble-text">
                  {m.content || (loading && m.role === "assistant" ? "…" : "")}
                  {loading &&
                    m.role === "assistant" &&
                    i === messages.length - 1 &&
                    m.content && (
                      <span className="chat-cursor" aria-hidden>
                        ▍
                      </span>
                    )}
                </p>
              </div>
              {m.reasoning && m.role === "assistant" && (
                <p className="chat-meta">
                  {m.reasoning.confidence != null
                    ? `${m.reasoning.confidence}% relevance`
                    : "Recall pending"}
                  <span className="chat-meta-sep">·</span>
                  {m.reasoning.latencyMs}ms
                  <span className="chat-meta-sep">·</span>
                  {m.reasoning.mode}
                </p>
              )}
            </div>
          ))}

          {loading && messages[messages.length - 1]?.role === "user" && (
            <div className="chat-typing">
              <span className="pulse-dot" />
              HydraDB recall + streaming answer…
            </div>
          )}
        </div>

        <form
          className="chat-composer"
          onSubmit={(e) => {
            e.preventDefault();
            send(input);
          }}
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={disabled || loading}
            placeholder={
              disabled
                ? "Upload knowledge and connect HydraDB to chat…"
                : "Ask about your uploaded knowledge…"
            }
            className="input-field chat-composer-input"
          />
          <button
            type="submit"
            disabled={disabled || loading || !input.trim()}
            className="btn-primary chat-composer-btn"
          >
            {loading ? "…" : "Reason"}
          </button>
        </form>
      </div>
    </section>
  );
}

