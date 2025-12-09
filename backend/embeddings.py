"""
Vector Embedding Generation
Creates embeddings using Google's Gemini API
"""

import requests
from typing import List


def create_embeddings(texts: List[str], api_key: str) -> List[List[float]]:
    """
    Create vector embeddings for a list of text chunks
    Uses Gemini embedding model for semantic representation
    """
    embeddings = []
    
    for text in texts:
        response = requests.post(
            "https://generativelanguage.googleapis.com/v1beta/models/embedding-001:embedContent",
            headers={"Content-Type": "application/json"},
            params={"key": api_key},
            json={
                "model": "models/embedding-001",
                "content": {
                    "parts": [{"text": text}]
                }
            }
        )
        
        if response.status_code == 200:
            embedding = response.json()["embedding"]["values"]
            embeddings.append(embedding)
        else:
            raise Exception(f"Embedding creation failed: {response.text}")
    
    print(f"[Embeddings] Created {len(embeddings)} embeddings (dim: {len(embeddings[0]) if embeddings else 0})")
    return embeddings


def compute_similarity(embedding1: List[float], embedding2: List[float]) -> float:
    """
    Compute cosine similarity between two embeddings
    """
    import numpy as np
    
    vec1 = np.array(embedding1)
    vec2 = np.array(embedding2)
    
    dot_product = np.dot(vec1, vec2)
    norm1 = np.linalg.norm(vec1)
    norm2 = np.linalg.norm(vec2)
    
    return dot_product / (norm1 * norm2)
