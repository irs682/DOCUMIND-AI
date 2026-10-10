import React, { useState } from 'react';
import { Eye, Download, Trash2, ArrowUpDown, FileText, Layers, CheckSquare, Square, Sparkles } from 'lucide-react';
import Badge from '../common/Badge';

const statusVariants = {
  indexed: 'emerald',
  ready: 'emerald',
  processing: 'amber',
  loading: 'amber',
  indexing: 'amber',
  failed: 'rose',
  index_failed: 'rose',
  pending: 'slate',
};

const DocumentTable = ({ documents = [], onPreview, onDelete, onDownload, onBulkDelete, onExtract }) => {
  const [selectedIds, setSelectedIds] = useState([]);
  const [sortField, setSortField] = useState('name');
  const [sortAsc, setSortAsc] = useState(true);

  const toggleSelectAll = () => {
    if (selectedIds.length === documents.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(documents.map((d) => d.id));
    }
  };

  const toggleSelectOne = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSort = (field) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  const sortedDocuments = [...documents].sort((a, b) => {
    const valA = a[sortField] || '';
    const valB = b[sortField] || '';
    if (valA < valB) return sortAsc ? -1 : 1;
    if (valA > valB) return sortAsc ? 1 : -1;
    return 0;
  });

  return (
    <div className="w-full space-y-3">
      {/* Bulk action header */}
      {selectedIds.length > 0 && (
        <div className="flex items-center justify-between rounded-xl bg-indigo-50 p-3 px-4 border border-indigo-100 text-xs font-semibold text-indigo-900">
          <span>{selectedIds.length} document(s) selected</span>
          <button
            onClick={() => {
              if (onBulkDelete) onBulkDelete(selectedIds);
              setSelectedIds([]);
            }}
            className="flex items-center gap-1.5 rounded-lg bg-rose-600 px-3 py-1.5 text-white hover:bg-rose-700 transition"
          >
            <Trash2 size={14} />
            Delete Selected
          </button>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-xs">
        <table className="w-full text-left text-sm text-slate-600">
          <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500 border-b border-slate-200">
            <tr>
              <th scope="col" className="p-4 w-10">
                <button onClick={toggleSelectAll} className="text-slate-400 hover:text-slate-600">
                  {selectedIds.length === documents.length && documents.length > 0 ? (
                    <CheckSquare size={18} className="text-indigo-600" />
                  ) : (
                    <Square size={18} />
                  )}
                </button>
              </th>
              <th scope="col" className="px-4 py-3.5 cursor-pointer" onClick={() => handleSort('name')}>
                <div className="flex items-center gap-1.5">
                  Name
                  <ArrowUpDown size={14} className="text-slate-400" />
                </div>
              </th>
              <th scope="col" className="px-4 py-3.5">Knowledge Base</th>
              <th scope="col" className="px-4 py-3.5">Category</th>
              <th scope="col" className="px-4 py-3.5">Size</th>
              <th scope="col" className="px-4 py-3.5">Status</th>
              <th scope="col" className="px-4 py-3.5">Chunks</th>
              <th scope="col" className="px-4 py-3.5">Uploaded</th>
              <th scope="col" className="px-4 py-3.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {sortedDocuments.map((doc) => {
              const isSelected = selectedIds.includes(doc.id);
              const canExtract = ['ready', 'indexed'].includes(String(doc.status || '').toLowerCase());
              return (
                <tr
                  key={doc.id}
                  className={`transition hover:bg-slate-50/80 ${
                    isSelected ? 'bg-indigo-50/30' : ''
                  }`}
                >
                  <td className="p-4">
                    <button onClick={() => toggleSelectOne(doc.id)} className="text-slate-400 hover:text-slate-600">
                      {isSelected ? (
                        <CheckSquare size={18} className="text-indigo-600" />
                      ) : (
                        <Square size={18} />
                      )}
                    </button>
                  </td>
                  <td className="px-4 py-3.5 font-semibold text-slate-900">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                        <FileText size={18} />
                      </div>
                      <span className="truncate max-w-xs" title={doc.name}>
                        {doc.name}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 text-slate-500 font-medium">{doc.knowledgeBase || 'General'}</td>
                  <td className="px-4 py-3.5">
                    <span className="inline-flex items-center gap-1 rounded-md bg-purple-50 px-2 py-0.5 text-[11px] font-semibold text-purple-700 border border-purple-200">
                      <Sparkles size={11} className="text-purple-600 shrink-0" />
                      <span>{doc.category || 'Other'}</span>
                      {doc.classificationConfidence && (
                        <span className="text-[10px] text-purple-500 font-normal">
                          {Math.round(doc.classificationConfidence * 100)}%
                        </span>
                      )}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-slate-500">{doc.size || '1.2 MB'}</td>
                  <td className="px-4 py-3.5">
                    <Badge variant={statusVariants[doc.status] || 'slate'}>
                      {doc.status ? doc.status.charAt(0).toUpperCase() + doc.status.slice(1) : 'Indexed'}
                    </Badge>
                  </td>
                  <td className="px-4 py-3.5 font-medium text-slate-700">
                    <div className="flex items-center gap-1">
                      <Layers size={14} className="text-slate-400" />
                      {doc.chunksCount || 12}
                    </div>
                  </td>
                  <td className="px-4 py-3.5 text-slate-500 text-xs">{doc.uploadedAt || 'Today'}</td>
                  <td className="px-4 py-3.5 text-right">
                    <div className="flex items-center justify-end gap-1">
                      {onPreview && (
                        <button
                          onClick={() => onPreview(doc)}
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-indigo-600 transition"
                          title="Preview Document"
                        >
                          <Eye size={16} />
                        </button>
                      )}
                      {onExtract && (
                        <button
                          disabled={!canExtract}
                          onClick={() => onExtract(doc)}
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-indigo-50 hover:text-indigo-600 transition disabled:cursor-not-allowed disabled:opacity-40"
                          title={canExtract ? 'Extract Information' : 'Available when document processing is complete'}
                        >
                          <Sparkles size={16} />
                        </button>
                      )}
                      {onDownload && (
                        <button
                          onClick={() => onDownload(doc)}
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-emerald-600 transition"
                          title="Download"
                        >
                          <Download size={16} />
                        </button>
                      )}
                      {onDelete && (
                        <button
                          onClick={() => onDelete(doc.id)}
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition"
                          title="Delete"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default DocumentTable;
