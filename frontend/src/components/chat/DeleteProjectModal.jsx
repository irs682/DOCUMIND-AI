import React, { useState } from 'react';
import { AlertTriangle, X, ShieldCheck } from 'lucide-react';

const DeleteProjectModal = ({
  isOpen,
  onClose,
  project,
  onConfirm,
  isDeleting = false,
}) => {
  const [deleteChats, setDeleteChats] = useState(false);

  if (!isOpen || !project) return null;

  const handleConfirm = () => {
    onConfirm(project._id, { deleteChats });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative w-full max-w-md rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-2xl animate-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5 text-rose-600 dark:text-rose-400 font-bold text-base">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-rose-50 dark:bg-rose-950/60">
              <AlertTriangle size={18} />
            </div>
            <span>Delete Project</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        <div className="mt-4">
          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            Are you sure you want to delete <span className="font-bold text-slate-900 dark:text-white">&ldquo;{project.name}&rdquo;</span>?
          </p>

          <div className="mt-4 space-y-2 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800/60 p-3.5 text-xs">
            <div className="font-bold text-slate-800 dark:text-slate-200 mb-2">What happens to project chats:</div>

            <label className="flex items-start gap-2.5 cursor-pointer p-2 rounded-xl hover:bg-white dark:hover:bg-slate-750 transition">
              <input
                type="radio"
                name="chatPolicy"
                checked={!deleteChats}
                onChange={() => setDeleteChats(false)}
                className="mt-0.5 text-indigo-600"
              />
              <div>
                <span className="font-semibold text-slate-800 dark:text-slate-200">Move chats to general history (Recommended)</span>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Preserves all messages and conversation history as standalone chats.
                </p>
              </div>
            </label>

            <label className="flex items-start gap-2.5 cursor-pointer p-2 rounded-xl hover:bg-white dark:hover:bg-slate-750 transition">
              <input
                type="radio"
                name="chatPolicy"
                checked={deleteChats}
                onChange={() => setDeleteChats(true)}
                className="mt-0.5 text-rose-600"
              />
              <div>
                <span className="font-semibold text-rose-700 dark:text-rose-400">Delete all chats in this project</span>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Permanently removes all conversations created within this workspace.
                </p>
              </div>
            </label>
          </div>

          <div className="mt-3.5 flex items-center gap-2 rounded-xl bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200/60 dark:border-emerald-800/60 p-2.5 text-xs text-emerald-800 dark:text-emerald-300">
            <ShieldCheck size={16} className="shrink-0 text-emerald-600 dark:text-emerald-400" />
            <span>Documents remain preserved in your document library and are never deleted.</span>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isDeleting}
            className="rounded-xl bg-rose-600 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-700 disabled:opacity-50 transition shadow-xs cursor-pointer"
          >
            {isDeleting ? 'Deleting...' : 'Delete Project'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeleteProjectModal;
