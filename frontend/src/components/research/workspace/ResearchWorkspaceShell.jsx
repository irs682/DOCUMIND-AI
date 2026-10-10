import React, { useState, useEffect } from 'react';
import {
  Plus,
  Loader2,
} from 'lucide-react';
import WorkspaceStepper from './WorkspaceStepper';
import Step1AddPapers from './Step1AddPapers';
import Step2ResearchGoal from './Step2ResearchGoal';
import Step3RelatedWork from './Step3RelatedWork';
import Step4Comparison from './Step4Comparison';
import Step5ResearchGap from './Step5ResearchGap';
import Step6Questions from './Step6Questions';
import Step7Methodology from './Step7Methodology';
import Step8Benchmarks from './Step8Benchmarks';
import Step9Results from './Step9Results';
import Step10Discussion from './Step10Discussion';
import Step11PaperDraft from './Step11PaperDraft';
import { researchApi } from '../../../services/researchApi';

const ResearchWorkspaceShell = ({
  project: initialProject,
  initialStep = 1,
  onBackToProjects,
  onProjectUpdated,
  onStepChange,
  onCreateNewProject,
}) => {
  const [project, setProject] = useState(initialProject);
  const [currentStep, setCurrentStep] = useState(
    initialStep || initialProject?.currentStep || 1
  );
  const [isSaving, setIsSaving] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);

  // New Project Modal State
  const [showNewProjectModal, setShowNewProjectModal] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [modalTopic, setModalTopic] = useState('');
  const [modalDescription, setModalDescription] = useState('');
  const [modalError, setModalError] = useState('');
  const [isCreatingProject, setIsCreatingProject] = useState(false);

  useEffect(() => {
    setProject(initialProject);
  }, [initialProject]);

  useEffect(() => {
    if (initialStep && initialStep >= 1 && initialStep <= 11) {
      setCurrentStep(initialStep);
    } else if (initialProject?.currentStep) {
      setCurrentStep(initialProject.currentStep);
    }
  }, [initialStep, initialProject?.currentStep]);

  const handleUpdateProject = async (updates) => {
    const projectId = project?._id || project?.id;
    if (!projectId) {
      throw new Error('No active research project found. Please select or create a project first.');
    }
    setIsSaving(true);
    try {
      const res = await researchApi.updateProject(projectId, updates);
      const updated = res.data?.project || { ...project, ...updates };
      setProject(updated);
      if (onProjectUpdated) {
        onProjectUpdated(updated);
      }
      return updated;
    } catch (err) {
      console.error('Failed to update project:', err);
      throw err;
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveGoal = async (goalPayload) => {
    const projectId = project?._id || project?.id;
    if (!projectId) {
      throw new Error('No active research project found. Please select or create a project first.');
    }
    setIsSaving(true);
    try {
      const res = await researchApi.updateProjectGoal(projectId, goalPayload);
      const updated = res.data?.project || { ...project, ...goalPayload };
      setProject(updated);
      if (onProjectUpdated) {
        onProjectUpdated(updated);
      }
      return updated;
    } catch (err) {
      console.error('Failed to save research goal:', err);
      throw err;
    } finally {
      setIsSaving(false);
    }
  };

  const handleExecuteStep = async (stepNumber, stepData = {}) => {
    const projectId = project?._id || project?.id;
    if (!projectId) {
      throw new Error('No active research project found. Please select or create a project first.');
    }
    setIsExecuting(true);
    try {
      const res = await researchApi.executeStep(projectId, stepNumber, stepData);
      const updated = res.data?.project || project;
      setProject(updated);
      if (onProjectUpdated) {
        onProjectUpdated(updated);
      }
      return res.data;
    } catch (err) {
      console.error(`Step ${stepNumber} execution failed:`, err);
      throw err;
    } finally {
      setIsExecuting(false);
    }
  };

  const handleSelectStep = async (stepNum) => {
    setCurrentStep(stepNum);
    if (onStepChange) {
      onStepChange(stepNum);
    }
    const projectId = project?._id || project?.id;
    if (projectId) {
      try {
        await researchApi.updateProject(projectId, { currentStep: stepNum });
      } catch (e) {
        // non-fatal
      }
    }
  };

  const handleNextStep = () => {
    const next = Math.min(currentStep + 1, 11);
    handleSelectStep(next);
  };

  const handlePrevStep = () => {
    const prev = Math.max(currentStep - 1, 1);
    handleSelectStep(prev);
  };

  // Safe context-aware Back navigation (Sections 9, 10)
  const handleBack = async () => {
    setHeaderError('');
    if (isSaving) {
      // Flush / await in-flight save before leaving
      await new Promise((resolve) => setTimeout(resolve, 200));
    }

    if (currentStep > 1) {
      // Context aware: Step N -> Step N - 1
      handleSelectStep(currentStep - 1);
    } else {
      // Step 1 -> All Projects list
      if (onBackToProjects) {
        onBackToProjects();
      }
    }
  };

  // Safe return to All Projects
  const handleSafeBackToProjects = async () => {
    if (isSaving) {
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
    if (onBackToProjects) {
      onBackToProjects();
    }
  };

  // Handle New Project submission
  const handleCreateNewProjectSubmit = async (e) => {
    e.preventDefault();
    if (!modalTitle.trim()) return;
    setIsCreatingProject(true);
    setModalError('');
    try {
      if (onCreateNewProject) {
        await onCreateNewProject({
          title: modalTitle.trim(),
          researchTopic: modalTopic.trim() || modalTitle.trim(),
          description: modalDescription.trim(),
        });
      } else {
        const res = await researchApi.createProject({
          title: modalTitle.trim(),
          researchTopic: modalTopic.trim() || modalTitle.trim(),
          description: modalDescription.trim(),
        });
        const created = res.data?.project;
        if (created) {
          setProject(created);
          setCurrentStep(1);
          if (onProjectUpdated) onProjectUpdated(created);
        }
      }
      setShowNewProjectModal(false);
      setModalTitle('');
      setModalTopic('');
      setModalDescription('');
    } catch (err) {
      console.error('Failed to create new project:', err);
      setModalError(err.message || 'Failed to create new project');
    } finally {
      setIsCreatingProject(false);
    }
  };

  const renderActiveStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <Step1AddPapers
            project={project}
            onUpdateProject={handleUpdateProject}
            onExecuteStep={handleExecuteStep}
            onNext={handleNextStep}
            isExecuting={isExecuting}
          />
        );
      case 2:
        return (
          <Step2ResearchGoal
            project={project}
            onUpdateProject={handleUpdateProject}
            onSaveGoal={handleSaveGoal}
            onExecuteStep={handleExecuteStep}
            onNext={handleNextStep}
            onPrev={handlePrevStep}
            isExecuting={isExecuting}
          />
        );
      case 3:
        return (
          <Step3RelatedWork
            project={project}
            onUpdateProject={handleUpdateProject}
            onExecuteStep={handleExecuteStep}
            onNext={handleNextStep}
            onPrev={handlePrevStep}
            isExecuting={isExecuting}
          />
        );
      case 4:
        return (
          <Step4Comparison
            project={project}
            onUpdateProject={handleUpdateProject}
            onExecuteStep={handleExecuteStep}
            onNext={handleNextStep}
            onPrev={handlePrevStep}
            isExecuting={isExecuting}
          />
        );
      case 5:
        return (
          <Step5ResearchGap
            project={project}
            onUpdateProject={handleUpdateProject}
            onExecuteStep={handleExecuteStep}
            onNext={handleNextStep}
            onPrev={handlePrevStep}
            isExecuting={isExecuting}
          />
        );
      case 6:
        return (
          <Step6Questions
            project={project}
            onUpdateProject={handleUpdateProject}
            onExecuteStep={handleExecuteStep}
            onNext={handleNextStep}
            onPrev={handlePrevStep}
            isExecuting={isExecuting}
          />
        );
      case 7:
        return (
          <Step7Methodology
            project={project}
            onUpdateProject={handleUpdateProject}
            onExecuteStep={handleExecuteStep}
            onNext={handleNextStep}
            onPrev={handlePrevStep}
            isExecuting={isExecuting}
          />
        );
      case 8:
        return (
          <Step8Benchmarks
            project={project}
            onUpdateProject={handleUpdateProject}
            onExecuteStep={handleExecuteStep}
            onNext={handleNextStep}
            onPrev={handlePrevStep}
            isExecuting={isExecuting}
          />
        );
      case 9:
        return (
          <Step9Results
            project={project}
            onUpdateProject={handleUpdateProject}
            onExecuteStep={handleExecuteStep}
            onNext={handleNextStep}
            onPrev={handlePrevStep}
            isExecuting={isExecuting}
          />
        );
      case 10:
        return (
          <Step10Discussion
            project={project}
            onUpdateProject={handleUpdateProject}
            onExecuteStep={handleExecuteStep}
            onNext={handleNextStep}
            onPrev={handlePrevStep}
            isExecuting={isExecuting}
          />
        );
      case 11:
        return (
          <Step11PaperDraft
            project={project}
            onUpdateProject={handleUpdateProject}
            onExecuteStep={handleExecuteStep}
            onPrev={handlePrevStep}
            isExecuting={isExecuting}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-4">
      {/* Main 2-Column Layout */}
      <div className="grid gap-6 lg:grid-cols-12 items-start">
        {/* Left Column: 11-Step Stepper */}
        <div className="lg:col-span-3">
          <WorkspaceStepper
            project={project}
            currentStep={currentStep}
            onSelectStep={handleSelectStep}
            onBackToProjects={handleSafeBackToProjects}
            onNewProject={() => setShowNewProjectModal(true)}
            isSaving={isSaving}
          />
        </div>

        {/* Right Column: Active Step Workspace */}
        <div className="lg:col-span-9 rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
          {renderActiveStep()}
        </div>
      </div>

      {/* Start New Research Project Modal (Complies with Sections 11, 12, 13) */}
      {showNewProjectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-slate-200 space-y-5">
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-slate-900">Start New Research Project</h3>
              <p className="text-xs text-slate-500">
                Creates a clean, independent research project workspace isolated from other papers.
              </p>
            </div>

            {modalError && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700 font-medium">
                {modalError}
              </div>
            )}

            <form onSubmit={handleCreateNewProjectSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Project Title *
                </label>
                <input
                  type="text"
                  placeholder="e.g. MERA-VLA: Retrieval-Augmented Vision-Language-Action"
                  value={modalTitle}
                  onChange={(e) => setModalTitle(e.target.value)}
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
                  placeholder="e.g. Memory retrieval in embodied robot manipulation"
                  value={modalTopic}
                  onChange={(e) => setModalTopic(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 p-2.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                  Description / Research Goal (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Investigate whether episodic memory retrieval reduces multimodal hallucination"
                  value={modalDescription}
                  onChange={(e) => setModalDescription(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 p-2.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewProjectModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreatingProject || !modalTitle.trim()}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 transition-colors shadow-xs"
                >
                  {isCreatingProject ? (
                    <>
                      <Loader2 size={13} className="animate-spin" />
                      <span>Creating...</span>
                    </>
                  ) : (
                    <>
                      <Plus size={13} />
                      <span>Create Project</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ResearchWorkspaceShell;
