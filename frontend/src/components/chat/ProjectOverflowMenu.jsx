import React from 'react';
import {
  Plus,
  FilePlus,
  Pencil,
  Pin,
  Settings,
  Archive,
  ArchiveRestore,
  Trash2,
} from 'lucide-react';
import FloatingMenu from './FloatingMenu';

const ProjectOverflowMenu = ({
  isOpen,
  onClose,
  triggerRect,
  project,
  onNewChat,
  onAddFiles,
  onRename,
  onTogglePin,
  onOpenSettings,
  onToggleArchive,
  onDelete,
}) => {
  if (!project) return null;

  return (
    <FloatingMenu isOpen={isOpen} onClose={onClose} triggerRect={triggerRect} width="w-52">
      {/* New chat */}
      <button
        type="button"
        onClick={() => {
          onClose();
          onNewChat(project);
        }}
        className="flex w-full items-center gap-2 rounded-xl px-2.5 py-1.5 font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition cursor-pointer text-slate-700 dark:text-slate-200"
      >
        <Plus size={13} className="text-indigo-600 dark:text-indigo-400" />
        <span>New chat</span>
      </button>

      {/* Add files */}
      <button
        type="button"
        onClick={() => {
          onClose();
          onAddFiles(project);
        }}
        className="flex w-full items-center gap-2 rounded-xl px-2.5 py-1.5 font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition cursor-pointer text-slate-700 dark:text-slate-200"
      >
        <FilePlus size={13} className="text-slate-400 dark:text-slate-500" />
        <span>Add files</span>
      </button>

      {/* Rename */}
      <button
        type="button"
        onClick={() => {
          onClose();
          onRename(project);
        }}
        className="flex w-full items-center gap-2 rounded-xl px-2.5 py-1.5 font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition cursor-pointer text-slate-700 dark:text-slate-200"
      >
        <Pencil size={13} className="text-slate-400 dark:text-slate-500" />
        <span>Rename</span>
      </button>

      {/* Pin / Unpin */}
      <button
        type="button"
        onClick={() => {
          onClose();
          onTogglePin(project);
        }}
        className="flex w-full items-center gap-2 rounded-xl px-2.5 py-1.5 font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition cursor-pointer text-slate-700 dark:text-slate-200"
      >
        <Pin size={13} className={project.isPinned ? 'fill-amber-500 text-amber-500' : 'text-slate-400 dark:text-slate-500'} />
        <span>{project.isPinned ? 'Unpin project' : 'Pin project'}</span>
      </button>

      {/* Project settings */}
      <button
        type="button"
        onClick={() => {
          onClose();
          onOpenSettings(project);
        }}
        className="flex w-full items-center gap-2 rounded-xl px-2.5 py-1.5 font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition cursor-pointer text-slate-700 dark:text-slate-200"
      >
        <Settings size={13} className="text-slate-400 dark:text-slate-500" />
        <span>Project settings</span>
      </button>

      {/* Divider */}
      <div className="my-1 border-t border-slate-100 dark:border-slate-800" />

      {/* Archive / Restore */}
      <button
        type="button"
        onClick={() => {
          onClose();
          onToggleArchive(project);
        }}
        className="flex w-full items-center gap-2 rounded-xl px-2.5 py-1.5 font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition cursor-pointer text-slate-700 dark:text-slate-200"
      >
        {project.status === 'archived' ? (
          <>
            <ArchiveRestore size={13} className="text-slate-400 dark:text-slate-500" />
            <span>Restore project</span>
          </>
        ) : (
          <>
            <Archive size={13} className="text-slate-400 dark:text-slate-500" />
            <span>Archive project</span>
          </>
        )}
      </button>

      {/* Destructive: Delete */}
      <button
        type="button"
        onClick={() => {
          onClose();
          onDelete(project);
        }}
        className="flex w-full items-center gap-2 rounded-xl px-2.5 py-1.5 font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer"
      >
        <Trash2 size={13} />
        <span>Delete project</span>
      </button>
    </FloatingMenu>
  );
};

export default ProjectOverflowMenu;
