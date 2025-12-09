import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useDocument } from "@/contexts/DocumentContext";
import { ChatMessage } from "@/components/ChatMessage";
import { ChatInput } from "@/components/ChatInput";
import { routeDocuments, retrieveAndRerankChunks, synthesizeAnswer } from "@/lib/geminiAdvanced";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { TransparencyPanel } from "@/components/TransparencyPanel";
import { CitationLegend } from "@/components/CitationLegend";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ArrowLeft, FileText, Loader2, Sparkles, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { RoutingResult, RerankedChunk } from "@/types/rag";

const Chat = () => {
  const navigate = useNavigate();
  const { documents, apiKey, messages, rerankerEnabled, addMessage } = useDocument();
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (documents.length === 0 || !apiKey) {
      navigate("/");
    }
  }, [documents, apiKey, navigate]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendMessage = async (message: string) => {
    addMessage({ role: "user", content: message });
    setIsLoading(true);

    try {
      // Phase 1: Multi-Document Routing
      const routingResults = await routeDocuments(apiKey, message, documents);
      
      // Filter documents with confidence > 0.3
      const selectedDocs = documents.filter(doc => {
        const result = routingResults.find(r => r.doc_id === doc.name);
        return result && result.routing_confidence_score > 0.3;
      });

      if (selectedDocs.length === 0) {
        addMessage({
          role: "assistant",
          content: "I cannot answer this question definitively as the necessary information could not be sufficiently sourced or verified across the available research papers.",
          routingResults,
          topChunks: []
        });
        return;
      }

      // Phase 2: Structure-Aware Retrieval & Reranking
      const topChunks = await retrieveAndRerankChunks(apiKey, message, selectedDocs, 10);

      // Calculate average scores
      const avgRoutingScore = routingResults.reduce((sum, r) => sum + r.routing_confidence_score, 0) / routingResults.length;
      const avgRelevanceScore = topChunks.reduce((sum, c) => sum + c.simulated_relevance_score, 0) / topChunks.length;

      // Guardrail check
      if (avgRoutingScore < 0.3 || avgRelevanceScore < 0.4 || topChunks.length < 3) {
        addMessage({
          role: "assistant",
          content: "I cannot answer this question definitively as the necessary information could not be sufficiently sourced or verified across the available research papers.",
          routingResults,
          topChunks
        });
        return;
      }

      // Phase 3: Two-Pass Synthesis
      const synthesis = await synthesizeAnswer(apiKey, message, topChunks, documents);

      if (!synthesis.is_answerable) {
        addMessage({
          role: "assistant",
          content: "I cannot answer this question definitively as the necessary information could not be sufficiently sourced or verified across the available research papers.",
          routingResults,
          topChunks
        });
        return;
      }

      addMessage({
        role: "assistant",
        content: synthesis.refined_answer,
        routingResults,
        topChunks
      });

    } catch (error) {
      console.error("Chat error:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to get response",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const lastMessage = messages[messages.length - 1];
  const showTransparency = lastMessage?.role === "assistant" && (lastMessage.routingResults || lastMessage.topChunks);

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card px-6 py-4">
        <div className="flex items-center justify-between max-w-6xl mx-auto">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              <div>
                <h1 className="font-semibold text-foreground">DocChat</h1>
                <p className="text-xs text-muted-foreground">
                  {documents.length} document{documents.length > 1 ? 's' : ''} loaded
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="gap-1.5">
              <Sparkles className="h-3 w-3" />
              Advanced RAG: Active
            </Badge>
            {rerankerEnabled && (
              <Badge variant="default" className="gap-1.5">
                <Sparkles className="h-3 w-3" />
                Reranker
              </Badge>
            )}
          </div>
        </div>
      </header>

      {/* Messages */}
      <ScrollArea className="flex-1" ref={scrollRef}>
        <div className="max-w-4xl mx-auto px-6 py-8">
          {messages.length === 0 ? (
            <div className="text-center text-muted-foreground py-12 space-y-4">
              <FileText className="h-12 w-12 mx-auto opacity-50" />
              <div>
                <p className="font-medium">Multi-Document RAG Ready</p>
                <p className="text-sm">Ask questions that span across your uploaded documents</p>
              </div>
              <Alert className="text-left">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Advanced Features Enabled</AlertTitle>
                <AlertDescription className="text-xs">
                  • Document routing with confidence scoring<br/>
                  • Cross-document chunk retrieval & reranking<br/>
                  • Two-pass synthesis with inline citations<br/>
                  • Transparency panel showing RAG pipeline decisions
                </AlertDescription>
              </Alert>
            </div>
          ) : (
            <>
              {messages.map((message, index) => {
                const isLastAssistant = index === messages.length - 1 && message.role === "assistant";
                return (
                  <div key={index} className="space-y-4 mb-6">
                    <ChatMessage role={message.role} content={message.content} />
                    {isLastAssistant && message.routingResults && message.topChunks && (
                      <>
                        <TransparencyPanel
                          routingResults={message.routingResults}
                          topChunks={message.topChunks}
                        />
                        <CitationLegend citations={extractCitations(message.content, documents)} />
                      </>
                    )}
                  </div>
                );
              })}
            </>
          )}
          {isLoading && (
            <div className="flex justify-start mb-4">
              <div className="bg-card border border-border rounded-2xl px-4 py-3 space-y-2">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
                <p className="text-xs text-muted-foreground">
                  Running multi-document RAG pipeline...
                </p>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Input */}
      <ChatInput onSend={handleSendMessage} disabled={isLoading} />
    </div>
  );
};

// Helper function to extract citations
function extractCitations(content: string, documents: any[]) {
  const citationPattern = /\[([A-Z])\.(\d+)\]/g;
  const citations: any[] = [];
  const seen = new Set<string>();
  
  let match;
  while ((match = citationPattern.exec(content)) !== null) {
    const tag = `${match[1]}.${match[2]}`;
    if (!seen.has(tag)) {
      seen.add(tag);
      const docLetter = match[1];
      const sourceDoc = documents.find(d => d.name.charAt(0).toUpperCase() === docLetter);
      if (sourceDoc) {
        citations.push({
          tag,
          document_name: sourceDoc.name,
          location: `Section ${match[2]}`
        });
      }
    }
  }
  
  return citations;
}

export default Chat;
