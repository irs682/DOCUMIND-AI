import React, { useState, useEffect, useMemo } from 'react';
import {
  Upload,
  FileText,
  Search,
  CheckCircle2,
  AlertCircle,
  Loader2,
  FolderPlus,
  Layers,
  Calendar,
  X,
  Plus,
} from 'lucide-react';
import Modal from '../common/Modal';
import Button from '../common/Button';
import Badge from '../common/Badge';
import Input from '../common/Input';
import { uploadDocument, fetchDocuments } from '../../api/documentsApi';
import { addDocumentsToKnowledgeBase } from '../../api/knowledgeBasesApi';

const AddDocumentsModal = ({
  isOpen,
  onClose,
  knowledgeBase,
  allKnowledgeBases = [],
  initialTab = 'upload',
  onSuccess,
}) => {
  const [activeTab, setActiveTab] = useState(initialTab); // 'upload' | 'existing'
  const [selectedKbId, setSelectedKbId] = useState('');
  const [selectedKbName, setSelectedKbName] = useState('');

  // ── Existing Documents State ──
  const [allDocs, setAllDocs] = useState([]);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [docsError, setDocsError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDocIds, setSelectedDocIds] = useState(new Set());
  const [isAddingExisting, setIsAddingExisting] = useState(false);
  const [existingSuccessMsg, setExistingSuccessMsg] = useState('');

  // ── Upload New Files State ──
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState(null); // 'success' | 'error' | null
  const [uploadError, setUploadError] = useState('');

  // Sync active KB when modal opens or prop changes
  useEffect(() => {
    if (knowledgeBase) {
      const kbId = knowledgeBase._id || knowledgeBase.id;
      setSelectedKbId(kbId);
      setSelectedKbName(knowledgeBase.name || 'Knowledge Base');
    } else if (allKnowledgeBases.length > 0) {
      const first = allKnowledgeBases[0];
      setSelectedKbId(first._id || first.id);
      setSelectedKbName(first.name);
    }
    setActiveTab(initialTab);
    setSelectedFile(null);
    setUploadStatus(null);
    setUploadError('');
    setSelectedDocIds(new Set());
    setExistingSuccessMsg('');
  }, [isOpen, knowledgeBase, allKnowledgeBases, initialTab]);

  // Load existing documents when modal is open and on 'existing' tab
  useEffect(() => {
    if (isOpen && activeTab === 'existing') {
      loadPlatformDocuments();
    }
  }, [isOpen, activeTab]);

  const loadPlatformDocuments = async () => {
    try {
      setLoadingDocs(true);
      setDocsError('');
      const docs = await fetchDocuments();
      setAllDocs(docs || []);
    } catch (err) {
      console.error('Failed to load platform documents:', err);
      setDocsError('Unable to load documents library. Please try again.');
    } finally {
      setLoadingDocs(false);
    }
  };

  // Check if document is already associated with selected KB
  const isDocInKb = (doc) => {
    if (!selectedKbId) return false;
    const strKbId = String(selectedKbId);
    if (doc.knowledgeBaseId && String(doc.knowledgeBaseId) === strKbId) return true;
    if (
      Array.isArray(doc.knowledgeBaseIds) &&
      doc.knowledgeBaseIds.some((kId) => String(kId?._id || kId) === strKbId)
    ) {
      return true;
    }
    // Backward compatibility for string name match
    if (doc.knowledgeBase && selectedKbName && doc.knowledgeBase.toLowerCase() === selectedKbName.toLowerCase()) {
      return true;
    }
    return false;
  };

  // Filter documents by search query
  const filteredDocs = useMemo(() => {
    return allDocs.filter((doc) => {
      const name = doc.name || doc.originalName || '';
      return name.toLowerCase().includes(searchQuery.toLowerCase());
    });
  }, [allDocs, searchQuery]);

  // Handle select/unselect checkbox
  const handleToggleDoc = (docId) => {
    setSelectedDocIds((prev) => {
      const next = new Set(prev);
      if (next.has(docId)) {
        next.delete(docId);
      } else {
        next.add(docId);
      }
      return next;
    });
  };

  // Select all selectable documents
  const handleSelectAll = () => {
    const selectable = filteredDocs.filter((d) => !isDocInKb(d));
    if (selectedDocIds.size === selectable.length) {
      setSelectedDocIds(new Set());
    } else {
      setSelectedDocIds(new Set(selectable.map((d) => d._id || d.id)));
    }
  };

  // ── Action: Add Selected Existing Documents ──
  const handleAddSelectedDocuments = async () => {
    if (selectedDocIds.size === 0 || !selectedKbId) return;
    setIsAddingExisting(true);
    setExistingSuccessMsg('');
    setDocsError('');

    try {
      const idsArray = Array.from(selectedDocIds);
      const res = await addDocumentsToKnowledgeBase(selectedKbId, idsArray);
      setExistingSuccessMsg(
        res.message || `Successfully linked ${idsArray.length} document(s) to ${selectedKbName}!`
      );
      setSelectedDocIds(new Set());

      // Refresh documents list to reflect new membership
      await loadPlatformDocuments();

      if (onSuccess) {
        onSuccess({ type: 'added_existing', count: idsArray.length, kbId: selectedKbId });
      }
    } catch (err) {
      console.error('Failed to add documents to KB:', err);
      setDocsError(
        err.response?.data?.message || err.message || 'Failed to add documents to Knowledge Base.'
      );
    } finally {
      setIsAddingExisting(false);
    }
  };

  // ── Drag & Drop Handlers ──
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
      handleFileSelected(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelected = (file) => {
    setSelectedFile(file);
    setUploadStatus(null);
    setUploadProgress(0);
    setUploadError('');
  };

  // ── Action: Upload New File ──
  const handleStartUpload = async () => {
    if (!selectedFile || !selectedKbId) return;
    setUploading(true);
    setUploadProgress(10);
    setUploadStatus(null);
    setUploadError('');

    try {
      const doc = await uploadDocument(
        selectedFile,
        selectedKbName,
        selectedKbId,
        (pct) => {
          setUploadProgress(Math.min(pct * 0.85, 85));
        }
      );

      setUploadProgress(100);
      setUploadStatus('success');

      if (onSuccess) {
        onSuccess({
          type: 'uploaded_new',
          document: doc,
          kbId: selectedKbId,
        });
      }
    } catch (err) {
      console.error('Direct KB upload failed:', err);
      setUploadStatus('error');
      setUploadError(
        err.response?.data?.message || err.message || 'Document upload and indexing failed.'
      );
    } finally {
      setUploading(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'ready':
      case 'indexed':
        return <Badge variant="emerald">Ready</Badge>;
      case 'processing':
      case 'validating':
      case 'extracting':
      case 'ocr_processing':
      case 'table_extraction':
      case 'embedding':
      case 'indexing':
        return <Badge variant="purple">Processing</Badge>;
      case 'uploaded':
        return <Badge variant="blue">Queued</Badge>;
      case 'failed':
      case 'extraction_failed':
      case 'index_failed':
        return <Badge variant="rose">Failed</Badge>;
      default:
        return <Badge variant="slate">{status || 'Ready'}</Badge>;
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Add Documents to Knowledge Base`}
      subtitle={selectedKbName ? `Target Knowledge Base: ${selectedKbName}` : 'Select destination and documents'}
      size="xl"
    >
      <div className="space-y-5">
        {/* Destination Knowledge Base Selector (if multiple available) */}
        {allKnowledgeBases.length > 1 && (
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/60 p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Destination Knowledge Base:
            </span>
            <select
              value={selectedKbId}
              onChange={(e) => {
                const kbId = e.target.value;
                setSelectedKbId(kbId);
                const kb = allKnowledgeBases.find((k) => (k._id || k.id) === kbId);
                if (kb) setSelectedKbName(kb.name);
              }}
              className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-300"
            >
              {allKnowledgeBases.map((kb) => (
                <option key={kb._id || kb.id} value={kb._id || kb.id}>
                  {kb.name} ({kb.docCount || 0} docs)
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Tab Toggle */}
        <div className="flex border-b border-slate-200 dark:border-slate-800">
          <button
            type="button"
            onClick={() => setActiveTab('upload')}
            className={`flex items-center gap-2 border-b-2 px-5 py-3 text-sm font-semibold transition ${
              activeTab === 'upload'
                ? 'border-purple-600 dark:border-purple-400 text-purple-600 dark:text-purple-400'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
            }`}
          >
            <Upload size={16} />
            Upload New Files
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('existing')}
            className={`flex items-center gap-2 border-b-2 px-5 py-3 text-sm font-semibold transition ${
              activeTab === 'existing'
                ? 'border-purple-600 dark:border-purple-400 text-purple-600 dark:text-purple-400'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
            }`}
          >
            <FolderPlus size={16} />
            Select Existing Documents
          </button>
        </div>

        {/* ── TAB 1: UPLOAD NEW FILES ── */}
        {activeTab === 'upload' && (
          <div className="space-y-4">
            {/* Drag & Drop Area */}
            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              className={`relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-8 text-center transition ${
                dragActive
                  ? 'border-purple-500 dark:border-purple-500/60 bg-purple-50/50 dark:bg-purple-950/30 scale-[0.99]'
                  : 'border-slate-300 dark:border-slate-700 bg-slate-50/40 dark:bg-slate-900/60 hover:bg-slate-100/60 dark:hover:bg-slate-800/50'
              }`}
            >
              <input
                id="kb-file-upload-input"
                type="file"
                accept=".pdf,.docx,.doc,.pptx,.txt,.csv,.json"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    handleFileSelected(e.target.files[0]);
                  }
                }}
                className="hidden"
              />

              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-purple-100 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 mb-3 shadow-xs">
                <Upload size={28} />
              </div>

              <p className="text-sm font-semibold text-slate-900 dark:text-white">
                Drag & drop files here to upload directly to{' '}
                <span className="text-purple-600 dark:text-purple-400">{selectedKbName}</span>
              </p>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Supports PDF, DOCX, PPTX, TXT, CSV, JSON (max 25MB)
              </p>

              <div className="mt-3 flex gap-2">
                <Badge variant="slate">PDF</Badge>
                <Badge variant="slate">DOCX</Badge>
                <Badge variant="slate">PPTX</Badge>
                <Badge variant="slate">TXT</Badge>
              </div>

              <div className="mt-4">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => document.getElementById('kb-file-upload-input')?.click()}
                >
                  Browse Files
                </Button>
              </div>
            </div>

            {/* Selected File Card & Progress */}
            {selectedFile && (
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400">
                      <FileText size={20} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-900 dark:text-white truncate max-w-sm">
                        {selectedFile.name}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB • Destination: {selectedKbName}
                      </p>
                    </div>
                  </div>

                  {!uploading && uploadStatus !== 'success' && (
                    <button
                      onClick={() => {
                        setSelectedFile(null);
                        setUploadStatus(null);
                      }}
                      className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-600 dark:hover:text-slate-200"
                    >
                      <X size={18} />
                    </button>
                  )}
                </div>

                {uploading && (
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs text-slate-600 dark:text-slate-300 font-medium">
                      <span className="flex items-center gap-1.5 text-purple-700 dark:text-purple-400">
                        <Loader2 size={12} className="animate-spin" />
                        Uploading, running OCR & chunking into vector store...
                      </span>
                      <span>{uploadProgress}%</span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                      <div
                        className="h-full bg-purple-600 transition-all duration-300"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                  </div>
                )}

                {uploadStatus === 'success' && (
                  <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/30 p-3 rounded-lg border border-emerald-200 dark:border-emerald-900/50">
                    <CheckCircle2 size={16} className="shrink-0" />
                    <span>
                      Document uploaded! Central pipeline (OCR, chunking, and Qdrant embeddings) has started.
                    </span>
                  </div>
                )}

                {uploadStatus === 'error' && (
                  <div className="flex items-start gap-2 text-xs font-semibold text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/30 p-3 rounded-lg border border-rose-200 dark:border-rose-900/50">
                    <AlertCircle size={16} className="shrink-0 mt-0.5" />
                    <span>{uploadError}</span>
                  </div>
                )}

                {!uploading && uploadStatus !== 'success' && (
                  <div className="flex justify-end pt-2">
                    <Button variant="primary" size="sm" onClick={handleStartUpload}>
                      Start Ingestion into {selectedKbName}
                    </Button>
                  </div>
                )}

                {uploadStatus === 'success' && (
                  <div className="flex justify-end gap-2 pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedFile(null);
                        setUploadStatus(null);
                      }}
                    >
                      Upload Another File
                    </Button>
                    <Button variant="primary" size="sm" onClick={onClose}>
                      Done
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── TAB 2: SELECT EXISTING DOCUMENTS ── */}
        {activeTab === 'existing' && (
          <div className="space-y-4">
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Link documents already present in your global platform library directly into{' '}
              <strong className="text-purple-700 dark:text-purple-400">{selectedKbName}</strong> without re-uploading or duplicating vectors.
            </p>

            {/* Search Bar */}
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <Input
                  placeholder="Search existing documents by title..."
                  leftIcon={Search}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              {filteredDocs.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSelectAll}
                  className="whitespace-nowrap"
                >
                  {selectedDocIds.size === filteredDocs.filter((d) => !isDocInKb(d)).length &&
                  selectedDocIds.size > 0
                    ? 'Deselect All'
                    : 'Select All Available'}
                </Button>
              )}
            </div>

            {/* Success message */}
            {existingSuccessMsg && (
              <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/30 p-3 rounded-lg border border-emerald-200 dark:border-emerald-900/50">
                <CheckCircle2 size={16} />
                <span>{existingSuccessMsg}</span>
              </div>
            )}

            {/* Error message */}
            {docsError && (
              <div className="flex items-center gap-2 text-xs font-semibold text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/30 p-3 rounded-lg border border-rose-200 dark:border-rose-900/50">
                <AlertCircle size={16} />
                <span>{docsError}</span>
              </div>
            )}

            {/* Documents List */}
            {loadingDocs ? (
              <div className="flex flex-col items-center justify-center p-8 text-slate-400 gap-2">
                <Loader2 size={24} className="animate-spin text-purple-600 dark:text-purple-400" />
                <span className="text-xs">Loading document repository...</span>
              </div>
            ) : filteredDocs.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 dark:border-slate-800 p-8 text-center text-xs text-slate-500 dark:text-slate-400">
                {searchQuery
                  ? 'No documents matched your search query.'
                  : 'No documents found in your platform library. Use the "Upload New Files" tab above to add documents.'}
              </div>
            ) : (
              <div className="max-h-72 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                {filteredDocs.map((doc) => {
                  const docId = doc._id || doc.id;
                  const alreadyMember = isDocInKb(doc);
                  const isChecked = selectedDocIds.has(docId);
                  const docType = (doc.name || doc.originalName || '').split('.').pop()?.toUpperCase() || 'DOC';
                  const dateStr = doc.createdAt
                    ? new Date(doc.createdAt).toLocaleDateString()
                    : 'Recent';

                  return (
                    <div
                      key={docId}
                      className={`flex items-center justify-between p-3.5 transition ${
                        alreadyMember
                          ? 'bg-slate-50/60 dark:bg-slate-800/40 opacity-70 cursor-not-allowed'
                          : isChecked
                          ? 'bg-purple-50/40 dark:bg-purple-950/30 hover:bg-purple-50/60 dark:hover:bg-purple-950/50 cursor-pointer'
                          : 'hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer'
                      }`}
                      onClick={() => {
                        if (!alreadyMember) handleToggleDoc(docId);
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={isChecked || alreadyMember}
                          disabled={alreadyMember}
                          onChange={() => {
                            if (!alreadyMember) handleToggleDoc(docId);
                          }}
                          className="h-4 w-4 rounded border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-purple-600 focus:ring-purple-500 cursor-pointer disabled:cursor-not-allowed"
                        />

                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 shrink-0">
                          <FileText size={18} />
                        </div>

                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-xs font-bold text-slate-900 dark:text-white truncate max-w-xs sm:max-w-md">
                              {doc.name || doc.originalName}
                            </p>
                            <Badge variant="slate" className="text-[10px] uppercase">
                              {docType}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                            <span>{doc.formattedSize || `${((doc.size || 0) / 1024).toFixed(1)} KB`}</span>
                            <span>•</span>
                            <span>{doc.chunksCount || 0} vectors</span>
                            <span>•</span>
                            <span>Added {dateStr}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {alreadyMember ? (
                          <Badge variant="amber" icon={CheckCircle2}>
                            Already in KB
                          </Badge>
                        ) : (
                          getStatusBadge(doc.status)
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Selection Summary and Add Selected Button */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
              <span className="text-xs text-slate-600 dark:text-slate-400">
                <strong>{selectedDocIds.size}</strong> document(s) selected
              </span>

              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={onClose}>
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  disabled={selectedDocIds.size === 0}
                  loading={isAddingExisting}
                  onClick={handleAddSelectedDocuments}
                  leftIcon={Plus}
                >
                  Add Selected to {selectedKbName}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default AddDocumentsModal;
