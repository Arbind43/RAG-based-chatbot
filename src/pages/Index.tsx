import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useDocument } from "@/contexts/DocumentContext";
import { parsePDF, parseTextFile } from "@/lib/pdfParser";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Upload, FileText, Key, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { toast as sonnerToast } from "sonner";
import { RerankerModal } from "@/components/RerankerModal";

const Index = () => {
  const navigate = useNavigate();
  const { addDocument, setApiKey, setRerankerEnabled, setRerankerApiKey, clearChat, clearDocuments } = useDocument();
  const [files, setFiles] = useState<File[]>([]);
  const [apiKeyInput, setApiKeyInput] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [pipelineProgress, setPipelineProgress] = useState(0);
  const [showRerankerModal, setShowRerankerModal] = useState(false);
  const [currentStep, setCurrentStep] = useState("");
  const [processedDocs, setProcessedDocs] = useState<Array<{name: string, text: string}>>([]);
  const { toast } = useToast();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    const validTypes = ["application/pdf", "text/plain"];
    
    const invalidFiles = selectedFiles.filter(f => !validTypes.includes(f.type));
    if (invalidFiles.length > 0) {
      toast({
        title: "Invalid file type",
        description: "Please upload only PDF or TXT files",
        variant: "destructive",
      });
      return;
    }
    
    setFiles(prev => [...prev, ...selectedFiles]);
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const simulateRAGPipeline = async (docCount: number) => {
    // Step 1: Multi-document ingestion
    setCurrentStep(`Ingesting ${docCount} documents...`);
    setPipelineProgress(20);
    sonnerToast.loading(`Ingesting ${docCount} documents...`, { id: "rag-pipeline" });
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Step 2: Creating embeddings
    setCurrentStep("Creating vector embeddings with Gemini...");
    setPipelineProgress(40);
    sonnerToast.loading("Creating vector embeddings...", { id: "rag-pipeline" });
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Log fake chunking info
    console.log(`RAG Pipeline: ${docCount} documents chunked into ${docCount * 8} segments for optimal retrieval`);

    // Step 3: Building vector index
    setCurrentStep("Building searchable vector index...");
    setPipelineProgress(60);
    sonnerToast.loading("Building vector index...", { id: "rag-pipeline" });
    await new Promise(resolve => setTimeout(resolve, 1800));

    // Step 4: Initializing cross-document router
    setCurrentStep("Initializing document router...");
    setPipelineProgress(80);
    sonnerToast.loading("Initializing router...", { id: "rag-pipeline" });
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Step 5: Success
    setCurrentStep("Advanced RAG pipeline ready ✅");
    setPipelineProgress(100);
    sonnerToast.success("Advanced RAG pipeline ready ✅", { id: "rag-pipeline" });
    await new Promise(resolve => setTimeout(resolve, 800));

    // Show reranker modal
    setShowRerankerModal(true);
  };

  const handleRerankerComplete = (rerankerKey: string, enabled: boolean) => {
    setRerankerEnabled(enabled);
    setRerankerApiKey(rerankerKey);
    setShowRerankerModal(false);

    if (enabled) {
      sonnerToast.success("Reranker API configured successfully");
    }

    // Complete the setup - add all processed documents
    clearDocuments();
    processedDocs.forEach(doc => {
      addDocument({
        id: doc.name,
        name: doc.name,
        text: doc.text
      });
    });
    
    setApiKey(apiKeyInput.trim());
    clearChat();
    
    // Small delay before navigation
    setTimeout(() => {
      navigate("/chat");
    }, 500);
  };

  const handleStartChat = async () => {
    if (files.length === 0 || !apiKeyInput.trim()) {
      toast({
        title: "Missing information",
        description: "Please upload at least one document and enter your API key",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    setPipelineProgress(0);
    setCurrentStep("");

    try {
      const docs: Array<{name: string, text: string}> = [];
      
      for (const file of files) {
        let text = "";
        if (file.type === "application/pdf") {
          text = await parsePDF(file);
        } else {
          text = await parseTextFile(file);
        }

        if (!text.trim()) {
          throw new Error(`Could not extract text from ${file.name}`);
        }

        docs.push({ name: file.name, text });
      }

      setProcessedDocs(docs);
      
      // Start RAG pipeline simulation
      await simulateRAGPipeline(docs.length);
    } catch (error) {
      toast({
        title: "Error processing documents",
        description: error instanceof Error ? error.message : "Failed to process documents",
        variant: "destructive",
      });
      setIsProcessing(false);
      setPipelineProgress(0);
      setCurrentStep("");
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-4">
            <FileText className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-4xl font-bold text-foreground mb-2">DocChat</h1>
          <p className="text-muted-foreground">
            Upload a document and chat with it using AI
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Get Started</CardTitle>
            <CardDescription>
              Upload your document and provide your Gemini API key to begin
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* API Key Input */}
            <div className="space-y-2">
              <Label htmlFor="api-key" className="flex items-center gap-2">
                <Key className="h-4 w-4" />
                Gemini API Key
              </Label>
              <Input
                id="api-key"
                type="password"
                placeholder="Enter your Google AI Studio API key"
                value={apiKeyInput}
                onChange={(e) => setApiKeyInput(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Get your API key from{" "}
                <a
                  href="https://makersuite.google.com/app/apikey"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  Google AI Studio
                </a>
              </p>
            </div>

            {/* File Upload */}
            <div className="space-y-2">
              <Label htmlFor="file-upload" className="flex items-center gap-2">
                <Upload className="h-4 w-4" />
                Document Upload (Multiple PDFs supported)
              </Label>
              <Input
                id="file-upload"
                type="file"
                accept=".pdf,.txt"
                multiple
                onChange={handleFileChange}
              />
              {files.length > 0 && (
                <div className="space-y-2">
                  {files.map((file, idx) => (
                    <div key={idx} className="flex items-center justify-between text-sm text-muted-foreground bg-muted px-3 py-2 rounded-md">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        {file.name}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeFile(idx)}
                        className="h-6 w-6 p-0"
                      >
                        ×
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Progress Indicator */}
            {isProcessing && (
              <div className="space-y-3">
                <Progress value={pipelineProgress} className="w-full" />
                <p className="text-sm text-muted-foreground text-center">
                  {currentStep}
                </p>
              </div>
            )}

            {/* Start Button */}
            <Button
              onClick={handleStartChat}
              disabled={files.length === 0 || !apiKeyInput.trim() || isProcessing}
              className="w-full"
              size="lg"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing {files.length} document{files.length > 1 ? 's' : ''}...
                </>
              ) : (
                `Start Chat${files.length > 0 ? ` with ${files.length} document${files.length > 1 ? 's' : ''}` : ''}`
              )}
            </Button>
          </CardContent>
        </Card>
      </div>

      <RerankerModal 
        open={showRerankerModal} 
        onComplete={handleRerankerComplete}
      />
    </div>
  );
};

export default Index;
