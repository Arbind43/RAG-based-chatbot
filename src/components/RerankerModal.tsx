import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sparkles } from "lucide-react";

interface RerankerModalProps {
  open: boolean;
  onComplete: (apiKey: string, enabled: boolean) => void;
}

export const RerankerModal = ({ open, onComplete }: RerankerModalProps) => {
  const [apiKey, setApiKey] = useState("");

  const handleSkip = () => {
    onComplete("", false);
  };

  const handleContinue = () => {
    if (apiKey.trim()) {
      onComplete(apiKey.trim(), true);
    } else {
      handleSkip();
    }
  };

  return (
    <Dialog open={open}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-2">
            <div className="p-2 rounded-lg bg-primary/10">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
          </div>
          <DialogTitle>Enhanced Retrieval with Reranking</DialogTitle>
          <DialogDescription>
            Improve answer accuracy by using a Reranker API (e.g., Cohere, VoyageAI).
            This helps prioritize the most relevant document chunks.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="reranker-key">Reranker API Key (Optional)</Label>
            <Input
              id="reranker-key"
              type="password"
              placeholder="Enter Cohere or VoyageAI API key"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleContinue()}
            />
            <p className="text-xs text-muted-foreground">
              Leave blank to continue without reranking
            </p>
          </div>
        </div>
        <DialogFooter className="flex-row gap-2 sm:gap-0">
          <Button variant="outline" onClick={handleSkip} className="flex-1 sm:flex-none">
            Skip
          </Button>
          <Button onClick={handleContinue} className="flex-1 sm:flex-none">
            Continue
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
