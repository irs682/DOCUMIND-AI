import React, { useMemo, useState } from 'react';
import { Check, Copy, Download, FileJson, Search, X } from 'lucide-react';
import Button from '../common/Button';
import Badge from '../common/Badge';
import ExtractionCategory from './ExtractionCategory';
import {
  getCategoryDefinition,
  getCategoryValue,
  getExtractionResult,
  toExtractionItems,
} from './extractionTypes';

const getItemText = (item) => {
  if (typeof item === 'string' || typeof item === 'number') return String(item);
  if (!item || typeof item !== 'object') return '';
  return String(item.value ?? item.name ?? item.title ?? item.label ?? item.description ?? item.id ?? '');
};

const getSource = (item) => {
  const source = item?.source || item?.sourceMetadata || {};
  return {
    page: source.page ?? source.pageNumber ?? item?.page ?? item?.pageNumber ?? '',
    section: source.section ?? item?.section ?? '',
    documentId: source.documentId ?? item?.documentId ?? '',
  };
};

const csvCell = (value) => `"${String(value ?? '').replaceAll('"', '""')}"`;

const buildCsv = (entries) => {
  const header = ['Category', 'Value', 'Description', 'Page', 'Section', 'Document ID'];
  const rows = entries.flatMap(({ category, value }) =>
    toExtractionItems(value).map((item) => {
      const source = getSource(item);
      return [
        category.label,
        getItemText(item),
        item?.description ?? item?.context ?? item?.purpose ?? '',
        source.page,
        source.section,
        source.documentId,
      ];
    })
  );

  return [header, ...rows].map((row) => row.map(csvCell).join(',')).join('\n');
};

const downloadFile = (content, filename, type) => {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
};

const ExtractionResults = ({ extraction }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [openCategories, setOpenCategories] = useState(() => new Set());
  const [copied, setCopied] = useState(false);
  const rawResult = extraction?.result || extraction?.results || extraction?.data?.result || {};
  const result = getExtractionResult(extraction);
  const documentName = extraction?.documentName || extraction?.document?.name || extraction?.document?.originalName || rawResult?.meta?.documentName || 'Document';

  const categoryEntries = useMemo(() => {
    const selectedIds = extraction?.extractionTypes || extraction?.types || [];
    const resultIds = Object.keys(result || {});
    const uniqueIds = [...new Set([...selectedIds, ...resultIds])];

    return uniqueIds
      .map((id) => {
        const category = getCategoryDefinition(id);
        const value = getCategoryValue(result, category);
        return { category, value, items: toExtractionItems(value) };
      })
      .filter(({ items }) => items.length > 0)
      .map((entry) => ({
        ...entry,
        filteredValue: searchQuery.trim()
          ? entry.items.filter((item) => JSON.stringify(item).toLowerCase().includes(searchQuery.trim().toLowerCase()))
          : entry.value,
      }))
      .filter(({ filteredValue }) => toExtractionItems(filteredValue).length > 0);
  }, [extraction?.extractionTypes, extraction?.types, result, searchQuery]);

  const totalItems = categoryEntries.reduce((total, entry) => total + toExtractionItems(entry.filteredValue).length, 0);
  const failedBatches = Number(extraction?.batchStats?.failedBatches || extraction?.batchStats?.failed || 0);

  const copyText = async (text) => {
    try {
      await navigator.clipboard?.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard access is unavailable in some non-secure local browser contexts.
    }
  };

  const copyAll = () => {
    const text = categoryEntries
      .map(({ category, filteredValue }) => `${category.label}\n${toExtractionItems(filteredValue).map(getItemText).join('\n')}`)
      .join('\n\n');
    copyText(text);
  };

  const toggleCategory = (id) => {
    setOpenCategories((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleCopyCategory = (category, value) => {
    const text = `${category.label}\n${toExtractionItems(value).map(getItemText).join('\n')}`;
    copyText(text);
  };

  const handleExportJson = () => {
    downloadFile(JSON.stringify(rawResult, null, 2), 'documind-extraction.json', 'application/json');
  };

  const handleExportCsv = () => {
    downloadFile(buildCsv(categoryEntries.map(({ category, filteredValue }) => ({ category, value: filteredValue }))), 'documind-extraction.csv', 'text/csv;charset=utf-8');
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-indigo-100 bg-indigo-50/50 p-5 sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-bold text-slate-900">Extracted Information</h2>
              <Badge variant="emerald">Grounded result</Badge>
            </div>
            <p className="mt-1 text-sm text-slate-600">
              {totalItems} {totalItems === 1 ? 'item' : 'items'} from <span className="font-semibold text-slate-700">{documentName}</span>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" leftIcon={copied ? Check : Copy} onClick={copyAll}>
              {copied ? 'Copied' : 'Copy all'}
            </Button>
            <Button variant="outline" size="sm" leftIcon={FileJson} onClick={handleExportJson}>JSON</Button>
            <Button variant="outline" size="sm" leftIcon={Download} onClick={handleExportCsv}>CSV</Button>
          </div>
        </div>
      </div>

      {failedBatches > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Some document batches could not be processed ({failedBatches}). Results may be incomplete.
        </div>
      )}

      <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 shadow-xs">
        <Search size={17} className="shrink-0 text-slate-400" />
        <input
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          placeholder="Search extracted information..."
          className="w-full bg-transparent text-sm text-slate-800 outline-none placeholder:text-slate-400"
        />
        {searchQuery && (
          <button type="button" onClick={() => setSearchQuery('')} className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700" aria-label="Clear search">
            <X size={15} />
          </button>
        )}
      </div>

      {categoryEntries.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center">
          <h3 className="text-sm font-bold text-slate-700">No matching information found</h3>
          <p className="mt-1 text-sm text-slate-500">
            {searchQuery ? 'Try a different search term.' : 'The selected fields were not found in this document.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {categoryEntries.map(({ category, filteredValue }, index) => (
            <ExtractionCategory
              key={category.id}
              category={category}
              value={filteredValue}
              documentName={documentName}
              isOpen={openCategories.has(category.id) || (openCategories.size === 0 && index === 0)}
              onToggle={() => toggleCategory(category.id)}
              onCopyCategory={() => handleCopyCategory(category, filteredValue)}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default ExtractionResults;
