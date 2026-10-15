import React, { useState, useMemo } from 'react';
import {
  FileText,
  Layers,
  Trash2,
  Plus,
  Search,
  MoreVertical,
  Eye,
  RefreshCw,
  FolderMinus,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Upload,
  FolderPlus,
} from 'lucide-react';
import Badge from '../common/Badge';
import Button from '../common/Button';
import Input from '../common/Input';
import Modal from '../common/Modal';

const KnowledgeBaseDocuments = ({
  documents = [],
  kbName = 'Knowledge Base',
  onAddDocument,
  onRemoveDocument,
  onDeleteDocument,
  onReprocessDocument,
  onViewDocument,
  reprocessingDocId = null,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeMenuDocId, setActiveMenuDocId] = useState(null);
  const [errorDetailsDoc, setErrorDetailsDoc] = useState(null);

  const filteredDocuments = useMemo(() => {
    return documents.filter((doc) => {
      const name = doc.name || doc.originalName || '';
      return name.toLowerCase().includes(searchQuery.toLowerCase());
    });
  }, [documents, searchQuery]);

  const getStatusBadge = (doc) => {
    const status = doc.status || 'ready';
    const isReprocessing = reprocessingDocId === (doc._id || doc.id);

    if (isReprocessing) {
      return (
        <Badge variant="purple" icon={Loader2} className="animate-pulse">
          Reprocessing
        </Badge>
      );
    }

    switch (status) {
      case 'ready':
      case 'indexed':
        return (
          <Badge variant="emerald" icon={CheckCircle2}>
            Ready
          </Badge>
        );
      case 'processing':
      case 'validating':
      case 'extracting':
      case 'ocr_processing':
      case 'table_extraction':
      case 'embedding':
      case 'indexing':
        return (
          <Badge variant="purple" icon={Loader2} className="animate-pulse">
            Processing
          </Badge>
        );
      case 'uploaded':
        return <Badge variant="blue">Queued</Badge>;
      case 'failed':
      case 'extraction_failed':
      case 'index_failed':
      case 'validation_failed':
        return (
          <div className="flex items-center gap-1.5">
            <Badge variant="rose" icon={AlertCircle}>
              Failed
            </Badge>
            {onReprocessDocument && (
              <button
                type="button"
                onClick={() => onReprocessDocument(doc)}
                className="text-[11px] font-semibold text-purple-600 hover:text-purple-800 underline ml-1"
                title="Retry processing"
              >
                Retry
              </button>
            )}
            {doc.errorMessage && (
              <button
                type="button"
                onClick={() => setErrorDetailsDoc(doc)}
                className="text-[11px] font-semibold text-slate-500 hover:text-slate-800 underline"
                title="View error message"
              >
                View Error
              </button>
            )}
          </div>
        );
      default:
        return <Badge variant="slate">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-4">
      {/* Search and Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h4 className="text-base font-bold text-slate-900 dark:text-white">
            Documents
          </h4>
          <span className="rounded-full bg-purple-100 dark:bg-purple-950/50 px-2.5 py-0.5 text-xs font-semibold text-purple-700 dark:text-purple-300">
            {documents.length}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <div className="w-48 sm:w-64">
            <Input
              placeholder="Search documents..."
              leftIcon={Search}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {onAddDocument && (
            <Button
              variant="primary"
              size="sm"
              leftIcon={Plus}
              onClick={() => onAddDocument('upload')}
            >
              Add Documents
            </Button>
          )}
        </div>
      </div>

      {/* Main Documents Table or Empty State */}
      {documents.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-12 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 mb-4 shadow-xs">
            <FileText size={28} />
          </div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            No documents in this Knowledge Base
          </h3>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
            Add documents to start building a searchable knowledge collection for RAG queries and autonomous research.
          </p>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            {onAddDocument && (
              <>
                <Button
                  variant="primary"
                  leftIcon={Upload}
                  onClick={() => onAddDocument('upload')}
                >
                  Upload Documents
                </Button>
                <Button
                  variant="outline"
                  leftIcon={FolderPlus}
                  onClick={() => onAddDocument('existing')}
                >
                  Add Existing Documents
                </Button>
              </>
            )}
          </div>
        </div>
      ) : filteredDocuments.length === 0 ? (
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 text-center text-xs text-slate-500 dark:text-slate-400">
          No documents match "{searchQuery}".
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/60 font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                <tr>
                  <th className="px-5 py-3.5">Document</th>
                  <th className="px-4 py-3.5">Type</th>
                  <th className="px-4 py-3.5">Status</th>
                  <th className="px-4 py-3.5">Chunks / Vectors</th>
                  <th className="px-4 py-3.5">Added</th>
                  <th className="px-4 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                {filteredDocuments.map((doc) => {
                  const docId = doc._id || doc.id;
                  const docName = doc.name || doc.originalName || 'Untitled Document';
                  const docType = docName.split('.').pop()?.toUpperCase() || 'FILE';
                  const dateStr = doc.createdAt
                    ? new Date(doc.createdAt).toLocaleDateString()
                    : 'Today';
                  const chunksCount = doc.chunksCount || doc.vectorsCount || (doc.status === 'ready' || doc.status === 'indexed' ? '12+' : '—');
                  const isMenuOpen = activeMenuDocId === docId;

                  return (
                    <tr key={docId} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition">
                      {/* Document Name */}
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 shrink-0">
                            <FileText size={18} />
                          </div>
                          <div>
                            <p
                              onClick={() => onViewDocument && onViewDocument(doc)}
                              className="font-bold text-slate-900 dark:text-white hover:text-purple-600 dark:hover:text-purple-400 transition cursor-pointer max-w-xs sm:max-w-md truncate"
                            >
                              {docName}
                            </p>
                            <span className="text-[11px] text-slate-400 dark:text-slate-500">
                              {doc.formattedSize || `${((doc.size || 0) / 1024).toFixed(1)} KB`}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Type */}
                      <td className="px-4 py-3.5">
                        <Badge variant="slate" className="font-mono text-[10px]">
                          {docType}
                        </Badge>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3.5">{getStatusBadge(doc)}</td>

                      {/* Chunks / Vectors */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-1.5 font-medium text-slate-800 dark:text-slate-200">
                          <Layers size={13} className="text-purple-500 dark:text-purple-400" />
                          <span>{chunksCount}</span>
                        </div>
                      </td>

                      {/* Added Date */}
                      <td className="px-4 py-3.5 text-slate-500 dark:text-slate-400">{dateStr}</td>

                      {/* Actions */}
                      <td className="px-4 py-3.5 text-right relative">
                        <button
                          type="button"
                          onClick={() => setActiveMenuDocId(isMenuOpen ? null : docId)}
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-200 transition"
                          title="Actions"
                        >
                          <MoreVertical size={16} />
                        </button>

                        {isMenuOpen && (
                          <div
                            onMouseLeave={() => setActiveMenuDocId(null)}
                            className="absolute right-4 top-10 z-20 w-52 rounded-xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 py-1.5 shadow-lg animate-in fade-in zoom-in-95 duration-100 text-left"
                          >
                            {onViewDocument && (
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveMenuDocId(null);
                                  onViewDocument(doc);
                                }}
                                className="flex w-full items-center gap-2 px-3.5 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
                              >
                                <Eye size={14} className="text-slate-500 dark:text-slate-400" />
                                View Document
                              </button>
                            )}

                            {onReprocessDocument && (
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveMenuDocId(null);
                                  onReprocessDocument(doc);
                                }}
                                className="flex w-full items-center gap-2 px-3.5 py-2 text-xs font-medium text-purple-700 dark:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-950/40"
                              >
                                <RefreshCw size={14} className="text-purple-600 dark:text-purple-400" />
                                Reprocess Document
                              </button>
                            )}

                            {onRemoveDocument && (
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveMenuDocId(null);
                                  onRemoveDocument(doc);
                                }}
                                className="flex w-full items-center gap-2 px-3.5 py-2 text-xs font-medium text-amber-700 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/40"
                              >
                                <FolderMinus size={14} className="text-amber-600 dark:text-amber-400" />
                                Remove from Knowledge Base
                              </button>
                            )}

                            {onDeleteDocument && (
                              <div className="border-t border-slate-100 dark:border-slate-800 mt-1 pt-1">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveMenuDocId(null);
                                    onDeleteDocument(doc);
                                  }}
                                  className="flex w-full items-center gap-2 px-3.5 py-2 text-xs font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                                >
                                  <Trash2 size={14} />
                                  Delete Document Permanently
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Error Details Modal */}
      {errorDetailsDoc && (
        <Modal
          isOpen={!!errorDetailsDoc}
          onClose={() => setErrorDetailsDoc(null)}
          title="Document Ingestion Error"
          subtitle={errorDetailsDoc.name}
          size="md"
        >
          <div className="space-y-4">
            <div className="rounded-xl border border-rose-200 dark:border-rose-900/50 bg-rose-50 dark:bg-rose-950/30 p-4 text-xs text-rose-800 dark:text-rose-300 font-mono whitespace-pre-wrap">
              {errorDetailsDoc.errorMessage || errorDetailsDoc.error_message || 'An unknown error occurred during indexing.'}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setErrorDetailsDoc(null)}>
                Close
              </Button>
              {onReprocessDocument && (
                <Button
                  variant="primary"
                  size="sm"
                  leftIcon={RefreshCw}
                  onClick={() => {
                    const d = errorDetailsDoc;
                    setErrorDetailsDoc(null);
                    onReprocessDocument(d);
                  }}
                >
                  Retry Processing
                </Button>
              )}
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default KnowledgeBaseDocuments;
