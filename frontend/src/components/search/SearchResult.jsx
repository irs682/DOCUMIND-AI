import React, { useState } from 'react';
import { FileText, MessageSquare, ChevronRight, Layers, CheckCircle2 } from 'lucide-react';
import Badge from '../common/Badge';
import RetrievalDetails from './RetrievalDetails';

const SearchResult = ({ result, onAskAI }) => {
  const [showDetails, setShowDetails] = useState(false);

  const {
    documentName = 'Document.pdf',
    snippet = 'Sample snippet content extracted from vector retrieval.',
    similarityScore = 0.92,
    knowledgeBase = 'General',
    pageNumber = 1,
    chunkId = 'chk-102',
    tokenCount = 210,
  } = result || {};

  const scorePercentage = Math.round(similarityScore * 100);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs transition-all hover:border-indigo-300 hover:shadow-md space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 font-bold">
            <FileText size={20} />
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-900">{documentName}</h4>
            <p className="text-xs text-slate-500 font-medium">
              Page {pageNumber} • {knowledgeBase}
            </p>
          </div>
        </div>

        <Badge variant="emerald" icon={CheckCircle2}>
          {scorePercentage}% match
        </Badge>
      </div>

      {/* Snippet text */}
      <div className="rounded-xl bg-slate-50 p-3.5 border border-slate-100 text-xs text-slate-800 font-sans leading-relaxed">
        "{snippet}"
      </div>

      {/* Action buttons bar */}
      <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="text-slate-500 hover:text-indigo-600 font-medium transition"
        >
          {showDetails ? 'Hide Vector Details' : 'View Vector Details'}
        </button>

        {onAskAI && (
          <button
            onClick={() => onAskAI(result)}
            className="flex items-center gap-1.5 font-bold text-indigo-600 hover:text-indigo-700 transition"
          >
            <MessageSquare size={14} />
            Ask AI about this
          </button>
        )}
      </div>

      {/* Expandable vector retrieval detail inspection */}
      {showDetails && (
        <RetrievalDetails
          similarityScore={similarityScore}
          chunkId={chunkId}
          tokenCount={tokenCount}
          embeddingModel="text-embedding-3-small"
        />
      )}
    </div>
  );
};

export default SearchResult;
