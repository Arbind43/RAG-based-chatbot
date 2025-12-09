# DocChat - Multi-Document RAG Pipeline Logic

## Project Overview

DocChat is an **advanced multi-document RAG (Retrieval-Augmented Generation) simulation** that uses Google's Gemini API to simulate a complete RAG pipeline through sophisticated prompting strategies. The system handles multiple research papers, performs intelligent document routing, chunk retrieval with reranking, and generates grounded answers with inline citations.

**Key Point**: This is a **frontend simulation** of a RAG pipeline. There is no actual vector database, embeddings storage, or traditional RAG infrastructure. Instead, it uses **multi-tiered chain-of-thought prompting** with Gemini API to simulate each RAG component through three distinct intelligence stages.

**Important**: The external reranker APIs (Cohere/VoyageAI) shown in RerankerModal and backend/reranker.py are **not integrated** - all reranking is simulated through Gemini prompting.

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     FRONTEND (React)                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ Index Page   │  │ Chat Page    │  │ Context API  │      │
│  │ (Upload)     │  │ (Query)      │  │ (State Mgmt) │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│              SIMULATED RAG PIPELINE                          │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  TIER 1: Multi-Document Router (Gemini API)          │  │
│  │  Input: Query + All Document Summaries               │  │
│  │  Output: Relevant docs with confidence scores        │  │
│  └──────────────────────────────────────────────────────┘  │
│                            │                                 │
│                            ▼                                 │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  TIER 2: Retrieval & Reranking (Gemini API)          │  │
│  │  Input: Query + Selected Document Chunks              │  │
│  │  Output: Top K chunks with relevance scores           │  │
│  └──────────────────────────────────────────────────────┘  │
│                            │                                 │
│                            ▼                                 │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  TIER 3: Two-Pass Synthesis (Gemini API)             │  │
│  │  Pass 1: Extract & synthesize facts                   │  │
│  │  Pass 2: Refine, clarify, ground with citations       │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                UI PRESENTATION LAYER                         │
│  • Inline Citations ([A.1], [B.3])                          │
│  • Citation Legend (Source Mapping)                          │
│  • Transparency Panel (Routing + Reranking Scores)           │
│  • Unanswerable Query Guardrail                              │
└─────────────────────────────────────────────────────────────┘
```

---

## Phase 1: Document Upload & Processing Workflow

### Step 1: File Selection (`Index.tsx`)

**Location**: `src/pages/Index.tsx`

1. User selects one or more PDF/TXT files via `<input type="file" multiple>`
2. Files are validated:
   - Type check: Must be `.pdf` or `.txt`
   - Size check: Max 20MB per file (Lovable platform limitation)
3. Valid files are stored in component state: `files: File[]`

### Step 2: PDF Text Extraction (`pdfParser.ts`)

**Location**: `src/lib/pdfParser.ts`

**For PDF Files**:
```typescript
parsePDF(file: File) -> Promise<string>
```
- Converts PDF file to ArrayBuffer
- Uses `pdfjs-dist` library to load PDF document
- Iterates through all pages (1 to numPages)
- Extracts text content from each page using `getTextContent()`
- Concatenates all page text into a single string
- Returns full document text

**For TXT Files**:
```typescript
parseTextFile(file: File) -> Promise<string>
```
- Uses FileReader API to read file as text
- Returns raw text content directly

### Step 3: Simulated RAG Progress (`Index.tsx`)

**Purpose**: Provide visual feedback simulating backend processing

```typescript
simulateRAGPipeline(documentCount: number)
```

Displays sequential toast notifications:
1. ✓ "Document ingestion complete" (500ms delay)
2. ✓ "Vector embeddings generated" (1000ms delay)
3. ✓ "Vector index built successfully" (1500ms delay)
4. ✓ "Multi-document router initialized" (2000ms delay)

**Note**: These are purely cosmetic. No actual embeddings or vector operations occur.

### Step 4: Optional Reranker Modal (`RerankerModal.tsx`)

**Location**: `src/components/RerankerModal.tsx`

**IMPORTANT**: This modal is for UI/UX demonstration only. The reranker API key is collected but **never used**.

- Modal prompts user to enter optional reranker API key (Cohere/VoyageAI)
- User can skip or enter key
- Key is stored in context: `rerankerEnabled` and `rerankerApiKey`
- **Backend file `backend/reranker.py` exists but is never called**
- **Actual reranking is performed by Gemini API** in Tier 2 (see below)
- Provides UX appearance of advanced RAG configuration for demonstration

### Step 5: Document Storage in Context

**Location**: `src/contexts/DocumentContext.tsx`

```typescript
interface DocumentMetadata {
  id: string;           // UUID
  name: string;         // Original filename
  text: string;         // Full extracted text
  summary?: string;     // Optional summary
}
```

Each processed document is added to global React Context:
```typescript
addDocument(doc: DocumentMetadata)
```

**State stored**:
- `documents: DocumentMetadata[]` - Array of all uploaded docs
- `apiKey: string` - Gemini API key
- `messages: Message[]` - Chat history
- `rerankerEnabled: boolean` - Reranker toggle
- `rerankerApiKey: string` - Reranker key

### Step 6: Navigation to Chat

After all documents are processed:
- User clicks "Start Chatting"
- App navigates to `/chat` route
- Chat interface loads with all documents available in context

---

## Phase 2: Query Processing & Answer Generation

### Chat Interface Initialization (`Chat.tsx`)

**Location**: `src/pages/Chat.tsx`

**On Load**:
1. Retrieves documents and API key from `DocumentContext`
2. Displays welcome message explaining multi-document RAG capabilities
3. Shows document count and system badges:
   - "Advanced RAG: Active"
   - "Reranker" (if enabled)

### User Query Submission

1. User types question in `<ChatInput>` component
2. User presses Enter or clicks Send button
3. `handleSendMessage(message: string)` is triggered

---

## The Three-Tier RAG Simulation Pipeline

### **TIER 1: Multi-Document Router** 🎯

**Function**: `routeDocuments(apiKey, query, documents)`  
**Location**: `src/lib/geminiAdvanced.ts`

#### Input:
- User query (e.g., "What are the main findings?")
- Array of `DocumentMetadata` with document summaries/previews

#### Process:

1. **Prepare Document Summaries**:
   ```typescript
   docSummaries = documents.map(doc => ({
     doc_id: doc.name,
     preview: doc.text.substring(0, 500)  // First 500 chars
   }))
   ```

2. **Construct Router Prompt**:
   ```
   You are an expert Document Router in a RAG system.
   
   User Query: "{query}"
   
   Available Documents:
   1. Paper_A.pdf
   Preview: {first 500 characters}...
   
   2. Paper_B.pdf
   Preview: {first 500 characters}...
   
   For EACH document, provide routing decision in JSON format:
   {
     "routing_results": [
       {
         "doc_id": "Paper_A.pdf",
         "routing_confidence_score": 0.85,
         "selection_reasoning": "Contains relevant keywords..."
       }
     ]
   }
   
   Be critical - only score high (>0.7) if clearly relevant.
   ```

3. **Call Gemini API**:
   ```typescript
   const response = await callGemini(apiKey, prompt)
   ```

4. **Parse JSON Response**:
   - Extract routing decisions using regex: `/\{[\s\S]*\}/`
   - Parse JSON to get structured routing results

#### Output: `RoutingResult[]`

```typescript
interface RoutingResult {
  doc_id: string;                    // "Paper_A.pdf"
  routing_confidence_score: number;  // 0.0 - 1.0
  selection_reasoning: string;       // "Contains transformer architecture..."
}
```

#### Fallback:
If JSON parsing fails, returns all documents with default score 0.5.

---

### **TIER 2: Structure-Aware Retrieval & Reranking** 📊

**Function**: `retrieveAndRerankChunks(apiKey, query, selectedDocuments, topK)`  
**Location**: `src/lib/geminiAdvanced.ts`

**Note**: Despite the RerankerModal UI, this function does **NOT use external reranker APIs** (Cohere/VoyageAI). All reranking is simulated through Gemini API prompting. The backend/reranker.py file is not integrated.

#### Input:
- User query
- Documents selected by Router (confidence > 0.3)
- `topK`: Number of chunks to return (default: 10)

#### Process:

**For each selected document**:

1. **Chunk Creation**:
   ```typescript
   chunks = doc.text
     .split(/\n\n+/)              // Split on double newlines
     .filter(chunk => chunk.length > 100)  // Min 100 chars
     .slice(0, 20)                 // Max 20 chunks per doc
   ```

2. **Generate Citation Letter**:
   ```typescript
   docLetter = doc.name.charAt(0).toUpperCase()  // "A", "B", "C"...
   ```

3. **Construct Reranker Prompt**:
   ```
   You are a Structure-Aware Retriever and Cross-Encoder Reranker.
   
   User Query: "{query}"
   Document: Paper_A.pdf
   
   Text Chunks:
   CHUNK 1:
   {chunk text}
   ---
   CHUNK 2:
   {chunk text}
   ---
   
   For EACH chunk, analyze relevance and provide JSON:
   {
     "reranked_chunks": [
       {
         "chunk_index": 1,
         "chunk_text": "first 200 chars...",
         "source_citation_tag": "[A.1]",
         "simulated_relevance_score": 0.92
       }
     ]
   }
   
   Only include chunks with score > 0.4.
   Higher scores (>0.8) for direct answers.
   ```

4. **Call Gemini API per Document**:
   ```typescript
   const response = await callGemini(apiKey, prompt)
   ```

5. **Parse and Aggregate**:
   - Extract reranked chunks from JSON
   - Add full chunk text and proper citation tags `[A.1]`, `[B.3]`, etc.
   - Combine chunks from all documents into single array

6. **Sort and Truncate**:
   ```typescript
   allChunks.sort((a, b) => 
     b.simulated_relevance_score - a.simulated_relevance_score
   )
   return allChunks.slice(0, topK)  // Return top K chunks
   ```

#### Output: `RerankedChunk[]`

```typescript
interface RerankedChunk {
  chunk_text: string;                  // Full chunk text
  source_citation_tag: string;         // "[A.1]", "[B.3]"
  simulated_relevance_score: number;   // 0.0 - 1.0
}
```

---

### **TIER 3: Two-Pass Cross-Document Synthesis** ✍️

**Function**: `synthesizeAnswer(apiKey, query, topChunks, documents)`  
**Location**: `src/lib/geminiAdvanced.ts`

#### Input:
- User query
- Top K reranked chunks from Tier 2
- Original document metadata (for citation mapping)

#### Process:

### **Pass 1: Extraction & Synthesis**

**Purpose**: Generate draft answer by synthesizing evidence

1. **Construct Synthesis Prompt**:
   ```
   You are an expert research assistant synthesizing information 
   from multiple academic papers.
   
   User Query: "{query}"
   
   Retrieved Evidence Chunks:
   [A.1]: {chunk text}
   ---
   [B.3]: {chunk text}
   ---
   
   Task: Generate a comprehensive draft answer that:
   1. Directly addresses the query
   2. Synthesizes facts from evidence
   3. Handles conflicts/comparisons between papers
   4. Uses inline citation tags after EVERY factual claim
   
   Draft Answer:
   ```

2. **Call Gemini API**:
   ```typescript
   const draftAnswer = await callGemini(apiKey, pass1Prompt)
   ```

3. **Draft Output Example**:
   ```
   The Transformer architecture [A.1] revolutionized NLP by introducing 
   self-attention mechanisms [A.3]. In contrast, RNNs process sequences 
   sequentially [B.2], which limits parallelization [B.4].
   ```

### **Pass 2: Refinement & Grounding**

**Purpose**: Improve clarity, verify citations, acknowledge limitations

1. **Construct Refinement Prompt**:
   ```
   You are refining a research answer for clarity and accessibility.
   
   Original Query: "{query}"
   Evidence Context: {topChunks.length} chunks from {documents.length} docs
   
   Draft Answer:
   {draftAnswer}
   
   Task: Refine this answer to be:
   1. Clear and accessible (explain complex terms)
   2. Well-grounded (verify every citation tag is present)
   3. Honest (if evidence is weak, acknowledge it)
   
   Refined Answer:
   ```

2. **Call Gemini API**:
   ```typescript
   const refinedAnswer = await callGemini(apiKey, pass2Prompt)
   ```

3. **Refined Output Example**:
   ```
   The Transformer architecture [A.1] changed natural language processing 
   by using "self-attention" - a method where each word can look at all 
   other words simultaneously [A.3]. Earlier models like RNNs [B.2] had 
   to process words one-by-one, making them slower [B.4].
   ```

### **Citation Extraction**

**Purpose**: Map inline citation tags to source documents

1. **Extract All Citations**:
   ```typescript
   const citationPattern = /\[([A-Z])\.(\d+)\]/g
   // Matches: [A.1], [B.3], [C.12], etc.
   ```

2. **Build Citation Legend**:
   ```typescript
   citations: CitationEntry[] = [
     {
       tag: "A.1",
       document_name: "Attention_Is_All_You_Need.pdf",
       location: "Section 1"
     },
     {
       tag: "B.3",
       document_name: "LSTM_Networks.pdf",
       location: "Section 3"
     }
   ]
   ```

### **Confidence Calculation**

1. **Average Relevance Score**:
   ```typescript
   avgRelevance = sum(chunk.simulated_relevance_score) / numChunks
   ```

2. **Answerability Check**:
   ```typescript
   isAnswerable = avgRelevance >= 0.4 && numChunks >= 3
   ```

#### Output: `SynthesisResult`

```typescript
interface SynthesisResult {
  draft_answer: string;                // Pass 1 output
  refined_answer: string;              // Pass 2 output (displayed)
  citations: CitationEntry[];          // Citation mapping
  average_routing_confidence: number;  // Avg routing score
  average_relevance_score: number;     // Avg chunk score
  is_answerable: boolean;              // Confidence flag
}
```

---

## Guardrail Logic: Unanswerable Query Detection

**Location**: `Chat.tsx` - `handleSendMessage()`

### Conditions for "Unanswerable":

```typescript
// 1. Check routing confidence
const avgRoutingScore = routingResults.reduce(...) / routingResults.length
if (avgRoutingScore < 0.3) {
  return UNANSWERABLE_MESSAGE
}

// 2. Check chunk retrieval quality
if (topChunks.length === 0) {
  return UNANSWERABLE_MESSAGE
}

// 3. Check chunk relevance scores
const avgRelevance = topChunks.reduce(...) / topChunks.length
if (avgRelevance < 0.4) {
  return UNANSWERABLE_MESSAGE
}

// 4. Check minimum chunk count
if (topChunks.length < 3) {
  return UNANSWERABLE_MESSAGE
}
```

### Guardrail Message:

```
⚠️ I cannot answer this question definitively as the necessary 
information could not be sufficiently sourced or verified across 
the available research papers.
```

**Purpose**: Prevent hallucinations by explicitly stating when confidence is too low.

---

## Frontend Display Components

### 1. Chat Message Display (`ChatMessage.tsx`)

**Location**: `src/components/ChatMessage.tsx`

- Renders user messages and assistant responses
- Formats markdown in messages
- Displays avatars and role indicators

### 2. Inline Citations in Answer

**Example Output**:
```
The Transformer architecture [A.1] revolutionized NLP by 
introducing self-attention mechanisms [A.3]. RNNs process 
sequences sequentially [B.2], limiting parallelization [B.4].
```

Citations appear as `[A.1]`, `[B.3]` inline with the text.

### 3. Citation Legend (`CitationLegend.tsx`)

**Location**: `src/components/CitationLegend.tsx`

**Purpose**: Map citation tags to source documents

**Display Format**:
```
📚 Sources & Citations

[A]: "Attention Is All You Need.pdf"
  [A.1]: Section 1
  [A.3]: Section 3

[B]: "LSTM Networks.pdf"
  [B.2]: Section 2
  [B.4]: Section 4
```

**Features**:
- Grouped by document (A, B, C...)
- Shows document name and specific section locations
- Collapsible per document
- Color-coded citation tags

### 4. Transparency Panel (`TransparencyPanel.tsx`)

**Location**: `src/components/TransparencyPanel.tsx`

**Purpose**: Show RAG pipeline internals for trust and education

#### Section A: Document Routing

**Displays**:
- All uploaded documents
- Routing confidence score (0-100%)
- Progress bar visualization
- Selection reasoning text

**Example**:
```
📄 Paper_A.pdf                                    85%
████████████████████░░░░
"Contains detailed explanation of attention mechanisms"

📄 Paper_B.pdf                                    42%
████████░░░░░░░░░░░░░░░░
"Mentions RNNs but not the main focus"
```

#### Section B: Chunk Reranking

**Displays**:
- Top 5 retrieved chunks
- Source citation tag ([A.1], [B.3])
- Relevance score (0-100%)
- Preview of chunk text (2 lines)

**Example**:
```
[A.1]                                    Score: 92%
"The Transformer architecture eliminates recurrence 
and instead relies entirely on attention mechanisms..."

[B.3]                                    Score: 78%
"LSTMs solve the vanishing gradient problem but still
process sequences sequentially..."
```

**Interaction**: Collapsible panel with chevron icon

---

## Complete Data Flow Summary

### Upload Flow:
```
1. User selects PDF files
2. pdfParser.ts extracts text using pdfjs-dist
3. DocumentMetadata created with id, name, text
4. Document stored in DocumentContext
5. Navigate to /chat
```

### Query Flow:
```
1. User enters question in chat
2. TIER 1: routeDocuments()
   - Gemini analyzes query vs document previews
   - Returns routing confidence scores
   - Filter docs with score > 0.5

3. TIER 2: retrieveAndRerankChunks()
   - Split filtered docs into chunks
   - Gemini scores each chunk's relevance
   - Return top K chunks with citations

4. GUARDRAIL CHECK:
   - If avgRoutingScore < 0.3 → STOP
   - If avgRelevance < 0.4 → STOP
   - If chunks < 3 → STOP
   - Display "unanswerable" message

5. TIER 3: synthesizeAnswer()
   - Pass 1: Extract & synthesize from chunks
   - Pass 2: Refine, clarify, ground with citations
   - Extract citation tags from answer

6. DISPLAY:
   - Show refined answer with inline citations
   - Render CitationLegend below
   - Show TransparencyPanel with routing/reranking data
   - Store message in context for chat history
```

---

## Key Technical Details

### State Management

**React Context API** (`DocumentContext.tsx`):
- Global state for documents, messages, API keys
- No Redux or external state management
- Persists across navigation between Index and Chat pages

### PDF Processing

**Library**: `pdfjs-dist` v5.4.394
- Extracts text from PDF using browser-based parsing
- Worker configured via `GlobalWorkerOptions.workerSrc`
- Handles multi-page documents
- No OCR capability (text-based PDFs only)

### API Communication

**Gemini API Integration**:
```typescript
const GEMINI_API_BASE = 
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent"

async function callGemini(apiKey: string, prompt: string) {
  const response = await fetch(`${GEMINI_API_BASE}?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }]
    })
  })
  
  const data = await response.json()
  return data.candidates[0].content.parts[0].text
}
```

**Model**: `gemini-2.5-flash`
- Fast inference
- Good reasoning capabilities
- Supports JSON output formatting

### UI Components

**Shadcn/ui Library**:
- Button, Card, Progress, Collapsible, Dialog, Textarea
- Fully themed via Tailwind CSS
- Accessible by default (ARIA attributes)

**Styling**:
- Tailwind CSS with custom design tokens
- HSL color system for theming
- Responsive design (mobile-first)

---

## What Makes This "Advanced"

### 1. Multi-Tier Intelligence
- Three separate Gemini API calls per query
- Each tier builds on previous tier's output
- Mimics real RAG pipeline architecture

### 2. Cross-Document Synthesis
- Handles multiple papers simultaneously
- Can compare/contrast findings across sources
- Maintains document-level attribution

### 3. Transparency & Trust
- Visual routing confidence scores
- Chunk reranking scores exposed
- Citation grounding for every claim
- Explicit "unanswerable" detection

### 4. Structure-Aware Processing
- Considers document structure in chunking
- Citation tags preserve source location
- Context-aware chunk boundaries

### 5. Two-Pass Refinement
- First pass: Extract and synthesize
- Second pass: Clarify and ground
- Ensures both accuracy and readability

---

## Limitations & Future Enhancements

### Current Limitations:

1. **No Real Vector Store**: All documents sent to Gemini API each time
2. **No Persistent Embeddings**: No caching of document representations
3. **API Cost**: 3 Gemini calls per query can be expensive at scale
4. **No OCR**: Cannot read scanned PDFs
5. **Single Language**: English-only prompts
6. **Frontend Only**: No backend persistence or user accounts

### Potential Enhancements:

1. **Real RAG Backend**:
   - Use Lovable Cloud with Supabase pgvector
   - Store actual embeddings in database
   - Implement true semantic search

2. **Advanced Chunking**:
   - Use LangChain for semantic chunking
   - Preserve LaTeX equations and tables
   - Handle figures and captions

3. **Better Reranking**:
   - Integrate Cohere Rerank API
   - Use cross-encoder models
   - Implement BM25 + semantic hybrid search

4. **User Features**:
   - Save chat history
   - Export citations in BibTeX format
   - Collaborative document annotation
   - Multi-user document collections

5. **Performance**:
   - Implement streaming responses
   - Cache routing/reranking results
   - Parallel processing for multiple documents

---

## Conclusion

This project demonstrates how sophisticated RAG pipelines can be **simulated** using advanced prompting techniques with modern LLMs. While it lacks the infrastructure of production RAG systems, it provides:

- **Educational value**: Clear visualization of RAG components
- **Rapid prototyping**: No backend setup required
- **Flexibility**: Easy to modify prompts and behavior
- **Transparency**: Full visibility into decision-making

The architecture serves as a foundation for understanding RAG systems and can be extended into a production-grade implementation with proper vector storage, embedding models, and backend infrastructure.

---

## File Structure Reference

```
src/
├── components/
│   ├── ChatInput.tsx          # Text input for queries
│   ├── ChatMessage.tsx        # Message display component
│   ├── CitationLegend.tsx     # Source citation mapping
│   ├── TransparencyPanel.tsx  # RAG pipeline visualization
│   └── RerankerModal.tsx      # Optional reranker config
├── contexts/
│   └── DocumentContext.tsx    # Global state management
├── lib/
│   ├── geminiAdvanced.ts      # Three-tier RAG functions
│   ├── pdfParser.ts           # PDF text extraction
│   └── gemini.ts              # Basic Gemini API wrapper
├── pages/
│   ├── Index.tsx              # Upload page
│   ├── Chat.tsx               # Chat interface + RAG orchestration
│   └── NotFound.tsx           # 404 page
├── types/
│   └── rag.ts                 # TypeScript interfaces
└── main.tsx                   # App entry point
```

**Backend Files (Not Used)**:
- `backend/rag_pipeline.py`
- `backend/embeddings.py`
- `backend/vector_store.py`
- `backend/reranker.py`
- `backend/document_processor.py`

These files are **decorative** and not executed by the application.
