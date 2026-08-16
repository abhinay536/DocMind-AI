import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { documentAPI } from '../services/api';
import { FileText, Trash2, ExternalLink, RefreshCw } from 'lucide-react';

export const DocumentList: React.FC = () => {
  const queryClient = useQueryClient();

  const { data: documents = [], isLoading } = useQuery({
    queryKey: ['documents'],
    queryFn: documentAPI.list,
    refetchInterval: 3000,
  });

  const deleteMutation = useMutation({
    mutationFn: documentAPI.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
    },
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-heading font-bold text-2xl text-white">Document Management</h2>
          <p className="text-xs text-slate-400">View, inspect status, and delete parsed document collections</p>
        </div>
      </div>

      {isLoading ? (
        <div className="p-8 text-center text-slate-400 text-sm">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-brand-400" />
          Loading document repository...
        </div>
      ) : documents.length === 0 ? (
        <div className="glass-card p-12 text-center rounded-2xl space-y-3">
          <FileText className="w-10 h-10 text-slate-500 mx-auto" />
          <h3 className="font-heading font-semibold text-lg text-white">No Documents Uploaded</h3>
          <p className="text-xs text-slate-400">Upload a PDF from your Dashboard to begin processing.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {documents.map((doc) => (
            <div key={doc.id} className="glass-card p-5 rounded-2xl space-y-4 flex flex-col justify-between">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className={`px-2 py-0.5 rounded-full font-semibold uppercase text-[10px] ${
                    doc.status === 'READY' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                    doc.status === 'FAILED' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' :
                    'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                  }`}>
                    {doc.status}
                  </span>
                  <button
                    onClick={() => deleteMutation.mutate(doc.id)}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition"
                    title="Delete Document"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <h3 className="font-heading font-semibold text-slate-100 truncate">{doc.filename}</h3>
                <div className="grid grid-cols-3 gap-2 text-center text-xs pt-2">
                  <div className="bg-slate-900/60 p-2 rounded-lg border border-slate-800">
                    <p className="text-[10px] text-slate-400">Text</p>
                    <p className="font-bold text-sky-400">{doc.text_chunks}</p>
                  </div>
                  <div className="bg-slate-900/60 p-2 rounded-lg border border-slate-800">
                    <p className="text-[10px] text-slate-400">Tables</p>
                    <p className="font-bold text-emerald-400">{doc.table_chunks}</p>
                  </div>
                  <div className="bg-slate-900/60 p-2 rounded-lg border border-slate-800">
                    <p className="text-[10px] text-slate-400">OCR</p>
                    <p className="font-bold text-amber-400">{doc.image_chunks}</p>
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                <Link
                  to={`/documents/${doc.id}`}
                  className="text-xs text-brand-400 hover:underline flex items-center gap-1 font-medium"
                >
                  View Details <ExternalLink className="w-3 h-3" />
                </Link>
                {doc.status === 'READY' && (
                  <Link
                    to={`/chat?doc=${doc.id}`}
                    className="px-3 py-1 rounded-lg bg-brand-600/20 border border-brand-500/30 text-brand-300 text-xs font-semibold hover:bg-brand-600/40 transition"
                  >
                    Ask Questions
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
