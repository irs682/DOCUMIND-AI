import React, { useState } from 'react';
import Modal from '../common/Modal';
import Badge from '../common/Badge';
import Button from '../common/Button';
import { FileText, Layers, Download, Database, RefreshCw, FileCode, CheckCircle2 } from 'lucide-react';

const DocumentPreview = ({ isOpen, onClose, document }) => {
  const [activeTab, setActiveTab] = useState('content');

  if (!document) return null;

  const mockChunks = [
    {
      id: 'chunk-1',
      index: 0,
      tokenCount: 240,
      content: 'DOCUMIND-AI provides automated document processing workflows using vector embeddings and Retrieval-Augmented Generation (RAG). Documents are parsed into semantic chunks to enable high-accuracy semantic retrieval.',
    },
    {
      id: 'chunk-2',
      index: 1,
      tokenCount: 310,
      content: 'Role-based access control (RBAC) ensures that vector search queries only return results from knowledge bases to which the requesting user has explicit read access.',
    },
    {
      id: 'chunk-3',
      index: 2,
      tokenCount: 185,
      content: 'The platform integrates with vector databases including Pinecone, Weaviate, and Milvus, using dense embeddings produced by OpenAI text-embedding-3-small.',
    },
  ];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={document.name} size="xl">
      <div className="space-y-6">
        {/* Header Metadata Banner */}
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl bg-slate-50 p-4 border border-slate-200">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-600 text-white font-bold">
              <FileText size={22} />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Document Details
              </p>
              <h4 className="text-sm font-bold text-slate-900">{document.name}</h4>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Badge variant="emerald" icon={CheckCircle2}>
              Indexed
            </Badge>
            <Badge variant="indigo">
              {document.knowledgeBase || 'General KB'}
            </Badge>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-200 gap-6">
          <button
            onClick={() => setActiveTab('content')}
            className={`pb-3 text-sm font-semibold transition border-b-2 ${
              activeTab === 'content'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            Parsed Content
          </button>
          <button
            onClick={() => setActiveTab('chunks')}
            className={`pb-3 text-sm font-semibold transition border-b-2 ${
              activeTab === 'chunks'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            Vector Chunks ({document.chunksCount || mockChunks.length})
          </button>
          <button
            onClick={() => setActiveTab('metadata')}
            className={`pb-3 text-sm font-semibold transition border-b-2 ${
              activeTab === 'metadata'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            Metadata Schema
          </button>
        </div>

        {/* Tab Contents */}
        {activeTab === 'content' && (
          <div className="rounded-xl border border-slate-200 bg-white p-4 font-mono text-xs text-slate-700 space-y-3 leading-relaxed max-h-72 overflow-y-auto">
            <p>
              {document.contentSummary ||
                'This document contains extracted text content parsed during the ingestion pipeline. It includes section headings, tables, embedded metadata, and semantic passages ready for vector indexing.'}
            </p>
            <p className="text-slate-500 italic">
              [End of preview. Full document contains {document.size || '1.2 MB'} of indexed content.]
            </p>
          </div>
        )}

        {activeTab === 'chunks' && (
          <div className="space-y-3 max-h-72 overflow-y-auto">
            {mockChunks.map((chunk) => (
              <div key={chunk.id} className="rounded-xl border border-slate-200 bg-slate-50/60 p-3.5 space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span className="font-semibold text-slate-700">Chunk #{chunk.index + 1}</span>
                  <span>{chunk.tokenCount} tokens</span>
                </div>
                <p className="text-xs text-slate-800 font-sans leading-relaxed">{chunk.content}</p>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'metadata' && (
          <div className="rounded-xl border border-slate-200 bg-slate-900 p-4 font-mono text-xs text-emerald-400 max-h-72 overflow-y-auto">
            <pre>{JSON.stringify({
              id: document.id,
              fileName: document.name,
              fileSize: document.size || '1.2 MB',
              uploadedAt: document.uploadedAt || '2026-08-07',
              embeddingModel: 'text-embedding-3-small',
              chunkStrategy: 'recursive-character',
              chunkSize: 512,
              overlap: 50,
              vectorDimension: 1536,
              knowledgeBase: document.knowledgeBase || 'General',
            }, null, 2)}</pre>
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex items-center justify-between border-t border-slate-100 pt-4">
          <Button variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" leftIcon={RefreshCw}>
              Re-Index Vectors
            </Button>
            <Button variant="primary" size="sm" leftIcon={Download}>
              Download Original
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default DocumentPreview;
