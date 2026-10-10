import React, { useState, useEffect } from 'react';
import { X, FileText, Search, Check, FilePlus } from 'lucide-react';

const LinkProjectDocsModal = ({
  isOpen,
  onClose,
  project,
  allDocuments = [],
  onSave,
  isSaving = false,
}) => {
  const [selectedIds, setSelectedIds] = useState([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (project && project.documentIds) {
      setSelectedIds(
        project.documentIds.map((d) => (typeof d === 'string' ? d : d._id || d))
      );
    } else {
      setSelectedIds([]);
    }
  }, [project, isOpen]);

  if (!isOpen || !project) return null;

  const toggleDoc = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((d) => d !== id) : [...prev, id]
    );
  };

  const filteredDocs = allDocuments.filter((doc) =>
    (doc.name || doc.originalName || '').toLowerCase().includes(search.toLowerCase())
  );

  const handleSave = () => {
    onSave(project._id, selectedIds);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl animate-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div
              className="flex h-8 w-8 items-center justify-center rounded-xl text-white shadow-xs font-bold text-sm"
              style={{ backgroundColor: project.color || '#4f46e5' }}
            >
              <FilePlus size={16} />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Project Documents
              </h2>
              <p className="text-xs text-slate-500">
                Select documents from your library to attach to &ldquo;{project.name}&rdquo;
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Search */}
        <div className="mt-4 flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs">
          <Search size={14} className="text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search documents..."
            className="w-full bg-transparent outline-none placeholder:text-slate-400 text-slate-800"
          />
        </div>

        {/* Document list */}
        <div className="mt-3 max-h-64 overflow-y-auto space-y-1.5 pr-1">
          {filteredDocs.map((doc) => {
            const isSelected = selectedIds.includes(doc._id);
            return (
              <div
                key={doc._id}
                onClick={() => toggleDoc(doc._id)}
                className={`flex items-center justify-between p-2.5 rounded-xl border text-xs cursor-pointer transition ${
                  isSelected
                    ? 'border-indigo-500 bg-indigo-50/60 ring-1 ring-indigo-400 text-indigo-950 font-medium'
                    : 'border-slate-200 bg-white hover:border-slate-300 text-slate-700'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <FileText
                    size={15}
                    className={isSelected ? 'text-indigo-600 shrink-0' : 'text-slate-400 shrink-0'}
                  />
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{doc.name || doc.originalName}</p>
                    <p className="text-[10px] text-slate-400">
                      {doc.fileType?.toUpperCase() || 'DOCUMENT'} · {doc.status || 'ready'}
                    </p>
                  </div>
                </div>
                <div
                  className={`h-5 w-5 rounded-md flex items-center justify-center border transition shrink-0 ml-2 ${
                    isSelected
                      ? 'border-indigo-600 bg-indigo-600 text-white'
                      : 'border-slate-300 bg-white'
                  }`}
                >
                  {isSelected && <Check size={12} />}
                </div>
              </div>
            );
          })}

          {filteredDocs.length === 0 && (
            <div className="py-8 text-center text-xs text-slate-400">
              No documents found.
            </div>
          )}
        </div>

        <div className="mt-6 flex items-center justify-between pt-4 border-t border-slate-100">
          <span className="text-xs text-slate-500 font-medium">
            {selectedIds.length} document{selectedIds.length === 1 ? '' : 's'} selected
          </span>
          <div className="flex items-center gap-2.5">
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
              disabled={isSaving}
              className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-50 transition shadow-xs cursor-pointer"
            >
              {isSaving ? 'Saving...' : 'Save Documents'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LinkProjectDocsModal;
