import React from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  Circle,
  Clock,
  FileText,
  Target,
  BookOpen,
  GitCompare,
  HelpCircle,
  Cpu,
  BarChart2,
  Database,
  MessageSquare,
  Award,
  Layers,
  Plus,
} from 'lucide-react';

export const WORKSPACE_STEPS = [
  {
    number: 1,
    id: 'papers',
    label: '1. Add Papers',
    shortLabel: 'Papers',
    desc: 'Ingest & extract profiles',
    icon: FileText,
  },
  {
    number: 2,
    id: 'goal',
    label: '2. Research Goal',
    shortLabel: 'Goal',
    desc: 'Define topic & problem',
    icon: Target,
  },
  {
    number: 3,
    id: 'related',
    label: '3. Related Work',
    shortLabel: 'Related Work',
    desc: 'Literature synthesis',
    icon: BookOpen,
  },
  {
    number: 4,
    id: 'comparison',
    label: '4. Comparison',
    shortLabel: 'Comparison',
    desc: 'Matrix & compatibility check',
    icon: GitCompare,
  },
  {
    number: 5,
    id: 'gap',
    label: '5. Research Gap',
    shortLabel: 'Gap',
    desc: 'Grounded limitations',
    icon: Layers,
  },
  {
    number: 6,
    id: 'questions',
    label: '6. Questions',
    shortLabel: 'Questions',
    desc: 'RQs & Hypotheses',
    icon: HelpCircle,
  },
  {
    number: 7,
    id: 'methodology',
    label: '7. Methodology',
    shortLabel: 'Methodology',
    desc: 'Architecture & pipeline',
    icon: Cpu,
  },
  {
    number: 8,
    id: 'benchmarks',
    label: '8. Benchmarks',
    shortLabel: 'Benchmarks',
    desc: 'Baselines & metrics',
    icon: BarChart2,
  },
  {
    number: 9,
    id: 'results',
    label: '9. Results',
    shortLabel: 'Results',
    desc: 'User empirical data & gains',
    icon: Database,
  },
  {
    number: 10,
    id: 'discussion',
    label: '10. Discussion',
    shortLabel: 'Discussion',
    desc: 'Trade-offs & validation',
    icon: MessageSquare,
  },
  {
    number: 11,
    id: 'draft',
    label: '11. Paper Draft',
    shortLabel: 'Draft',
    desc: 'Full IMRAD manuscript',
    icon: Award,
  },
];

const WorkspaceStepper = ({
  project,
  currentStep,
  onSelectStep,
  onBackToProjects,
  onNewProject,
  isSaving = false,
}) => {
  // Calculate Workflow Progress (steps with data) vs Research Readiness (scientific completeness)
  const calculateProgress = () => {
    let completed = 0;
    if (project?.paperProfiles?.length > 0) completed++;
    if (project?.mainResearchProblem || project?.researchProblem) completed++;
    if (project?.relatedWork?.table?.length > 0) completed++;
    if (project?.comparisonMatrix?.length > 0) completed++;
    if (project?.researchGaps?.length > 0) completed++;
    if (project?.researchQuestions?.length > 0) completed++;
    if (project?.methodology?.proposedArchitecture) completed++;
    if (project?.baselines?.length > 0) completed++;
    if (project?.userResults?.length > 0) completed++;
    if (project?.discussion?.performanceAnalysis) completed++;
    if (project?.generatedDraft?.title) completed++;
    return completed;
  };

  const completedStepsCount = calculateProgress();
  const workflowPct = Math.round((completedStepsCount / 11) * 100);

  // Research Readiness with Hard Gates (Zero verified experiments caps at 72%)
  const verifiedResultsCount = (project?.userResults || []).filter((r) => r.verified).length;
  let readinessPct = Math.min(72, Math.round((completedStepsCount / 11) * 72));
  let readinessLabel = 'Pre-Experimental Draft';

  if (verifiedResultsCount > 0) {
    readinessPct = Math.min(100, 72 + Math.round((verifiedResultsCount / 3) * 28));
    readinessLabel = readinessPct >= 95 ? 'Publication Ready' : 'Empirical Draft';
  } else if (completedStepsCount >= 8) {
    readinessLabel = 'Strong Pre-Experimental Draft';
  }

  const isStepCompleted = (stepNum) => {
    switch (stepNum) {
      case 1:
        return (project?.paperProfiles?.length || 0) > 0;
      case 2:
        return !!(project?.mainResearchProblem || project?.researchProblem);
      case 3:
        return (project?.relatedWork?.table?.length || 0) > 0;
      case 4:
        return (project?.comparisonMatrix?.length || 0) > 0;
      case 5:
        return (project?.researchGaps?.length || 0) > 0;
      case 6:
        return (project?.researchQuestions?.length || 0) > 0;
      case 7:
        return !!project?.methodology?.proposedArchitecture;
      case 8:
        return (project?.baselines?.length || 0) > 0;
      case 9:
        return (project?.userResults?.length || 0) > 0;
      case 10:
        return !!project?.discussion?.performanceAnalysis;
      case 11:
        return !!project?.generatedDraft?.title;
      default:
        return false;
    }
  };

  return (
    <aside className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs flex flex-col h-full sticky top-4">
      {/* Top Header */}
      <div className="border-b border-slate-100 pb-4 mb-4">
        <div className="flex items-center justify-between gap-2 mb-3">
          <button
            type="button"
            onClick={onBackToProjects}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-indigo-600 transition-colors group"
            title="Return to all research projects"
          >
            <ArrowLeft size={14} className="group-hover:-translate-x-0.5 transition-transform" />
            <span>All Projects</span>
          </button>

          {onNewProject && (
            <button
              type="button"
              onClick={onNewProject}
              className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-2 py-0.5 rounded-lg transition-colors border border-indigo-100"
              title="Create a new research project"
            >
              <Plus size={12} />
              <span>New</span>
            </button>
          )}
        </div>

        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h2 className="text-sm font-bold text-slate-900 truncate" title={project?.title}>
              {project?.title || 'Untitled Research Project'}
            </h2>
            <div className="flex items-center gap-2 mt-1">
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100">
                Step {currentStep} of 11
              </span>
              {isSaving && (
                <span className="text-[10px] text-amber-600 animate-pulse flex items-center gap-1">
                  <Clock size={10} /> Saving...
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Dual Indicators: Workflow Progress vs Research Readiness (Sections 42 & 43) */}
        <div className="mt-3.5 space-y-2.5">
          <div className="space-y-1">
            <div className="flex justify-between text-[10px] text-slate-500 font-medium">
              <span>Workflow Progress</span>
              <span className="font-semibold text-slate-700">{completedStepsCount} / 11 steps</span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
              <div
                className="h-full rounded-full bg-indigo-500 transition-all duration-500 ease-out"
                style={{ width: `${workflowPct}%` }}
              />
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex justify-between text-[10px] text-slate-500 font-medium">
              <span>Research Readiness</span>
              <span className="font-bold text-indigo-700">{readinessPct}%</span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ease-out ${
                  readinessPct >= 90 ? 'bg-emerald-600' : 'bg-amber-500'
                }`}
                style={{ width: `${readinessPct}%` }}
              />
            </div>
            <div className="text-[9.5px] text-slate-400 font-mono flex items-center justify-between">
              <span>Status:</span>
              <span className="text-slate-600 font-medium truncate">{readinessLabel}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Step Navigation List */}
      <div className="flex-1 overflow-y-auto pr-1 space-y-1">
        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-2 py-1">
          Research Workflow
        </div>

        {WORKSPACE_STEPS.map((step) => {
          const isActive = currentStep === step.number;
          const completed = isStepCompleted(step.number);
          const Icon = step.icon;

          return (
            <button
              key={step.id}
              type="button"
              onClick={() => onSelectStep(step.number)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all ${
                isActive
                  ? 'bg-indigo-50/80 text-indigo-900 font-semibold border border-indigo-200/80 shadow-xs'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 border border-transparent'
              }`}
            >
              {/* Step indicator icon */}
              <div
                className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 text-xs font-bold transition-colors ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : completed
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-slate-100 text-slate-400'
                }`}
              >
                {completed && !isActive ? (
                  <CheckCircle2 size={14} className="stroke-[2.5]" />
                ) : (
                  <span>{step.number}</span>
                )}
              </div>

              {/* Step details */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <p className={`text-xs truncate ${isActive ? 'font-bold text-indigo-950' : 'font-medium'}`}>
                    {step.label}
                  </p>
                </div>
                <p className="text-[10px] text-slate-400 truncate">{step.desc}</p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Footer Info */}
      <div className="pt-3 mt-3 border-t border-slate-100 text-[11px] text-slate-400 flex items-center justify-between">
        <span>DOCUMIND Research</span>
        <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-mono">
          v2.0
        </span>
      </div>
    </aside>
  );
};

export default WorkspaceStepper;
