import React from 'react';

const RetrievalDetails = ({ similarityScore, chunkId, tokenCount, embeddingModel }) => {
  return (
    <div className="mt-3 rounded-xl border border-indigo-100 dark:border-indigo-900/50 bg-indigo-50/50 dark:bg-indigo-950/30 p-3 text-xs font-mono space-y-1.5 text-indigo-950 dark:text-indigo-200 animate-in fade-in duration-200">
      <div className="flex justify-between">
        <span className="text-slate-500 dark:text-slate-400">Chunk ID:</span>
        <span className="font-bold text-slate-800 dark:text-slate-200">{chunkId || 'chk-8472'}</span>
      </div>
      <div className="flex justify-between">
        <span className="text-slate-500 dark:text-slate-400">Cosine Distance Metric:</span>
        <span className="font-bold text-slate-800 dark:text-slate-200">{(1 - similarityScore).toFixed(4)}</span>
      </div>
      <div className="flex justify-between">
        <span className="text-slate-500 dark:text-slate-400">Token Count:</span>
        <span className="text-slate-800 dark:text-slate-200">{tokenCount || 240} tokens</span>
      </div>
      <div className="flex justify-between">
        <span className="text-slate-500 dark:text-slate-400">Embedding Engine:</span>
        <span className="text-slate-800 dark:text-slate-200">{embeddingModel || 'text-embedding-3-small'}</span>
      </div>
    </div>
  );
};

export default RetrievalDetails;
