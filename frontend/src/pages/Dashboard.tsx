import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, Link } from 'react-router-dom';
import { documentAPI, chatAPI } from '../services/api';
import { UploadCloud, FileText, MessageSquare, Layers, Table, Image as ImageIcon, ArrowRight } from 'lucide-react';

export const Dashboard: React.FC = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const { data: documents = [] } = useQuery({
    queryKey: ['documents'],
    queryFn: documentAPI.list,
    refetchInterval: 3000,
  });

  const { data: conversations = [] } = useQuery({
    queryKey: ['conversations'],
    queryFn: chatAPI.listConversations,
  });

  const uploadMutation = useMutation({
    mutationFn: documentAPI.upload,
    onSuccess: (newDoc) => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      setUploading(false);
      navigate(`/documents/${newDoc.id}`);
    },
    onError: (err: any) => {
      setError(err.response?.data?.detail || 'Failed to upload document');
      setUploading(false);
    },
  });

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setUploading(true);
      setError('');
      uploadMutation.mutate(e.target.files[0]);
    }
  };

  const totalChunks = documents.reduce((sum, d) => sum + d.total_chunks, 0);
  const totalTables = documents.reduce((sum, d) => sum + d.table_chunks, 0);
  const totalImages = documents.reduce((sum, d) => sum + d.image_chunks, 0);

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Hero Welcome */}
      <div className="glass-panel rounded-3xl p-8 relative overflow-hidden">
        <div className="relative z-10 max-w-2xl space-y-3">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-brand-500/10 border border-brand-500/20 text-brand-300 text-xs font-semibold">
            <span>⚡ Production Architecture</span>
          </div>
          <h2 className="font-heading text-3xl font-extrabold text-white">
            Multi-Modal Document Intelligence Platform
          </h2>
          <p className="text-slate-300 text-sm leading-relaxed">
            Upload complex financial, technical, or research PDFs. DocMind extracts text paragraphs, grid tables, and OCR figures using a <b>FAANG-grade Hybrid Retrieval Pipeline</b> (Qdrant + BM25 + RRF + Cross-Encoder Re-Ranking).
          </p>
        </div>
      </div>

      {/* Quick Upload Dropzone */}
      <div className="glass-card rounded-2xl p-6 border-dashed border-2 border-brand-500/30 text-center space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-brand-600/20 text-brand-400 flex items-center justify-center mx-auto">
          <UploadCloud className="w-6 h-6" />
        </div>
        <div>
          <h3 className="font-heading font-semibold text-lg text-white">Upload PDF Document</h3>
          <p className="text-xs text-slate-400">PDFs up to 50MB with embedded text, tables & images</p>
        </div>
        {error && <p className="text-xs text-rose-400 font-medium">{error}</p>}
        <div>
          <label className="inline-flex items-center space-x-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-brand-600 to-indigo-500 text-white font-medium text-sm shadow-lg shadow-indigo-500/20 cursor-pointer hover:opacity-95 transition">
            <span>{uploading ? 'Processing & Indexing PDF...' : 'Select PDF File'}</span>
            <input type="file" accept=".pdf" onChange={handleFileUpload} disabled={uploading} className="hidden" />
          </label>
        </div>
      </div>

      {/* Metrics Dashboard */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="glass-card p-5 rounded-2xl space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium uppercase tracking-wider">Documents</span>
            <FileText className="w-4 h-4 text-brand-400" />
          </div>
          <p className="font-heading font-bold text-2xl text-white">{documents.length}</p>
        </div>
        <div className="glass-card p-5 rounded-2xl space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium uppercase tracking-wider">Total Chunks</span>
            <Layers className="w-4 h-4 text-sky-400" />
          </div>
          <p className="font-heading font-bold text-2xl text-white">{totalChunks}</p>
        </div>
        <div className="glass-card p-5 rounded-2xl space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium uppercase tracking-wider">Grid Tables</span>
            <Table className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="font-heading font-bold text-2xl text-white">{totalTables}</p>
        </div>
        <div className="glass-card p-5 rounded-2xl space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium uppercase tracking-wider">OCR Figures</span>
            <ImageIcon className="w-4 h-4 text-amber-400" />
          </div>
          <p className="font-heading font-bold text-2xl text-white">{totalImages}</p>
        </div>
      </div>

      {/* Recent Documents & Conversations Split */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass-card p-6 rounded-2xl space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-heading font-semibold text-white flex items-center gap-2">
              <FileText className="w-4 h-4 text-brand-400" />
              Recent Documents
            </h3>
            <Link to="/documents" className="text-xs text-brand-400 hover:underline flex items-center gap-1">
              View All <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          {documents.length === 0 ? (
            <p className="text-xs text-slate-400 py-4">No documents uploaded yet.</p>
          ) : (
            <div className="space-y-2">
              {documents.slice(0, 4).map((doc) => (
                <div key={doc.id} className="p-3 rounded-xl bg-slate-800/40 border border-slate-700/40 flex items-center justify-between text-xs">
                  <div>
                    <p className="font-semibold text-slate-200">{doc.filename}</p>
                    <p className="text-slate-400">{doc.total_chunks} chunks parsed</p>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full font-semibold uppercase text-[10px] ${
                    doc.status === 'READY' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                    doc.status === 'FAILED' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' :
                    'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                  }`}>
                    {doc.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="glass-card p-6 rounded-2xl space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-heading font-semibold text-white flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-indigo-400" />
              Recent Conversations
            </h3>
            <Link to="/chat" className="text-xs text-brand-400 hover:underline flex items-center gap-1">
              Open Chat <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          {conversations.length === 0 ? (
            <p className="text-xs text-slate-400 py-4">No RAG chats created yet.</p>
          ) : (
            <div className="space-y-2">
              {conversations.slice(0, 4).map((c) => (
                <Link key={c.id} to={`/chat?conv=${c.id}`} className="p-3 rounded-xl bg-slate-800/40 border border-slate-700/40 flex items-center justify-between text-xs hover:bg-slate-800/70 transition block">
                  <div>
                    <p className="font-semibold text-slate-200">{c.title}</p>
                    <p className="text-slate-400">{c.messages.length} messages</p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-500" />
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
