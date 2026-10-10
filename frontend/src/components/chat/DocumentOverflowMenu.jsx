import React from 'react';
import {
  ExternalLink,
  MessageSquarePlus,
  RotateCw,
  FolderMinus,
  Trash2,
  Sparkles,
} from 'lucide-react';
import FloatingMenu from './FloatingMenu';

const DocumentOverflowMenu = ({
  isOpen,
  onClose,
  triggerRect,
  doc,
  isProjectDoc = false,
  onOpenDoc,
  onUseInChat,
  onExtract,
  onReprocess,
  onRemoveFromProject,
  onDeleteDoc,
}) => {
  if (!doc) return null;
  const canExtract = ['ready', 'indexed'].includes(String(doc.status || '').toLowerCase());

  return (
    <FloatingMenu isOpen={isOpen} onClose={onClose} triggerRect={triggerRect} width="w-48">
      {/* Open */}
      {onOpenDoc && (
        <button
          type="button"
          onClick={() => {
            onClose();
            onOpenDoc(doc);
          }}
          className="flex w-full items-center gap-2 rounded-xl px-2.5 py-1.5 font-medium hover:bg-slate-50 transition cursor-pointer text-slate-700"
        >
          <ExternalLink size={13} className="text-slate-400" />
          <span>Open document</span>
        </button>
      )}

      {/* Use in chat */}
      {onUseInChat && (
        <button
          type="button"
          onClick={() => {
            onClose();
            onUseInChat(doc);
          }}
          className="flex w-full items-center gap-2 rounded-xl px-2.5 py-1.5 font-medium hover:bg-slate-50 transition cursor-pointer text-slate-700"
        >
          <MessageSquarePlus size={13} className="text-slate-400" />
          <span>Use in chat</span>
        </button>
      )}

      {onExtract && (
        <button
          type="button"
          disabled={!canExtract}
          onClick={() => {
            onClose();
            onExtract(doc);
          }}
          className="flex w-full items-center gap-2 rounded-xl px-2.5 py-1.5 font-medium hover:bg-indigo-50 transition cursor-pointer text-indigo-700 disabled:cursor-not-allowed disabled:opacity-45"
          title={canExtract ? 'Extract structured information' : 'Available when document processing is complete'}
        >
          <Sparkles size={13} className="text-indigo-500" />
          <span>Extract information</span>
        </button>
      )}

      {/* Reprocess */}
      {onReprocess && (
        <button
          type="button"
          onClick={() => {
            onClose();
            onReprocess(doc);
          }}
          className="flex w-full items-center gap-2 rounded-xl px-2.5 py-1.5 font-medium hover:bg-slate-50 transition cursor-pointer text-slate-700"
        >
          <RotateCw size={13} className="text-slate-400" />
          <span>Reprocess</span>
        </button>
      )}

      {/* Remove from project (only if in project) */}
      {isProjectDoc && onRemoveFromProject && (
        <>
          <div className="my-1 border-t border-slate-100" />
          <button
            type="button"
            onClick={() => {
              onClose();
              onRemoveFromProject(doc);
            }}
            className="flex w-full items-center gap-2 rounded-xl px-2.5 py-1.5 font-medium hover:bg-slate-50 transition cursor-pointer text-amber-700"
            title="Unlinks document from this project without deleting the file"
          >
            <FolderMinus size={13} className="text-amber-500" />
            <span>Remove from project</span>
          </button>
        </>
      )}

      {/* Divider */}
      <div className="my-1 border-t border-slate-100" />

      {/* Delete document from library */}
      {onDeleteDoc && (
        <button
          type="button"
          onClick={() => {
            onClose();
            onDeleteDoc(doc);
          }}
          className="flex w-full items-center gap-2 rounded-xl px-2.5 py-1.5 font-medium text-rose-600 hover:bg-rose-50 transition cursor-pointer"
        >
          <Trash2 size={13} />
          <span>Delete document</span>
        </button>
      )}
    </FloatingMenu>
  );
};

export default DocumentOverflowMenu;
