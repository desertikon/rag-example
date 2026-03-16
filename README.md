# RAG Demo

Retrieval-Augmented Generation demo with Next.js frontend, NestJS backend, and Chroma vector database.

## Architecture

- **Frontend** (Next.js, port 3001): UI for indexing documents and asking questions
- **Backend** (NestJS, port 3000): POST `/index` and POST `/ask` endpoints
- **Chroma** (Docker, port 8000): Vector database for embeddings

## Prerequisites

- Node.js 18+
- Docker
- OpenAI API key

## Setup

1. **Start Chroma**

   ```bash
   docker compose up -d
   ```

2. **Backend**

   ```bash
   cd backend
   cp ../.env.example .env
   # Edit .env and add your OPENAI_API_KEY
   npm install
   npm run start:dev
   ```

3. **Frontend**

   ```bash
   cd frontend
   npm install
   npm run dev
   ```

4. Open http://localhost:3001

## Usage

1. Add `.txt` or `.md` files to `backend/docs/`
2. Click "Index documents" to chunk and embed them into Chroma
3. Ask questions about the content
4. **Voice assistant** — Go to `/voice` for push-to-talk. Uses Web Speech API (STT + TTS). Optionally enable Edge TTS for better voice quality.

## Endpoints

- `POST /index` — Index documents from `docs/` folder
- `POST /ask` — Body: `{ "question": "...", "topK": 4 }` — Ask a question with RAG
- `POST /ask-stream` — Same as ask but streams response (SSE)
- `POST /ask-tools` — LLM with function calling (e.g. get_current_time)
- `POST /tts` — Body: `{ "text": "..." }` — Text-to-speech via Edge TTS (returns audio/webm)
