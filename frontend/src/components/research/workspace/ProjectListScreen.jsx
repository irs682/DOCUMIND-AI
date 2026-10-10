import React, { useState } from 'react';
import {
  Sparkles,
  Plus,
  Layers,
  Trash2,
  Loader2,
  Clock,
  ArrowRight,
  Edit2,
  Award,
  CheckCircle2,
  Archive,
} from 'lucide-react';
import Button from '../../common/Button';

const STEP_LABELS = {
  1: '1. Add Papers',
  2: '2. Research Goal',
  3: '3. Related Work',
  4: '4. Paper Comparison',
  5: '5. Research Gap',
  6: '6. Questions & Hypotheses',
  7: '7. Methodology',
  8: '8. Benchmarks & Baselines',
  9: '9. Empirical Results',
  10: '10. Discussion',
  11: '11. Manuscript Draft',
};

const STATUS_CONFIG = {
  active: {
    label: 'Active',
    className: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  },
  in_progress: {
    label: 'In Progress',
    className: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  },
  draft: {
    label: 'Draft',
    className: 'bg-slate-100 text-slate-700 border-slate-200',
  },
  completed: {
    label: 'Completed',
    className: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
  archived: {
    label: 'Archived',
    className: 'bg-amber-50 text-amber-700 border-amber-200',
  },
};

const ProjectListScreen = ({
  projects = [],
  loading = false,
  onSelectProject,
  onOpenManuscript,
  onCreateProject,
  onRenameProject,
  onDeleteProject,
}) => {
  // Create Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newTopic, setNewTopic] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [creating, setCreating] = useState(false);

  // Rename Modal
  const [renameTarget, setRenameTarget] = useState(null);
  const [renameTitle, setRenameTitle] = useState('');
  const [renameTopic, setRenameTopic] = useState('');
  const [renaming, setRenaming] = useState(false);

  // Delete Confirmation Modal
  const [deleteTarget, setDeleteTarget] = useState(null);

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    setCreating(true);
    try {
      await onCreateProject({
        title: newTitle.trim(),
        researchTopic: newTopic.trim() || newTitle.trim(),
        description: newDescription.trim(),
      });
      setShowCreateModal(false);
      setNewTitle('');
      setNewTopic('');
      setNewDescription('');
    } finally {
      setCreating(false);
    }
  };

  const handleRenameSubmit = async (e) => {
    e.preventDefault();
    if (!renameTarget || !renameTitle.trim()) return;
    setRenaming(true);
    try {
      if (onRenameProject) {
        await onRenameProject(renameTarget._id, {
          title: renameTitle.trim(),
          researchTopic: renameTopic.trim() || renameTitle.trim(),
        });
      }
      setRenameTarget(null);
    } finally {
      setRenaming(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await onDeleteProject(deleteTarget._id);
    } finally {
      setDeleteTarget(null);
    }
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Top Banner */}
      <div className="rounded-3xl border border-indigo-100 bg-gradient-to-br from-indigo-50/70 via-white to-purple-50/40 p-8 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-indigo-600">
              <Sparkles size={16} />
              <span>AI Research Workspace</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Autonomous Research &amp; Document Intelligence
            </h1>
            <p className="text-sm text-slate-600 leading-relaxed">
              Synthesize multi-document literature, discover genuine research gaps, formulate verifiable
              hypotheses and methodology, ingest empirical findings, and export publication-ready academic manuscripts.
            </p>
          </div>

          <Button
            size="lg"
            leftIcon={Plus}
            onClick={() => setShowCreateModal(true)}
            className="shrink-0 shadow-sm"
          >
            Start New Research Project
          </Button>
        </div>
      </div>

      {/* Projects List Section */}
      <div className="space-y-4">

        {loading ? (
          <div className="p-12 text-center text-slate-500">
            <Loader2 size={24} className="animate-spin mx-auto text-indigo-600 mb-2" />
            <p className="text-xs">Loading research projects...</p>
          </div>
        ) : projects.length === 0 ? (
          /* Empty state complying with Section 21 */
          <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-white p-12 text-center space-y-3">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
              <Layers size={26} />
            </div>
            <h3 className="text-base font-bold text-slate-900">No research projects yet.</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Create your first project to begin comparing literature, defining research gaps, and drafting your paper.
            </p>
            <div className="pt-2">
              <Button leftIcon={Plus} onClick={() => setShowCreateModal(true)}>
                + New Research Project
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {projects.map((proj) => {
              const currentStepNum = proj.currentStep || 1;
              const stepName = STEP_LABELS[currentStepNum] || `Step ${currentStepNum}`;
              const docCount = proj.documentIds?.length || 0;
              const statusCfg =
                STATUS_CONFIG[proj.status] || STATUS_CONFIG.active;
              const hasManuscript = Boolean(proj.generatedDraft?.title);

              const updatedDate = new Date(proj.updatedAt || proj.createdAt).toLocaleDateString('en-US', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              });

              return (
                <div
                  key={proj._id}
                  className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-xs hover:border-indigo-300 hover:shadow-md transition-all flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1 min-w-0">
                        <h3 className="text-base font-bold text-slate-900 group-hover:text-indigo-600 transition-colors truncate">
                          {proj.title}
                        </h3>
                        <p className="text-xs text-slate-500 line-clamp-1">
                          {proj.researchTopic || 'General research investigation'}
                        </p>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        {/* Rename button */}
                        <button
                          type="button"
                          onClick={() => {
                            setRenameTarget(proj);
                            setRenameTitle(proj.title);
                            setRenameTopic(proj.researchTopic || '');
                          }}
                          className="text-slate-400 hover:text-indigo-600 p-1 rounded-lg transition-colors"
                          title="Rename project"
                        >
                          <Edit2 size={15} />
                        </button>

                        {/* Delete button */}
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(proj)}
                          className="text-slate-400 hover:text-rose-600 p-1 rounded-lg transition-colors"
                          title="Delete project"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>

                    {/* Metadata tags: Status, Step, Papers, Updated (Section 15) */}
                    <div className="flex items-center gap-2 flex-wrap text-xs">
                      <span
                        className={`rounded-full px-2.5 py-0.5 font-bold border ${statusCfg.className}`}
                      >
                        {statusCfg.label}
                      </span>

                      <span className="rounded-full bg-slate-100 px-2.5 py-0.5 font-medium text-slate-700">
                        {stepName}
                      </span>

                      <span className="text-slate-500">
                        {docCount} paper{docCount === 1 ? '' : 's'}
                      </span>

                      <span className="text-slate-300">•</span>

                      <span className="text-slate-500 flex items-center gap-1">
                        <Clock size={12} />
                        Updated {updatedDate}
                      </span>
                    </div>

                    {proj.description && (
                      <p className="text-xs text-slate-600 line-clamp-2 italic pt-1">
                        {proj.description}
                      </p>
                    )}
                  </div>

                  {/* Card bottom actions (Section 22, 23) */}
                  <div className="pt-5 mt-4 border-t border-slate-100 flex items-center justify-between gap-2 flex-wrap">
                    <div className="text-[11px] font-semibold text-slate-500">
                      Step {currentStepNum} of 11
                    </div>

                    <div className="flex items-center gap-2">
                      {hasManuscript && (
                        <button
                          type="button"
                          onClick={() => {
                            if (onOpenManuscript) {
                              onOpenManuscript(proj);
                            } else {
                              onSelectProject({ ...proj, currentStep: 11 });
                            }
                          }}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition-colors"
                          title="View compiled draft"
                        >
                          <Award size={13} />
                          <span>View Manuscript</span>
                        </button>
                      )}

                      <Button
                        size="sm"
                        variant="outline"
                        rightIcon={ArrowRight}
                        onClick={() => onSelectProject(proj)}
                        className="group-hover:border-indigo-600 group-hover:text-indigo-600"
                      >
                        Open Workspace
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Start New Research Project Modal (Sections 12, 13) */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-slate-200 space-y-5">
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-slate-900">Start New Research Project</h3>
              <p className="text-xs text-slate-500">
                Create a persistent project workspace to guide you from papers to a completed paper.
              </p>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Project Title *
                </label>
                <input
                  type="text"
                  placeholder="e.g. MERA-VLA: Retrieval-Augmented Vision-Language-Action"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  required
                  autoFocus
                  className="w-full rounded-xl border border-slate-300 p-2.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                  Core Topic / Problem Domain
                </label>
                <input
                  type="text"
                  placeholder="e.g. Memory-augmented robotic manipulation under sensory noise"
                  value={newTopic}
                  onChange={(e) => setNewTopic(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 p-2.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                  Description / Research Goal (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Ingest episodic demonstration datasets and test action calibration"
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 p-2.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowCreateModal(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={creating || !newTitle.trim()}
                  leftIcon={creating ? Loader2 : Plus}
                >
                  {creating ? 'Creating...' : 'Create Project'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Rename Project Modal (Section 16) */}
      {renameTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-slate-200 space-y-5">
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-slate-900">Rename Research Project</h3>
              <p className="text-xs text-slate-500">
                Update project title and problem domain.
              </p>
            </div>

            <form onSubmit={handleRenameSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Project Title *
                </label>
                <input
                  type="text"
                  value={renameTitle}
                  onChange={(e) => setRenameTitle(e.target.value)}
                  required
                  autoFocus
                  className="w-full rounded-xl border border-slate-300 p-2.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                  Core Topic
                </label>
                <input
                  type="text"
                  value={renameTopic}
                  onChange={(e) => setRenameTopic(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 p-2.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setRenameTarget(null)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={renaming || !renameTitle.trim()}
                  leftIcon={renaming ? Loader2 : CheckCircle2}
                >
                  {renaming ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal (Section 16) */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="space-y-2">
              <h3 className="text-base font-bold text-slate-900">
                Delete project "{deleteTarget.title}"?
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                This will remove the project workspace and associated project-only data.
                Shared source documents from the main Documents/Knowledge Base system will not be deleted.
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 transition-colors shadow-xs"
              >
                Delete Project
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectListScreen;
