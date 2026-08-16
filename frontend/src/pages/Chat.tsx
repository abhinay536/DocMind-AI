import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { documentAPI, chatAPI } from '../services/api';
import { CitationCard } from '../components/CitationCard';
import { Send, Bot, User as UserIcon, Clock, Sparkles, FileText } from 'lucide-react';

export const Chat: React.FC = () => {
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();

  const docParam = searchParams.get('doc');
  const convParam = searchParams.get('conv');

  const [selectedDocId, setSelectedDocId] = useState<number>(docParam ? parseInt(docParam) : 0);
  const [activeConvId, setActiveConvId] = useState<number | undefined>(convParam ? parseInt(convParam) : undefined);
  const [question, setQuestion] = useState('');
  const [selectedEngine, setSelectedEngine] = useState('Local FLAN-T5 (CPU Offline)');

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: documents = [] } = useQuery({
    queryKey: ['documents'],
    queryFn: documentAPI.list,
  });

  const readyDocs = documents.filter((d) => d.status === 'READY');

  useEffect(() => {
    if (!selectedDocId && readyDocs.length > 0) {
      setSelectedDocId(readyDocs[0].id);
    }
  }, [readyDocs, selectedDocId]);

  const { data: activeConv } = useQuery({
    queryKey: ['conversation', activeConvId],
    queryFn: () => (activeConvId ? chatAPI.getConversation(activeConvId) : null),
    enabled: !!activeConvId,
  });

  const queryMutation = useMutation({
    mutationFn: chatAPI.query,
    onSuccess: (res) => {
      setActiveConvId(res.conversation_id);
      queryClient.invalidateQueries({ queryKey: ['conversation', res.conversation_id] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      setQuestion('');
    },
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeConv, queryMutation.isPending]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim() || !selectedDocId) return;

    queryMutation.mutate({
      document_id: selectedDocId,
      question: question.trim(),
      conversation_id: activeConvId,
      engine: selectedEngine,
      groq_api_key: localStorage.getItem('groq_api_key') || undefined,
      gemini_api_key: localStorage.getItem('gemini_api_key') || undefined,
    });
  };

  const selectedDoc = documents.find((d) => d.id === selectedDocId);

  return (
    <div className="h-[calc(100vh-6rem)] max-w-7xl mx-auto flex flex-col space-y-4">
      {/* Top Selector Controls */}
      <div className="glass-panel p-4 rounded-2xl flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <FileText className="w-5 h-5 text-brand-400" />
          <select
            value={selectedDocId}
            onChange={(e) => {
              setSelectedDocId(parseInt(e.target.value));
              setActiveConvId(undefined);
            }}
            className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-brand-500"
          >
            <option value={0}>Select Document...</option>
            {readyDocs.map((d) => (
              <option key={d.id} value={d.id}>
                {d.filename} ({d.total_chunks} chunks)
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center space-x-3">
          <Sparkles className="w-4 h-4 text-indigo-400" />
          <select
            value={selectedEngine}
            onChange={(e) => setSelectedEngine(e.target.value)}
            className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-brand-500"
          >
            <option value="Local FLAN-T5 (CPU Offline)">Local FLAN-T5 (CPU Offline)</option>
            <option value="Groq Llama-3.1-8B (Free Cloud API)">Groq Llama-3.1-8B (Free Cloud API)</option>
            <option value="Google Gemini 1.5 Flash (Free Cloud API)">Google Gemini 1.5 Flash (Free Cloud API)</option>
          </select>
        </div>
      </div>

      {/* Chat Messages Workspace */}
      <div className="flex-1 glass-panel rounded-2xl p-6 overflow-y-auto space-y-6">
        {!selectedDoc ? (
          <div className="h-full flex items-center justify-center text-center text-slate-400 text-sm">
            Please select an uploaded document to begin Q&A.
          </div>
        ) : !activeConv || activeConv.messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center space-y-3">
            <div className="p-4 rounded-2xl bg-brand-600/20 text-brand-400 border border-brand-500/30">
              <Bot className="w-8 h-8" />
            </div>
            <h3 className="font-heading font-bold text-lg text-white">Ask Anything About {selectedDoc.filename}</h3>
            <p className="text-xs text-slate-400 max-w-md">
              Ask about text content, specific table numbers, or figure OCR charts. Hybrid retrieval selects the exact evidence passages.
            </p>
          </div>
        ) : (
          activeConv.messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex items-start space-x-3 ${msg.role === 'user' ? 'flex-row-reverse space-x-reverse' : ''}`}
            >
              <div
                className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 text-white shadow-md ${
                  msg.role === 'user' ? 'bg-indigo-600' : 'bg-brand-600'
                }`}
              >
                {msg.role === 'user' ? <UserIcon className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
              </div>

              <div className={`space-y-2 max-w-3xl ${msg.role === 'user' ? 'text-right' : ''}`}>
                {msg.intent && (
                  <span className="inline-block px-2.5 py-0.5 rounded-full bg-brand-500/10 border border-brand-500/20 text-brand-300 text-[10px] font-semibold">
                    {msg.intent}
                  </span>
                )}
                {msg.telemetry && (
                  <span className="inline-block ml-2 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-mono">
                    {msg.telemetry}
                  </span>
                )}

                <div
                  className={`p-4 rounded-2xl text-sm leading-relaxed text-slate-100 ${
                    msg.role === 'user'
                      ? 'bg-gradient-to-r from-brand-600 to-indigo-600 text-white shadow-lg'
                      : 'bg-slate-900/80 border border-slate-700/60'
                  }`}
                >
                  {msg.content}
                </div>

                {/* Citations Expander */}
                {msg.citations && msg.citations.length > 0 && (
                  <div className="space-y-2 pt-2">
                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider text-left">
                      Verified Document Evidence & Citations:
                    </p>
                    <div className="space-y-2 text-left">
                      {msg.citations.map((c, i) => (
                        <CitationCard key={i} citation={c} />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))
        )}

        {queryMutation.isPending && (
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-xl bg-brand-600 flex items-center justify-center text-white animate-pulse">
              <Bot className="w-4 h-4" />
            </div>
            <div className="p-3 rounded-2xl bg-slate-900/80 border border-slate-700/60 text-xs text-slate-400 flex items-center space-x-2">
              <Clock className="w-4 h-4 animate-spin text-brand-400" />
              <span>Executing Hybrid Retrieval (Qdrant + BM25 + RRF + Re-Ranker)...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Box */}
      <form onSubmit={handleSend} className="glass-panel p-2.5 rounded-2xl flex items-center space-x-2">
        <input
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          disabled={!selectedDocId || queryMutation.isPending}
          placeholder={selectedDocId ? `Ask any question about ${selectedDoc?.filename}...` : 'Select a document to ask questions...'}
          className="flex-1 bg-transparent px-4 py-2 text-sm text-white placeholder-slate-400 focus:outline-none"
        />
        <button
          type="submit"
          disabled={!selectedDocId || !question.trim() || queryMutation.isPending}
          className="p-3 rounded-xl bg-gradient-to-r from-brand-600 to-indigo-500 text-white disabled:opacity-40 hover:opacity-95 transition"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
};
