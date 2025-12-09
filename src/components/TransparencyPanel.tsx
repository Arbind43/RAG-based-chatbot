import { ChevronDown, FileText, Layers } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { RoutingResult, RerankedChunk } from "@/types/rag";

interface TransparencyPanelProps {
  routingResults: RoutingResult[];
  topChunks: RerankedChunk[];
}

export const TransparencyPanel = ({ routingResults, topChunks }: TransparencyPanelProps) => {
  return (
    <Card className="p-4 bg-muted/30 border-border/50">
      <Collapsible>
        <CollapsibleTrigger className="flex items-center justify-between w-full group">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4" />
            <span className="font-medium">RAG Pipeline Transparency</span>
          </div>
          <ChevronDown className="w-4 h-4 transition-transform group-data-[state=open]:rotate-180" />
        </CollapsibleTrigger>
        
        <CollapsibleContent className="mt-4 space-y-6">
          {/* Section A: Document Routing */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Document Routing
            </h4>
            <div className="space-y-2">
              {routingResults.map((result, idx) => (
                <div key={idx} className="space-y-1 p-3 rounded-lg bg-background/50">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{result.doc_id}</span>
                    <span className="text-xs text-muted-foreground">
                      {(result.routing_confidence_score * 100).toFixed(0)}%
                    </span>
                  </div>
                  <Progress value={result.routing_confidence_score * 100} className="h-2" />
                  <p className="text-xs text-muted-foreground mt-1">
                    {result.selection_reasoning}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Section B: Chunk Reranking */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold">Top Retrieved Chunks</h4>
            <div className="space-y-2">
              {topChunks.slice(0, 5).map((chunk, idx) => (
                <div key={idx} className="p-3 rounded-lg bg-background/50 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono text-primary">{chunk.source_citation_tag}</span>
                    <span className="text-xs text-muted-foreground">
                      Score: {(chunk.simulated_relevance_score * 100).toFixed(0)}%
                    </span>
                  </div>
                  <p className="text-xs line-clamp-2">{chunk.chunk_text}</p>
                </div>
              ))}
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};
