"""
Document Processing and Chunking
Handles PDF, TXT, and other document formats
Implements smart chunking strategies for optimal retrieval
"""

import re
from typing import List


def process_document(file_path: str, chunk_size: int = 512, overlap: int = 50) -> List[str]:
    """
    Process a document and split it into chunks
    Uses sliding window approach with overlap for better context
    """
    # Read document content
    if file_path.endswith('.pdf'):
        text = extract_pdf_text(file_path)
    elif file_path.endswith('.txt'):
        with open(file_path, 'r', encoding='utf-8') as f:
            text = f.read()
    else:
        raise ValueError(f"Unsupported file format: {file_path}")
    
    # Clean and normalize text
    text = clean_text(text)
    
    # Split into chunks
    chunks = create_chunks(text, chunk_size, overlap)
    
    print(f"[DocumentProcessor] Processed {file_path}")
    print(f"[DocumentProcessor] Created {len(chunks)} chunks (size: {chunk_size}, overlap: {overlap})")
    
    return chunks


def extract_pdf_text(file_path: str) -> str:
    """
    Extract text from PDF using PyPDF2
    """
    from PyPDF2 import PdfReader
    
    reader = PdfReader(file_path)
    text = ""
    
    for page in reader.pages:
        text += page.extract_text() + "\n"
    
    return text


def clean_text(text: str) -> str:
    """
    Clean and normalize text
    """
    # Remove excessive whitespace
    text = re.sub(r'\s+', ' ', text)
    
    # Remove special characters but keep punctuation
    text = re.sub(r'[^\w\s.,!?;:\-\(\)]', '', text)
    
    return text.strip()


def create_chunks(text: str, chunk_size: int, overlap: int) -> List[str]:
    """
    Split text into overlapping chunks
    """
    words = text.split()
    chunks = []
    
    for i in range(0, len(words), chunk_size - overlap):
        chunk = ' '.join(words[i:i + chunk_size])
        if chunk:
            chunks.append(chunk)
    
    return chunks


def create_semantic_chunks(text: str) -> List[str]:
    """
    Create chunks based on semantic boundaries (paragraphs, sections)
    More advanced chunking strategy
    """
    # Split by paragraphs
    paragraphs = text.split('\n\n')
    
    chunks = []
    current_chunk = ""
    
    for para in paragraphs:
        if len(current_chunk) + len(para) < 512:
            current_chunk += para + "\n\n"
        else:
            if current_chunk:
                chunks.append(current_chunk.strip())
            current_chunk = para + "\n\n"
    
    if current_chunk:
        chunks.append(current_chunk.strip())
    
    return chunks
