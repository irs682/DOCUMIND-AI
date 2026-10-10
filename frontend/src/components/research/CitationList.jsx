import React from 'react';
import { BookOpen, FileText, CheckCircle2 } from 'lucide-react';
import Badge from '../common/Badge';

const CitationList = ({ citations = [] }) => {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-xs font-bold text-slate-700 uppercase tracking-wider">
        <BookOpen size={16} className="text-indigo-600" />
        <span>Cited Knowledge Sources ({citations.length})</span>
      </div>

      <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">
        {citations.map((cite, idx) => (
          <div key={idx} className="flex items-center justify-between p-3.5 hover:bg-slate-50 text-xs">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 font-bold">
                [{idx + 1}]
              </div>
              <div>
                <p className="font-bold text-slate-900">{cite.documentName}</p>
                <p className="text-[11px] text-slate-500">Page {cite.pageNumber || 1} • {cite.knowledgeBase || 'General'}</p>
              </div>
            </div>

            <Badge variant="emerald" icon={CheckCircle2}>
              {Math.round((cite.similarityScore || 0.9) * 100)}% match
            </Badge>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CitationList;
