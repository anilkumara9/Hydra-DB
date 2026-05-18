"use client";

import { useState } from "react";
import type { ChatMessage, ReasoningTrace } from "@/lib/types";

interface Props {
  disabled: boolean;
  suggestions?: string[];
  onAsk: (question: string, thinking: boolean) => Promise<{
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
  const [thinkingMode, setThinkingMode] = useState(true);

  const send = async (q: string) => {
    if (!q.trim() || loading) return;
    setInput("");
    setLoading(true);
    try {
      await onAsk(q, thinkingMode);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="feature-card flex flex-col">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <span className="flex items-center gap-3">
          <span className="step-badge">03</span>
          <h2 className="hydra-h3 font-display">Contextual Reasoning</h2>
        </span>
        <label className="flex cursor-pointer items-center gap-2 hydra-caption">
          <input
            type="checkbox"
            checked={thinkingMode}
            onChange={(e) => setThinkingMode(e.target.checked)}
            className="hydra-checkbox"
          />
          HydraDB thinking mode
        </label>
      </div>

      {suggestions.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-2">
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

      <div className="chat-scroll mb-4 max-h-72 flex-1 space-y-3 overflow-y-auto p-4">
        {messages.length === 0 && (
          <p className="hydra-caption text-center">
            Ask after upload — answers use HydraDB recall from your knowledge
          </p>
        )}
        {messages.map((m, i) => (
          <span key={i}>
            <div className={m.role === "user" ? "chat-user" : "chat-assistant"}>
              {m.content}
            </div>
            {m.reasoning && m.role === "assistant" && (
              <p className="mr-6 mt-1 hydra-caption">
                {m.reasoning.confidence != null
                  ? `${m.reasoning.confidence}% relevance`
                  : "Recall pending scores"}
                {" · "}
                {m.reasoning.latencyMs}ms · {m.reasoning.mode}
              </p>
            )}
          </span>
        ))}
        {loading && (
          <div className="flex items-center gap-2 hydra-caption">
            <span className="pulse-dot" />
            HydraDB recall in progress...
          </div>
        )}
      </div>

      <form
        className="flex gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={disabled || loading}
          placeholder="Ask about your uploaded knowledge..."
          className="input-field flex-1"
        />
        <button
          type="submit"
          disabled={disabled || loading || !input.trim()}
          className="btn-primary shrink-0"
        >
          Reason
        </button>
      </form>
    </section>
  );
}
