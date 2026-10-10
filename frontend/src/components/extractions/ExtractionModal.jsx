import React, { useEffect, useMemo, useState } from 'react';
import { FileText, Sparkles } from 'lucide-react';
import Modal from '../common/Modal';
import Button from '../common/Button';
import {
  DEFAULT_EXTRACTION_TYPES,
  EXTRACTION_CATEGORIES,
} from './extractionTypes';

const READY_STATUSES = new Set(['ready', 'indexed']);

const ExtractionModal = ({
  isOpen,
  onClose,
  document,
  onSubmit,
  isSubmitting = false,
  error = '',
}) => {
  const [selectedTypes, setSelectedTypes] = useState(DEFAULT_EXTRACTION_TYPES);
  const [customFields, setCustomFields] = useState('');
  const [validationError, setValidationError] = useState('');

  const documentName = useMemo(
    () => document?.name || document?.originalName || 'Selected document',
    [document]
  );
  const documentStatus = String(document?.status || 'ready').toLowerCase();
  const isDocumentReady = READY_STATUSES.has(documentStatus);

  useEffect(() => {
    if (isOpen) {
      setSelectedTypes(DEFAULT_EXTRACTION_TYPES);
      setCustomFields('');
      setValidationError('');
    }
  }, [isOpen, document?.id, document?._id]);

  const toggleType = (type) => {
    setValidationError('');
    setSelectedTypes((current) =>
      current.includes(type)
        ? current.filter((selected) => selected !== type)
        : [...current, type]
    );
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const trimmedCustomFields = customFields.trim();

    if (selectedTypes.length === 0 && !trimmedCustomFields) {
      setValidationError('Choose at least one category or describe custom fields to extract.');
      return;
    }

    setValidationError('');
    await onSubmit?.({
      documentId: document?.id || document?._id,
      extractionTypes: selectedTypes,
      customFields: trimmedCustomFields || undefined,
      projectId: document?.projectId?._id || document?.projectId || undefined,
    });
  };

  const closeModal = () => {
    if (!isSubmitting) onClose?.();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={closeModal}
      title="Extract Information"
      subtitle="Generate structured, source-grounded findings from this document."
      size="xl"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="flex items-center gap-3 rounded-xl border border-indigo-100 bg-indigo-50/60 p-3.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-600 text-white">
            <FileText size={18} />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-wider text-indigo-700">Document</p>
            <p className="truncate text-sm font-semibold text-slate-900" title={documentName}>{documentName}</p>
          </div>
          <span
            className={`ml-auto rounded-full border px-2 py-0.5 text-[10px] font-bold ${
              isDocumentReady
                ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                : 'border-amber-200 bg-amber-50 text-amber-700'
            }`}
          >
            {isDocumentReady ? 'Ready to extract' : 'Document is still processing'}
          </span>
        </div>

        <div>
          <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
            <div>
              <h4 className="text-sm font-bold text-slate-900">What do you want to extract?</h4>
              <p className="mt-0.5 text-xs text-slate-500">Select one or more categories for a single grounded extraction.</p>
            </div>
            <div className="flex items-center gap-3 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setSelectedTypes(EXTRACTION_CATEGORIES.map((category) => category.id))}
                className="text-indigo-600 hover:text-indigo-800"
              >
                Select all
              </button>
              <button
                type="button"
                onClick={() => setSelectedTypes([])}
                className="text-slate-500 hover:text-slate-700"
              >
                Clear
              </button>
            </div>
          </div>

          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {EXTRACTION_CATEGORIES.map((category) => {
              const isSelected = selectedTypes.includes(category.id);
              const Icon = category.icon;

              return (
                <label
                  key={category.id}
                  className={`flex cursor-pointer items-start gap-2.5 rounded-xl border p-3 transition ${
                    isSelected
                      ? 'border-indigo-300 bg-indigo-50/70 shadow-2xs'
                      : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleType(category.id)}
                    className="mt-0.5 h-3.5 w-3.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <Icon size={15} className={isSelected ? 'mt-0.5 shrink-0 text-indigo-600' : 'mt-0.5 shrink-0 text-slate-400'} />
                  <span className="min-w-0">
                    <span className="block text-xs font-bold text-slate-800">{category.label}</span>
                    <span className="mt-0.5 block text-[10px] leading-relaxed text-slate-500">{category.description}</span>
                  </span>
                </label>
              );
            })}
          </div>
        </div>

        <div>
          <label htmlFor="custom-extraction-fields" className="text-sm font-bold text-slate-900">
            Custom extraction
          </label>
          <p className="mt-0.5 text-xs text-slate-500">
            Describe the fields you need, such as “project objective, methodology, datasets, and evaluation metrics.”
          </p>
          <textarea
            id="custom-extraction-fields"
            value={customFields}
            onChange={(event) => {
              setCustomFields(event.target.value);
              setValidationError('');
            }}
            rows={3}
            maxLength={1200}
            placeholder="Extract all machine-learning algorithms, their purpose, and any evaluation metrics."
            className="mt-2.5 w-full resize-y rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
          />
          <div className="mt-1 flex justify-end text-[10px] text-slate-400">{customFields.length}/1200</div>
        </div>

        {(validationError || error) && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs font-medium text-rose-700">
            {validationError || error}
          </div>
        )}

        {!isDocumentReady && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-xs text-amber-800">
            Extraction will be available when the document has finished processing.
          </div>
        )}

        <div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-4">
          <Button variant="outline" onClick={closeModal} disabled={isSubmitting}>Cancel</Button>
          <Button
            type="submit"
            leftIcon={Sparkles}
            loading={isSubmitting}
            disabled={!isDocumentReady || (selectedTypes.length === 0 && !customFields.trim())}
          >
            {isSubmitting ? 'Starting extraction…' : 'Extract information'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default ExtractionModal;
