import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Database,
  Plus,
  Search,
  Layers,
  Lock,
  Globe,
  Upload,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  FolderPlus,
} from 'lucide-react';
import KnowledgeBaseCard from '../../components/knowledgeBase/KnowledgeBaseCard';
import KnowledgeBaseForm from '../../components/knowledgeBase/KnowledgeBaseForm';
import AddDocumentsModal from '../../components/knowledgeBase/AddDocumentsModal';
import Modal from '../../components/common/Modal';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import EmptyState from '../../components/common/EmptyState';
import {
  fetchKnowledgeBases,
  createKnowledgeBase,
  updateKnowledgeBase,
  deleteKnowledgeBase,
} from '../../api/knowledgeBasesApi';

const KnowledgeBases = () => {
  const navigate = useNavigate();
  const [knowledgeBases, setKnowledgeBases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // ── Modal States ──
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [editKb, setEditKb] = useState(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [deleteKb, setDeleteKb] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // ── Add Documents Modal ──
  const [addDocsKb, setAddDocsKb] = useState(null);
  const [isAddDocsModalOpen, setIsAddDocsModalOpen] = useState(false);

  // ── Post-Creation Prompt Modal (Section 11) ──
  const [createdKbPrompt, setCreatedKbPrompt] = useState(null);

  const loadKbs = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const list = await fetchKnowledgeBases();
      setKnowledgeBases(list);
    } catch (err) {
      console.error('Failed to load knowledge bases:', err);
      setError('Could not load knowledge bases. Please verify backend service.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadKbs();
  }, [loadKbs]);

  // ── Create KB Handler ──
  const handleCreateKb = async (formData) => {
    try {
      setIsCreating(true);
      setError('');
      const created = await createKnowledgeBase({
        name: formData.name,
        description: formData.description,
        isPrivate: formData.isPrivate,
        embeddingModel: formData.embeddingModel,
      });

      setKnowledgeBases((prev) => [created, ...prev]);
      setIsCreateModalOpen(false);

      // Section 11: Prompt user immediately to add documents
      setCreatedKbPrompt(created);
    } catch (err) {
      console.error('Error creating KB:', err);
      alert(err.response?.data?.message || err.message || 'Failed to create knowledge base');
    } finally {
      setIsCreating(false);
    }
  };

  // ── Update KB Handler ──
  const handleUpdateKb = async (formData) => {
    if (!editKb) return;
    try {
      setIsUpdating(true);
      const kbId = editKb._id || editKb.id;
      const updated = await updateKnowledgeBase(kbId, {
        name: formData.name,
        description: formData.description,
        isPrivate: formData.isPrivate,
        embeddingModel: formData.embeddingModel,
      });

      setKnowledgeBases((prev) =>
        prev.map((k) => ((k._id || k.id) === kbId ? { ...k, ...updated } : k))
      );
      setEditKb(null);
    } catch (err) {
      console.error('Error updating KB:', err);
      alert(err.response?.data?.message || err.message || 'Failed to update knowledge base');
    } finally {
      setIsUpdating(false);
    }
  };

  // ── Delete KB Handler ──
  const handleDeleteKb = async () => {
    if (!deleteKb) return;
    try {
      setIsDeleting(true);
      const kbId = deleteKb._id || deleteKb.id;
      await deleteKnowledgeBase(kbId);
      setKnowledgeBases((prev) => prev.filter((k) => (k._id || k.id) !== kbId));
      setDeleteKb(null);
    } catch (err) {
      console.error('Error deleting KB:', err);
      alert(err.response?.data?.message || err.message || 'Failed to delete knowledge base');
    } finally {
      setIsDeleting(false);
    }
  };

  // ── Add Documents Trigger ──
  const handleOpenAddDocuments = (kb) => {
    setAddDocsKb(kb || knowledgeBases[0] || null);
    setIsAddDocsModalOpen(true);
  };

  const handleDocumentsAddedSuccess = () => {
    loadKbs();
  };

  const filteredKbs = knowledgeBases.filter((kb) => {
    const name = kb.name || '';
    const desc = kb.description || '';
    const q = searchQuery.toLowerCase();
    return name.toLowerCase().includes(q) || desc.toLowerCase().includes(q);
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-purple-600">
            <Database size={16} />
            <span>Vector Stores</span>
          </div>
          <h1 className="mt-1 text-2xl font-bold text-slate-900 sm:text-3xl">
            Knowledge Bases
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Group related documents into isolated vector indexes for context-aware RAG search and research.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="ghost"
            size="sm"
            leftIcon={RefreshCw}
            onClick={loadKbs}
            disabled={loading}
          >
            Refresh
          </Button>

          {knowledgeBases.length > 0 && (
            <Button
              variant="outline"
              leftIcon={Upload}
              onClick={() => handleOpenAddDocuments(null)}
            >
              Add Documents
            </Button>
          )}

          <Button
            variant="primary"
            leftIcon={Plus}
            onClick={() => setIsCreateModalOpen(true)}
          >
            Create Knowledge Base
          </Button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
        <div className="w-full max-w-md">
          <Input
            placeholder="Search knowledge bases by name or domain..."
            leftIcon={Search}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="text-xs font-medium text-slate-500 hidden sm:block">
          {filteredKbs.length} Knowledge Base{filteredKbs.length === 1 ? '' : 's'}
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="flex items-center gap-2 text-xs font-semibold text-rose-700 bg-rose-50 p-3 rounded-xl border border-rose-200">
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {/* Grid List */}
      {loading ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((n) => (
            <div key={n} className="h-56 rounded-2xl border border-slate-200 bg-white p-6 shadow-xs animate-pulse">
              <div className="flex justify-between">
                <div className="h-12 w-12 rounded-xl bg-slate-100" />
                <div className="h-6 w-20 rounded-full bg-slate-100" />
              </div>
              <div className="mt-4 space-y-2">
                <div className="h-5 w-3/4 rounded bg-slate-100" />
                <div className="h-4 w-full rounded bg-slate-100" />
              </div>
            </div>
          ))}
        </div>
      ) : filteredKbs.length === 0 ? (
        <EmptyState
          title={searchQuery ? 'No matching knowledge bases' : 'No knowledge bases found'}
          description={
            searchQuery
              ? 'Try adjusting your search terms.'
              : 'Create your first knowledge base to organize your documents and enable precise RAG queries.'
          }
          icon={Database}
          actionLabel="Create Knowledge Base"
          onAction={() => setIsCreateModalOpen(true)}
        />
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filteredKbs.map((kb) => (
            <KnowledgeBaseCard
              key={kb._id || kb.id}
              knowledgeBase={kb}
              onViewDetails={(item) => navigate(`/knowledge-bases/${item._id || item.id}`)}
              onAddDocuments={(item) => handleOpenAddDocuments(item)}
              onEdit={(item) => setEditKb(item)}
              onDelete={(item) => setDeleteKb(item)}
            />
          ))}
        </div>
      )}

      {/* Create Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Create Knowledge Base"
        subtitle="Organize documents into specialized domain vector indexes."
        size="md"
      >
        <KnowledgeBaseForm
          onSubmit={handleCreateKb}
          onCancel={() => setIsCreateModalOpen(false)}
          loading={isCreating}
        />
      </Modal>

      {/* Edit Modal */}
      <Modal
        isOpen={!!editKb}
        onClose={() => setEditKb(null)}
        title="Edit Knowledge Base"
        subtitle="Update name, description, and permissions."
        size="md"
      >
        {editKb && (
          <KnowledgeBaseForm
            initialValues={editKb}
            onSubmit={handleUpdateKb}
            onCancel={() => setEditKb(null)}
            loading={isUpdating}
          />
        )}
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!deleteKb}
        onClose={() => setDeleteKb(null)}
        title="Delete Knowledge Base"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-700">
            Are you sure you want to delete{' '}
            <strong className="text-slate-900">{deleteKb?.name}</strong>?
          </p>
          <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-3 text-xs text-amber-800">
            <strong>Note:</strong> Your documents will <strong>not</strong> be deleted. They will remain safely in your global platform Documents library.
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={() => setDeleteKb(null)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              size="sm"
              loading={isDeleting}
              onClick={handleDeleteKb}
            >
              Delete Knowledge Base
            </Button>
          </div>
        </div>
      </Modal>

      {/* Post-Creation Prompt Modal (Section 11) */}
      <Modal
        isOpen={!!createdKbPrompt}
        onClose={() => setCreatedKbPrompt(null)}
        title="Knowledge Base Created Successfully"
        subtitle={`"${createdKbPrompt?.name}" is ready.`}
        size="md"
      >
        <div className="space-y-4 py-1">
          <div className="flex items-center gap-3 p-4 rounded-xl bg-purple-50 text-purple-900 border border-purple-200">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-purple-600 text-white">
              <CheckCircle2 size={22} />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-900">
                Would you like to populate this Knowledge Base now?
              </p>
              <p className="text-xs text-slate-600 mt-0.5">
                Upload new files or select existing documents from your library to begin building its vector collection.
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row justify-end gap-2.5 pt-3 border-t border-slate-100">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCreatedKbPrompt(null)}
            >
              Do This Later
            </Button>
            <Button
              variant="primary"
              size="sm"
              leftIcon={FolderPlus}
              onClick={() => {
                const target = createdKbPrompt;
                setCreatedKbPrompt(null);
                handleOpenAddDocuments(target);
              }}
            >
              Add Documents Now
            </Button>
          </div>
        </div>
      </Modal>

      {/* Add Documents Modal */}
      <AddDocumentsModal
        isOpen={isAddDocsModalOpen}
        onClose={() => setIsAddDocsModalOpen(false)}
        knowledgeBase={addDocsKb}
        allKnowledgeBases={knowledgeBases}
        onSuccess={handleDocumentsAddedSuccess}
      />
    </div>
  );
};

export default KnowledgeBases;
