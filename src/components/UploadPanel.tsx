"use client";

import { useState } from "react";

type Tab = "text" | "url" | "file";

interface Props {
  onIngest: (payload: {
    type: "text" | "url";
    content?: string;
    url?: string;
  }) => void;
  loading: boolean;
}

export function UploadPanel({ onIngest, loading }: Props) {
  const [tab, setTab] = useState<Tab>("text");
  const [text, setText] = useState("");
  const [url, setUrl] = useState("");

  const submit = () => {
    if (tab === "url") onIngest({ type: "url", url });
    else if (tab === "text") onIngest({ type: "text", content: text });
  };

  const onFile = async (file: File) => {
    const content = await file.text();
    onIngest({ type: "text", content });
  };

  return (
    <section className="feature-card">
      <div className="mb-6 flex items-center gap-3">
        <span className="step-badge">01</span>
        <h2 className="hydra-h3 font-display">Upload Knowledge</h2>
      </div>
      <p className="hydra-caption mb-6">
        Paste or upload real source material (200+ characters). Wiki sections are
        generated only from your text — nothing preloaded.
      </p>

      <div className="mb-6 flex flex-wrap gap-2">
        {(["text", "url", "file"] as Tab[]).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`tab-btn capitalize ${tab === t ? "active" : ""}`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "text" && (
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={5}
          className="input-field textarea-field mb-6 w-full"
          placeholder="Paste your document, notes, or article text..."
        />
      )}
      {tab === "url" && (
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          className="input-field mb-6 w-full"
          placeholder="https://..."
        />
      )}
      {tab === "file" && (
        <label className="file-drop mb-6 block">
          <span className="hydra-body text-[#999999]">Drop .txt or .md file</span>
          <input
            type="file"
            accept=".txt,.md,text/plain,text/markdown"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onFile(f);
            }}
          />
        </label>
      )}

      {tab !== "file" && (
        <button
          type="button"
          onClick={submit}
          disabled={loading || (tab === "text" ? !text.trim() : !url.trim())}
          className="btn-primary w-full"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <span className="pulse-dot" />
              Ingesting to HydraDB...
            </span>
          ) : (
            "Generate Living Wiki"
          )}
        </button>
      )}
    </section>
  );
}
