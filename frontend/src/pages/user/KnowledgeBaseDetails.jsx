import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Database,
  Plus,
  Layers,
  Lock,
  Globe,
  FileText,
  RefreshCw,
  MessageSquare,
  Sparkles,
  AlertCircle,
  Trash2,
  FolderMinus,
  CheckCircle2,
} from 'lucide-react';
import KnowledgeBaseDocuments from '../../components/knowledgeBase/KnowledgeBaseDocuments';
import AddDocumentsModal from '../../components/knowledgeBase/AddDocumentsModal';
import DocumentPreview from '../../components/documents/DocumentPreview';
import Button from '../../components/common/Button';
import Badge from '../../components/common/Badge';
import Modal from '../../components/common/Modal';
import {
  fetchKnowledgeBaseById,
  removeDocumentFromKnowledgeBase,
} from '../../api/knowledgeBasesApi';
import { deleteDocument, reindexDocument } from '../../api/documentsApi';

const KnowledgeBaseDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [kb, setKb] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successNotice, setSuccessNotice] = useState('');

  // ── Modals & Action States ──
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addModalTab, setAddModalTab] = useState('upload'); // 'upload' | 'existing'

  const [previewDoc, setPreviewDoc] = useState(null);
  const [reprocessingDocId, setReprocessingDocId] = useState(null);

  // Remove vs Delete separation
  const [docToRemove, setDocToRemove] = useState(null);
  const [isRemoving, setIsRemoving] = useState(false);

  const [docToDelete, setDocToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // ── Load KB & Documents ──
  const loadKbData = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      setError('');
      const data = await fetchKnowledgeBaseById(id);
      setKb(data.knowledgeBase);
      setDocuments(data.documents || []);
    } catch (err) {
      console.error('Failed to load Knowledge Base details:', err);
      setError('Could not load knowledge base. It may not exist or you lack permission.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadKbData();
  }, [loadKbData]);

  // Auto-refresh if any documents are processing
  useEffect(() => {
    const processingStatuses = [
      'uploaded', 'processing', 'validating', 'loading', 'extracting',
      'ocr_processing', 'table_extraction', 'cleaning', 'splitting', 'embedding', 'indexing'
    ];
    const hasProcessing = documents.some((d) => processingStatuses.includes(d.status));
    if (!hasProcessing) return;

    const timer = setTimeout(loadKbData, 3500);
    return () => clearTimeout(timer);
  }, [documents, loadKbData]);

  // ── Action: Remove Document from KB (relationship only) ──
  const handleConfirmRemove = async () => {
    if (!docToRemove || !kb) return;
    try {
      setIsRemoving(true);
      const docId = docToRemove._id || docToRemove.id;
      const res = await removeDocumentFromKnowledgeBase(kb._id || kb.id, docId);

      setDocuments((prev) => prev.filter((d) => (d._id || d.id) !== docId));
      setKb((prev) => ({
        ...prev,
        docCount: res.docCount ?? Math.max(0, (prev.docCount || 1) - 1),
        vectorCount: res.vectorCount ?? prev.vectorCount,
      }));

      setSuccessNotice(
        `"${docToRemove.name}" was removed from ${kb.name}. The file remains intact in your platform Documents library.`
      );
      setDocToRemove(null);
      setTimeout(() => setSuccessNotice(''), 6000);
    } catch (err) {
      console.error('Remove from KB failed:', err);
      alert(err.response?.data?.message || err.message || 'Failed to remove document from Knowledge Base');
    } finally {
      setIsRemoving(false);
    }
  };

  // ── Action: Permanently Delete Document (file + vectors + all KBs) ──
  const handleConfirmDelete = async () => {
    if (!docToDelete) return;
    try {
      setIsDeleting(true);
      const docId = docToDelete._id || docToDelete.id;
      await deleteDocument(docId);

      setDocuments((prev) => prev.filter((d) => (d._id || d.id) !== docId));
      setKb((prev) => ({
        ...prev,
        docCount: Math.max(0, (prev.docCount || 1) - 1),
      }));

      setSuccessNotice(`Document "${docToDelete.name}" was permanently deleted from the platform.`);
      setDocToDelete(null);
      setTimeout(() => setSuccessNotice(''), 6000);
    } catch (err) {
      console.error('Delete document failed:', err);
      alert(err.response?.data?.message || err.message || 'Failed to permanently delete document');
    } finally {
      setIsDeleting(false);
    }
  };

  // ── Action: Reprocess Document ──
  const handleReprocessDoc = async (doc) => {
    const docId = doc._id || doc.id;
    try {
      setReprocessingDocId(docId);
      await reindexDocument(docId);
      setSuccessNotice(`Reprocessing triggered for "${doc.name}". Vector index will update shortly.`);
      setTimeout(() => setSuccessNotice(''), 5000);
      setTimeout(loadKbData, 3000);
    } catch (err) {
      console.error('Reprocess failed:', err);
      alert(err.response?.data?.message || err.message || 'Failed to trigger reprocessing');
    } finally {
      setReprocessingDocId(null);
    }
  };

  if (loading && !kb) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="flex items-center gap-2 text-sm font-semibold text-purple-600">
          <RefreshCw size={18} className="animate-spin" />
          <span>Loading Knowledge Base...</span>
        </div>
      </div>
    );
  }

  if (error || !kb) {
    return (
      <div className="space-y-4">
        <Link
          to="/knowledge-bases"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-purple-600 transition"
        >
          <ArrowLeft size={16} />
          Back to Knowledge Bases
        </Link>
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-800">
          <p className="font-bold">Error Loading Knowledge Base</p>
          <p className="mt-1 text-xs">{error || 'Knowledge base not found.'}</p>
        </div>
      </div>
    );
  }

  const dimensionMap = {
    'text-embedding-3-small': '1536',
    'text-embedding-3-large': '3072',
    'bge-m3': '1024',
  };
  const vectorDim = dimensionMap[kb.embeddingModel] || '1536';

  return (
    <div className="space-y-6">
      {/* Back button */}
      <div>
        <Link
          to="/knowledge-bases"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-purple-600 transition"
        >
          <ArrowLeft size={16} />
          Back to Knowledge Bases
        </Link>
      </div>

      {/* Success banner */}
      {successNotice && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-semibold text-emerald-800 animate-in fade-in">
          <CheckCircle2 size={16} className="shrink-0" />
          <span>{successNotice}</span>
        </div>
      )}

      {/* Knowledge Base Header Banner */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-purple-600 text-white shadow-md shrink-0">
            <Database size={28} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-900">{kb.name}</h1>
              <Badge variant={kb.isPrivate ? 'amber' : 'blue'} icon={kb.isPrivate ? Lock : Globe}>
                {kb.isPrivate ? 'Private' : 'Team Shared'}
              </Badge>
            </div>
            <p className="mt-1 text-xs text-slate-500 leading-relaxed max-w-xl">
              {kb.description || 'Central vector store for domain-specific documents and evidence intelligence.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <Button
            variant="outline"
            size="sm"
            leftIcon={Plus}
            onClick={() => {
              setAddModalTab('upload');
              setIsAddModalOpen(true);
            }}
          >
            Add Documents
          </Button>

          <Button
            variant="primary"
            size="sm"
            leftIcon={Sparkles}
            onClick={() => navigate('/research')}
          >
            Research with KB
          </Button>
        </div>
      </div>

      {/* Main Grid: Document Management & Vector Overview */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column: Documents Table */}
        <div className="lg:col-span-2 space-y-6">
          <KnowledgeBaseDocuments
            documents={documents}
            kbName={kb.name}
            onAddDocument={(tab) => {
              setAddModalTab(tab || 'upload');
              setIsAddModalOpen(true);
            }}
            onRemoveDocument={(doc) => setDocToRemove(doc)}
            onDeleteDocument={(doc) => setDocToDelete(doc)}
            onReprocessDocument={handleReprocessDoc}
            onViewDocument={(doc) => setPreviewDoc(doc)}
            reprocessingDocId={reprocessingDocId}
          />
        </div>

        {/* Right Column: Knowledge Base & Vector Index Overview */}
        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Vector Index Overview
            </h4>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between py-2 border-b border-slate-100">
                <span className="text-slate-500">Embedding Model</span>
                <span className="font-mono font-semibold text-slate-800">{kb.embeddingModel}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-100">
                <span className="text-slate-500">Vector Dimensions</span>
                <span className="font-semibold text-slate-800">{vectorDim}d</span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-100">
                <span className="text-slate-500">Assigned Documents</span>
                <span className="font-bold text-slate-900">{documents.length}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-100">
                <span className="text-slate-500">Total Vectors / Chunks</span>
                <span className="font-bold text-purple-600">{kb.vectorCount || 0}</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-slate-500">Last Synced</span>
                <span className="text-slate-700">
                  {kb.updatedAt ? new Date(kb.updatedAt).toLocaleDateString() : 'Today'}
                </span>
              </div>
            </div>
          </div>

          {/* Quick Action Box */}
          <div className="rounded-2xl border border-purple-100 bg-gradient-to-br from-purple-50/70 to-indigo-50/30 p-5 space-y-3">
            <h5 className="text-xs font-bold uppercase tracking-wider text-purple-900">
              RAG & Autonomous Research
            </h5>
            <p className="text-xs text-purple-800/80 leading-relaxed">
              This Knowledge Base is directly selectable in Autonomous Research mode to isolate report generation to its evidence objects.
            </p>
            <div className="pt-1">
              <Link to="/chat">
                <Button variant="outline" size="sm" className="w-full justify-center">
                  Open Interactive Chat
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Add Documents Modal */}
      <AddDocumentsModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        knowledgeBase={kb}
        initialTab={addModalTab}
        onSuccess={() => {
          loadKbData();
        }}
      />

      {/* Preview Modal */}
      <DocumentPreview
        isOpen={!!previewDoc}
        onClose={() => setPreviewDoc(null)}
        document={previewDoc}
      />

      {/* Section 6 & 7: REMOVE from Knowledge Base Confirmation Modal */}
      <Modal
        isOpen={!!docToRemove}
        onClose={() => setDocToRemove(null)}
        title="Remove Document from Knowledge Base"
        size="md"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-700">
            Are you sure you want to remove{' '}
            <strong className="text-slate-900">{docToRemove?.name}</strong> from{' '}
            <strong className="text-purple-700">{kb.name}</strong>?
          </p>

          <div className="rounded-xl border border-indigo-200 bg-indigo-50/70 p-3.5 text-xs text-indigo-900 flex items-start gap-2.5">
            <FileText size={18} className="shrink-0 text-indigo-600 mt-0.5" />
            <div>
              <p className="font-bold">Safe Detach Operation:</p>
              <p className="mt-0.5 leading-relaxed text-indigo-800">
                This document will <strong>NOT</strong> be deleted. It will remain in your global Documents library and in any other Knowledge Bases it belongs to.
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-2.5 pt-2 border-t border-slate-100">
            <Button variant="outline" size="sm" onClick={() => setDocToRemove(null)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              loading={isRemoving}
              onClick={handleConfirmRemove}
              leftIcon={FolderMinus}
            >
              Remove from Knowledge Base
            </Button>
          </div>
        </div>
      </Modal>

      {/* Section 6 & 7: DELETE Document Permanently Confirmation Modal */}
      <Modal
        isOpen={!!docToDelete}
        onClose={() => setDocToDelete(null)}
        title="Permanently Delete Document"
        size="md"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-700">
            Are you sure you want to permanently delete{' '}
            <strong className="text-slate-900">{docToDelete?.name}</strong>?
          </p>

          <div className="rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-xs text-rose-900 flex items-start gap-2.5">
            <Trash2 size={18} className="shrink-0 text-rose-600 mt-0.5" />
            <div>
              <p className="font-bold">Permanent Platform Deletion:</p>
              <p className="mt-0.5 leading-relaxed text-rose-800">
                This will delete the original file, its parsed text, tables, figures, OCR evidence, and vector embeddings in Qdrant across the entire platform. This action cannot be undone.
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-2.5 pt-2 border-t border-slate-100">
            <Button variant="outline" size="sm" onClick={() => setDocToDelete(null)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              size="sm"
              loading={isDeleting}
              onClick={handleConfirmDelete}
              leftIcon={Trash2}
            >
              Permanently Delete Document
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default KnowledgeBaseDetails;
