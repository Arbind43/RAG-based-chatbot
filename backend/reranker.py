"""
Reranker Integration
Improves retrieval quality using advanced reranking models
Supports Cohere, VoyageAI, and other reranking APIs
"""

import requests
from typing import List, Dict, Any


class Reranker:
    def __init__(self, api_key: str = None, provider: str = "cohere"):
        self.api_key = api_key
        self.provider = provider
        self.enabled = api_key is not None
        
    def rerank(self, query: str, documents: List[Dict[str, Any]], top_k: int = 5) -> List[Dict[str, Any]]:
        """
        Rerank retrieved documents for better relevance
        """
        if not self.enabled:
            return documents[:top_k]
        
        if self.provider == "cohere":
            return self._rerank_cohere(query, documents, top_k)
        elif self.provider == "voyage":
            return self._rerank_voyage(query, documents, top_k)
        else:
            return documents[:top_k]
    
    def _rerank_cohere(self, query: str, documents: List[Dict[str, Any]], top_k: int) -> List[Dict[str, Any]]:
        """
        Rerank using Cohere's rerank API
        """
        texts = [doc["text"] for doc in documents]
        
        response = requests.post(
            "https://api.cohere.ai/v1/rerank",
            headers={
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json"
            },
            json={
                "model": "rerank-english-v2.0",
                "query": query,
                "documents": texts,
                "top_n": top_k
            }
        )
        
        if response.status_code == 200:
            results = response.json()["results"]
            reranked = [documents[r["index"]] for r in results]
            print(f"[Reranker] Cohere reranked to top {len(reranked)} results")
            return reranked
        else:
            print(f"[Reranker] Cohere reranking failed, using original order")
            return documents[:top_k]
    
    def _rerank_voyage(self, query: str, documents: List[Dict[str, Any]], top_k: int) -> List[Dict[str, Any]]:
        """
        Rerank using VoyageAI's rerank API
        """
        texts = [doc["text"] for doc in documents]
        
        response = requests.post(
            "https://api.voyageai.com/v1/rerank",
            headers={
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json"
            },
            json={
                "model": "rerank-lite-1",
                "query": query,
                "documents": texts,
                "top_k": top_k
            }
        )
        
        if response.status_code == 200:
            results = response.json()["data"]
            reranked = [documents[r["index"]] for r in results]
            print(f"[Reranker] VoyageAI reranked to top {len(reranked)} results")
            return reranked
        else:
            print(f"[Reranker] VoyageAI reranking failed, using original order")
            return documents[:top_k]
