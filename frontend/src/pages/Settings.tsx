import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { settingsAPI } from '../services/api';
import { Key, Server, Cpu, CheckCircle, AlertCircle, Save } from 'lucide-react';

export const Settings: React.FC = () => {
  const [groqKey, setGroqKey] = useState(localStorage.getItem('groq_api_key') || '');
  const [geminiKey, setGeminiKey] = useState(localStorage.getItem('gemini_api_key') || '');
  const [saved, setSaved] = useState(false);

  const { data: status } = useQuery({
    queryKey: ['systemStatus'],
    queryFn: settingsAPI.getStatus,
  });

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (groqKey) localStorage.setItem('groq_api_key', groqKey);
    else localStorage.removeItem('groq_api_key');

    if (geminiKey) localStorage.setItem('gemini_api_key', geminiKey);
    else localStorage.removeItem('gemini_api_key');

    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h2 className="font-heading font-bold text-2xl text-white">System Settings & BYOK API Keys</h2>
        <p className="text-xs text-slate-400">Configure free cloud generation providers and inspect system status</p>
      </div>

      {saved && (
        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium flex items-center gap-2">
          <CheckCircle className="w-4 h-4" /> API Keys saved securely in local session.
        </div>
      )}

      {/* BYOK Keys Card */}
      <div className="glass-panel p-6 rounded-2xl space-y-4">
        <h3 className="font-heading font-semibold text-lg text-white flex items-center gap-2">
          <Key className="w-5 h-5 text-brand-400" />
          Bring Your Own Key (BYOK)
        </h3>
        <p className="text-xs text-slate-400 leading-relaxed">
          Keys are stored in your client session and passed to requests on-demand. They are <b>never saved in plain text database logs or committed to code</b>.
        </p>

        <form onSubmit={handleSave} className="space-y-4 pt-2">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Groq API Key (Llama-3.1-8B)</label>
            <input
              type="password"
              value={groqKey}
              onChange={(e) => setGroqKey(e.target.value)}
              placeholder="gsk_..."
              className="w-full px-4 py-2.5 rounded-xl bg-slate-900/60 border border-slate-700/60 text-sm text-white focus:outline-none focus:border-brand-500"
            />
            <p className="text-[10px] text-slate-500 mt-1">Get free key at console.groq.com (100% Free)</p>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Google Gemini API Key (Gemini 1.5 Flash)</label>
            <input
              type="password"
              value={geminiKey}
              onChange={(e) => setGeminiKey(e.target.value)}
              placeholder="AIzaSy..."
              className="w-full px-4 py-2.5 rounded-xl bg-slate-900/60 border border-slate-700/60 text-sm text-white focus:outline-none focus:border-brand-500"
            />
            <p className="text-[10px] text-slate-500 mt-1">Get free key at aistudio.google.com (100% Free)</p>
          </div>

          <button
            type="submit"
            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-brand-600 to-indigo-500 text-white font-semibold text-xs shadow-lg shadow-indigo-500/20 hover:opacity-95 transition flex items-center space-x-2"
          >
            <Save className="w-4 h-4" />
            <span>Save Keys</span>
          </button>
        </form>
      </div>

      {/* System Engine Status */}
      <div className="glass-card p-6 rounded-2xl space-y-4">
        <h3 className="font-heading font-semibold text-lg text-white flex items-center gap-2">
          <Server className="w-5 h-5 text-indigo-400" />
          Engine & Vector DB Profile
        </h3>

        {status && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1">
              <span className="text-slate-400 uppercase text-[10px]">Tesseract OCR Engine</span>
              <p className="font-semibold text-slate-200 flex items-center gap-1.5">
                {status.tesseract_available ? (
                  <span className="text-emerald-400 flex items-center gap-1"><CheckCircle className="w-3.5 h-3.5" /> Installed & Active</span>
                ) : (
                  <span className="text-amber-400 flex items-center gap-1"><AlertCircle className="w-3.5 h-3.5" /> Fallback text mode</span>
                )}
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1">
              <span className="text-slate-400 uppercase text-[10px]">Vector Database Target</span>
              <p className="font-semibold text-indigo-300 font-mono">{status.qdrant_host} (Qdrant Vector DB)</p>
            </div>

            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1">
              <span className="text-slate-400 uppercase text-[10px]">Dense Embedding Model</span>
              <p className="font-semibold text-sky-300 font-mono">{status.embedding_model}</p>
            </div>

            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1">
              <span className="text-slate-400 uppercase text-[10px]">Local Offline Fallback Model</span>
              <p className="font-semibold text-emerald-300 font-mono">{status.local_llm_model}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
