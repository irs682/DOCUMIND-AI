import React, { useState, useCallback } from 'react';
import {
  Search,
  FileText,
  Check,
  X,
  FileUp,
  Loader2,
  CheckCircle2,
  Trash2,
  AlertTriangle,
} from 'lucide-react';

/**
 * DocumentPickerModal - Searchable document selector & quick upload
 * Now includes a per-row delete action with confirmation dialog.
 */
const DocumentPickerModal = ({
  isOpen,
  onClose,
  documents = [],
  selectedDocIds = [],
  onToggleDoc,
  onOpenUpload,
  onDeleteDoc,
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  // ── Delete confirmation state ──
  const [deleteTarget, setDeleteTarget] = useState(null);   // doc object to confirm
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteToast, setDeleteToast] = useState(null);     // { type: 'success' | 'error', msg }

  if (!isOpen) return null;

  const filteredDocs = documents.filter((doc) => {
    const name = (doc.name || doc.originalName || '').toLowerCase();
    return name.includes(searchQuery.toLowerCase());
  });

  // ── Handle delete request (opens confirmation) ──
  const handleDeleteClick = (e, doc) => {
    e.stopPropagation();
    e.preventDefault();
    setDeleteTarget(doc);
  };

  // ── Confirm permanent deletion ──
  const handleConfirmDelete = async () => {
    if (!deleteTarget || !onDeleteDoc) return;
    const docId = deleteTarget._id || deleteTarget.id;

    setIsDeleting(true);
    try {
      await onDeleteDoc(docId);
      setDeleteTarget(null);
      // Show success toast
      setDeleteToast({ type: 'success', msg: 'Document deleted' });
      setTimeout(() => setDeleteToast(null), 2500);
    } catch (err) {
      console.error('[DELETE] Failed:', err);
      setDeleteToast({ type: 'error', msg: 'Unable to delete document. Please try again.' });
      setTimeout(() => setDeleteToast(null), 3500);
      setDeleteTarget(null);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCancelDelete = () => {
    if (isDeleting) return;
    setDeleteTarget(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150 select-none">
      <div className="w-full max-w-lg rounded-3xl bg-white dark:bg-slate-900 p-5 shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[85vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
              <FileText size={18} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Attach Documents to Session</h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                RAG queries in this chat will prioritize selected files
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-600 dark:hover:text-slate-200 transition cursor-pointer"
          >
            <X size={17} />
          </button>
        </div>

        {/* Search Bar & Upload Action */}
        <div className="flex items-center gap-2 py-3">
          <label className="flex-1 flex items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-xs text-slate-500 dark:text-slate-400 focus-within:border-indigo-400 focus-within:bg-white dark:focus-within:bg-slate-800 focus-within:ring-2 focus-within:ring-indigo-100 dark:focus-within:ring-indigo-950/50 transition">
            <Search size={14} className="text-slate-400 dark:text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search uploaded files…"
              className="w-full bg-transparent text-xs text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 outline-none"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X size={13} />
              </button>
            )}
          </label>

          <button
            type="button"
            onClick={() => {
              onClose();
              if (onOpenUpload) onOpenUpload();
            }}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 dark:hover:bg-indigo-500 transition shadow-xs cursor-pointer shrink-0"
          >
            <FileUp size={14} />
            <span>Upload New</span>
          </button>
        </div>

        {/* Document List */}
        <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 py-1 select-text">
          {filteredDocs.length === 0 ? (
            <div className="text-center py-10 text-slate-400 dark:text-slate-500 text-xs">
              {searchQuery ? 'No documents match your search.' : 'No uploaded files found.'}
            </div>
          ) : (
            filteredDocs.map((doc) => {
              const docId = doc._id || doc.id;
              const isSelected = selectedDocIds.includes(docId);
              const isReady = ['indexed', 'completed', 'ready'].includes(doc.status);

              return (
                <div
                  key={docId}
                  onClick={() => onToggleDoc(docId)}
                  className={`group/row flex items-center justify-between p-3 rounded-2xl border transition cursor-pointer select-none ${
                    isSelected
                      ? 'border-indigo-300 dark:border-indigo-500/60 bg-indigo-50/60 dark:bg-indigo-950/40 shadow-2xs'
                      : 'border-slate-200/80 dark:border-slate-750 bg-white dark:bg-slate-850 hover:border-slate-300 dark:hover:border-slate-650 hover:bg-slate-50/50 dark:hover:bg-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0 pr-2">
                    <div
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl font-bold text-xs ${
                        isSelected
                          ? 'bg-indigo-600 text-white'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                      }`}
                    >
                      <FileText size={15} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-900 dark:text-white truncate" title={doc.name || doc.originalName}>
                        {doc.name || doc.originalName}
                      </p>
                      <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
                        {doc.fileSize ? `${(doc.fileSize / 1024).toFixed(0)} KB • ` : ''}
                        {isReady ? (
                          <span className="text-emerald-600 dark:text-emerald-400 font-medium">Ready</span>
                        ) : (
                          <span>{doc.status || 'Ready'}</span>
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {/* ── Trash / Delete Button ── */}
                    {onDeleteDoc && (
                      <button
                        type="button"
                        aria-label="Delete document"
                        title="Delete document"
                        onClick={(e) => handleDeleteClick(e, doc)}
                        className="rounded-lg p-1.5 text-slate-300 dark:text-slate-600 sm:opacity-0 group-hover/row:opacity-100 focus:opacity-100 hover:bg-rose-50 dark:hover:bg-rose-950/40 hover:text-rose-500 dark:hover:text-rose-400 focus:bg-rose-50 focus:text-rose-500 transition-all duration-150 cursor-pointer"
                        style={{ touchAction: 'manipulation' }}
                        tabIndex={0}
                      >
                        <Trash2 size={14} />
                      </button>
                    )}

                    {/* ── Selection Checkbox ── */}
                    <div
                      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-lg border transition ${
                        isSelected
                          ? 'border-indigo-600 bg-indigo-600 text-white'
                          : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800'
                      }`}
                    >
                      {isSelected && <Check size={12} strokeWidth={3} />}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Toast */}
        {deleteToast && (
          <div
            className={`mx-auto mb-2 flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold shadow-lg animate-in slide-in-from-bottom-2 duration-200 ${
              deleteToast.type === 'success'
                ? 'bg-emerald-600 text-white'
                : 'bg-rose-600 text-white'
            }`}
          >
            {deleteToast.type === 'success' ? <CheckCircle2 size={14} /> : <AlertTriangle size={14} />}
            {deleteToast.msg}
          </div>
        )}

        {/* Modal Footer */}
        <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800 pt-3 mt-2">
          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
            {selectedDocIds.length} document{selectedDocIds.length === 1 ? '' : 's'} attached
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-900 dark:bg-indigo-600 text-white text-xs font-bold hover:bg-slate-800 dark:hover:bg-indigo-500 transition cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>

      {/* ── Confirmation Dialog Overlay ── */}
      {deleteTarget && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-100"
          onClick={handleCancelDelete}
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-white dark:bg-slate-900 p-5 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4 animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Dialog Header */}
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-500 dark:text-rose-400">
                <AlertTriangle size={20} />
              </div>
              <div className="min-w-0">
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">Delete document?</h4>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 break-words leading-relaxed">
                  <span className="font-semibold text-slate-700 dark:text-slate-200">
                    {deleteTarget.name || deleteTarget.originalName}
                  </span>
                </p>
                <p className="mt-2 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  This will remove the document from your library and delete its processed search data.
                  This action cannot be undone.
                </p>
              </div>
            </div>

            {/* Dialog Actions */}
            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={handleCancelDelete}
                disabled={isDeleting}
                className="px-3.5 py-2 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 transition cursor-pointer disabled:opacity-60 flex items-center gap-1.5"
              >
                {isDeleting ? (
                  <>
                    <Loader2 size={13} className="animate-spin" />
                    Deleting…
                  </>
                ) : (
                  <>
                    <Trash2 size={13} />
                    Delete
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default React.memo(DocumentPickerModal);
