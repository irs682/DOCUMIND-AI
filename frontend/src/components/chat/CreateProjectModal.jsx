import React, { useState, useEffect } from 'react';
import { X, FolderKanban, Sparkles } from 'lucide-react';

const PROJECT_COLORS = [
  '#4f46e5', // Indigo
  '#0891b2', // Cyan
  '#059669', // Emerald
  '#d97706', // Amber
  '#db2777', // Pink
  '#7c3aed', // Purple
  '#ea580c', // Orange
  '#0284c7', // Sky
];

const CreateProjectModal = ({
  isOpen,
  onClose,
  onSubmit,
  initialData = null,
  isSaving = false,
}) => {
  const isEditing = Boolean(initialData?._id);

  const [form, setForm] = useState({
    name: '',
    description: '',
    instructions: '',
    color: PROJECT_COLORS[0],
    icon: 'folder',
  });

  useEffect(() => {
    if (initialData) {
      setForm({
        name: initialData.name || '',
        description: initialData.description || '',
        instructions: initialData.instructions || '',
        color: initialData.color || PROJECT_COLORS[0],
        icon: initialData.icon || 'folder',
      });
    } else {
      setForm({
        name: '',
        description: '',
        instructions: '',
        color: PROJECT_COLORS[0],
        icon: 'folder',
      });
    }
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    onSubmit({
      ...form,
      name: form.name.trim(),
      description: form.description.trim(),
      instructions: form.instructions.trim(),
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative w-full max-w-lg rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-2xl animate-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div
              className="flex h-8 w-8 items-center justify-center rounded-xl text-white shadow-xs font-bold text-sm"
              style={{ backgroundColor: form.color }}
            >
              <FolderKanban size={16} />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                {isEditing ? 'Project Settings' : 'Create New Project'}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {isEditing
                  ? 'Update workspace configuration and custom instructions'
                  : 'Organize files, conversations, and custom AI instructions'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          {/* Project Name */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              Project Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. INDUSTRIA-AI, PhD Research, Legal Review"
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900/50 transition"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              Description <span className="text-slate-400 font-normal">(optional)</span>
            </label>
            <input
              type="text"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Brief summary of what this project covers"
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900/50 transition"
            />
          </div>

          {/* Project Custom Instructions */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Sparkles size={13} className="text-indigo-600 dark:text-indigo-400" />
                <span>Project Instructions</span>
                <span className="text-slate-400 font-normal">(optional)</span>
              </label>
            </div>
            <textarea
              rows={4}
              value={form.instructions}
              onChange={(e) => setForm({ ...form, instructions: e.target.value })}
              placeholder="How should DOCUMIND respond inside this project?&#10;e.g. Prefer concise technical explanations. Cite document sections. Use academic terminology."
              className="w-full resize-none rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900/50 transition leading-relaxed"
            />
            <p className="mt-1 text-[11px] text-slate-400">
              Instructions apply exclusively to chats inside this project without affecting standalone conversations.
            </p>
          </div>

          {/* Color theme */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
              Color Accent
            </label>
            <div className="flex items-center gap-2.5">
              {PROJECT_COLORS.map((col) => (
                <button
                  type="button"
                  key={col}
                  onClick={() => setForm({ ...form, color: col })}
                  className={`h-6 w-6 rounded-full transition cursor-pointer ${
                    form.color === col
                      ? 'ring-2 ring-offset-2 ring-slate-800 dark:ring-offset-slate-900 dark:ring-slate-300 scale-110'
                      : 'hover:scale-105'
                  }`}
                  style={{ backgroundColor: col }}
                  aria-label={`Select color ${col}`}
                />
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="mt-6 flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving || !form.name.trim()}
              className="rounded-xl bg-slate-900 dark:bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 dark:hover:bg-indigo-500 disabled:opacity-50 transition shadow-xs cursor-pointer"
            >
              {isSaving ? 'Saving...' : isEditing ? 'Save Changes' : 'Create Project'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateProjectModal;
