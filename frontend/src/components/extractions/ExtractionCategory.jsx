import React, { useState } from 'react';
import { Check, ChevronDown, ChevronUp, Copy, ExternalLink, FileText } from 'lucide-react';
import { Link } from 'react-router-dom';
import SourceCitation from '../chat/SourceCitation';
import { toExtractionItems } from './extractionTypes';

const labelFromKey = (key) =>
  String(key || '')
    .replace(/([A-Z])/g, ' $1')
    .replace(/[_-]/g, ' ')
    .replace(/^./, (value) => value.toUpperCase());

const getItemTitle = (item) => {
  if (typeof item === 'string' || typeof item === 'number') return String(item);
  if (!item || typeof item !== 'object') return 'Extracted item';

  const value = item.value ?? item.name ?? item.title ?? item.label ?? item.description ?? item.id;
  const title = typeof value === 'object' ? JSON.stringify(value) : String(value || 'Extracted item');
  return item.fieldName ? `${labelFromKey(item.fieldName)}: ${title}` : title;
};

const getItemDescription = (item) => {
  if (!item || typeof item !== 'object') return '';
  const titleValue = item.value ?? item.name ?? item.title ?? item.label;
  const description = item.description ?? item.context ?? item.purpose ?? item.role ?? item.summary;
  return description && description !== titleValue ? String(description) : '';
};

const getItemMetadata = (item) => {
  if (!item || typeof item !== 'object') return [];
  const keys = ['id', 'type', 'priority', 'actor', 'owner', 'unit', 'normalizedValue', 'impact', 'probability', 'status'];
  return keys
    .filter((key) => item[key] !== undefined && item[key] !== null && item[key] !== '')
    .map((key) => `${labelFromKey(key)}: ${item[key]}`);
};

const getSource = (item) => {
  if (!item || typeof item !== 'object') return null;
  const nested = item.source || item.sourceMetadata || {};
  const page = nested.page ?? nested.pageNumber ?? item.page ?? item.pageNumber;
  const section = nested.section ?? item.section;
  const documentId = nested.documentId ?? nested.document ?? item.documentId;
  const documentName = nested.documentName ?? item.documentName;
  const snippet = nested.snippet ?? nested.evidence ?? item.evidence ?? item.snippet;

  if (!page && !section && !documentId && !snippet) return null;
  return { page, section, documentId, documentName, snippet };
};

const TablePreview = ({ item }) => {
  const headers = item?.headers || item?.columns || [];
  const rows = item?.rows || item?.data || [];
  const caption = item?.caption || item?.title || item?.value;

  if (!Array.isArray(headers) || !Array.isArray(rows) || (headers.length === 0 && rows.length === 0)) return null;

  return (
    <div className="mt-3 overflow-x-auto rounded-lg border border-slate-200 bg-white">
      {caption && <p className="border-b border-slate-100 px-3 py-2 text-xs font-semibold text-slate-700">{caption}</p>}
      <table className="min-w-full text-left text-[11px] text-slate-600">
        {headers.length > 0 && (
          <thead className="bg-slate-50 text-slate-500">
            <tr>{headers.map((header, index) => <th key={`${header}-${index}`} className="px-3 py-2 font-semibold">{header}</th>)}</tr>
          </thead>
        )}
        <tbody className="divide-y divide-slate-100">
          {rows.slice(0, 5).map((row, rowIndex) => {
            const cells = Array.isArray(row) ? row : Object.values(row || {});
            return <tr key={rowIndex}>{cells.map((cell, cellIndex) => <td key={cellIndex} className="px-3 py-2">{String(cell ?? '')}</td>)}</tr>;
          })}
        </tbody>
      </table>
      {rows.length > 5 && <p className="border-t border-slate-100 px-3 py-2 text-[10px] text-slate-400">Showing 5 of {rows.length} rows</p>}
    </div>
  );
};

const ExtractionCategory = ({ category, value, documentName, isOpen, onToggle, onCopyCategory }) => {
  const [copiedIndex, setCopiedIndex] = useState(null);
  const items = toExtractionItems(value);
  const Icon = category.icon || FileText;

  const handleCopyItem = async (item, index) => {
    const text = typeof item === 'string' ? item : JSON.stringify(item, null, 2);
    try {
      await navigator.clipboard?.writeText(text);
      setCopiedIndex(index);
      window.setTimeout(() => setCopiedIndex(null), 1800);
    } catch {
      // Clipboard availability depends on the browser's secure-context policy.
    }
  };

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
      <div className="flex items-center gap-3 p-4 sm:p-5">
        <button type="button" onClick={onToggle} className="flex min-w-0 flex-1 items-center gap-3 text-left">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600"><Icon size={18} /></span>
          <span className="min-w-0">
            <span className="block text-sm font-bold text-slate-900">{category.label}</span>
            <span className="mt-0.5 block text-xs text-slate-500">{items.length} {items.length === 1 ? 'item' : 'items'}</span>
          </span>
        </button>
        <button
          type="button"
          onClick={onCopyCategory}
          className="hidden items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-500 hover:bg-slate-100 hover:text-slate-800 sm:inline-flex"
        >
          <Copy size={14} /> Copy category
        </button>
        <button type="button" onClick={onToggle} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700" aria-label={`${isOpen ? 'Collapse' : 'Expand'} ${category.label}`}>
          {isOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </button>
      </div>

      {isOpen && (
        <div className="border-t border-slate-100 px-4 py-4 sm:px-5">
          <div className="space-y-3">
            {items.map((item, index) => {
              const source = getSource(item);
              const title = getItemTitle(item);
              const description = getItemDescription(item);
              const metadata = getItemMetadata(item);

              return (
                <article key={`${title}-${index}`} className="rounded-xl border border-slate-200 bg-slate-50/60 p-3.5">
                  <div className="flex items-start gap-3">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-[10px] font-bold text-indigo-700">{index + 1}</span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start gap-3">
                        <div className="min-w-0 flex-1">
                          <h4 className="break-words text-sm font-semibold text-slate-900">{title}</h4>
                          {description && <p className="mt-1 text-xs leading-relaxed text-slate-600">{description}</p>}
                        </div>
                        <button
                          type="button"
                          onClick={() => handleCopyItem(item, index)}
                          className="shrink-0 rounded-lg p-1.5 text-slate-400 hover:bg-white hover:text-indigo-600"
                          title="Copy item"
                        >
                          {copiedIndex === index ? <Check size={15} className="text-emerald-600" /> : <Copy size={15} />}
                        </button>
                      </div>

                      {metadata.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {metadata.map((entry) => <span key={entry} className="rounded-md border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] font-medium text-slate-500">{entry}</span>)}
                        </div>
                      )}

                      {category.id === 'tables' && <TablePreview item={item} />}

                      {source && (
                        <div className="mt-3 space-y-2">
                          <SourceCitation citation={{
                            documentName: source.documentName || documentName || 'Source document',
                            pageNumber: source.page,
                            knowledgeBase: source.section,
                            snippet: source.snippet,
                          }} />
                          {source.documentId && (
                            <Link
                              to={`/documents/${source.documentId}`}
                              className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-600 hover:text-indigo-800"
                            >
                              <ExternalLink size={12} /> View source
                            </Link>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
};

export default ExtractionCategory;
