import { createContext, useContext, useState, ReactNode } from "react";

import { DocumentMetadata, RoutingResult, RerankedChunk } from "@/types/rag";

interface Message {
  role: "user" | "assistant";
  content: string;
  routingResults?: RoutingResult[];
  topChunks?: RerankedChunk[];
}

interface DocumentContextType {
  documents: DocumentMetadata[];
  apiKey: string;
  messages: Message[];
  rerankerEnabled: boolean;
  rerankerApiKey: string;
  addDocument: (doc: DocumentMetadata) => void;
  removeDocument: (id: string) => void;
  clearDocuments: () => void;
  setApiKey: (key: string) => void;
  setRerankerEnabled: (enabled: boolean) => void;
  setRerankerApiKey: (key: string) => void;
  addMessage: (message: Message) => void;
  clearChat: () => void;
}

const DocumentContext = createContext<DocumentContextType | undefined>(undefined);

export const DocumentProvider = ({ children }: { children: ReactNode }) => {
  const [documents, setDocuments] = useState<DocumentMetadata[]>([]);
  const [apiKey, setApiKey] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [rerankerEnabled, setRerankerEnabled] = useState(false);
  const [rerankerApiKey, setRerankerApiKey] = useState("");

  const addDocument = (doc: DocumentMetadata) => {
    setDocuments((prev) => [...prev, doc]);
  };

  const removeDocument = (id: string) => {
    setDocuments((prev) => prev.filter((d) => d.id !== id));
  };

  const clearDocuments = () => {
    setDocuments([]);
  };

  const addMessage = (message: Message) => {
    setMessages((prev) => [...prev, message]);
  };

  const clearChat = () => {
    setMessages([]);
  };

  return (
    <DocumentContext.Provider
      value={{
        documents,
        apiKey,
        messages,
        rerankerEnabled,
        rerankerApiKey,
        addDocument,
        removeDocument,
        clearDocuments,
        setApiKey,
        setRerankerEnabled,
        setRerankerApiKey,
        addMessage,
        clearChat,
      }}
    >
      {children}
    </DocumentContext.Provider>
  );
};

export const useDocument = () => {
  const context = useContext(DocumentContext);
  if (!context) {
    throw new Error("useDocument must be used within DocumentProvider");
  }
  return context;
};
