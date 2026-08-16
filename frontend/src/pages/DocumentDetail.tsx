import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { documentAPI } from '../services/api';
import { FileText, ArrowLeft, MessageSquare, Layers, Table, Image as ImageIcon } from 'lucide-react';

export const DocumentDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const docId = parseInt(id || '0');

  const { data: doc, isLoading, error } = useQuery({
    queryKey: ['document', docId],
    queryFn: () => documentAPI.get(docId),
  });

  if (isLoading) {
    return <div className="p-8 text-center text-slate-400">Loading document details...</div>;
  }

  if (error || !doc) {
    return <div className="p-8 text-center text-rose-400">Document not found or access denied.</div>;
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <Link to="/documents" className="inline-flex items-center space-x-1.5 text-xs text-slate-400 hover:text-white transition">
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Documents</span>
      </Link>

      <div className="glass-panel p-8 rounded-3xl space-y-6">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
          <div className="space-y-1">
            <div className="flex items-center space-x-3">
              <FileText className="w-8 h-8 text-brand-400" />
              <h2 className="font-heading font-bold text-2xl text-white">{doc.filename}</h2>
            </div>
            <p className="text-xs text-slate-400 font-mono">Hash: {doc.doc_hash}</p>
          </div>
          <div className="flex items-center space-x-3">
            <span className={`px-3 py-1 rounded-full font-semibold uppercase text-xs ${
              doc.status === 'READY' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
              doc.status === 'FAILED' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' :
              'bg-amber-500/10 text-amber-400 border border-amber-500/20'
            }`}>
              {doc.status}
            </span>
            {doc.status === 'READY' && (
              <Link
                to={`/chat?doc=${doc.id}`}
                className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-gradient-to-r from-brand-600 to-indigo-500 text-white font-semibold text-xs shadow-lg shadow-indigo-500/20 hover:opacity-95 transition"
              >
                <MessageSquare className="w-4 h-4" />
                <span>Start RAG Chat</span>
              </Link>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="glass-card p-4 rounded-xl text-center space-y-1">
            <Layers className="w-5 h-5 text-sky-400 mx-auto" />
            <p className="font-heading font-bold text-xl text-white">{doc.total_chunks}</p>
            <p className="text-[10px] text-slate-400 uppercase">Total Chunks</p>
          </div>
          <div className="glass-card p-4 rounded-xl text-center space-y-1">
            <FileText className="w-5 h-5 text-indigo-400 mx-auto" />
            <p className="font-heading font-bold text-xl text-white">{doc.text_chunks}</p>
            <p className="text-[10px] text-slate-400 uppercase">Text Paragraphs</p>
          </div>
          <div className="glass-card p-4 rounded-xl text-center space-y-1">
            <Table className="w-5 h-5 text-emerald-400 mx-auto" />
            <p className="font-heading font-bold text-xl text-white">{doc.table_chunks}</p>
            <p className="text-[10px] text-slate-400 uppercase">Grid Tables</p>
          </div>
          <div className="glass-card p-4 rounded-xl text-center space-y-1">
            <ImageIcon className="w-5 h-5 text-amber-400 mx-auto" />
            <p className="font-heading font-bold text-xl text-white">{doc.image_chunks}</p>
            <p className="text-[10px] text-slate-400 uppercase">OCR Figures</p>
          </div>
        </div>

        <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800 text-xs space-y-2">
          <p className="font-semibold text-slate-300">Hybrid Index Technical Profile:</p>
          <ul className="list-disc list-inside text-slate-400 space-y-1">
            <li>Dense Embeddings: <code className="text-sky-300">sentence-transformers/all-MiniLM-L6-v2</code></li>
            <li>Vector DB: <code className="text-indigo-300">Qdrant Vector Database</code></li>
            <li>Sparse Index: <code className="text-emerald-300">BM25Okapi Lexical Matching</code></li>
            <li>Re-Ranker: <code className="text-amber-300">cross-encoder/ms-marco-MiniLM-L-6-v2</code></li>
          </ul>
        </div>
      </div>
    </div>
  );
};
