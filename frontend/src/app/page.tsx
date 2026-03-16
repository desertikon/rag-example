"use client";

import { useState } from "react";
import Link from "next/link";

const API_BASE =
  typeof window !== "undefined"
    ? "/api/backend"
    : "http://localhost:3000";

const sectionStyle = {
  background: "#18181b",
  borderRadius: 8,
  padding: "1.5rem",
  marginBottom: "1.5rem",
};

const buttonStyle = (disabled: boolean) => ({
  padding: "0.5rem 1rem",
  background: "#6366f1",
  color: "white",
  border: "none",
  borderRadius: 6,
  cursor: disabled ? "not-allowed" : "pointer",
  opacity: disabled ? 0.7 : 1,
});

const inputStyle = {
  width: "100%" as const,
  padding: "0.75rem",
  background: "#27272a",
  border: "1px solid #3f3f46",
  borderRadius: 6,
  color: "#e4e4e7",
  marginBottom: "1rem",
  fontSize: "1rem",
};

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

  const [streamQuestion, setStreamQuestion] = useState("");
  const [streamResult, setStreamResult] = useState<{
    answer: string;
    sources?: { source: string; preview: string }[];
    error?: string;
  } | null>(null);
  const [streamLoading, setStreamLoading] = useState(false);

  const [toolsQuestion, setToolsQuestion] = useState("");
  const [toolsResult, setToolsResult] = useState<{
    ok: boolean;
    answer?: string;
    toolCalls?: { name: string; args: unknown; result: string }[];
    error?: string;
  } | null>(null);
  const [toolsLoading, setToolsLoading] = useState(false);

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

  async function handleAskStream(e: React.FormEvent) {
    e.preventDefault();
    if (!streamQuestion.trim()) return;
    setStreamLoading(true);
    setStreamResult({ answer: "" });
    try {
      const res = await fetch(`${API_BASE}/ask-stream`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: streamQuestion.trim() }),
      });
      if (!res.body) throw new Error("No response body");
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let sources: { source: string; preview: string }[] | undefined;
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6);
            if (data === "[DONE]") continue;
            try {
              const parsed = JSON.parse(data);
              if (parsed.chunk) {
                setStreamResult((prev) => ({
                  ...prev!,
                  answer: (prev?.answer ?? "") + parsed.chunk,
                }));
              } else if (parsed.sources) {
                sources = parsed.sources;
                setStreamResult((prev) => ({ ...prev!, sources }));
              } else if (parsed.error) {
                setStreamResult((prev) => ({ ...prev!, error: parsed.error }));
              }
            } catch {
              // skip invalid JSON
            }
          }
        }
      }
      if (sources) {
        setStreamResult((prev) => (prev ? { ...prev, sources } : prev));
      }
    } catch (e) {
      setStreamResult({
        answer: "",
        error: e instanceof Error ? e.message : String(e),
      });
    } finally {
      setStreamLoading(false);
    }
  }

  async function handleAskTools(e: React.FormEvent) {
    e.preventDefault();
    if (!toolsQuestion.trim()) return;
    setToolsLoading(true);
    setToolsResult(null);
    try {
      const res = await fetch(`${API_BASE}/ask-tools`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: toolsQuestion.trim() }),
      });
      const data = await res.json();
      setToolsResult(data);
    } catch (e) {
      setToolsResult({
        ok: false,
        error: e instanceof Error ? e.message : String(e),
      });
    } finally {
      setToolsLoading(false);
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
      <p style={{ color: "#a1a1aa", marginBottom: "1rem" }}>
        Index documents from <code>backend/docs/</code>, then ask questions.
      </p>
      <p style={{ marginBottom: "2rem" }}>
        <Link href="/voice" style={{ color: "#818cf8", textDecoration: "none" }}>
          Voice assistant →
        </Link>
      </p>

      <section style={sectionStyle}>
        <h2 style={{ fontSize: "1.125rem", marginBottom: "0.75rem" }}>
          1. Index documents
        </h2>
        <p style={{ color: "#a1a1aa", fontSize: "0.875rem", marginBottom: "1rem" }}>
          Chunk and embed .txt/.md files from docs/ into Chroma.
        </p>
        <button
          onClick={handleIndex}
          disabled={indexLoading}
          style={buttonStyle(indexLoading)}
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

      <section style={sectionStyle}>
        <h2 style={{ fontSize: "1.125rem", marginBottom: "0.75rem" }}>
          2. Ask (RAG)
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
            style={inputStyle}
          />
          <button type="submit" disabled={askLoading} style={buttonStyle(askLoading)}>
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

      <section style={sectionStyle}>
        <h2 style={{ fontSize: "1.125rem", marginBottom: "0.75rem" }}>
          3. Ask (Stream)
        </h2>
        <p style={{ color: "#a1a1aa", fontSize: "0.875rem", marginBottom: "1rem" }}>
          Same RAG but response streams token-by-token (real-time).
        </p>
        <form onSubmit={handleAskStream}>
          <input
            type="text"
            value={streamQuestion}
            onChange={(e) => setStreamQuestion(e.target.value)}
            placeholder="e.g. What is RAG?"
            disabled={streamLoading}
            style={inputStyle}
          />
          <button
            type="submit"
            disabled={streamLoading}
            style={buttonStyle(streamLoading)}
          >
            {streamLoading ? "Streaming…" : "Ask (Stream)"}
          </button>
        </form>
        {streamResult && (
          <div style={{ marginTop: "1.5rem" }}>
            {streamResult.error ? (
              <div
                style={{
                  padding: "0.75rem",
                  background: "#7f1d1d",
                  borderRadius: 6,
                  fontSize: "0.875rem",
                }}
              >
                {streamResult.error}
              </div>
            ) : (
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
                  {streamResult.answer || (streamLoading ? "…" : "")}
                </div>
                {streamResult.sources && streamResult.sources.length > 0 && (
                  <div>
                    <h3 style={{ fontSize: "0.875rem", marginBottom: "0.5rem" }}>
                      Sources
                    </h3>
                    {streamResult.sources.map((s, i) => (
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
            )}
          </div>
        )}
      </section>

      <section style={sectionStyle}>
        <h2 style={{ fontSize: "1.125rem", marginBottom: "0.75rem" }}>
          4. Ask (Tools)
        </h2>
        <p style={{ color: "#a1a1aa", fontSize: "0.875rem", marginBottom: "1rem" }}>
          LLM with function calling. Try &quot;What time is it?&quot; — uses get_current_time tool.
        </p>
        <form onSubmit={handleAskTools}>
          <input
            type="text"
            value={toolsQuestion}
            onChange={(e) => setToolsQuestion(e.target.value)}
            placeholder="e.g. What time is it?"
            disabled={toolsLoading}
            style={inputStyle}
          />
          <button
            type="submit"
            disabled={toolsLoading}
            style={buttonStyle(toolsLoading)}
          >
            {toolsLoading ? "Ask…" : "Ask (Tools)"}
          </button>
        </form>
        {toolsResult && (
          <div style={{ marginTop: "1.5rem" }}>
            {toolsResult.ok ? (
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
                  {toolsResult.answer}
                </div>
                {toolsResult.toolCalls && toolsResult.toolCalls.length > 0 && (
                  <div>
                    <h3 style={{ fontSize: "0.875rem", marginBottom: "0.5rem" }}>
                      Tools called
                    </h3>
                    {toolsResult.toolCalls.map((tc, i) => (
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
                        <strong>{tc.name}</strong>
                        <p style={{ color: "#a1a1aa", marginTop: "0.25rem" }}>
                          Result: {tc.result}
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
                {toolsResult.error}
              </div>
            )}
          </div>
        )}
      </section>
    </main>
  );
}
