export interface DocumentMetadata {
  id: string;
  name: string;
  text: string;
  summary?: string;
}

export interface RoutingResult {
  doc_id: string;
  routing_confidence_score: number;
  selection_reasoning: string;
}

export interface RerankedChunk {
  chunk_text: string;
  source_citation_tag: string;
  simulated_relevance_score: number;
}

export interface SynthesisResult {
  draft_answer: string;
  refined_answer: string;
  citations: CitationEntry[];
  average_routing_confidence: number;
  average_relevance_score: number;
  is_answerable: boolean;
}

export interface CitationEntry {
  tag: string;
  document_name: string;
  location: string;
}
