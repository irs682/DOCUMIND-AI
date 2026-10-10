import React, { useState, useEffect, useRef } from 'react';
import {
  Upload,
  FolderOpen,
  CheckCircle2,
  AlertCircle,
  Loader2,
  RefreshCw,
  GitCompare,
  Search,
  Lightbulb,
  FileText,
  FileCheck,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Check,
  ShieldAlert,
} from 'lucide-react';
import Button from '../common/Button';
import Input from '../common/Input';
import api from '../../services/api';

const MAIN_MODES = [
  {
    id: 'paper_comparison',
    label: 'Compare Papers',
    desc: 'Compare methods, datasets, and results across papers',
    minPapers: 2,
    icon: GitCompare,
  },
  {
    id: 'gap_analysis',
    label: 'Find Research Gaps',
    desc: 'Identify genuine gaps supported by your sources',
    minPapers: 1,
    icon: Search,
  },
  {
    id: 'idea_generation',
    label: 'Generate Research Ideas',
    desc: 'Formulate hypotheses and grounded proposals',
    minPapers: 1,
    icon: Lightbulb,
  },
  {
    id: 'synthesis',
    label: 'Create Research Report',
    desc: 'Comprehensive multi-paper synthesis report',
    minPapers: 1,
    icon: FileText,
  },
];

const ADVANCED_MODES = [
  { id: 'proposal', label: 'Research Proposal', desc: 'Full academic grant/study proposal' },
  { id: 'review_paper', label: 'Review / Survey Paper', desc: 'Systematic literature review draft' },
  { id: 'original_research_draft', label: 'Original Research Draft', desc: 'Evidence-grounded original paper draft' },
];

const DEPTH_OPTIONS = [
  { id: 'quick', label: 'Quick' },
  { id: 'standard', label: 'Standard' },
  { id: 'deep', label: 'Deep' },
];

const ACADEMIC_STYLES = ['Generic', 'IEEE', 'Elsevier', 'Springer'];

const ResearchStudioForm = ({
  onStartResearch,
  knowledgeBases = [],
  isResearching = false,
}) => {
  // Step 1: Sources
  const [sourceTab, setSourceTab] = useState('upload'); // 'upload' | 'existing'
  const [availableDocs, setAvailableDocs] = useState([]);
  const [selectedDocIds, setSelectedDocIds] = useState([]);
  const [selectedKbId, setSelectedKbId] = useState('');
  const [uploadQueue, setUploadQueue] = useState([]);
  const [dragActive, setDragActive] = useState(false);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const fileInputRef = useRef(null);

  // Step 2: Mode & Advanced
  const [researchMode, setResearchMode] = useState('paper_comparison');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [depth, setDepth] = useState('standard');
  const [academicStyle, setAcademicStyle] = useState('Generic');

  // Step 3: Topic & Focus
  const [topic, setTopic] = useState('');
  const [questions, setQuestions] = useState('');

  // Safeguards for Original Draft
  const [hasUserResults, setHasUserResults] = useState(false);
  const [userResultsText, setUserResultsText] = useState('');

  // Fetch user docs on mount
  const fetchUserDocuments = async () => {
    try {
      setLoadingDocs(true);
      const res = await api.get('/documents');
      if (res.data?.documents) {
        setAvailableDocs(res.data.documents);
        const readyIds = res.data.documents.filter((d) => d.status === 'ready').map((d) => d._id);
        if (readyIds.length > 0 && selectedDocIds.length === 0) {
          setSelectedDocIds(readyIds.slice(0, 3));
        }
      }
    } catch (err) {
      console.warn('Could not load user documents:', err.message);
    } finally {
      setLoadingDocs(false);
    }
  };

  useEffect(() => {
    fetchUserDocuments();
  }, []);

  // Upload Handlers
  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true);
    else if (e.type === 'dragleave') setDragActive(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(Array.from(e.dataTransfer.files));
    }
  };

  const handleFiles = (files) => {
    files.forEach((file) => {
      const queueItem = {
        id: `upload-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
        name: file.name,
        size: `${(file.size / (1024 * 1024)).toFixed(1)} MB`,
        status: 'uploading',
        file,
      };
      setUploadQueue((prev) => [queueItem, ...prev]);
      uploadFile(queueItem);
    });
  };

  const uploadFile = async (item) => {
    const formData = new FormData();
    formData.append('file', item.file);

    try {
      const res = await api.post('/documents/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const doc = res.data?.document;
      if (doc) {
        setUploadQueue((prev) =>
          prev.map((q) => (q.id === item.id ? { ...q, status: 'indexing', docId: doc._id } : q))
        );
        setSelectedDocIds((prev) => (prev.includes(doc._id) ? prev : [...prev, doc._id]));
        pollStatus(doc._id, item.id);
      }
    } catch (err) {
      setUploadQueue((prev) =>
        prev.map((q) => (q.id === item.id ? { ...q, status: 'failed', error: err.message } : q))
      );
    }
  };

  const pollStatus = (docId, queueId) => {
    let count = 0;
    const interval = setInterval(async () => {
      count++;
      try {
        const res = await api.get(`/documents/${docId}`);
        const status = res.data?.document?.status;
        if (status === 'ready') {
          clearInterval(interval);
          setUploadQueue((prev) =>
            prev.map((q) => (q.id === queueId ? { ...q, status: 'ready' } : q))
          );
          fetchUserDocuments();
        } else if (status === 'failed' || count > 20) {
          clearInterval(interval);
          setUploadQueue((prev) =>
            prev.map((q) => (q.id === queueId ? { ...q, status: 'ready' } : q))
          );
        }
      } catch (_) {
        if (count > 20) clearInterval(interval);
      }
    }, 2000);
  };

  const toggleDocSelection = (docId) => {
    setSelectedDocIds((prev) =>
      prev.includes(docId) ? prev.filter((id) => id !== docId) : [...prev, docId]
    );
  };

  // Validation
  const activeModeConfig =
    MAIN_MODES.find((m) => m.id === researchMode) ||
    ADVANCED_MODES.find((m) => m.id === researchMode);
  const minRequiredPapers = activeModeConfig?.minPapers || 1;
  const hasEnoughPapers = selectedDocIds.length >= minRequiredPapers || selectedKbId !== '';
  const isUploading = uploadQueue.some((q) => q.status === 'uploading');
  const isFormValid = Boolean(topic.trim()) && hasEnoughPapers && !isUploading;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!isFormValid || isResearching) return;

    onStartResearch({
      topic: topic.trim(),
      title: topic.trim(),
      questions: questions.trim(),
      researchMode,
      sourceMode: selectedKbId ? 'knowledge_base' : 'uploaded_documents',
      documentIds: selectedDocIds,
      knowledgeBaseIds: selectedKbId ? [selectedKbId] : [],
      depth,
      formatStyle: `${academicStyle}-style`,
      paperType: activeModeConfig?.label || 'Research Report',
      userResults: {
        hasExperimentalResults: hasUserResults,
        userResultsText: userResultsText.trim(),
      },
    });
  };

  return (
    <form onSubmit={handleSubmit} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-7">
      {/* ── STEP 1: ADD RESEARCH PAPERS ── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-600 text-[11px] font-bold text-white">
              1
            </span>
            <h3 className="text-sm font-bold text-slate-900">Add your research papers</h3>
          </div>
          <span className="text-[11px] font-semibold text-slate-500">
            {selectedDocIds.length} paper{selectedDocIds.length === 1 ? '' : 's'} selected
          </span>
        </div>

        {/* Source Toggle */}
        <div className="flex rounded-xl bg-slate-100 p-1 border border-slate-200 text-xs">
          <button
            type="button"
            onClick={() => setSourceTab('upload')}
            className={`flex-1 py-1.5 rounded-lg font-semibold transition-all ${
              sourceTab === 'upload' ? 'bg-white text-indigo-700 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Upload Papers
          </button>
          <button
            type="button"
            onClick={() => setSourceTab('existing')}
            className={`flex-1 py-1.5 rounded-lg font-semibold transition-all ${
              sourceTab === 'existing' ? 'bg-white text-indigo-700 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Choose from My Documents
          </button>
        </div>

        {/* Tab Content: Upload */}
        {sourceTab === 'upload' && (
          <div className="space-y-2.5">
            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-colors ${
                dragActive ? 'border-indigo-500 bg-indigo-50/50' : 'border-slate-300 hover:border-indigo-400 bg-slate-50/50'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".pdf,.docx,.txt"
                onChange={(e) => e.target.files && handleFiles(Array.from(e.target.files))}
                className="hidden"
              />
              <Upload size={22} className="mx-auto text-indigo-600 mb-1.5" />
              <p className="text-xs font-semibold text-slate-800">
                Drag & drop PDF / DOCX files here
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                or <span className="text-indigo-600 underline font-semibold">Browse Files</span>
              </p>
            </div>

            {/* Upload Queue / Selected Papers */}
            {uploadQueue.length > 0 && (
              <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                {uploadQueue.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-200 text-xs"
                  >
                    <span className="truncate max-w-[200px] font-medium text-slate-800">{item.name}</span>
                    <div>
                      {item.status === 'uploading' && (
                        <span className="flex items-center gap-1 text-[11px] text-amber-600">
                          <Loader2 size={12} className="animate-spin" /> Uploading
                        </span>
                      )}
                      {item.status === 'indexing' && (
                        <span className="flex items-center gap-1 text-[11px] text-indigo-600">
                          <Loader2 size={12} className="animate-spin" /> Readying
                        </span>
                      )}
                      {item.status === 'ready' && (
                        <span className="flex items-center gap-1 text-[11px] text-emerald-600 font-bold">
                          <CheckCircle2 size={12} /> Ready
                        </span>
                      )}
                      {item.status === 'failed' && (
                        <button
                          type="button"
                          onClick={() => uploadFile(item)}
                          className="flex items-center gap-1 text-[11px] text-rose-600 hover:underline"
                        >
                          <RefreshCw size={11} /> Retry
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab Content: Existing Documents */}
        {sourceTab === 'existing' && (
          <div className="space-y-2">
            {knowledgeBases.length > 0 && (
              <select
                value={selectedKbId}
                onChange={(e) => setSelectedKbId(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-200"
              >
                <option value="">All Uploaded Documents</option>
                {knowledgeBases.map((kb) => (
                  <option key={kb.id} value={kb.id}>
                    Knowledge Base: {kb.name} ({kb.docCount} docs)
                  </option>
                ))}
              </select>
            )}

            <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1">
              {availableDocs.map((doc) => {
                const isSelected = selectedDocIds.includes(doc._id);
                return (
                  <div
                    key={doc._id}
                    onClick={() => toggleDocSelection(doc._id)}
                    className={`flex items-center justify-between p-2 rounded-lg border text-xs cursor-pointer transition-colors ${
                      isSelected
                        ? 'border-indigo-300 bg-indigo-50/50 font-semibold text-slate-900'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <div
                        className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                          isSelected ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-slate-300'
                        }`}
                      >
                        {isSelected && <Check size={11} />}
                      </div>
                      <span className="truncate">{doc.name || doc.originalName}</span>
                    </div>
                    <span className="text-[10px] text-emerald-600 font-semibold uppercase">Ready</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ── STEP 2: WHAT WOULD YOU LIKE TO DO? ── */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-600 text-[11px] font-bold text-white">
            2
          </span>
          <h3 className="text-sm font-bold text-slate-900">What would you like to do?</h3>
        </div>

        {/* 4 Primary Simplified Modes */}
        <div className="grid grid-cols-2 gap-2">
          {MAIN_MODES.map((mode) => {
            const isSelected = researchMode === mode.id;
            const Icon = mode.icon;
            return (
              <button
                key={mode.id}
                type="button"
                onClick={() => setResearchMode(mode.id)}
                className={`flex flex-col items-start p-3 rounded-xl border text-left transition-all ${
                  isSelected
                    ? 'border-indigo-600 bg-indigo-50/70 ring-2 ring-indigo-500/20'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Icon size={14} className={isSelected ? 'text-indigo-600' : 'text-slate-500'} />
                  <span className={`text-xs font-bold ${isSelected ? 'text-indigo-950' : 'text-slate-900'}`}>
                    {mode.label}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 line-clamp-1">{mode.desc}</p>
              </button>
            );
          })}
        </div>

        {/* Progressive Disclosure: More Options Toggle */}
        <div>
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-800 transition-colors pt-1"
          >
            <span>{showAdvanced ? 'Hide advanced options' : 'More options'}</span>
            {showAdvanced ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>

          {/* Advanced Drawer */}
          {showAdvanced && (
            <div className="mt-3 p-4 rounded-xl border border-slate-200 bg-slate-50/70 space-y-4 text-xs">
              <div>
                <p className="font-bold text-slate-700 uppercase tracking-wider text-[10px] mb-2">
                  Advanced Research Outputs
                </p>
                <div className="grid grid-cols-1 gap-1.5">
                  {ADVANCED_MODES.map((adv) => {
                    const isSelected = researchMode === adv.id;
                    return (
                      <button
                        key={adv.id}
                        type="button"
                        onClick={() => setResearchMode(adv.id)}
                        className={`flex items-center justify-between p-2.5 rounded-lg border text-left transition-all ${
                          isSelected
                            ? 'border-indigo-500 bg-white font-bold text-indigo-900 shadow-xs'
                            : 'border-slate-200 bg-white/70 text-slate-700 hover:bg-white'
                        }`}
                      >
                        <span className="font-semibold">{adv.label}</span>
                        <span className="text-[10px] text-slate-500">{adv.desc}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Research Depth & Academic Style */}
              <div className="grid grid-cols-2 gap-3 pt-1 border-t border-slate-200">
                <div>
                  <label className="block font-bold text-slate-700 text-[10px] uppercase mb-1">
                    Research Depth
                  </label>
                  <div className="flex rounded-lg bg-white border border-slate-200 p-0.5 text-center">
                    {DEPTH_OPTIONS.map((d) => (
                      <button
                        key={d.id}
                        type="button"
                        onClick={() => setDepth(d.id)}
                        className={`flex-1 py-1 rounded text-[11px] font-semibold transition-all ${
                          depth === d.id ? 'bg-indigo-600 text-white font-bold' : 'text-slate-600'
                        }`}
                      >
                        {d.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 text-[10px] uppercase mb-1">
                    Academic Style
                  </label>
                  <select
                    value={academicStyle}
                    onChange={(e) => setAcademicStyle(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-800 focus:outline-none"
                  >
                    {ACADEMIC_STYLES.map((style) => (
                      <option key={style} value={style}>
                        {style}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Original Draft Safeguards if active */}
              {researchMode === 'original_research_draft' && (
                <div className="pt-2 border-t border-slate-200 space-y-2">
                  <div className="flex items-center gap-1.5 font-bold text-amber-900 text-[11px]">
                    <ShieldAlert size={14} className="text-amber-600" />
                    <span>User Experimental Data (Optional)</span>
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer text-[11px] text-slate-700">
                    <input
                      type="checkbox"
                      checked={hasUserResults}
                      onChange={(e) => setHasUserResults(e.target.checked)}
                      className="rounded text-indigo-600"
                    />
                    <span>I have verified experimental/simulation measurements</span>
                  </label>
                  {hasUserResults && (
                    <textarea
                      rows={2}
                      value={userResultsText}
                      onChange={(e) => setUserResultsText(e.target.value)}
                      placeholder="Paste your verified test metrics or measurements here..."
                      className="w-full rounded-lg border border-slate-300 bg-white p-2 text-xs text-slate-800"
                    />
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── STEP 3: TELL US WHAT YOU ARE RESEARCHING ── */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-600 text-[11px] font-bold text-white">
            3
          </span>
          <h3 className="text-sm font-bold text-slate-900">Tell us what you are researching</h3>
        </div>

        <Input
          label="Research topic or question"
          placeholder="e.g. Vision-Language-Action models in robotics manipulation"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          required
        />

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Optional focus / questions
          </label>
          <textarea
            rows={2}
            value={questions}
            onChange={(e) => setQuestions(e.target.value)}
            placeholder="1. How do baseline benchmarks compare?&#10;2. What parameters remain unverified?"
            className="w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs text-slate-900 placeholder-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
          />
        </div>
      </div>

      {/* Validation Warning if minimum papers not met */}
      {!hasEnoughPapers && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-slate-50 text-slate-600 text-xs border border-slate-200">
          <AlertCircle size={15} className="text-amber-500 shrink-0" />
          <span>
            {researchMode === 'paper_comparison'
              ? 'Please select or upload at least 2 papers for comparison.'
              : 'Please select or upload at least 1 paper.'}
          </span>
        </div>
      )}

      {/* Start Research Button */}
      <div className="pt-1">
        <Button
          type="submit"
          disabled={!isFormValid || isResearching}
          leftIcon={isResearching ? Loader2 : Sparkles}
          className="w-full justify-center py-2.5 text-sm font-bold"
        >
          {isResearching ? 'Analyzing your papers...' : 'Start Research'}
        </Button>
      </div>
    </form>
  );
};

export default ResearchStudioForm;
