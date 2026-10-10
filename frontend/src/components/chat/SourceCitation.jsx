import React, { useState } from 'react';
import { FileText, ChevronDown, ChevronUp, CheckCircle2 } from 'lucide-react';
import Badge from '../common/Badge';

const SourceCitation = ({ citation }) => {
  const [expanded, setExpanded] = useState(false);

  const {
    documentName = '2026_Q2_Financial_Report.pdf',
    similarityScore,
    pageNumber,
    snippet = '',
    knowledgeBase = '',
  } = citation || {};

  const hasSimilarityScore = Number.isFinite(Number(similarityScore));
  const scorePercentage = hasSimilarityScore ? Math.round(Number(similarityScore) * 100) : null;
  const sourceMeta = [
    Number.isFinite(Number(pageNumber)) && Number(pageNumber) > 0 ? `Page ${pageNumber}` : null,
    knowledgeBase || null,
  ].filter(Boolean).join(' / ');

  return (
    <div className="rounded-xl border border-indigo-100 bg-indigo-50/40 p-3 transition hover:border-indigo-200">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 truncate">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-indigo-600 text-white font-bold text-xs">
            <FileText size={14} />
          </div>
          <span className="text-xs font-bold text-slate-900 truncate" title={documentName}>
            {documentName}
          </span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {hasSimilarityScore && (
            <Badge variant="emerald" icon={CheckCircle2}>
              {scorePercentage}% match
            </Badge>
          )}
          <button
            onClick={() => setExpanded(!expanded)}
            className="rounded p-1 text-slate-400 hover:bg-indigo-100 hover:text-slate-700"
          >
            {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        </div>
      </div>

      <div className="mt-2 text-xs text-slate-600 font-sans leading-relaxed">
        {snippet && (expanded ? (
          <p className="bg-white p-2.5 rounded-lg border border-indigo-100 shadow-2xs">
            "{snippet}"
          </p>
        ) : (
          <p className="line-clamp-2">"{snippet}"</p>
        ))}
      </div>

      {sourceMeta && (
        <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400 font-medium">
        <span>Page {pageNumber} • {knowledgeBase}</span>
      </div>
      )}
    </div>
  );
};

export default SourceCitation;
