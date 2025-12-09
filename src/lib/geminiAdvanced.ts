import { DocumentMetadata, RoutingResult, RerankedChunk, SynthesisResult, CitationEntry } from "@/types/rag";

const GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";

async function callGemini(apiKey: string, prompt: string): Promise<string> {
  const response = await fetch(`${GEMINI_API_BASE}?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || "Gemini API call failed");
  }

  const data = await response.json();
  return data.candidates[0].content.parts[0].text;
}

export async function routeDocuments(
  apiKey: string,
  query: string,
  documents: DocumentMetadata[]
): Promise<RoutingResult[]> {
  const docSummaries = documents.map(doc => ({
    doc_id: doc.name,
    preview: doc.text.substring(0, 500)
  }));

  const prompt = `You are an expert Document Router in a RAG system. Your task is to identify which documents are most relevant to answer the user's query.

User Query: "${query}"

Available Documents:
${docSummaries.map((d, i) => `${i + 1}. ${d.doc_id}\nPreview: ${d.preview}...`).join('\n\n')}

For EACH document, provide a routing decision in this EXACT JSON format:
{
  "routing_results": [
    {
      "doc_id": "document_name.pdf",
      "routing_confidence_score": 0.0-1.0,
      "selection_reasoning": "Brief explanation"
    }
  ]
}

Be critical - only score high (>0.7) if the document clearly contains relevant information. Score low (<0.3) if irrelevant.`;

  const response = await callGemini(apiKey, prompt);
  
  try {
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return parsed.routing_results || [];
    }
  } catch (e) {
    console.error("Failed to parse routing results:", e);
  }
  
  // Fallback: return all documents with medium confidence
  return documents.map(doc => ({
    doc_id: doc.name,
    routing_confidence_score: 0.5,
    selection_reasoning: "Default routing applied"
  }));
}

export async function retrieveAndRerankChunks(
  apiKey: string,
  query: string,
  selectedDocuments: DocumentMetadata[],
  topK: number = 10
): Promise<RerankedChunk[]> {
  const allChunks: RerankedChunk[] = [];

  for (const doc of selectedDocuments) {
    // Simulate chunking by splitting into paragraphs
    const chunks = doc.text
      .split(/\n\n+/)
      .filter(chunk => chunk.trim().length > 100)
      .slice(0, 20); // Limit chunks per document

    const docLetter = doc.name.charAt(0).toUpperCase();

    const prompt = `You are a Structure-Aware Retriever and Cross-Encoder Reranker in a RAG system.

User Query: "${query}"

Document: ${doc.name}

Text Chunks:
${chunks.map((chunk, i) => `CHUNK ${i + 1}:\n${chunk}\n`).join('\n---\n')}

For EACH chunk, analyze its relevance to the query and provide reranking scores in this EXACT JSON format:
{
  "reranked_chunks": [
    {
      "chunk_index": 1,
      "chunk_text": "first 200 chars of chunk...",
      "source_citation_tag": "[${docLetter}.1]",
      "simulated_relevance_score": 0.0-1.0
    }
  ]
}

Only include chunks with score > 0.4. Higher scores (>0.8) should be reserved for direct, specific answers.`;

    try {
      const response = await callGemini(apiKey, prompt);
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        const docChunks = parsed.reranked_chunks || [];
        
        // Add full chunk text and proper citation tags
        docChunks.forEach((rc: any, idx: number) => {
          allChunks.push({
            chunk_text: chunks[rc.chunk_index - 1] || rc.chunk_text,
            source_citation_tag: `[${docLetter}.${rc.chunk_index}]`,
            simulated_relevance_score: rc.simulated_relevance_score
          });
        });
      }
    } catch (e) {
      console.error(`Failed to rerank chunks for ${doc.name}:`, e);
    }
  }

  // Sort by relevance and return top K
  allChunks.sort((a, b) => b.simulated_relevance_score - a.simulated_relevance_score);
  return allChunks.slice(0, topK);
}

export async function synthesizeAnswer(
  apiKey: string,
  query: string,
  topChunks: RerankedChunk[],
  documents: DocumentMetadata[]
): Promise<SynthesisResult> {
  // PASS 1: Extraction & Synthesis
  const pass1Prompt = `You are an expert research assistant synthesizing information from multiple academic papers.

User Query: "${query}"

Retrieved Evidence Chunks:
${topChunks.map(chunk => `${chunk.source_citation_tag}: ${chunk.chunk_text}`).join('\n\n---\n\n')}

Task: Generate a comprehensive draft answer that:
1. Directly addresses the query
2. Synthesizes facts from the evidence
3. Handles any conflicts or comparisons between papers
4. Uses inline citation tags (e.g., [A.1], [B.3]) after EVERY factual claim

Draft Answer:`;

  const draftAnswer = await callGemini(apiKey, pass1Prompt);

  // PASS 2: Refinement & Clarity
  const pass2Prompt = `You are refining a research answer for clarity and accessibility.

Original Query: "${query}"

Evidence Context: ${topChunks.length} chunks from ${documents.length} documents

Draft Answer:
${draftAnswer}

Task: Refine this answer to be:
1. Clear and accessible (explain complex terms)
2. Well-grounded (verify every citation tag is present)
3. Honest (if evidence is weak, acknowledge it)

Refined Answer:`;

  const refinedAnswer = await callGemini(apiKey, pass2Prompt);

  // Extract citations from refined answer
  const citationPattern = /\[([A-Z])\.(\d+)\]/g;
  const citationsFound = new Set<string>();
  const citations: CitationEntry[] = [];
  
  let match;
  while ((match = citationPattern.exec(refinedAnswer)) !== null) {
    const tag = match[0].slice(1, -1); // Remove brackets
    if (!citationsFound.has(tag)) {
      citationsFound.add(tag);
      const docLetter = match[1];
      const chunkNum = match[2];
      
      const sourceDoc = documents.find(d => d.name.charAt(0).toUpperCase() === docLetter);
      if (sourceDoc) {
        citations.push({
          tag,
          document_name: sourceDoc.name,
          location: `Section ${chunkNum}`
        });
      }
    }
  }

  // Calculate confidence scores
  const avgRelevance = topChunks.reduce((sum, c) => sum + c.simulated_relevance_score, 0) / topChunks.length;
  const isAnswerable = avgRelevance >= 0.4 && topChunks.length >= 3;

  return {
    draft_answer: draftAnswer,
    refined_answer: refinedAnswer,
    citations,
    average_routing_confidence: 0.7, // Placeholder
    average_relevance_score: avgRelevance,
    is_answerable: isAnswerable
  };
}
