import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, MoreVertical, Eye, Download, Trash2, Database, Layers, GitCompare, Sparkles } from 'lucide-react';
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

const DocumentCard = ({ document, onPreview, onDelete, onDownload, onExtract }) => {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const {
    id,
    name = 'Untitled Document.pdf',
    size = '1.2 MB',
    uploadedAt = 'Today',
    status = 'indexed',
    chunksCount = 12,
    knowledgeBase = 'General',
  } = document || {};

  const docId = id || document?._id;
  const canExtract = ['ready', 'indexed'].includes(String(status).toLowerCase());

  return (
    <div className="group relative rounded-2xl border border-slate-200 bg-white p-5 shadow-xs transition-all hover:border-indigo-300 hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 font-bold group-hover:bg-indigo-600 group-hover:text-white transition-colors">
          <FileText size={24} />
        </div>

        {/* Action menu dropdown */}
        <div className="relative">
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
          >
            <MoreVertical size={18} />
          </button>

          {menuOpen && (
            <div
              className="absolute right-0 top-8 z-10 w-44 rounded-xl border border-slate-100 bg-white py-1.5 shadow-xl"
              onMouseLeave={() => setMenuOpen(false)}
            >
              {onPreview && (
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    onPreview(document);
                  }}
                  className="flex w-full items-center gap-2.5 px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  <Eye size={15} />
                  Preview & Chunks
                </button>
              )}
              {onExtract && (
                <button
                  disabled={!canExtract}
                  onClick={() => {
                    setMenuOpen(false);
                    onExtract(document);
                  }}
                  className="flex w-full items-center gap-2.5 px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-45"
                  title={canExtract ? 'Extract structured information' : 'Available when document processing is complete'}
                >
                  <Sparkles size={15} className="text-indigo-500" />
                  Extract Information
                </button>
              )}
              <button
                onClick={() => {
                  setMenuOpen(false);
                  navigate(`/compare?docA=${docId}`);
                }}
                className="flex w-full items-center gap-2.5 px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                <GitCompare size={15} />
                Compare with...
              </button>
              {onDownload && (
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    onDownload(document);
                  }}
                  className="flex w-full items-center gap-2.5 px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  <Download size={15} />
                  Download File
                </button>
              )}
              {onDelete && (
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    onDelete(id);
                  }}
                  className="flex w-full items-center gap-2.5 px-3.5 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50"
                >
                  <Trash2 size={15} />
                  Delete Document
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="mt-4">
        <h4 className="font-bold text-slate-900 truncate text-sm" title={name}>
          {name}
        </h4>
        <div className="mt-2 flex items-center gap-2 text-xs text-slate-500">
          <span>{size}</span>
          <span>•</span>
          <span>{uploadedAt}</span>
        </div>
        {document?.category && (
          <div className="mt-2.5">
            <span className="inline-flex items-center gap-1 rounded-md bg-purple-50 px-2 py-0.5 text-[10px] font-semibold text-purple-700 border border-purple-200">
              <Sparkles size={10} className="text-purple-600" />
              <span>{document.category}</span>
              {document.classificationConfidence && (
                <span className="text-[9px] text-purple-500 font-normal">
                  {Math.round(document.classificationConfidence * 100)}%
                </span>
              )}
            </span>
          </div>
        )}
      </div>

      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
        <Badge variant={statusVariants[status] || 'slate'}>
          {status.charAt(0).toUpperCase() + status.slice(1)}
        </Badge>

        <div className="flex items-center gap-3 text-xs text-slate-500 font-medium">
          <span className="flex items-center gap-1">
            <Layers size={13} className="text-slate-400" />
            {chunksCount} chunks
          </span>
        </div>
      </div>
    </div>
  );
};

export default DocumentCard;
