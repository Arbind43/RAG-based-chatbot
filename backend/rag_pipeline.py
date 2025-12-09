"""
RAG Pipeline Orchestrator
Handles document ingestion, chunking, embedding, and retrieval
"""

import os
from typing import List, Dict, Any
from embeddings import create_embeddings
from vector_store import VectorStore
from reranker import Reranker
from document_processor import process_document


class RAGPipeline:
    def __init__(self, gemini_api_key: str, reranker_api_key: str = None):
        self.gemini_api_key = gemini_api_key
        self.vector_store = VectorStore()
        self.reranker = Reranker(reranker_api_key) if reranker_api_key else None
        
    def ingest_document(self, file_path: str) -> Dict[str, Any]:
        """
        Ingest a document into the RAG pipeline
        Returns metadata about the ingestion process
        """
        print(f"[RAG] Uploading document: {file_path}")
        
        # Step 1: Process and chunk document
        chunks = process_document(file_path)
        print(f"[RAG] Document chunked into {len(chunks)} segments for optimal retrieval")
        
        # Step 2: Create embeddings
        print("[RAG] Creating vector embeddings...")
        embeddings = create_embeddings(chunks, self.gemini_api_key)
        
        # Step 3: Store in vector database
        print("[RAG] Initializing vector store...")
        self.vector_store.add_documents(chunks, embeddings)
        
        print("[RAG] ✅ Vector store created successfully")
        
        return {
            "status": "success",
            "chunks": len(chunks),
            "embeddings_dim": len(embeddings[0]) if embeddings else 0
        }
    
    def query(self, question: str, top_k: int = 5) -> List[Dict[str, Any]]:
        """
        Query the RAG pipeline with a question
        Returns relevant document chunks
        """
        # Create query embedding
        query_embedding = create_embeddings([question], self.gemini_api_key)[0]
        
        # Retrieve relevant chunks
        results = self.vector_store.search(query_embedding, top_k=top_k * 2)
        
        # Rerank if reranker is available
        if self.reranker:
            results = self.reranker.rerank(question, results, top_k=top_k)
        else:
            results = results[:top_k]
        
        return results
    
    def get_context_for_llm(self, question: str) -> str:
        """
        Get formatted context from retrieved chunks for LLM
        """
        results = self.query(question)
        context = "\n\n".join([r["text"] for r in results])
        return context
