import React, { useState } from 'react';
import { Citation } from '../types';
import { FileText, Table, Image as ImageIcon, ChevronDown, ChevronUp } from 'lucide-react';

export const CitationCard: React.FC<{ citation: Citation }> = ({ citation }) => {
  const [expanded, setExpanded] = useState(false);

  const getBadgeClass = (type: string) => {
    switch (type.toLowerCase()) {
      case 'table':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'image':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      default:
        return 'bg-sky-500/10 text-sky-400 border-sky-500/20';
    }
  };

  const Icon = citation.type === 'table' ? Table : citation.type === 'image' ? ImageIcon : FileText;

  return (
    <div className="rounded-xl border border-slate-700/50 bg-slate-800/40 p-3 space-y-2 text-xs">
      <div
        className="flex items-center justify-between cursor-pointer select-none"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center space-x-2">
          <span className={`px-2 py-0.5 rounded-full border text-[10px] font-semibold uppercase flex items-center gap-1 ${getBadgeClass(citation.type)}`}>
            <Icon className="w-3 h-3" />
            {citation.type}
          </span>
          <span className="font-semibold text-slate-200">{citation.source}</span>
          <span className="text-slate-400">Page {citation.page}</span>
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-slate-400 font-mono">Score: {citation.relevance_score.toFixed(3)}</span>
          {expanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
        </div>
      </div>

      {expanded && (
        <div className="pt-2 border-t border-slate-700/40 space-y-2 text-slate-300">
          <p className="italic bg-slate-900/60 p-2.5 rounded-lg font-mono leading-relaxed">
            "{citation.content}"
          </p>
          {citation.image_path && (
            <div className="mt-2">
              <p className="text-[10px] text-slate-400 mb-1">Extracted Image Evidence:</p>
              <img
                src={citation.image_path.replace(/^.*[\/\\]data[\/\\]/, '/data/')}
                alt={`Evidence from Page ${citation.page}`}
                className="max-h-48 rounded-lg border border-slate-700 object-contain bg-slate-950"
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
};
