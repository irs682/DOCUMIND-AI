import React from 'react';

const RetrievalDetails = ({ similarityScore, chunkId, tokenCount, embeddingModel }) => {
  return (
    <div className="mt-3 rounded-xl border border-indigo-100 bg-indigo-50/50 p-3 text-xs font-mono space-y-1.5 text-indigo-950 animate-in fade-in duration-200">
      <div className="flex justify-between">
        <span className="text-slate-500">Chunk ID:</span>
        <span className="font-bold">{chunkId || 'chk-8472'}</span>
      </div>
      <div className="flex justify-between">
        <span className="text-slate-500">Cosine Distance Metric:</span>
        <span className="font-bold">{(1 - similarityScore).toFixed(4)}</span>
      </div>
      <div className="flex justify-between">
        <span className="text-slate-500">Token Count:</span>
        <span>{tokenCount || 240} tokens</span>
      </div>
      <div className="flex justify-between">
        <span className="text-slate-500">Embedding Engine:</span>
        <span>{embeddingModel || 'text-embedding-3-small'}</span>
      </div>
    </div>
  );
};

export default RetrievalDetails;
