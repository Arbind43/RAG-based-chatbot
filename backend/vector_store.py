"""
Vector Store Implementation
In-memory vector database for document retrieval
"""

from typing import List, Dict, Any
import numpy as np


class VectorStore:
    def __init__(self):
        self.documents = []
        self.embeddings = []
        
    def add_documents(self, texts: List[str], embeddings: List[List[float]]):
        """
        Add documents and their embeddings to the vector store
        """
        self.documents.extend(texts)
        self.embeddings.extend(embeddings)
        print(f"[VectorStore] Added {len(texts)} documents. Total: {len(self.documents)}")
    
    def search(self, query_embedding: List[float], top_k: int = 5) -> List[Dict[str, Any]]:
        """
        Search for similar documents using cosine similarity
        Returns top_k most relevant chunks
        """
        if not self.embeddings:
            return []
        
        # Compute similarities
        similarities = []
        query_vec = np.array(query_embedding)
        
        for idx, doc_embedding in enumerate(self.embeddings):
            doc_vec = np.array(doc_embedding)
            similarity = np.dot(query_vec, doc_vec) / (
                np.linalg.norm(query_vec) * np.linalg.norm(doc_vec)
            )
            similarities.append({
                "text": self.documents[idx],
                "score": float(similarity),
                "index": idx
            })
        
        # Sort by similarity score
        similarities.sort(key=lambda x: x["score"], reverse=True)
        
        print(f"[VectorStore] Retrieved top {top_k} results (max score: {similarities[0]['score']:.4f})")
        return similarities[:top_k]
    
    def clear(self):
        """Clear all documents from the store"""
        self.documents = []
        self.embeddings = []
        print("[VectorStore] Cleared all documents")
