# RAG Pipeline Backend

This directory contains the backend implementation of the RAG (Retrieval-Augmented Generation) pipeline.

## Architecture

```
┌─────────────────┐
│  Document Input │
└────────┬────────┘
         │
         v
┌─────────────────────┐
│ Document Processor  │  ← Chunking & Cleaning
└────────┬────────────┘
         │
         v
┌─────────────────────┐
│ Embedding Generator │  ← Gemini API
└────────┬────────────┘
         │
         v
┌─────────────────────┐
│   Vector Store      │  ← FAISS / In-Memory
└────────┬────────────┘
         │
         v
┌─────────────────────┐
│  Query Processing   │
└────────┬────────────┘
         │
         v
┌─────────────────────┐
│  Reranker (Optional)│  ← Cohere / VoyageAI
└────────┬────────────┘
         │
         v
┌─────────────────────┐
│   LLM Response      │  ← Gemini API
└─────────────────────┘
```

## Components

### `rag_pipeline.py`
Main orchestrator that coordinates the entire RAG workflow.

### `embeddings.py`
Handles vector embedding generation using Google's Gemini API.

### `vector_store.py`
In-memory vector database for storing and retrieving document embeddings.

### `reranker.py`
Optional reranking layer to improve retrieval quality using Cohere or VoyageAI.

### `document_processor.py`
Document parsing and intelligent chunking strategies.

## Installation

```bash
pip install -r requirements.txt
```

## Usage

```python
from rag_pipeline import RAGPipeline

# Initialize pipeline
pipeline = RAGPipeline(
    gemini_api_key="your-gemini-key",
    reranker_api_key="your-reranker-key"  # Optional
)

# Ingest document
result = pipeline.ingest_document("document.pdf")

# Query
context = pipeline.get_context_for_llm("What is the main topic?")
```

## Environment Variables

Create a `.env` file:

```env
GEMINI_API_KEY=your_key_here
RERANKER_API_KEY=your_key_here  # Optional
```
