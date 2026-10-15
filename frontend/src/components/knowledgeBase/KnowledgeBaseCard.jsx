import React, { useState, useRef, useEffect } from 'react';
import {
  Database,
  FileText,
  Lock,
  Globe,
  ArrowRight,
  Layers,
  MoreVertical,
  Edit,
  Trash2,
  Plus,
  FolderOpen,
} from 'lucide-react';
import Badge from '../common/Badge';

const KnowledgeBaseCard = ({
  knowledgeBase,
  onViewDetails,
  onAddDocuments,
  onEdit,
  onDelete,
}) => {
  const {
    _id,
    id,
    name = 'General KB',
    description = 'Central repository for organizational knowledge and documentation.',
    docCount = 0,
    vectorCount = 0,
    isPrivate = true,
    embeddingModel = 'text-embedding-3-small',
  } = knowledgeBase || {};

  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    };
    if (menuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [menuOpen]);

  return (
    <div className="group relative rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs transition-all hover:border-purple-300 dark:hover:border-purple-600 hover:shadow-md flex flex-col justify-between">
      <div>
        <div className="flex items-start justify-between gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 font-bold group-hover:bg-purple-600 group-hover:text-white transition-colors">
            <Database size={24} />
          </div>

          <div className="flex items-center gap-1.5">
            <Badge variant={isPrivate ? 'amber' : 'blue'} icon={isPrivate ? Lock : Globe}>
              {isPrivate ? 'Private' : 'Team Shared'}
            </Badge>

            {/* Actions Menu */}
            <div className="relative" ref={menuRef}>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setMenuOpen((prev) => !prev);
                }}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-600 dark:hover:text-slate-200 transition"
                title="Options"
              >
                <MoreVertical size={16} />
              </button>

              {menuOpen && (
                <div className="absolute right-0 top-7 z-20 w-48 rounded-xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 py-1.5 shadow-lg animate-in fade-in zoom-in-95 duration-100">
                  {onAddDocuments && (
                    <button
                      type="button"
                      onClick={() => {
                        setMenuOpen(false);
                        onAddDocuments(knowledgeBase);
                      }}
                      className="flex w-full items-center gap-2 px-3.5 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-purple-50 dark:hover:bg-purple-950/40 hover:text-purple-700 dark:hover:text-purple-300"
                    >
                      <Plus size={14} className="text-purple-600 dark:text-purple-400" />
                      Add Documents
                    </button>
                  )}

                  {onViewDetails && (
                    <button
                      type="button"
                      onClick={() => {
                        setMenuOpen(false);
                        onViewDetails(knowledgeBase);
                      }}
                      className="flex w-full items-center gap-2 px-3.5 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
                    >
                      <FolderOpen size={14} className="text-slate-500 dark:text-slate-400" />
                      Manage Documents
                    </button>
                  )}

                  {onEdit && (
                    <button
                      type="button"
                      onClick={() => {
                        setMenuOpen(false);
                        onEdit(knowledgeBase);
                      }}
                      className="flex w-full items-center gap-2 px-3.5 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
                    >
                      <Edit size={14} className="text-slate-500 dark:text-slate-400" />
                      Edit Knowledge Base
                    </button>
                  )}

                  {onDelete && (
                    <div className="border-t border-slate-100 dark:border-slate-800 mt-1 pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          setMenuOpen(false);
                          onDelete(knowledgeBase);
                        }}
                        className="flex w-full items-center gap-2 px-3.5 py-2 text-xs font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                      >
                        <Trash2 size={14} />
                        Delete Knowledge Base
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="mt-4">
          <h4
            onClick={() => onViewDetails && onViewDetails(knowledgeBase)}
            className="text-base font-bold text-slate-900 dark:text-white group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors cursor-pointer"
          >
            {name}
          </h4>
          <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
            {description}
          </p>
        </div>
      </div>

      <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 space-y-3.5">
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
            <FileText size={14} className="text-slate-400 dark:text-slate-500" />
            <span className="font-semibold text-slate-900 dark:text-white">{docCount}</span> docs
          </div>
          <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
            <Layers size={14} className="text-slate-400 dark:text-slate-500" />
            <span className="font-semibold text-purple-600 dark:text-purple-400">{vectorCount}</span> vectors
          </div>
        </div>

        <div className="flex items-center justify-between text-xs pt-1">
          <span className="text-[11px] text-slate-400 dark:text-slate-500 font-mono truncate max-w-[130px]" title={embeddingModel}>
            {embeddingModel}
          </span>

          <div className="flex items-center gap-2">
            {onAddDocuments && (
              <button
                type="button"
                onClick={() => onAddDocuments(knowledgeBase)}
                className="inline-flex items-center gap-1 rounded-lg border border-purple-200 dark:border-purple-800/60 bg-purple-50/70 dark:bg-purple-950/40 px-2.5 py-1 text-xs font-semibold text-purple-700 dark:text-purple-300 hover:bg-purple-100 dark:hover:bg-purple-900/50 transition"
              >
                <Plus size={12} />
                Add Documents
              </button>
            )}

            {onViewDetails && (
              <button
                type="button"
                onClick={() => onViewDetails(knowledgeBase)}
                className="inline-flex items-center gap-1 text-xs font-semibold text-purple-600 dark:text-purple-400 hover:text-purple-800 dark:hover:text-purple-300 transition"
              >
                Explore KB
                <ArrowRight size={13} />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default KnowledgeBaseCard;
