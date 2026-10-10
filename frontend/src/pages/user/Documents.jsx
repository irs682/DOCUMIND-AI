import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, LayoutGrid, List, Search, FileText, CheckCircle2, RefreshCw, AlertCircle, GitCompare } from 'lucide-react';
import DocumentCard from '../../components/documents/DocumentCard';
import DocumentTable from '../../components/documents/DocumentTable';
import DocumentUpload from '../../components/documents/DocumentUpload';
import DocumentPreview from '../../components/documents/DocumentPreview';
import Modal from '../../components/common/Modal';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import EmptyState from '../../components/common/EmptyState';
import ExtractionModal from '../../components/extractions/ExtractionModal';
import { fetchDocuments, deleteDocument as apiDeleteDocument } from '../../api/documentsApi';
import { fetchKnowledgeBases } from '../../api/knowledgeBasesApi';
import { extractionApi } from '../../services/extractionApi';

const Documents = () => {
  const navigate = useNavigate();
  const [documents, setDocuments] = useState([]);
  const [knowledgeBases, setKnowledgeBases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [viewMode, setViewMode] = useState('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedKbFilter, setSelectedKbFilter] = useState('all');
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [previewDoc, setPreviewDoc] = useState(null);
  const [extractionDocument, setExtractionDocument] = useState(null);
  const [isExtractionModalOpen, setIsExtractionModalOpen] = useState(false);
  const [isStartingExtraction, setIsStartingExtraction] = useState(false);
  const [extractionError, setExtractionError] = useState('');

  // ── Load documents & KBs from backend ──────────────────────────────────────────
  const loadDocuments = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [docs, kbs] = await Promise.all([
        fetchDocuments().catch(() => []),
        fetchKnowledgeBases().catch(() => []),
      ]);
      setDocuments(docs || []);
      setKnowledgeBases(kbs || []);
    } catch (err) {
      console.error('Failed to load documents:', err);
      setError('Could not load documents. Make sure the backend server is running.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  // Auto-refresh every 3s if any document is still in progress
  useEffect(() => {
    const processingStatuses = [
      'uploaded', 'processing', 'validating', 'loading', 'extracting',
      'ocr_processing', 'table_extraction', 'cleaning', 'splitting', 'embedding', 'indexing'
    ];
    const hasProcessing = documents.some((d) => processingStatuses.includes(d.status));
    if (!hasProcessing) return;
    const timer = setTimeout(loadDocuments, 3000);
    return () => clearTimeout(timer);
  }, [documents, loadDocuments]);

  const handleUploadSuccess = (newDoc) => {
    setDocuments((prev) => [newDoc, ...prev]);
    setIsUploadModalOpen(false);
    // Refresh after a few seconds to get the indexed status
    setTimeout(loadDocuments, 8000);
  };

  const handleDelete = async (docId) => {
    try {
      await apiDeleteDocument(docId);
      setDocuments((prev) => prev.filter((d) => (d._id || d.id) !== docId));
    } catch (err) {
      console.error('Delete failed:', err);
      alert('Failed to delete document. Please try again.');
    }
  };

  const handleBulkDelete = async (ids) => {
    await Promise.all(ids.map((id) => apiDeleteDocument(id).catch(() => {})));
    setDocuments((prev) => prev.filter((d) => !ids.includes(d._id || d.id)));
  };

  const handleDownload = (doc) => {
    alert(`Downloading ${doc.name || doc.originalName}...`);
  };

  const handleOpenExtraction = (doc) => {
    setExtractionDocument({ ...doc, id: doc.id || doc._id });
    setExtractionError('');
    setIsExtractionModalOpen(true);
  };

  const handleStartExtraction = async (payload) => {
    try {
      setIsStartingExtraction(true);
      setExtractionError('');
      const { extraction } = await extractionApi.create(payload);
      const extractionId = extraction?._id || extraction?.id;

      if (!extractionId) {
        throw new Error('The extraction service did not return a result identifier.');
      }

      setIsExtractionModalOpen(false);
      navigate(`/extractions/${extractionId}`, { state: { extraction } });
    } catch (requestError) {
      setExtractionError(
        requestError.response?.data?.message ||
        requestError.message ||
        'Unable to start information extraction. Please try again.'
      );
    } finally {
      setIsStartingExtraction(false);
    }
  };

  const filteredDocs = documents.filter((doc) => {
    const name = doc.name || doc.originalName || '';
    const matchesSearch = name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesKb =
      selectedKbFilter === 'all' ||
      (doc.knowledgeBase || '').includes(selectedKbFilter);
    return matchesSearch && matchesKb;
  });

  const indexedCount = documents.filter((d) => d.status === 'indexed' || d.status === 'ready').length;
  const totalChunks = documents.reduce((acc, d) => acc + (d.chunksCount || 0), 0);
  const allIndexed = documents.length > 0 && documents.every((d) => d.status === 'indexed' || d.status === 'ready');

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-indigo-600">
            <FileText size={16} />
            <span>Document Repository</span>
          </div>
          <h1 className="mt-1 text-2xl font-bold text-slate-900 sm:text-3xl">
            Knowledge Documents
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Upload, chunk, inspect, and manage your vector-indexed documents.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            leftIcon={RefreshCw}
            onClick={loadDocuments}
            disabled={loading}
            size="sm"
          >
            Refresh
          </Button>
          <Button
            variant="secondary"
            leftIcon={GitCompare}
            onClick={() => navigate('/compare')}
          >
            Compare Documents
          </Button>
          <Button
            variant="primary"
            leftIcon={Plus}
            onClick={() => setIsUploadModalOpen(true)}
          >
            Upload Document
          </Button>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="flex items-center gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          <AlertCircle size={18} className="shrink-0" />
          <span>{error}</span>
          <button
            onClick={loadDocuments}
            className="ml-auto text-xs font-semibold underline hover:no-underline"
          >
            Retry
          </button>
        </div>
      )}

      {/* Stats Quick Strip */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
          <p className="text-xs font-medium text-slate-500">Total Documents</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">
            {loading ? '…' : documents.length}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
          <p className="text-xs font-medium text-slate-500">Indexed Chunks</p>
          <p className="mt-1 text-2xl font-bold text-indigo-600">
            {loading ? '…' : `${totalChunks} chunks`}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
          <p className="text-xs font-medium text-slate-500">Indexed Documents</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">
            {loading ? '…' : `${indexedCount} / ${documents.length}`}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
          <p className="text-xs font-medium text-slate-500">Index Status</p>
          <div className={`mt-1 flex items-center gap-1.5 font-bold text-sm ${allIndexed ? 'text-emerald-600' : 'text-amber-500'}`}>
            <CheckCircle2 size={18} />
            <span>{allIndexed ? '100% Healthy' : 'Processing…'}</span>
          </div>
        </div>
      </div>

      {/* Filter and View Controls Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
        <div className="flex flex-1 items-center gap-3">
          <div className="w-full max-w-xs">
            <Input
              placeholder="Search documents by name..."
              leftIcon={Search}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <select
            value={selectedKbFilter}
            onChange={(e) => setSelectedKbFilter(e.target.value)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-200"
          >
            <option value="all">All Knowledge Bases</option>
            {knowledgeBases.map((kb) => (
              <option key={kb._id || kb.id} value={kb.name}>
                {kb.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-1.5 self-end sm:self-auto border border-slate-200 p-1 rounded-xl bg-slate-50">
          <button
            onClick={() => setViewMode('grid')}
            className={`rounded-lg p-1.5 text-xs font-semibold transition ${
              viewMode === 'grid'
                ? 'bg-white text-indigo-600 shadow-xs'
                : 'text-slate-500 hover:text-slate-900'
            }`}
            title="Grid View"
          >
            <LayoutGrid size={18} />
          </button>
          <button
            onClick={() => setViewMode('table')}
            className={`rounded-lg p-1.5 text-xs font-semibold transition ${
              viewMode === 'table'
                ? 'bg-white text-indigo-600 shadow-xs'
                : 'text-slate-500 hover:text-slate-900'
            }`}
            title="Table View"
          >
            <List size={18} />
          </button>
        </div>
      </div>

      {/* Loading Skeleton */}
      {loading && (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-44 rounded-2xl border border-slate-200 bg-white animate-pulse"
            />
          ))}
        </div>
      )}

      {/* Document Grid / Table Content */}
      {!loading && filteredDocs.length === 0 ? (
        <EmptyState
          title={error ? 'Connection Error' : 'No documents found'}
          description={
            error
              ? 'The backend server is not reachable. Start it with: cd backend && npm run dev'
              : searchQuery
              ? `No documents match "${searchQuery}". Try clearing filters.`
              : 'Upload your first document to build your intelligent knowledge base.'
          }
          icon={FileText}
          actionLabel="Upload Document"
          onAction={() => setIsUploadModalOpen(true)}
        />
      ) : !loading && viewMode === 'grid' ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredDocs.map((doc) => (
            <DocumentCard
              key={doc._id || doc.id}
              document={{ ...doc, id: doc._id || doc.id }}
              onPreview={(d) => setPreviewDoc(d)}
              onDelete={(id) => handleDelete(id)}
              onDownload={(d) => handleDownload(d)}
              onExtract={handleOpenExtraction}
            />
          ))}
        </div>
      ) : !loading ? (
        <DocumentTable
          documents={filteredDocs.map((d) => ({ ...d, id: d._id || d.id }))}
          onPreview={(d) => setPreviewDoc(d)}
          onDelete={(id) => handleDelete(id)}
          onDownload={(d) => handleDownload(d)}
          onBulkDelete={(ids) => handleBulkDelete(ids)}
          onExtract={handleOpenExtraction}
        />
      ) : null}

      {/* Upload Modal */}
      <Modal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        title="Upload & Ingest Document"
        subtitle="Parsed documents are automatically chunked and vectorized for RAG query retrieval."
        size="lg"
      >
        <DocumentUpload
          knowledgeBases={knowledgeBases}
          onUploadSuccess={handleUploadSuccess}
        />
      </Modal>

      {/* Preview Modal */}
      <DocumentPreview
        isOpen={!!previewDoc}
        onClose={() => setPreviewDoc(null)}
        document={previewDoc}
      />

      <ExtractionModal
        isOpen={isExtractionModalOpen}
        onClose={() => {
          setIsExtractionModalOpen(false);
          setExtractionError('');
        }}
        document={extractionDocument}
        onSubmit={handleStartExtraction}
        isSubmitting={isStartingExtraction}
        error={extractionError}
      />
    </div>
  );
};

export default Documents;
