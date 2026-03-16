"use client";

import { useState, useRef, useCallback } from "react";
import Link from "next/link";

const API_BASE =
  typeof window !== "undefined"
    ? "/api/backend"
    : "http://localhost:3000";

declare global {
  interface Window {
    SpeechRecognition: typeof SpeechRecognition;
    webkitSpeechRecognition: typeof SpeechRecognition;
  }
}

const SpeechRecognition =
  typeof window !== "undefined"
    ? window.SpeechRecognition || window.webkitSpeechRecognition
    : null;

export default function VoicePage() {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [answer, setAnswer] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [useEdgeTts, setUseEdgeTts] = useState(false);
  const recognitionRef = useRef<InstanceType<NonNullable<typeof SpeechRecognition>> | null>(null);
  const lastTranscriptRef = useRef("");
  const askedRef = useRef(false);

  const speakWithBrowserTts = useCallback((text: string) => {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-US";
    window.speechSynthesis.speak(utterance);
  }, []);

  const speak = useCallback(
    (text: string) => {
      if (useEdgeTts) {
        fetch(`${API_BASE}/tts`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text }),
        })
          .then(async (res) => {
            if (!res.ok) {
              const errData = await res.json().catch(() => ({}));
              const errMsg = errData?.error ?? res.statusText;
              setError(errMsg);
              speakWithBrowserTts(text);
              return;
            }
            return res.arrayBuffer();
          })
          .then((buf) => {
            if (!buf) return;
            const audio = new Audio();
            const blob = new Blob([buf], { type: "audio/webm" });
            audio.src = URL.createObjectURL(blob);
            audio.play();
          })
          .catch((e) => {
            setError(e instanceof Error ? e.message : String(e));
            speakWithBrowserTts(text);
          });
      } else {
        speakWithBrowserTts(text);
      }
    },
    [useEdgeTts, speakWithBrowserTts]
  );

  const handleAsk = useCallback(
    async (question: string) => {
      if (!question.trim()) return;
      setIsLoading(true);
      setError(null);
      setAnswer("");
      try {
        const res = await fetch(`${API_BASE}/ask`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ question: question.trim() }),
        });
        const data = await res.json();
        if (data.ok && data.answer) {
          setAnswer(data.answer);
          speak(data.answer);
        } else {
          setError(data.error ?? "No answer received");
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        setIsLoading(false);
      }
    },
    [speak]
  );

  const startListening = useCallback(() => {
    if (!SpeechRecognition) {
      setError("Speech recognition not supported. Use Chrome or Edge.");
      return;
    }
    setError(null);
    setTranscript("");
    askedRef.current = false;
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const last = event.results.length - 1;
      const text = event.results[last][0].transcript;
      lastTranscriptRef.current = text;
      setTranscript(text);
      if (event.results[last].isFinal && text.trim()) {
        askedRef.current = true;
        handleAsk(text);
      }
    };

    recognition.onend = () => {
      setIsListening(false);
      recognitionRef.current = null;
      const finalText = lastTranscriptRef.current.trim();
      if (finalText && !askedRef.current) {
        handleAsk(finalText);
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      setError(event.error ?? "Recognition error");
      setIsListening(false);
    };

    recognition.start();
    recognitionRef.current = recognition;
    setIsListening(true);
  }, [handleAsk]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setIsListening(false);
  }, []);

  const unsupported = typeof window !== "undefined" && !SpeechRecognition;

  return (
    <main
      style={{
        maxWidth: 560,
        margin: "0 auto",
        padding: "2rem 1rem",
        minHeight: "100vh",
      }}
    >
      <div style={{ marginBottom: "1.5rem" }}>
        <Link
          href="/"
          style={{ color: "#818cf8", textDecoration: "none", fontSize: "0.875rem" }}
        >
          ← Back to RAG Demo
        </Link>
      </div>

      <h1 style={{ fontSize: "1.75rem", marginBottom: "0.5rem" }}>
        Voice Assistant
      </h1>
      <p style={{ color: "#a1a1aa", marginBottom: "2rem", fontSize: "0.875rem" }}>
        Push to talk. Ask about indexed documents. Answer is spoken aloud.
      </p>

      {unsupported && (
        <div
          style={{
            padding: "1rem",
            background: "#7f1d1d",
            borderRadius: 8,
            marginBottom: "1.5rem",
            fontSize: "0.875rem",
          }}
        >
          Speech recognition is not supported in this browser. Use Chrome or Edge.
        </div>
      )}

      <section
        style={{
          background: "#18181b",
          borderRadius: 8,
          padding: "1.5rem",
          marginBottom: "1.5rem",
        }}
      >
        <div style={{ marginBottom: "1rem" }}>
          <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.875rem", cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={useEdgeTts}
              onChange={(e) => setUseEdgeTts(e.target.checked)}
            />
            Use Edge TTS (better voice; may be blocked in some regions — falls back to browser TTS)
          </label>
        </div>

        <button
          onClick={isListening ? stopListening : startListening}
          disabled={unsupported || isLoading}
          style={{
            width: "100%",
            padding: "1.5rem",
            fontSize: "1.125rem",
            background: isListening ? "#dc2626" : "#6366f1",
            color: "white",
            border: "none",
            borderRadius: 8,
            cursor: unsupported || isLoading ? "not-allowed" : "pointer",
            opacity: unsupported || isLoading ? 0.7 : 1,
          }}
        >
          {isListening ? "Stop" : "Push to talk"}
        </button>

        {transcript && (
          <div style={{ marginTop: "1rem", fontSize: "0.875rem", color: "#a1a1aa" }}>
            Heard: {transcript}
          </div>
        )}
      </section>

      {isLoading && (
        <div style={{ padding: "1rem", color: "#a1a1aa", fontSize: "0.875rem" }}>
          Thinking…
        </div>
      )}

      {answer && (
        <section
          style={{
            background: "#27272a",
            borderRadius: 8,
            padding: "1.5rem",
            whiteSpace: "pre-wrap",
            lineHeight: 1.6,
          }}
        >
          <h3 style={{ fontSize: "0.875rem", marginBottom: "0.5rem", color: "#a1a1aa" }}>
            Answer
          </h3>
          {answer}
        </section>
      )}

      {error && (
        <div
          style={{
            marginTop: "1rem",
            padding: "1rem",
            background: "#7f1d1d",
            borderRadius: 8,
            fontSize: "0.875rem",
          }}
        >
          {error}
        </div>
      )}
    </main>
  );
}
