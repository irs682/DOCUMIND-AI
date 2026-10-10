import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import {
  GitCompare,
  FileText,
  ArrowRight,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Clock,
  Layers,
  Calendar,
  Hash,
  Sparkles,
  ChevronRight,
  Filter,
  History,
  Trash2,
  Table,
} from 'lucide-react';
import { fetchDocuments } from '../../api/documentsApi';
import { comparisonApi } from '../../services/comparisonApi';
import ComparisonDrawer from '../../components/comparison/ComparisonDrawer';
import Button from '../../components/common/Button';
import Badge from '../../components/common/Badge';

const CATEGORY_TABS = [
  { id: 'all', label: 'All Findings' },
  { id: 'differences', label: 'Differences' },
  { id: 'added', label: 'Added' },
  { id: 'removed', label: 'Removed' },
  { id: 'numericalChanges', label: 'Numbers & Dates' },
  { id: 'requirementChanges', label: 'Requirements' },
  { id: 'tableChanges', label: 'Tables' },
  { id: 'contradictions', label: 'Contradictions' },
  { id: 'similarities', label: 'Similarities' },
];

const CompareDocuments = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const urlDocA = searchParams.get('docA');
  const urlDocB = searchParams.get('docB');
  const projectId = searchParams.get('project');

  // Document states
  const [documents, setDocuments] = useState([]);
  const [loadingDocs, setLoadingDocs] = useState(true);
  const [selectedDocAId, setSelectedDocAId] = useState(urlDocA || '');
  const [selectedDocBId, setSelectedDocBId] = useState(urlDocB || '');

  // Comparison execution states
  const [isComparing, setIsComparing] = useState(false);
  const [comparisonProgress, setComparisonProgress] = useState('');
  const [comparisonResult, setComparisonResult] = useState(null);
  const [error, setError] = useState(null);

  // View & Filter states
  const [activeTab, setActiveTab] = useState('executive'); // 'executive' | 'findings'
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [inspectingFinding, setInspectingFinding] = useState(null);

  // Past comparisons history
  const [history, setHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);

  // Load available documents
  const loadDocs = useCallback(async () => {
    try {
      setLoadingDocs(true);
      const docs = await fetchDocuments();
      setDocuments(docs || []);
    } catch (err) {
      console.error('Failed to load documents:', err);
    } finally {
      setLoadingDocs(false);
    }
  }, []);

  // Load comparison history
  const loadHistory = useCallback(async () => {
    try {
      const data = await comparisonApi.getComparisons(projectId);
      setHistory(data.comparisons || []);
    } catch (_) {}
  }, [projectId]);

  useEffect(() => {
    loadDocs();
    loadHistory();
  }, [loadDocs, loadHistory]);

  // Execute Comparison
  const handleStartComparison = async (forceRecompute = false) => {
    if (!selectedDocAId || !selectedDocBId) {
      setError('Please select both Document A and Document B.');
      return;
    }

    if (selectedDocAId === selectedDocBId) {
      setError('Please select two distinct documents to compare.');
      return;
    }

    try {
      setError(null);
      setIsComparing(true);
      setComparisonProgress('Extracting and normalizing sections…');

      // Update URL query params
      setSearchParams({ docA: selectedDocAId, docB: selectedDocBId, ...(projectId ? { project: projectId } : {}) });

      const progressInterval = setInterval(() => {
        setComparisonProgress((prev) => {
          if (prev.includes('Extracting')) return 'Matching document structure and headings…';
          if (prev.includes('Matching')) return 'Analyzing pairwise section changes & numbers…';
          if (prev.includes('Analyzing')) return 'Synthesizing executive comparison report…';
          return prev;
        });
      }, 2500);

      const result = await comparisonApi.compareDocuments({
        documentAId: selectedDocAId,
        documentBId: selectedDocBId,
        projectId,
        forceRecompute,
      });

      clearInterval(progressInterval);
      setComparisonResult(result);
      loadHistory();
    } catch (err) {
      console.error('Comparison error:', err);
      setError(err.response?.data?.message || err.message || 'Comparison failed. Please try again.');
    } finally {
      setIsComparing(false);
      setComparisonProgress('');
    }
  };

  const handleSelectHistoryItem = async (histId) => {
    try {
      setIsComparing(true);
      const full = await comparisonApi.getComparisonById(histId);
      setComparisonResult(full);
      setSelectedDocAId(full.documentA?._id || full.documentA);
      setSelectedDocBId(full.documentB?._id || full.documentB);
      setShowHistory(false);
    } catch (err) {
      alert('Failed to load past comparison: ' + err.message);
    } finally {
      setIsComparing(false);
    }
  };

  const handleDeleteHistoryItem = async (e, histId) => {
    e.stopPropagation();
    try {
      await comparisonApi.deleteComparison(histId);
      setHistory((prev) => prev.filter((h) => h._id !== histId));
      if (comparisonResult?._id === histId) {
        setComparisonResult(null);
      }
    } catch (err) {
      alert('Failed to delete comparison: ' + err.message);
    }
  };

  const docA = documents.find((d) => (d._id || d.id) === selectedDocAId);
  const docB = documents.find((d) => (d._id || d.id) === selectedDocBId);

  // Filter findings
  const rawFindings = comparisonResult?.findings || [];
  const filteredFindings = rawFindings.filter((f) => {
    if (selectedCategory === 'all') return true;
    if (selectedCategory === 'numericalChanges') {
      return f.category === 'numericalChanges' || f.category === 'dateChanges';
    }
    return f.category === selectedCategory;
  });

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-indigo-600">
            <GitCompare size={16} />
            <span>Document Intelligence</span>
          </div>
          <h1 className="mt-1 text-2xl font-bold text-slate-900 sm:text-3xl">
            Compare Documents
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Semantically analyze two document versions for changes, added requirements, modified metrics, and contradictions.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            leftIcon={History}
            onClick={() => setShowHistory(!showHistory)}
            className="text-slate-600"
          >
            History ({history.length})
          </Button>
          {comparisonResult && (
            <Button
              variant="outline"
              leftIcon={RefreshCw}
              onClick={() => handleStartComparison(true)}
              disabled={isComparing}
            >
              Recompute
            </Button>
          )}
        </div>
      </div>

      {/* Document Selection Deck */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative">
        {/* Document A Card */}
        <div
          className={`rounded-2xl border p-6 transition shadow-xs ${
            docA ? 'border-indigo-200 bg-white' : 'border-slate-200 bg-slate-50/70'
          }`}
        >
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Document A (Baseline / Prior)
            </span>
            {docA && (
              <span className="text-xs font-medium text-emerald-600 flex items-center gap-1">
                <CheckCircle2 size={13} /> Selected
              </span>
            )}
          </div>

          <label className="block text-xs font-semibold text-slate-700 mb-2">
            Select Document
          </label>
          <select
            value={selectedDocAId}
            onChange={(e) => setSelectedDocAId(e.target.value)}
            disabled={isComparing}
            className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-800 shadow-xs focus:border-indigo-500 focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
          >
            <option value="">-- Choose first document --</option>
            {documents.map((d) => (
              <option key={d._id || d.id} value={d._id || d.id} disabled={(d._id || d.id) === selectedDocBId}>
                {d.name || d.originalName} ({d.formattedSize || `${Math.round(d.size / 1024)} KB`})
              </option>
            ))}
          </select>

          {docA && (
            <div className="mt-4 rounded-xl bg-slate-50 p-3.5 border border-slate-100 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-100 text-indigo-700 shrink-0">
                <FileText size={20} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-bold text-slate-800 truncate">
                  {docA.name || docA.originalName}
                </div>
                <div className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                  <span>{docA.chunksCount || 0} chunks</span>
                  <span>•</span>
                  <span className="capitalize">{docA.status || 'Ready'}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Document B Card */}
        <div
          className={`rounded-2xl border p-6 transition shadow-xs ${
            docB ? 'border-indigo-200 bg-white' : 'border-slate-200 bg-slate-50/70'
          }`}
        >
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">
              Document B (Updated / Compare Target)
            </span>
            {docB && (
              <span className="text-xs font-medium text-emerald-600 flex items-center gap-1">
                <CheckCircle2 size={13} /> Selected
              </span>
            )}
          </div>

          <label className="block text-xs font-semibold text-slate-700 mb-2">
            Select Document
          </label>
          <select
            value={selectedDocBId}
            onChange={(e) => setSelectedDocBId(e.target.value)}
            disabled={isComparing}
            className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-800 shadow-xs focus:border-indigo-500 focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
          >
            <option value="">-- Choose second document --</option>
            {documents.map((d) => (
              <option key={d._id || d.id} value={d._id || d.id} disabled={(d._id || d.id) === selectedDocAId}>
                {d.name || d.originalName} ({d.formattedSize || `${Math.round(d.size / 1024)} KB`})
              </option>
            ))}
          </select>

          {docB && (
            <div className="mt-4 rounded-xl bg-indigo-50/40 p-3.5 border border-indigo-100/80 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-600 text-white shrink-0">
                <FileText size={20} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-bold text-slate-800 truncate">
                  {docB.name || docB.originalName}
                </div>
                <div className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                  <span>{docB.chunksCount || 0} chunks</span>
                  <span>•</span>
                  <span className="capitalize">{docB.status || 'Ready'}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Compare Trigger Button */}
      <div className="flex flex-col items-center justify-center gap-3 pt-2">
        <Button
          size="lg"
          leftIcon={GitCompare}
          onClick={() => handleStartComparison(false)}
          disabled={!selectedDocAId || !selectedDocBId || isComparing}
          className="px-8 py-3.5 shadow-md text-base"
        >
          {isComparing ? 'Comparing Documents…' : 'Compare Documents'}
        </Button>

        {isComparing && (
          <div className="flex items-center gap-2.5 text-sm font-medium text-indigo-600 animate-pulse mt-2">
            <RefreshCw size={16} className="animate-spin" />
            <span>{comparisonProgress || 'Processing documents…'}</span>
          </div>
        )}

        {error && (
          <div className="mt-2 rounded-xl bg-rose-50 border border-rose-200 p-4 text-sm font-medium text-rose-700 flex items-center gap-2.5 max-w-lg text-center">
            <AlertCircle size={18} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}
      </div>

      {/* Comparison History Modal / Drawer */}
      {showHistory && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700">
              Past Comparison History
            </h3>
            <button
              onClick={() => setShowHistory(false)}
              className="text-xs font-semibold text-slate-400 hover:text-slate-600"
            >
              Close
            </button>
          </div>

          {history.length === 0 ? (
            <p className="text-sm text-slate-400 py-4">No previous comparisons found.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {history.map((item) => (
                <div
                  key={item._id}
                  onClick={() => handleSelectHistoryItem(item._id)}
                  className="cursor-pointer rounded-xl border border-slate-200 bg-slate-50/50 p-4 hover:border-indigo-300 hover:bg-indigo-50/20 transition flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                      <span>{new Date(item.createdAt).toLocaleDateString()}</span>
                      <button
                        onClick={(e) => handleDeleteHistoryItem(e, item._id)}
                        className="text-slate-400 hover:text-rose-600 transition"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                    <div className="text-sm font-bold text-slate-800 line-clamp-1">
                      {item.documentAName} ↔ {item.documentBName}
                    </div>
                  </div>
                  <div className="mt-3 flex items-center justify-between text-xs font-semibold">
                    <span className="text-indigo-600">{item.similarityScore}% Similarity</span>
                    <span className="text-slate-500">{item.stats?.totalDifferences || 0} changes</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Comparison Results Section */}
      {comparisonResult && (
        <div className="space-y-6 pt-4">
          {/* Executive Overview Banner */}
          <div className="rounded-3xl border border-indigo-100 bg-white p-6 sm:p-8 shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 border-b border-slate-100 pb-6">
              <div>
                <div className="flex items-center gap-2">
                  <span className="rounded-md bg-indigo-50 text-indigo-700 px-2.5 py-0.5 text-xs font-bold border border-indigo-200">
                    Verified Analysis
                  </span>
                  <span className="text-xs text-slate-400">
                    Compared on {new Date(comparisonResult.updatedAt || comparisonResult.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <h2 className="mt-2 text-xl font-bold text-slate-900 sm:text-2xl">
                  {comparisonResult.documentAName} <span className="text-slate-400 font-normal">vs</span> {comparisonResult.documentBName}
                </h2>
              </div>

              {/* Similarity Score Meter */}
              <div className="flex items-center gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100 shrink-0">
                <div className="text-right">
                  <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Overall Similarity
                  </div>
                  <div className="text-2xl font-black text-indigo-600">
                    {comparisonResult.similarityScore}%
                  </div>
                </div>
                <div className="h-10 w-px bg-slate-200" />
                <div className="text-left">
                  <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Total Findings
                  </div>
                  <div className="text-2xl font-bold text-slate-800">
                    {comparisonResult.findings?.length || 0}
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Metrics Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
              <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-3 text-center">
                <div className="text-xs text-slate-500 font-medium">Differences</div>
                <div className="text-lg font-bold text-slate-900 mt-0.5">
                  {comparisonResult.stats?.totalDifferences || 0}
                </div>
              </div>
              <div className="rounded-xl border border-emerald-100 bg-emerald-50/30 p-3 text-center">
                <div className="text-xs text-emerald-700 font-medium">Similarities</div>
                <div className="text-lg font-bold text-emerald-800 mt-0.5">
                  {comparisonResult.stats?.totalSimilarities || 0}
                </div>
              </div>
              <div className="rounded-xl border border-blue-100 bg-blue-50/30 p-3 text-center">
                <div className="text-xs text-blue-700 font-medium">Added</div>
                <div className="text-lg font-bold text-blue-800 mt-0.5">
                  {comparisonResult.stats?.totalAdded || 0}
                </div>
              </div>
              <div className="rounded-xl border border-rose-100 bg-rose-50/30 p-3 text-center">
                <div className="text-xs text-rose-700 font-medium">Removed</div>
                <div className="text-lg font-bold text-rose-800 mt-0.5">
                  {comparisonResult.stats?.totalRemoved || 0}
                </div>
              </div>
              <div className="rounded-xl border border-purple-100 bg-purple-50/30 p-3 text-center">
                <div className="text-xs text-purple-700 font-medium">Numbers/Dates</div>
                <div className="text-lg font-bold text-purple-800 mt-0.5">
                  {(comparisonResult.stats?.totalNumericChanges || 0) + (comparisonResult.stats?.totalDateChanges || 0)}
                </div>
              </div>
              <div className="rounded-xl border border-amber-100 bg-amber-50/30 p-3 text-center">
                <div className="text-xs text-amber-700 font-medium">Contradictions</div>
                <div className="text-lg font-bold text-amber-800 mt-0.5">
                  {comparisonResult.stats?.totalContradictions || 0}
                </div>
              </div>
            </div>
          </div>

          {/* Tab Navigation: Executive Report vs Findings */}
          <div className="flex items-center gap-2 border-b border-slate-200">
            <button
              onClick={() => setActiveTab('executive')}
              className={`pb-3 px-4 text-sm font-semibold border-b-2 transition ${
                activeTab === 'executive'
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              Executive Report
            </button>
            <button
              onClick={() => setActiveTab('findings')}
              className={`pb-3 px-4 text-sm font-semibold border-b-2 transition flex items-center gap-2 ${
                activeTab === 'findings'
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <span>Structured Findings</span>
              <span className="rounded-full bg-indigo-50 text-indigo-700 px-2 py-0.2 text-xs font-bold">
                {rawFindings.length}
              </span>
            </button>
          </div>

          {/* TAB 1: Executive Report */}
          {activeTab === 'executive' && (
            <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xs leading-relaxed text-slate-800 whitespace-pre-wrap font-sans text-sm sm:text-base space-y-4">
              {comparisonResult.summary}
            </div>
          )}

          {/* TAB 2: Structured Findings Explorer */}
          {activeTab === 'findings' && (
            <div className="space-y-6">
              {/* Category Filter Pills */}
              <div className="flex flex-wrap gap-2">
                {CATEGORY_TABS.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setSelectedCategory(tab.id)}
                    className={`rounded-xl px-3.5 py-1.5 text-xs font-semibold transition ${
                      selectedCategory === tab.id
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Findings List Cards */}
              {filteredFindings.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center text-slate-400 text-sm">
                  No findings in this category.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredFindings.map((finding) => (
                    <div
                      key={finding.id}
                      onClick={() => setInspectingFinding(finding)}
                      className="cursor-pointer rounded-2xl border border-slate-200 bg-white p-5 hover:border-indigo-300 hover:shadow-md transition flex flex-col justify-between space-y-3"
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <span className="rounded bg-slate-100 text-slate-700 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider">
                            {finding.category}
                          </span>
                          <span className="text-[11px] font-medium text-slate-400">
                            P.{finding.sourceB?.page || finding.sourceA?.page || 1}
                          </span>
                        </div>
                        <h4 className="text-sm font-bold text-slate-900 leading-snug">
                          {finding.title}
                        </h4>
                        <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                          {finding.description}
                        </p>
                      </div>

                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-indigo-600">
                        <span>Inspect Side-by-Side</span>
                        <ChevronRight size={15} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Side-by-Side Detail Drawer */}
      <ComparisonDrawer
        finding={inspectingFinding}
        isOpen={Boolean(inspectingFinding)}
        onClose={() => setInspectingFinding(null)}
        docAName={comparisonResult?.documentAName}
        docBName={comparisonResult?.documentBName}
      />
    </div>
  );
};

export default CompareDocuments;
