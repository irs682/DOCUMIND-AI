import React, { useState } from 'react';
import {
  PanelLeft,
  Bot,
  Pin,
  Layers,
  Brain,
  MoreVertical,
  Pencil,
  Download,
  Archive,
  Trash2,
  ChevronDown,
} from 'lucide-react';

/**
 * ChatHeader - Clean, production-grade conversation header with session metadata and quick actions
 */
const ChatHeader = ({
  title = 'New Conversation',
  isPinned = false,
  status = 'active',
  sessionDocCount = 0,
  project = null,
  onViewProjectHome = null,
  onOpenSidebar,
  onRename,
  onTogglePin,
  onToggleArchive,
  onExport,
  onDelete,
  onToggleContextPanel,
  isContextPanelOpen = false,
  sourcesCount = 0,
  memoriesCount = 0,
}) => {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="flex items-center justify-between border-b border-slate-200/90 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 px-4 py-2.5 sm:px-5 backdrop-blur-xs select-none z-10">
      {/* Left: Sidebar toggle, AI icon, Title */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          type="button"
          onClick={onOpenSidebar}
          className="rounded-xl border border-slate-200 dark:border-slate-700 p-2 text-slate-500 dark:text-slate-400 hover:border-indigo-200 dark:hover:border-indigo-500/40 hover:bg-indigo-50 dark:hover:bg-slate-800 hover:text-indigo-600 dark:hover:text-indigo-400 md:hidden cursor-pointer"
          title="Open chat history"
        >
          <PanelLeft size={16} />
        </button>

        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-900 dark:bg-indigo-600 text-white shadow-xs shrink-0">
          <Bot size={17} />
        </div>

        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="text-sm font-bold text-slate-900 dark:text-white truncate max-w-[180px] sm:max-w-md" title={title}>
              {title}
            </h1>
            {isPinned && (
              <Pin size={12} className="fill-amber-500 text-amber-500 shrink-0" title="Pinned conversation" />
            )}
            {project && (
              <button
                type="button"
                onClick={onViewProjectHome}
                className="flex items-center gap-1 text-[11px] font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 px-2 py-0.5 rounded-md shrink-0 cursor-pointer transition"
                title="View project home"
              >
                <span
                  className="h-1.5 w-1.5 rounded-full"
                  style={{ backgroundColor: project.color || '#4f46e5' }}
                />
                <span className="max-w-[100px] truncate">{project.name}</span>
              </button>
            )}
            {status === 'archived' && (
              <span className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 px-1.5 py-0.2 rounded font-semibold shrink-0">
                Archived
              </span>
            )}
          </div>
          <p className="text-[11px] text-slate-400 dark:text-slate-500 truncate">
            {sessionDocCount > 0
              ? `${sessionDocCount} file${sessionDocCount === 1 ? '' : 's'} attached to session`
              : project
              ? `${project.documentIds?.length || 0} project documents available · ${project.instructions ? 'Instructions active' : 'Default behavior'}`
              : 'Grounded in all uploaded documents'}
          </p>
        </div>
      </div>

      {/* Right: Quick Context Panel trigger & Menu */}
      <div className="flex items-center gap-1.5">
        {/* Context / Sources toggle button */}
        <button
          type="button"
          onClick={onToggleContextPanel}
          className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer border ${
            isContextPanelOpen
              ? 'border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 shadow-2xs'
              : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600'
          }`}
          title="Toggle sources and context panel"
        >
          <Layers size={13} className="text-indigo-500 dark:text-indigo-400" />
          <span className="hidden sm:inline">Context</span>
          {sourcesCount > 0 && (
            <span className="rounded-full bg-indigo-100 dark:bg-indigo-950/60 px-1.5 py-0.2 text-[10px] font-bold text-indigo-700 dark:text-indigo-300">
              {sourcesCount}
            </span>
          )}
        </button>

        {/* Action Dropdown Menu */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setMenuOpen(!menuOpen)}
            className="rounded-xl border border-slate-200 dark:border-slate-700 p-1.5 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition cursor-pointer"
            title="Chat options"
          >
            <MoreVertical size={16} />
          </button>

          {menuOpen && (
            <>
              <div
                className="fixed inset-0 z-30"
                onClick={() => setMenuOpen(false)}
              />
              <div className="absolute right-0 mt-1 w-44 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-850 p-1.5 shadow-xl z-40 text-xs text-slate-700 dark:text-slate-200 space-y-0.5 animate-in fade-in zoom-in-95 duration-100">
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    onRename();
                  }}
                  className="w-full flex items-center gap-2 px-2.5 py-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition text-left cursor-pointer"
                >
                  <Pencil size={13} className="text-slate-400" />
                  <span>Rename</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    onTogglePin();
                  }}
                  className="w-full flex items-center gap-2 px-2.5 py-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition text-left cursor-pointer"
                >
                  <Pin size={13} className="text-slate-400" />
                  <span>{isPinned ? 'Unpin' : 'Pin to top'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    onToggleArchive();
                  }}
                  className="w-full flex items-center gap-2 px-2.5 py-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition text-left cursor-pointer"
                >
                  <Archive size={13} className="text-slate-400" />
                  <span>{status === 'archived' ? 'Restore to active' : 'Archive'}</span>
                </button>

                <div className="border-t border-slate-100 dark:border-slate-800 my-1" />

                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    onExport('md');
                  }}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition text-left cursor-pointer"
                >
                  <Download size={13} className="text-slate-400" />
                  <span>Export Markdown</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    onExport('txt');
                  }}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition text-left cursor-pointer"
                >
                  <Download size={13} className="text-slate-400" />
                  <span>Export Plain Text</span>
                </button>

                <div className="border-t border-slate-100 dark:border-slate-800 my-1" />

                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    onDelete();
                  }}
                  className="w-full flex items-center gap-2 px-2.5 py-2 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-950/30 text-rose-600 dark:text-rose-400 transition text-left cursor-pointer"
                >
                  <Trash2 size={13} />
                  <span>Delete Chat</span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
};

export default React.memo(ChatHeader);
