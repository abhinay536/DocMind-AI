export interface User {
  id: number;
  email: string;
  full_name?: string;
  created_at: string;
}

export interface Document {
  id: number;
  user_id: number;
  filename: string;
  doc_hash: string;
  status: 'UPLOADED' | 'PROCESSING' | 'INDEXING' | 'READY' | 'FAILED';
  error_message?: string;
  total_chunks: number;
  text_chunks: number;
  table_chunks: number;
  image_chunks: number;
  created_at: string;
}

export interface Citation {
  rank: number;
  source: string;
  page: number;
  type: string;
  relevance_score: number;
  content: string;
  image_path?: string;
}

export interface Message {
  id: number;
  conversation_id: number;
  role: 'user' | 'assistant';
  content: string;
  intent?: string;
  telemetry?: string;
  citations?: Citation[];
  created_at: string;
}

export interface Conversation {
  id: number;
  document_id: number;
  title: string;
  created_at: string;
  messages: Message[];
}

export interface SystemStatus {
  groq_configured: boolean;
  gemini_configured: boolean;
  tesseract_available: boolean;
  embedding_model: string;
  local_llm_model: string;
  qdrant_host: string;
}
