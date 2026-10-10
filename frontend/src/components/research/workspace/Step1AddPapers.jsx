import React, { useState, useEffect } from 'react';
import {
  Upload,
  FileText,
  Database,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Trash2,
  ArrowRight,
  BookOpen,
  RefreshCw,
  Plus,
} from 'lucide-react';
import { documentApi } from '../../../services/documentApi';
import api from '../../../services/api';

const Step1AddPapers = ({
  project,
  onUpdateProject,
  onExecuteStep,
  onNext,
  isExecuting,
}) => {
  const [activeSubTab, setActiveSubTab] = useState('upload'); // 'upload' | 'existing' | 'kb'
  const [existingDocs, setExistingDocs] = useState([]);
  const [knowledgeBases, setKnowledgeBases] = useState([]);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [selectedDocIds, setSelectedDocIds] = useState(
    (project?.documentIds || []).map((d) => (typeof d === 'object' ? d._id : d))
  );

  // Sync selectedDocIds if project updates
  useEffect(() => {
    if (project?.documentIds) {
      setSelectedDocIds(
        project.documentIds.map((d) => (typeof d === 'object' ? d._id : d))
      );
    }
  }, [project]);

  // Load user's existing documents & knowledge bases
  useEffect(() => {
    const fetchData = async () => {
      setLoadingDocs(true);
      try {
        const [docsRes, kbRes] = await Promise.allSettled([
          documentApi.getAll(),
          api.get('/knowledge-bases'),
        ]);

        if (docsRes.status === 'fulfilled' && docsRes.value.data) {
          const docs = docsRes.value.data.documents || docsRes.value.data || [];
          setExistingDocs(Array.isArray(docs) ? docs : []);
        }

        if (kbRes.status === 'fulfilled' && kbRes.value.data) {
          const kbs = kbRes.value.data.knowledgeBases || kbRes.value.data || [];
          setKnowledgeBases(Array.isArray(kbs) ? kbs : []);
        }
      } catch (err) {
        console.warn('Failed to load existing documents or KBs:', err);
      } finally {
        setLoadingDocs(false);
      }
    };

    fetchData();
  }, []);

  // Handle direct file uploads (reuses existing document ingestion pipeline)
  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    setUploading(true);
    setError('');

    try {
      const newIds = [...selectedDocIds];
      for (const file of files) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('title', file.name);

        const res = await documentApi.upload(formData);
        const docId = res.data?.document?._id || res.data?._id;
        if (docId && !newIds.includes(docId)) {
          newIds.push(docId);
        }
      }

      setSelectedDocIds(newIds);
      await onUpdateProject({ documentIds: newIds });
    } catch (err) {
      console.error('File upload failed:', err);
      setError(err.response?.data?.message || err.message || 'File upload failed');
    } finally {
      setUploading(false);
      // Reset input value
      e.target.value = '';
    }
  };

  const toggleSelectDoc = async (id) => {
    let updated;
    if (selectedDocIds.includes(id)) {
      updated = selectedDocIds.filter((docId) => docId !== id);
    } else {
      updated = [...selectedDocIds, id];
    }
    setSelectedDocIds(updated);
    await onUpdateProject({ documentIds: updated });
  };

  const handleSelectKnowledgeBase = async (kb) => {
    // If KB has documents attached, add them
    if (kb.documents && Array.isArray(kb.documents)) {
      const kbDocIds = kb.documents.map((d) => (typeof d === 'object' ? d._id : d));
      const merged = Array.from(new Set([...selectedDocIds, ...kbDocIds]));
      setSelectedDocIds(merged);
      await onUpdateProject({ documentIds: merged });
    }
  };

  const handleRemoveDoc = async (id) => {
    const updated = selectedDocIds.filter((docId) => docId !== id);
    setSelectedDocIds(updated);
    await onUpdateProject({ documentIds: updated });
  };

  const handleExtractProfiles = async () => {
    if (selectedDocIds.length === 0) {
      setError('Please select or upload at least one research paper first.');
      return;
    }
    setError('');
    try {
      await onExecuteStep(1);
    } catch (err) {
      setError(err.message || 'Profile extraction failed');
    }
  };

  const profiles = project?.paperProfiles || [];

  return (
    <div className="space-y-6">
      {/* Step Header */}
      <div className="border-b border-slate-100 pb-4">
        <h2 className="text-xl font-bold text-slate-900">Step 1 — Add Research Papers</h2>
        <p className="text-sm text-slate-500 mt-1">
          Select or upload peer-reviewed papers to build your evidence foundation. We extract
          structured paper profiles (problem, methodology, baselines, and results) directly from
          the text.
        </p>
      </div>

      {error && (
        <div className="flex items-center gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          <AlertCircle size={18} className="shrink-0 text-rose-600" />
          <p>{error}</p>
        </div>
      )}

      {/* Tabs to Add Papers */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
        <div className="flex border-b border-slate-100 pb-3 gap-2">
          <button
            type="button"
            onClick={() => setActiveSubTab('upload')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
              activeSubTab === 'upload'
                ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Upload size={14} />
            <span>Upload Papers</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab('existing')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
              activeSubTab === 'existing'
                ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <FileText size={14} />
            <span>Choose Existing Papers</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab('kb')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
              activeSubTab === 'kb'
                ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Database size={14} />
            <span>Select Knowledge Base</span>
          </button>
        </div>

        {/* Tab 1: Direct File Upload */}
        {activeSubTab === 'upload' && (
          <div className="space-y-4">
            <label className="flex flex-col items-center justify-center border-2 border-dashed border-slate-200 hover:border-indigo-300 rounded-2xl p-8 cursor-pointer bg-slate-50/50 hover:bg-indigo-50/20 transition-all text-center">
              <input
                type="file"
                multiple
                accept=".pdf,.docx,.pptx,.txt"
                onChange={handleFileUpload}
                disabled={uploading}
                className="hidden"
              />
              {uploading ? (
                <div className="space-y-2">
                  <Loader2 size={32} className="animate-spin text-indigo-600 mx-auto" />
                  <p className="text-sm font-semibold text-slate-700">Ingesting & parsing papers...</p>
                  <p className="text-xs text-slate-400">OCR, figures, tables and indexing in progress</p>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
                    <Upload size={24} />
                  </div>
                  <div>
                    <span className="text-sm font-bold text-indigo-600 hover:underline">
                      Click to upload
                    </span>{' '}
                    <span className="text-sm text-slate-600">or drag and drop</span>
                  </div>
                  <p className="text-xs text-slate-400">
                    PDF, DOCX, PPTX, or TXT (Peer-reviewed articles, preprints, conference papers)
                  </p>
                </div>
              )}
            </label>
          </div>
        )}

        {/* Tab 2: Existing Document Library */}
        {activeSubTab === 'existing' && (
          <div className="space-y-3">
            {loadingDocs ? (
              <div className="text-center py-6 text-xs text-slate-400">
                <Loader2 size={20} className="animate-spin mx-auto mb-2 text-indigo-600" />
                Loading your documents...
              </div>
            ) : existingDocs.length === 0 ? (
              <p className="text-xs text-slate-500 py-4 text-center">
                No documents found in your library. Please use Upload Papers.
              </p>
            ) : (
              <div className="grid gap-2 max-h-60 overflow-y-auto pr-1">
                {existingDocs.map((doc) => {
                  const isChecked = selectedDocIds.includes(doc._id);
                  return (
                    <div
                      key={doc._id}
                      onClick={() => toggleSelectDoc(doc._id)}
                      className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${
                        isChecked
                          ? 'border-indigo-300 bg-indigo-50/60'
                          : 'border-slate-200 bg-white hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center gap-3 overflow-hidden">
                        <FileText
                          size={18}
                          className={isChecked ? 'text-indigo-600' : 'text-slate-400'}
                        />
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-800 truncate">
                            {doc.title || doc.originalName || 'Untitled Paper'}
                          </p>
                          <p className="text-[10px] text-slate-400">
                            {doc.pageCount ? `${doc.pageCount} pages • ` : ''}
                            {doc.fileType ? `${doc.fileType.toUpperCase()} • ` : ''}
                            Ready
                          </p>
                        </div>
                      </div>
                      <div
                        className={`w-5 h-5 rounded-md flex items-center justify-center border text-xs ${
                          isChecked
                            ? 'bg-indigo-600 border-indigo-600 text-white'
                            : 'border-slate-300 bg-white'
                        }`}
                      >
                        {isChecked && <CheckCircle2 size={14} />}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Knowledge Base Selector */}
        {activeSubTab === 'kb' && (
          <div className="space-y-3">
            {knowledgeBases.length === 0 ? (
              <p className="text-xs text-slate-500 py-4 text-center">
                No Knowledge Bases created yet.
              </p>
            ) : (
              <div className="grid gap-2 max-h-60 overflow-y-auto pr-1">
                {knowledgeBases.map((kb) => (
                  <div
                    key={kb._id || kb.id}
                    onClick={() => handleSelectKnowledgeBase(kb)}
                    className="flex items-center justify-between p-3 rounded-xl border border-slate-200 bg-white hover:border-indigo-200 hover:bg-indigo-50/30 cursor-pointer transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <Database size={18} className="text-indigo-600" />
                      <div>
                        <p className="text-xs font-bold text-slate-800">{kb.name}</p>
                        <p className="text-[10px] text-slate-400">
                          {kb.docCount || kb.documents?.length || 0} papers attached
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      className="text-xs font-semibold text-indigo-600 hover:underline flex items-center gap-1"
                    >
                      <Plus size={12} /> Add all papers
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Selected Papers List */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={16} className="text-emerald-600" />
            <h3 className="text-sm font-bold text-slate-900">
              Selected Papers in Project ({selectedDocIds.length})
            </h3>
          </div>
          {selectedDocIds.length > 0 && (
            <button
              type="button"
              onClick={handleExtractProfiles}
              disabled={isExecuting}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 transition-all shadow-xs"
            >
              {isExecuting ? (
                <>
                  <Loader2 size={12} className="animate-spin" />
                  <span>Extracting Profiles...</span>
                </>
              ) : (
                <>
                  <RefreshCw size={12} />
                  <span>Extract Structured Profiles</span>
                </>
              )}
            </button>
          )}
        </div>

        {selectedDocIds.length === 0 ? (
          <div className="text-center py-6 text-slate-400 space-y-1">
            <BookOpen size={28} className="mx-auto text-slate-300" />
            <p className="text-xs font-medium">No papers selected yet.</p>
            <p className="text-[11px]">Upload or select at least 1-2 papers to begin.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {selectedDocIds.map((docId, idx) => {
              const profile = profiles.find((p) => p.documentId === docId) || profiles[idx];
              const docObj = existingDocs.find((d) => d._id === docId);
              const displayName =
                profile?.title || docObj?.title || docObj?.originalName || `Paper ${idx + 1}`;

              return (
                <div
                  key={docId}
                  className="py-3 flex items-start justify-between gap-4 hover:bg-slate-50/50 px-2 rounded-lg transition-colors"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <span className="text-xs font-mono text-slate-400 mt-0.5">#{idx + 1}</span>
                    <div className="space-y-1 min-w-0">
                      <p className="text-xs font-bold text-slate-900 truncate">{displayName}</p>
                      <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                        {profile?.authors ? <span>{profile.authors}</span> : null}
                        {profile?.year ? <span>({profile.year})</span> : null}
                        {profile?.venue ? (
                          <span className="italic text-slate-400">• {profile.venue}</span>
                        ) : null}
                        <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100">
                          Ready
                        </span>
                      </div>
                      {profile?.problemStatement && (
                        <p className="text-[11px] text-slate-600 line-clamp-1 italic bg-slate-50 p-1.5 rounded">
                          "{profile.problemStatement}"
                        </p>
                      )}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleRemoveDoc(docId)}
                    className="text-slate-400 hover:text-rose-600 p-1 rounded transition-colors"
                    title="Remove paper"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Extracted Profiles Preview */}
      {profiles.length > 0 && (
        <div className="rounded-2xl border border-indigo-100 bg-indigo-50/30 p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-indigo-950 uppercase tracking-wider">
              Extracted Profile Summary ({profiles.length} papers indexed)
            </h4>
            <span className="text-[11px] text-indigo-700 font-semibold">
              Ready for Literature Review
            </span>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {profiles.map((p, idx) => (
              <div
                key={idx}
                className="rounded-xl border border-indigo-100 bg-white p-3.5 space-y-2 text-xs"
              >
                <p className="font-bold text-slate-900 truncate">
                  {p.title || `Paper #${idx + 1}`}
                </p>
                <div className="text-[11px] text-slate-500 space-y-1">
                  <p>
                    <strong className="text-slate-700">Method:</strong>{' '}
                    {p.methodology || p.modelArchitecture || 'Not specified'}
                  </p>
                  <p>
                    <strong className="text-slate-700">Dataset/Metric:</strong>{' '}
                    {p.dataset || 'Standard'} / {p.metrics || 'Accuracy'}
                  </p>
                  {p.mainResults && (
                    <p>
                      <strong className="text-slate-700">Best Result:</strong> {p.mainResults}
                    </p>
                  )}
                  {p.limitations && (
                    <p className="text-amber-800 bg-amber-50/80 p-1 rounded text-[10px]">
                      <strong>Limitation:</strong> {p.limitations}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Next Step Action */}
      <div className="flex items-center justify-between pt-4 border-t border-slate-100">
        <span className="text-xs text-slate-500">
          {selectedDocIds.length} paper{selectedDocIds.length === 1 ? '' : 's'} linked to project
        </span>
        <button
          type="button"
          onClick={onNext}
          disabled={selectedDocIds.length === 0}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 transition-all shadow-xs"
        >
          <span>Continue to Step 2: Research Goal</span>
          <ArrowRight size={14} />
        </button>
      </div>
    </div>
  );
};

export default Step1AddPapers;
