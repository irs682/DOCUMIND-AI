import React, { useState, useRef } from 'react';
import { Upload, FileText, CheckCircle2, AlertCircle, X, Loader2, Database } from 'lucide-react';
import Button from '../common/Button';
import Badge from '../common/Badge';
import { uploadDocument } from '../../api/documentsApi';
import { addDocumentsToKnowledgeBase } from '../../api/knowledgeBasesApi';

const DocumentUpload = ({ onUploadSuccess, knowledgeBases = [], projectId = null }) => {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);

  // Selected Knowledge Bases (checkboxes as per Section 16)
  const [selectedKbIds, setSelectedKbIds] = useState(() => {
    if (knowledgeBases.length > 0) {
      const firstId = knowledgeBases[0]._id || knowledgeBases[0].id;
      return new Set([firstId]);
    }
    return new Set();
  });

  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState(null); // 'success' | 'error' | null
  const [errorMessage, setErrorMessage] = useState('');
  const inputRef = useRef(null);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleFile = (file) => {
    setSelectedFile(file);
    setUploadStatus(null);
    setUploadProgress(0);
    setErrorMessage('');
  };

  const toggleKbSelection = (kbId) => {
    setSelectedKbIds((prev) => {
      const next = new Set(prev);
      if (next.has(kbId)) {
        next.delete(kbId);
      } else {
        next.add(kbId);
      }
      return next;
    });
  };

  const startUpload = async () => {
    if (!selectedFile) return;
    setUploading(true);
    setUploadProgress(5);
    setUploadStatus(null);
    setErrorMessage('');

    try {
      const kbIdsArray = Array.from(selectedKbIds);
      const primaryKbId = kbIdsArray[0] || null;
      let primaryKbName = 'General KB';
      if (primaryKbId) {
        const found = knowledgeBases.find((k) => (k._id || k.id) === primaryKbId);
        if (found) primaryKbName = found.name;
      }

      const doc = await uploadDocument(
        selectedFile,
        primaryKbName,
        primaryKbId,
        (pct) => {
          setUploadProgress(Math.min(pct * 0.8, 80));
        },
        projectId
      );

      // If additional KBs were selected, link to them as well
      const additionalKbIds = kbIdsArray.slice(1);
      if (additionalKbIds.length > 0 && (doc?._id || doc?.id)) {
        const docId = doc._id || doc.id;
        for (const extraKbId of additionalKbIds) {
          try {
            await addDocumentsToKnowledgeBase(extraKbId, [docId]);
          } catch (_) {}
        }
      }

      setUploadProgress(100);
      setUploadStatus('success');

      if (onUploadSuccess) {
        onUploadSuccess({
          ...doc,
          id: doc._id || doc.id,
          name: doc.name || doc.originalName || selectedFile.name,
          size: doc.formattedSize || `${(selectedFile.size / 1024).toFixed(1)} KB`,
          type: selectedFile.name.split('.').pop()?.toUpperCase() || 'FILE',
          uploadedAt: new Date().toLocaleDateString(),
          knowledgeBase: primaryKbName,
        });
      }
    } catch (err) {
      console.error('Upload error:', err);
      setUploadStatus('error');
      setErrorMessage(
        err?.response?.data?.message ||
        err.message ||
        'Upload failed. Please check your backend connection.'
      );
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="w-full space-y-4">
      {/* Target Knowledge Base Selection (Section 16 optional KB checkboxes) */}
      {knowledgeBases.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 space-y-2">
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
            Add to Knowledge Base (optional):
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {knowledgeBases.map((kb) => {
              const kbId = kb._id || kb.id;
              const isChecked = selectedKbIds.has(kbId);
              return (
                <label
                  key={kbId}
                  className={`flex items-center gap-2.5 p-2 rounded-lg border text-xs cursor-pointer transition ${
                    isChecked
                      ? 'border-purple-300 bg-purple-50/60 font-semibold text-purple-900'
                      : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => toggleKbSelection(kbId)}
                    className="h-4 w-4 rounded border-slate-300 text-purple-600 focus:ring-purple-500 cursor-pointer"
                  />
                  <div className="truncate flex-1">
                    <span>{kb.name}</span>
                    <span className="text-[10px] text-slate-400 ml-1.5 font-normal">
                      ({kb.docCount || 0} docs)
                    </span>
                  </div>
                </label>
              );
            })}
          </div>
        </div>
      )}

      {/* Drag & Drop Area */}
      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-8 text-center transition cursor-pointer ${
          dragActive
            ? 'border-purple-500 bg-purple-50/50 scale-[0.99]'
            : 'border-slate-300 bg-slate-50/40 hover:bg-slate-100/60'
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.docx,.doc,.pptx,.txt,.csv,.json"
          onChange={handleChange}
          className="hidden"
        />

        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-purple-100 text-purple-600 mb-3 shadow-xs">
          <Upload size={28} />
        </div>

        <p className="text-sm font-semibold text-slate-900">
          Click to upload or drag and drop
        </p>
        <p className="mt-1 text-xs text-slate-500">
          PDF, DOCX, PPTX, CSV, TXT, or JSON (max size: 25MB)
        </p>

        <div className="mt-4 flex gap-2">
          <Badge variant="slate">PDF</Badge>
          <Badge variant="slate">DOCX</Badge>
          <Badge variant="slate">PPTX</Badge>
          <Badge variant="slate">TXT</Badge>
        </div>
      </div>

      {/* Selected File Card */}
      {selectedFile && (
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-50 text-purple-600">
                <FileText size={20} />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900 truncate max-w-xs sm:max-w-md">
                  {selectedFile.name}
                </p>
                <p className="text-xs text-slate-500">
                  {(selectedFile.size / 1024).toFixed(1)} KB •{' '}
                  {selectedKbIds.size > 0
                    ? `${selectedKbIds.size} KB(s) selected`
                    : 'Unassigned Knowledge Base'}
                </p>
              </div>
            </div>

            {!uploading && uploadStatus !== 'success' && (
              <button
                onClick={() => {
                  setSelectedFile(null);
                  setUploadStatus(null);
                }}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X size={18} />
              </button>
            )}
          </div>

          {/* Progress bar */}
          {uploading && (
            <div className="mt-3 space-y-1.5">
              <div className="flex justify-between text-xs text-slate-600 font-medium">
                <span className="flex items-center gap-1.5 text-purple-700">
                  <Loader2 size={12} className="animate-spin" />
                  Uploading & Processing Vectors...
                </span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full bg-purple-600 transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* Status Indicators */}
          {uploadStatus === 'success' && (
            <div className="mt-3 flex items-center gap-2 text-xs font-semibold text-emerald-700 bg-emerald-50 p-2.5 rounded-lg border border-emerald-200">
              <CheckCircle2 size={16} />
              Document uploaded! Ingestion started in background — ready for AI Q&amp;A and Research soon.
            </div>
          )}

          {uploadStatus === 'error' && (
            <div className="mt-3 flex items-start gap-2 text-xs font-semibold text-rose-700 bg-rose-50 p-2.5 rounded-lg border border-rose-200">
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              <span>{errorMessage || 'Ingestion failed. Please check file format and retry.'}</span>
            </div>
          )}

          {/* Upload Button */}
          {!uploading && uploadStatus !== 'success' && (
            <div className="mt-4 flex justify-end">
              <Button onClick={startUpload} size="sm">
                Start Processing
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default DocumentUpload;
