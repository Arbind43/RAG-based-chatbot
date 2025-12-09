import { BookOpen } from "lucide-react";
import { Card } from "@/components/ui/card";
import { CitationEntry } from "@/types/rag";

interface CitationLegendProps {
  citations: CitationEntry[];
}

export const CitationLegend = ({ citations }: CitationLegendProps) => {
  if (citations.length === 0) return null;

  // Group citations by document
  const groupedCitations = citations.reduce((acc, citation) => {
    const docKey = citation.tag.split('.')[0];
    if (!acc[docKey]) {
      acc[docKey] = [];
    }
    acc[docKey].push(citation);
    return acc;
  }, {} as Record<string, CitationEntry[]>);

  return (
    <Card className="p-4 bg-muted/20 border-border/50 mt-4">
      <div className="flex items-center gap-2 mb-3">
        <BookOpen className="w-4 h-4" />
        <h4 className="font-semibold text-sm">Citations & Sources</h4>
      </div>
      <div className="space-y-3">
        {Object.entries(groupedCitations).map(([docKey, cites]) => (
          <div key={docKey} className="space-y-1">
            <div className="font-mono text-xs text-primary font-semibold">
              [{docKey}]: {cites[0].document_name}
            </div>
            <div className="pl-4 space-y-0.5">
              {cites.map((cite, idx) => (
                <div key={idx} className="text-xs text-muted-foreground">
                  <span className="font-mono text-primary">[{cite.tag}]</span>: {cite.location}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
};
