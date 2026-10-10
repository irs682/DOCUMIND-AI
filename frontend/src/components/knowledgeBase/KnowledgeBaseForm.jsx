import React, { useState } from 'react';
import Input from '../common/Input';
import Button from '../common/Button';

const KnowledgeBaseForm = ({ initialValues, onSubmit, onCancel, loading = false }) => {
  const [name, setName] = useState(initialValues?.name || '');
  const [description, setDescription] = useState(initialValues?.description || '');
  const [isPrivate, setIsPrivate] = useState(initialValues?.isPrivate ?? true);
  const [embeddingModel, setEmbeddingModel] = useState(initialValues?.embeddingModel || 'text-embedding-3-small');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSubmit({
      id: initialValues?.id || `kb-${Date.now()}`,
      name,
      description,
      isPrivate,
      embeddingModel,
      docCount: initialValues?.docCount || 0,
      vectorCount: initialValues?.vectorCount || 0,
      updatedAt: 'Just now',
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        label="Knowledge Base Name"
        placeholder="e.g. Legal & Contracts, Q2 Financials"
        value={name}
        onChange={(e) => setName(e.target.value)}
        required
      />

      <div>
        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
          Description
        </label>
        <textarea
          rows={3}
          placeholder="Brief description of documents stored in this knowledge base..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full rounded-lg border border-slate-300 bg-white p-3 text-sm text-slate-900 placeholder-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
        />
      </div>

      <div>
        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
          Embedding Model
        </label>
        <select
          value={embeddingModel}
          onChange={(e) => setEmbeddingModel(e.target.value)}
          className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-200"
        >
          <option value="text-embedding-3-small">OpenAI text-embedding-3-small (1536d)</option>
          <option value="text-embedding-3-large">OpenAI text-embedding-3-large (3072d)</option>
          <option value="bge-m3">BGE-M3 Multilingual Dense/Sparse (1024d)</option>
        </select>
      </div>

      <div>
        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
          Access Permission
        </label>
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setIsPrivate(true)}
            className={`rounded-xl border p-3.5 text-left text-xs font-semibold transition ${
              isPrivate
                ? 'border-indigo-600 bg-indigo-50/50 text-indigo-900 ring-2 ring-indigo-500/20'
                : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
            }`}
          >
            <div className="font-bold">🔒 Private</div>
            <div className="mt-1 text-slate-500 font-normal">Only you can query and access</div>
          </button>

          <button
            type="button"
            onClick={() => setIsPrivate(false)}
            className={`rounded-xl border p-3.5 text-left text-xs font-semibold transition ${
              !isPrivate
                ? 'border-indigo-600 bg-indigo-50/50 text-indigo-900 ring-2 ring-indigo-500/20'
                : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
            }`}
          >
            <div className="font-bold">🌐 Team Shared</div>
            <div className="mt-1 text-slate-500 font-normal">All organization members have access</div>
          </button>
        </div>
      </div>

      <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button type="submit" loading={loading}>
          {initialValues ? 'Save Changes' : 'Create Knowledge Base'}
        </Button>
      </div>
    </form>
  );
};

export default KnowledgeBaseForm;
