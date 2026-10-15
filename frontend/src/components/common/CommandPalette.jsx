import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Plus,
  FileText,
  Sparkles,
  BookOpen,
  GitCompare,
  Layers,
  Database,
  ArrowRight,
  ShieldCheck,
  Cpu,
  X,
  MessageSquare,
} from 'lucide-react';

const CommandPalette = ({ isOpen, onClose, onOpenNewProject }) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef(null);
  const navigate = useNavigate();

  const commands = [
    {
      id: 'search-papers',
      title: 'Search Academic Papers & Literature',
      category: 'Research Discovery',
      icon: Search,
      action: () => {
        onClose();
        navigate('/documents');
      },
    },
    {
      id: 'open-project',
      title: 'Open Active Study: MERA-VLA',
      category: 'Projects',
      icon: Sparkles,
      action: () => {
        onClose();
        navigate('/research');
      },
    },
    {
      id: 'new-project',
      title: 'Create New Research Project',
      category: 'Projects',
      icon: Plus,
      action: () => {
        onClose();
        if (onOpenNewProject) onOpenNewProject();
      },
    },
    {
      id: 'upload-doc',
      title: 'Upload Papers & Datasets',
      category: 'Document Tools',
      icon: FileText,
      action: () => {
        onClose();
        navigate('/documents');
      },
    },
    {
      id: 'run-audit',
      title: 'Run 19D Scholarly Quality Audit',
      category: 'Integrity Gates',
      icon: ShieldCheck,
      action: () => {
        onClose();
        navigate('/research?action=audit');
      },
    },
    {
      id: 'gen-manuscript',
      title: 'Generate Academic Manuscript Draft',
      category: 'Manuscript Studio',
      icon: BookOpen,
      action: () => {
        onClose();
        navigate('/research?step=11');
      },
    },
    {
      id: 'export-pdf',
      title: 'Export Camera-Ready PDF & LaTeX',
      category: 'Manuscript Studio',
      icon: Layers,
      action: () => {
        onClose();
        navigate('/research?step=11&action=export');
      },
    },
    {
      id: 'figures-eqs',
      title: 'Open Figure 3 & Equation Manager',
      category: 'Figures & Math',
      icon: Cpu,
      action: () => {
        onClose();
        navigate('/research?step=11&tab=figures');
      },
    },
    {
      id: 'compare-docs',
      title: 'Compare Academic Papers',
      category: 'Intelligence',
      icon: GitCompare,
      action: () => {
        onClose();
        navigate('/compare');
      },
    },
    {
      id: 'ai-chat',
      title: 'DOCUMIND Research Copilot Chat',
      category: 'Intelligence',
      icon: MessageSquare,
      action: () => {
        onClose();
        navigate('/chat');
      },
    },
    {
      id: 'knowledge-bases',
      title: 'Browse Vector Knowledge Bases',
      category: 'Knowledge Graph',
      icon: Database,
      action: () => {
        onClose();
        navigate('/knowledge-bases');
      },
    },
  ];

  const filteredCommands = commands.filter((cmd) =>
    cmd.title.toLowerCase().includes(query.toLowerCase()) ||
    cmd.category.toLowerCase().includes(query.toLowerCase())
  );

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!isOpen) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % (filteredCommands.length || 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev === 0 ? (filteredCommands.length || 1) - 1 : prev - 1
        );
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filteredCommands[selectedIndex]) {
          filteredCommands[selectedIndex].action();
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, filteredCommands, selectedIndex, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Palette Modal */}
      <div className="relative w-full max-w-xl rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden animate-scale-in">
        {/* Search Input Bar */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-slate-100 dark:border-slate-800">
          <Search size={18} className="text-slate-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            placeholder="Type a command, project, or search documents..."
            className="w-full bg-transparent text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none"
          />
          <kbd className="hidden sm:inline-flex items-center px-2 py-0.5 text-[10px] font-mono text-slate-400 bg-slate-100 dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700">
            ESC
          </kbd>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 sm:hidden"
          >
            <X size={16} />
          </button>
        </div>

        {/* Command list */}
        <div className="max-h-80 overflow-y-auto p-2 space-y-1">
          {filteredCommands.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-500 dark:text-slate-400">
              No matching actions found. Try typing &quot;research&quot;, &quot;upload&quot;, or &quot;compare&quot;.
            </div>
          ) : (
            filteredCommands.map((cmd, idx) => {
              const Icon = cmd.icon;
              const isSelected = idx === selectedIndex;
              return (
                <button
                  key={cmd.id}
                  onClick={cmd.action}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-left text-sm transition-colors ${
                    isSelected
                      ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-950 dark:text-indigo-200'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                        isSelected
                          ? 'bg-indigo-600 text-white'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                      }`}
                    >
                      <Icon size={16} />
                    </div>
                    <div>
                      <div className="font-medium text-xs sm:text-sm">{cmd.title}</div>
                      <div className="text-[10px] text-slate-400">{cmd.category}</div>
                    </div>
                  </div>
                  <ArrowRight
                    size={14}
                    className={`transition-opacity ${
                      isSelected ? 'opacity-100 text-indigo-600 dark:text-indigo-400' : 'opacity-0'
                    }`}
                  />
                </button>
              );
            })
          )}
        </div>

        {/* Bottom hints */}
        <div className="flex items-center justify-between px-4 py-2 bg-slate-50 dark:bg-slate-950 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-400">
          <div className="flex items-center gap-2">
            <span>↑↓ to navigate</span>
            <span>•</span>
            <span>↵ to select</span>
          </div>
          <span className="font-medium text-slate-500 dark:text-slate-400">DOCUMIND-AI Quick Actions</span>
        </div>
      </div>
    </div>
  );
};

export default CommandPalette;
