import { Injectable } from "@nestjs/common";
import * as fs from "fs";
import * as path from "path";
import { Document } from "@langchain/core/documents";
import { HumanMessage, AIMessage, ToolMessage } from "@langchain/core/messages";
import { OpenAIEmbeddings, ChatOpenAI } from "@langchain/openai";
import { Chroma } from "@langchain/community/vectorstores/chroma";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";

const CHROMA_URL = process.env.CHROMA_URL ?? "http://localhost:8000";
const COLLECTION = process.env.COLLECTION ?? "demo_docs";

@Injectable()
export class RagService {
  private loadDocsFromFolder(dir: string): Document[] {
    const files = fs
      .readdirSync(dir)
      .filter((f) => f.endsWith(".txt") || f.endsWith(".md"));
    const docs: Document[] = [];

    for (const f of files) {
      const full = path.join(dir, f);
      const text = fs.readFileSync(full, "utf-8");
      docs.push(new Document({ pageContent: text, metadata: { source: f } }));
    }
    return docs;
  }

  private async getVectorStore() {
    const embeddings = new OpenAIEmbeddings();
    return Chroma.fromExistingCollection(embeddings, {
      collectionName: COLLECTION,
      url: CHROMA_URL,
    });
  }

  async indexDocuments(): Promise<{ ok: boolean; chunks: number; collection: string }> {
    const docsDir = path.join(process.cwd(), "docs");
    const rawDocs = this.loadDocsFromFolder(docsDir);

    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize: 800,
      chunkOverlap: 150,
    });
    const chunks = await splitter.splitDocuments(rawDocs);

    const embeddings = new OpenAIEmbeddings();

    await Chroma.fromDocuments(chunks, embeddings, {
      collectionName: COLLECTION,
      url: CHROMA_URL,
    });

    return { ok: true, chunks: chunks.length, collection: COLLECTION };
  }

  async ask(
    question: string,
    topK: number = 4
  ): Promise<{
    ok: boolean;
    answer: string;
    sources: { source: string; preview: string }[];
  }> {
    const store = await this.getVectorStore();
    const docs = await store.similaritySearch(question, topK);

    const context = docs
      .map(
        (d, i) =>
          `Source ${i + 1} (${d.metadata?.source}):\n${d.pageContent}`
      )
      .join("\n\n---\n\n");

    const llm = new ChatOpenAI({ model: "gpt-4o-mini", temperature: 0 });

    const prompt = `
You are a helpful assistant. Answer the user's question using ONLY the provided context.
If the context is insufficient, say you don't know.
Cite sources by referring to "Source 1", "Source 2", etc.

Question: ${question}

Context:
${context}
`.trim();

    const answer = await llm.invoke(prompt);

    return {
      ok: true,
      answer: String(answer.content),
      sources: docs.map((d) => ({
        source: String(d.metadata?.source ?? "unknown"),
        preview: d.pageContent.slice(0, 180),
      })),
    };
  }

  async *askStream(
    question: string,
    topK: number = 4
  ): AsyncGenerator<{ type: "chunk"; chunk: string } | { type: "sources"; sources: { source: string; preview: string }[] }> {
    const store = await this.getVectorStore();
    const docs = await store.similaritySearch(question, topK);

    const context = docs
      .map(
        (d, i) =>
          `Source ${i + 1} (${d.metadata?.source}):\n${d.pageContent}`
      )
      .join("\n\n---\n\n");

    const llm = new ChatOpenAI({ model: "gpt-4o-mini", temperature: 0 });

    const prompt = `
You are a helpful assistant. Answer the user's question using ONLY the provided context.
If the context is insufficient, say you don't know.
Cite sources by referring to "Source 1", "Source 2", etc.

Question: ${question}

Context:
${context}
`.trim();

    const stream = await llm.stream(prompt);
    for await (const chunk of stream) {
      const content = chunk.content;
      if (typeof content === "string" && content) {
        yield { type: "chunk" as const, chunk: content };
      }
    }

    yield {
      type: "sources",
      sources: docs.map((d) => ({
        source: String(d.metadata?.source ?? "unknown"),
        preview: d.pageContent.slice(0, 180),
      })),
    };
  }

  async askWithTools(question: string): Promise<{
    ok: boolean;
    answer: string;
    toolCalls: { name: string; args: unknown; result: string }[];
  }> {
    const getCurrentTimeTool = {
      type: "function" as const,
      function: {
        name: "get_current_time",
        description: "Get the current date and time in ISO format",
        parameters: { type: "object" as const, properties: {} },
      },
    };

    const llm = new ChatOpenAI({ model: "gpt-4o-mini", temperature: 0 });
    const llmWithTools = llm.bindTools([getCurrentTimeTool]);

    const messages = [new HumanMessage(question)];
    const toolCalls: { name: string; args: unknown; result: string }[] = [];
    let maxIterations = 5;
    let lastAnswer = "";

    while (maxIterations-- > 0) {
      const response = await llmWithTools.invoke(messages);
      lastAnswer = String(response.content ?? "");

      const responseToolCalls = response.tool_calls ?? [];
      if (responseToolCalls.length === 0) {
        break;
      }

      messages.push(response as AIMessage);

      for (const tc of responseToolCalls) {
        const name = tc.name;
        const args = tc.args ?? {};
        let result = "";

        if (name === "get_current_time") {
          result = new Date().toISOString();
        }

        toolCalls.push({ name, args, result });
        messages.push(
          new ToolMessage({
            content: result,
            tool_call_id: tc.id ?? `call_${Date.now()}`,
          })
        );
      }
    }

    return {
      ok: true,
      answer: lastAnswer,
      toolCalls,
    };
  }
}
