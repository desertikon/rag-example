# RAG Demo FAQ

## What is RAG?

RAG stands for Retrieval-Augmented Generation. It enhances large language models by retrieving relevant documents before generating a response.

## How does chunking work?

Documents are split into overlapping chunks (default: 800 characters with 150 overlap). This helps maintain context while fitting within model limits.

## What vector database is used?

This demo uses Chroma, an open-source vector database that runs in Docker on port 8000.

## Which LLM is used?

The demo uses GPT-4o-mini from OpenAI for generating answers based on the retrieved context.
