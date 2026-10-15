import React, { useState, useEffect } from 'react';
import {
  X,
  FileText,
  ExternalLink,
  Layers,
  CheckCircle2,
  AlertCircle,
  FileUp,
  Brain,
  Trash2,
  Check,
  ChevronRight,
} from 'lucide-react';

/**
 * ContextPanel - Collapsible Right Panel
 * Tabs:
 * - 'sources': Shows retrieved passages and chunk matches for the latest response
 * - 'documents': Attached session documents, statuses, and quick management
 * - 'memory': Active memory facts with toggle and deletion
 */
const ContextPanel = ({
  isOpen,
  onClose,
  activeTab = 'sources',
  setActiveTab,
  sources = [],
  documents = [],
  sessionDocIds = [],
  onAttachDoc,
  onRemoveDoc,
  onOpenUpload,
  memories = [],
  memoryEnabled = true,
  onToggleMemory,
  onDeleteMemory,
  memoryLoading = false,
}) => {
  if (!isOpen) return null;

  return (
    <aside className="w-80 md:w-88 shrink-0 flex flex-col border-l border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm z-20 h-full animate-in slide-in-from-right duration-200 select-none">
      {/* Panel Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-1.5 p-0.5 rounded-xl bg-slate-100/90 dark:bg-slate-800 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveTab('sources')}
            className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
              activeTab === 'sources'
                ? 'bg-white dark:bg-slate-700 text-indigo-700 dark:text-indigo-300 shadow-xs font-bold'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            Sources ({sources.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('documents')}
            className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
              activeTab === 'documents'
                ? 'bg-white dark:bg-slate-700 text-indigo-700 dark:text-indigo-300 shadow-xs font-bold'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            Docs ({sessionDocIds.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('memory')}
            className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
              activeTab === 'memory'
                ? 'bg-white dark:bg-slate-700 text-purple-700 dark:text-purple-300 shadow-xs font-bold'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            Memory
          </button>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-600 dark:hover:text-slate-300 transition cursor-pointer"
          title="Close context panel"
        >
          <X size={16} />
        </button>
      </div>

      {/* Panel Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 text-slate-700 dark:text-slate-300 select-text">
        {/* ── 1. Sources Tab ──────────────────────────────────────────────── */}
        {activeTab === 'sources' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Retrieved Context Chunks
              </span>
              <span className="text-[11px] text-slate-400 dark:text-slate-500 font-medium">
                {sources.length} passage{sources.length === 1 ? '' : 's'}
              </span>
            </div>

            {sources.length === 0 ? (
              <div className="text-center py-12 px-4 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
                <Layers size={28} className="mx-auto text-slate-300 dark:text-slate-600 mb-2" />
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">No citations in this turn</p>
                <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1 max-w-xs mx-auto">
                  Ask a question about your uploaded files to see grounded source evidence.
                </p>
              </div>
            ) : (
              sources.map((src, i) => (
                <div
                  key={i}
                  className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/60 p-3.5 space-y-2 hover:border-indigo-200 dark:hover:border-indigo-500/40 hover:bg-white dark:hover:bg-slate-800 transition shadow-2xs group"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <FileText size={14} className="text-indigo-600 dark:text-indigo-400 shrink-0" />
                      <span className="text-xs font-bold text-slate-900 dark:text-white truncate" title={src.documentName}>
                        {src.documentName || 'Document Reference'}
                      </span>
                    </div>
                    {src.score != null && (
                      <span className="shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/60">
                        {(src.score * 100).toFixed(0)}% match
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 text-[10px] text-slate-400 dark:text-slate-500 font-medium">
                    {src.pageNumber && (
                      <span className="px-1.5 py-0.5 rounded bg-slate-200/60 dark:bg-slate-700/60 text-slate-700 dark:text-slate-300 font-mono">
                        Page {src.pageNumber}
                      </span>
                    )}
                    {src.chunkIndex != null && (
                      <span className="px-1.5 py-0.5 rounded bg-slate-200/60 dark:bg-slate-700/60 text-slate-700 dark:text-slate-300 font-mono">
                        Chunk #{src.chunkIndex}
                      </span>
                    )}
                    {src.section && (
                      <span className="truncate text-slate-500 dark:text-slate-400 font-sans">
                        • {src.section}
                      </span>
                    )}
                  </div>

                  {src.snippet && (
                    <p className="text-xs text-slate-600 dark:text-slate-300 italic leading-relaxed border-l-2 border-indigo-300 dark:border-indigo-500 pl-2.5 py-0.5 bg-white/70 dark:bg-slate-900/60 rounded-r-md">
                      "{src.snippet}"
                    </p>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {/* ── 2. Documents Tab ────────────────────────────────────────────── */}
        {activeTab === 'documents' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Session Documents
              </span>
              <button
                type="button"
                onClick={onOpenUpload}
                className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 cursor-pointer"
              >
                <FileUp size={12} /> Upload
              </button>
            </div>

            <div className="space-y-1.5">
              {documents.length === 0 ? (
                <div className="text-center py-10 px-4 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
                  <FileText size={28} className="mx-auto text-slate-300 dark:text-slate-600 mb-2" />
                  <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">No files uploaded</p>
                  <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">Upload files to attach to this chat session.</p>
                </div>
              ) : (
                documents.map((doc) => {
                  const docId = doc._id || doc.id;
                  const isAttached = sessionDocIds.includes(docId);
                  const isReady = ['indexed', 'completed', 'ready'].includes(doc.status);
                  const isProcessing = ['uploading', 'extracting', 'cleaning', 'splitting', 'embedding', 'indexing'].includes(doc.status);

                  return (
                    <div
                      key={docId}
                      className={`flex items-center justify-between p-2.5 rounded-xl border text-xs transition ${
                        isAttached
                          ? 'border-indigo-200 dark:border-indigo-800/60 bg-indigo-50/40 dark:bg-indigo-950/30 text-slate-900 dark:text-white'
                          : 'border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-850 text-slate-600 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-700'
                      }`}
                    >
                      <div className="min-w-0 flex-1 pr-2">
                        <div className="flex items-center gap-1.5 truncate font-semibold">
                          <FileText size={13} className={isAttached ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400 dark:text-slate-500'} />
                          <span className="truncate">{doc.name || doc.originalName}</span>
                        </div>
                        <div className="flex items-center gap-2 mt-0.5 text-[10px] text-slate-400 dark:text-slate-500">
                          {isProcessing ? (
                            <span className="text-amber-600 dark:text-amber-400 font-medium animate-pulse">Processing…</span>
                          ) : isReady ? (
                            <span className="text-emerald-600 dark:text-emerald-400 font-medium">Ready for RAG</span>
                          ) : (
                            <span className="text-slate-400 dark:text-slate-500">{doc.status || 'Ready'}</span>
                          )}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => (isAttached ? onRemoveDoc(docId) : onAttachDoc(docId))}
                        className={`text-[11px] font-bold px-2.5 py-1 rounded-lg transition cursor-pointer shrink-0 ${
                          isAttached
                            ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                        }`}
                      >
                        {isAttached ? 'Active' : '+ Add'}
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* ── 3. Memory Tab ───────────────────────────────────────────────── */}
        {activeTab === 'memory' && (
          <div className="space-y-4">
            <div className="p-3 rounded-2xl bg-purple-50/70 dark:bg-purple-950/30 border border-purple-100 dark:border-purple-900/50 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-purple-950 dark:text-purple-200 flex items-center gap-1.5">
                  <Brain size={14} className="text-purple-600 dark:text-purple-400" />
                  Personalization Engine
                </span>
                <button
                  type="button"
                  onClick={onToggleMemory}
                  disabled={memoryLoading}
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-md cursor-pointer transition ${
                    memoryEnabled
                      ? 'bg-purple-600 text-white'
                      : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  {memoryEnabled ? 'Enabled' : 'Paused'}
                </button>
              </div>
              <p className="text-[11px] text-purple-700 dark:text-purple-300 leading-relaxed">
                Global memory carries preferences and project facts across sessions automatically.
              </p>
            </div>

            <div className="space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block">
                Remembered Facts ({memories.length})
              </span>

              {memories.length === 0 ? (
                <p className="text-xs text-slate-400 dark:text-slate-500 italic py-4 text-center">
                  No durable facts stored yet.
                </p>
              ) : (
                memories.map((mem) => (
                  <div
                    key={mem._id}
                    className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/70 hover:border-purple-200 dark:hover:border-purple-800/60 transition text-xs space-y-1 group"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] uppercase tracking-wider font-mono font-bold px-1.5 py-0.5 rounded bg-purple-100 dark:bg-purple-950/60 text-purple-800 dark:text-purple-300">
                        {mem.type || 'fact'}
                      </span>
                      <button
                        type="button"
                        onClick={() => onDeleteMemory(mem._id)}
                        disabled={memoryLoading}
                        className="text-slate-300 dark:text-slate-600 hover:text-rose-600 dark:hover:text-rose-400 transition p-0.5 cursor-pointer"
                        title="Forget this memory"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                    <p className="text-slate-800 dark:text-slate-200 text-[11px] leading-relaxed">
                      {mem.content}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};

export default React.memo(ContextPanel);
