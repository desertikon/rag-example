"use client";

import { useState } from "react";

const API_BASE =
  typeof window !== "undefined"
    ? "/api/backend"
    : "http://localhost:3000";

export default function Home() {
  const [indexResult, setIndexResult] = useState<{
    ok: boolean;
    chunks?: number;
    collection?: string;
    error?: string;
  } | null>(null);
  const [indexLoading, setIndexLoading] = useState(false);

  const [question, setQuestion] = useState("");
  const [askResult, setAskResult] = useState<{
    ok: boolean;
    answer?: string;
    sources?: { source: string; preview: string }[];
    error?: string;
  } | null>(null);
  const [askLoading, setAskLoading] = useState(false);

  async function handleIndex() {
    setIndexLoading(true);
    setIndexResult(null);
    try {
      const res = await fetch(`${API_BASE}/index`, { method: "POST" });
      const data = await res.json();
      setIndexResult(data);
    } catch (e) {
      setIndexResult({
        ok: false,
        error: e instanceof Error ? e.message : String(e),
      });
    } finally {
      setIndexLoading(false);
    }
  }

  async function handleAsk(e: React.FormEvent) {
    e.preventDefault();
    if (!question.trim()) return;
    setAskLoading(true);
    setAskResult(null);
    try {
      const res = await fetch(`${API_BASE}/ask`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: question.trim() }),
      });
      const data = await res.json();
      setAskResult(data);
    } catch (e) {
      setAskResult({
        ok: false,
        error: e instanceof Error ? e.message : String(e),
      });
    } finally {
      setAskLoading(false);
    }
  }

  return (
    <main
      style={{
        maxWidth: 720,
        margin: "0 auto",
        padding: "2rem 1rem",
        minHeight: "100vh",
      }}
    >
      <h1 style={{ fontSize: "1.75rem", marginBottom: "0.5rem" }}>
        RAG Demo
      </h1>
      <p style={{ color: "#a1a1aa", marginBottom: "2rem" }}>
        Index documents from <code>backend/docs/</code>, then ask questions.
      </p>

      <section
        style={{
          background: "#18181b",
          borderRadius: 8,
          padding: "1.5rem",
          marginBottom: "1.5rem",
        }}
      >
        <h2 style={{ fontSize: "1.125rem", marginBottom: "0.75rem" }}>
          1. Index documents
        </h2>
        <p style={{ color: "#a1a1aa", fontSize: "0.875rem", marginBottom: "1rem" }}>
          Chunk and embed .txt/.md files from docs/ into Chroma.
        </p>
        <button
          onClick={handleIndex}
          disabled={indexLoading}
          style={{
            padding: "0.5rem 1rem",
            background: "#6366f1",
            color: "white",
            border: "none",
            borderRadius: 6,
            cursor: indexLoading ? "not-allowed" : "pointer",
            opacity: indexLoading ? 0.7 : 1,
          }}
        >
          {indexLoading ? "Indexing…" : "Index documents"}
        </button>
        {indexResult && (
          <div
            style={{
              marginTop: "1rem",
              padding: "0.75rem",
              background: indexResult.ok ? "#14532d" : "#7f1d1d",
              borderRadius: 6,
              fontSize: "0.875rem",
            }}
          >
            {indexResult.ok ? (
              `Indexed ${indexResult.chunks} chunks into "${indexResult.collection}".`
            ) : (
              indexResult.error
            )}
          </div>
        )}
      </section>

      <section
        style={{
          background: "#18181b",
          borderRadius: 8,
          padding: "1.5rem",
        }}
      >
        <h2 style={{ fontSize: "1.125rem", marginBottom: "0.75rem" }}>
          2. Ask a question
        </h2>
        <p style={{ color: "#a1a1aa", fontSize: "0.875rem", marginBottom: "1rem" }}>
          Ask about the indexed content. Answers are grounded in retrieved context.
        </p>
        <form onSubmit={handleAsk}>
          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="e.g. What is RAG?"
            disabled={askLoading}
            style={{
              width: "100%",
              padding: "0.75rem",
              background: "#27272a",
              border: "1px solid #3f3f46",
              borderRadius: 6,
              color: "#e4e4e7",
              marginBottom: "1rem",
              fontSize: "1rem",
            }}
          />
          <button
            type="submit"
            disabled={askLoading}
            style={{
              padding: "0.5rem 1rem",
              background: "#6366f1",
              color: "white",
              border: "none",
              borderRadius: 6,
              cursor: askLoading ? "not-allowed" : "pointer",
              opacity: askLoading ? 0.7 : 1,
            }}
          >
            {askLoading ? "Ask…" : "Ask"}
          </button>
        </form>
        {askResult && (
          <div style={{ marginTop: "1.5rem" }}>
            {askResult.ok ? (
              <>
                <div
                  style={{
                    padding: "1rem",
                    background: "#27272a",
                    borderRadius: 6,
                    marginBottom: "1rem",
                    whiteSpace: "pre-wrap",
                    lineHeight: 1.6,
                  }}
                >
                  {askResult.answer}
                </div>
                {askResult.sources && askResult.sources.length > 0 && (
                  <div>
                    <h3 style={{ fontSize: "0.875rem", marginBottom: "0.5rem" }}>
                      Sources
                    </h3>
                    {askResult.sources.map((s, i) => (
                      <div
                        key={i}
                        style={{
                          padding: "0.75rem",
                          background: "#18181b",
                          borderRadius: 6,
                          marginBottom: "0.5rem",
                          fontSize: "0.875rem",
                        }}
                      >
                        <strong>{s.source}</strong>
                        <p style={{ color: "#a1a1aa", marginTop: "0.25rem" }}>
                          {s.preview}…
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div
                style={{
                  padding: "0.75rem",
                  background: "#7f1d1d",
                  borderRadius: 6,
                  fontSize: "0.875rem",
                }}
              >
                {askResult.error}
              </div>
            )}
          </div>
        )}
      </section>
    </main>
  );
}
