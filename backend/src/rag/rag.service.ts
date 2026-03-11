import { Injectable } from "@nestjs/common";
import * as fs from "fs";
import * as path from "path";
import { Document } from "@langchain/core/documents";
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
}
