import React from 'react';
import { AlertTriangle, X, FileText } from 'lucide-react';

const DeleteDocumentModal = ({
  isOpen,
  onClose,
  document: doc,
  onConfirm,
  isDeleting = false,
}) => {
  if (!isOpen || !doc) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-xs animate-in fade-in duration-150 select-none">
      <div className="relative w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl animate-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5 text-rose-600 font-bold text-base">
            <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-rose-50 text-rose-600">
              <AlertTriangle size={19} />
            </div>
            <span>Delete Document</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 cursor-pointer transition"
          >
            <X size={16} />
          </button>
        </div>

        <div className="mt-4 space-y-3">
          <p className="text-xs text-slate-600 leading-relaxed">
            Are you sure you want to permanently delete this document from your library?
          </p>

          <div className="flex items-center gap-2.5 p-3 rounded-2xl border border-rose-100 bg-rose-50/50 text-xs">
            <FileText size={16} className="text-rose-500 shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="font-bold text-slate-900 truncate" title={doc.name || doc.originalName}>
                {doc.name || doc.originalName}
              </p>
              <p className="text-[10px] text-slate-500">
                {doc.fileType?.toUpperCase() || 'DOCUMENT'} {doc.chunksCount ? `• ${doc.chunksCount} chunks` : ''}
              </p>
            </div>
          </div>

          <p className="text-[11px] text-slate-500 leading-relaxed">
            This action permanently deletes the file, extracted chunks, and vector index from Qdrant. Any attached chat sessions or projects will no longer have access to its context.
          </p>
        </div>

        <div className="mt-6 flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onConfirm(doc)}
            disabled={isDeleting}
            className="rounded-xl bg-rose-600 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-700 disabled:opacity-50 transition shadow-xs cursor-pointer"
          >
            {isDeleting ? 'Deleting…' : 'Delete Document'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeleteDocumentModal;
