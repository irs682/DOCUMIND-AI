import React from 'react';
import {
  Pencil,
  Pin,
  FolderInput,
  FolderMinus,
  Archive,
  ArchiveRestore,
  Download,
  Trash2,
} from 'lucide-react';
import FloatingMenu from './FloatingMenu';

const ChatOverflowMenu = ({
  isOpen,
  onClose,
  triggerRect,
  chat,
  isProjectChat = false,
  onRename,
  onTogglePin,
  onMoveToProject,
  onRemoveFromProject,
  onToggleArchive,
  onExport,
  onDelete,
}) => {
  if (!chat) return null;

  return (
    <FloatingMenu isOpen={isOpen} onClose={onClose} triggerRect={triggerRect} width="w-48">
      {/* Rename */}
      <button
        type="button"
        onClick={() => {
          onClose();
          onRename(chat._id);
        }}
        className="flex w-full items-center gap-2 rounded-xl px-2.5 py-1.5 font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition cursor-pointer text-slate-700 dark:text-slate-200"
      >
        <Pencil size={13} className="text-slate-400 dark:text-slate-500" />
        <span>Rename</span>
      </button>

      {/* Pin / Unpin */}
      <button
        type="button"
        onClick={(e) => {
          onClose();
          onTogglePin(e, chat);
        }}
        className="flex w-full items-center gap-2 rounded-xl px-2.5 py-1.5 font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition cursor-pointer text-slate-700 dark:text-slate-200"
      >
        <Pin size={13} className={chat.isPinned ? 'fill-amber-500 text-amber-500' : 'text-slate-400 dark:text-slate-500'} />
        <span>{chat.isPinned ? 'Unpin chat' : 'Pin chat'}</span>
      </button>

      {/* Move to project */}
      <button
        type="button"
        onClick={() => {
          onClose();
          onMoveToProject(chat);
        }}
        className="flex w-full items-center gap-2 rounded-xl px-2.5 py-1.5 font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition cursor-pointer text-slate-700 dark:text-slate-200"
      >
        <FolderInput size={13} className="text-slate-400 dark:text-slate-500" />
        <span>{isProjectChat ? 'Move to another project' : 'Move to project'}</span>
      </button>

      {/* Remove from project (if already in a project) */}
      {isProjectChat && (
        <button
          type="button"
          onClick={() => {
            onClose();
            onRemoveFromProject(chat);
          }}
          className="flex w-full items-center gap-2 rounded-xl px-2.5 py-1.5 font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition cursor-pointer text-slate-700 dark:text-slate-200"
        >
          <FolderMinus size={13} className="text-slate-400 dark:text-slate-500" />
          <span>Remove from project</span>
        </button>
      )}

      {/* Archive / Restore */}
      <button
        type="button"
        onClick={(e) => {
          onClose();
          onToggleArchive(e, chat);
        }}
        className="flex w-full items-center gap-2 rounded-xl px-2.5 py-1.5 font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition cursor-pointer text-slate-700 dark:text-slate-200"
      >
        {chat.status === 'archived' ? (
          <>
            <ArchiveRestore size={13} className="text-slate-400 dark:text-slate-500" />
            <span>Restore chat</span>
          </>
        ) : (
          <>
            <Archive size={13} className="text-slate-400 dark:text-slate-500" />
            <span>Archive chat</span>
          </>
        )}
      </button>

      {/* Export */}
      {onExport && (
        <button
          type="button"
          onClick={() => {
            onClose();
            onExport(chat);
          }}
          className="flex w-full items-center gap-2 rounded-xl px-2.5 py-1.5 font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition cursor-pointer text-slate-700 dark:text-slate-200"
        >
          <Download size={13} className="text-slate-400 dark:text-slate-500" />
          <span>Export conversation</span>
        </button>
      )}

      {/* Divider */}
      <div className="my-1 border-t border-slate-100 dark:border-slate-800" />

      {/* Destructive: Delete */}
      <button
        type="button"
        onClick={() => {
          onClose();
          onDelete(chat._id);
        }}
        className="flex w-full items-center gap-2 rounded-xl px-2.5 py-1.5 font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer"
      >
        <Trash2 size={13} />
        <span>Delete chat</span>
      </button>
    </FloatingMenu>
  );
};

export default ChatOverflowMenu;
