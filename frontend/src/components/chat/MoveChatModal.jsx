import React, { useState } from 'react';
import { X, FolderInput, Folder, Check } from 'lucide-react';

const MoveChatModal = ({
  isOpen,
  onClose,
  chat,
  projects = [],
  onMove,
  isMoving = false,
}) => {
  const [selectedProjectId, setSelectedProjectId] = useState(
    chat?.projectId?._id || chat?.projectId || null
  );

  if (!isOpen || !chat) return null;

  const handleSave = () => {
    onMove(chat._id, selectedProjectId);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl animate-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2 text-slate-900 font-bold text-base">
            <FolderInput size={18} className="text-indigo-600" />
            <span>Move Conversation</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        <p className="mt-3 text-xs text-slate-500">
          Move &ldquo;<span className="font-semibold text-slate-700">{chat.title || 'New chat'}</span>&rdquo; to a project workspace or general history:
        </p>

        <div className="mt-4 max-h-60 overflow-y-auto space-y-1.5 pr-1">
          {/* General History / No Project option */}
          <button
            type="button"
            onClick={() => setSelectedProjectId(null)}
            className={`w-full flex items-center justify-between p-3 rounded-xl border text-left text-xs font-medium transition cursor-pointer ${
              selectedProjectId === null
                ? 'border-indigo-600 bg-indigo-50/60 text-indigo-900 ring-1 ring-indigo-500'
                : 'border-slate-200 bg-white hover:border-slate-300 text-slate-700'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <div className="h-6 w-6 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600">
                <Folder size={13} />
              </div>
              <div>
                <p className="font-semibold">General History</p>
                <p className="text-[11px] text-slate-400">Standalone chat without project context</p>
              </div>
            </div>
            {selectedProjectId === null && <Check size={16} className="text-indigo-600" />}
          </button>

          {/* User's active projects */}
          {projects
            .filter((p) => p.status !== 'archived')
            .map((proj) => {
              const isSelected = selectedProjectId === proj._id;
              return (
                <button
                  type="button"
                  key={proj._id}
                  onClick={() => setSelectedProjectId(proj._id)}
                  className={`w-full flex items-center justify-between p-3 rounded-xl border text-left text-xs font-medium transition cursor-pointer ${
                    isSelected
                      ? 'border-indigo-600 bg-indigo-50/60 text-indigo-900 ring-1 ring-indigo-500'
                      : 'border-slate-200 bg-white hover:border-slate-300 text-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className="h-6 w-6 rounded-lg flex items-center justify-center text-white text-[10px] font-bold shrink-0"
                      style={{ backgroundColor: proj.color || '#4f46e5' }}
                    >
                      {proj.name?.charAt(0)?.toUpperCase() || 'P'}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold truncate text-slate-900">{proj.name}</p>
                      <p className="text-[11px] text-slate-400 truncate">
                        {proj.description || `${proj.documentIds?.length || 0} files · ${proj.chatCount || 0} chats`}
                      </p>
                    </div>
                  </div>
                  {isSelected && <Check size={16} className="text-indigo-600 shrink-0 ml-2" />}
                </button>
              );
            })}
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
            onClick={handleSave}
            disabled={isMoving}
            className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-50 transition shadow-xs cursor-pointer"
          >
            {isMoving ? 'Moving...' : 'Move Chat'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default MoveChatModal;
