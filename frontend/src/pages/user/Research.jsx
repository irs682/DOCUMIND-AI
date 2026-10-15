import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Sparkles, BarChart3, AlertCircle, Loader2 } from 'lucide-react';
import ProjectListScreen from '../../components/research/workspace/ProjectListScreen';
import ResearchWorkspaceShell from '../../components/research/workspace/ResearchWorkspaceShell';
import EvaluationWorkbench from '../../components/research/EvaluationWorkbench';
import { researchApi } from '../../services/researchApi';

const Research = () => {
  const { projectId, step } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const [activeTab, setActiveTab] = useState('workspace'); // 'workspace' | 'evaluation'
  const [projects, setProjects] = useState([]);
  const [activeProject, setActiveProject] = useState(null);
  const [loadingProject, setLoadingProject] = useState(false);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [error, setError] = useState('');

  // Determine current step from route params
  const isManuscriptRoute = location.pathname.endsWith('/manuscript');
  const routeStep = isManuscriptRoute
    ? 11
    : step
    ? parseInt(step, 10)
    : null;

  // Redirect legacy /manuscript path directly to step 11 in the classic workspace
  useEffect(() => {
    if (isManuscriptRoute && projectId) {
      navigate(`/research/projects/${projectId}/step/11`, { replace: true });
    }
  }, [isManuscriptRoute, projectId, navigate]);

  // Load user's projects list
  const loadProjects = useCallback(async () => {
    try {
      setLoadingProjects(true);
      const res = await researchApi.getProjects();
      if (res.data?.projects) {
        setProjects(res.data.projects);
      }
    } catch (err) {
      console.warn('Could not load research projects:', err);
      setProjects([]);
    } finally {
      setLoadingProjects(false);
    }
  }, []);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  // Synchronize active project from route params (Refresh safety & safe browser back)
  useEffect(() => {
    if (!projectId) {
      setActiveProject(null);
      return;
    }

    // If activeProject is already loaded and matches projectId, nothing to fetch
    if (activeProject && (activeProject._id === projectId || activeProject.id === projectId)) {
      return;
    }

    let isMounted = true;
    const fetchActiveProject = async () => {
      try {
        setLoadingProject(true);
        setError('');
        const res = await researchApi.getProjectById(projectId);
        if (isMounted && res.data?.project) {
          const loadedProj = res.data.project;
          setActiveProject(loadedProj);

          // If no specific step in URL, redirect cleanly to project.currentStep without history loops
          if (!step && !isManuscriptRoute) {
            const destStep = loadedProj.currentStep || 1;
            navigate(`/research/projects/${projectId}/step/${destStep}`, { replace: true });
          }
        }
      } catch (err) {
        if (isMounted) {
          console.error('Failed to load project by ID:', err);
          setError(
            err.response?.status === 404
              ? 'Research project not found or you do not have permission to view it.'
              : 'Unable to load research project.'
          );
          setActiveProject(null);
          // Return safely to projects list
          navigate('/research/projects', { replace: true });
        }
      } finally {
        if (isMounted) {
          setLoadingProject(false);
        }
      }
    };

    fetchActiveProject();

    return () => {
      isMounted = false;
    };
  }, [projectId, step, isManuscriptRoute, navigate]);

  // Open existing project at its currentStep (Section 22)
  const handleSelectProject = (project) => {
    setError('');
    setActiveProject(project);
    const destStep = project.currentStep || 1;
    navigate(`/research/projects/${project._id}/step/${destStep}`);
  };

  // Open manuscript directly (Section 23)
  const handleOpenManuscript = (project) => {
    setError('');
    setActiveProject(project);
    navigate(`/research/projects/${project._id}/step/11`);
  };

  // Step change navigation (keeps route and state in perfect sync)
  const handleStepChange = (newStep) => {
    if (!activeProject) return;
    const projId = activeProject._id || activeProject.id;
    navigate(`/research/projects/${projId}/step/${newStep}`);
  };

  // Back to All Projects
  const handleBackToProjects = () => {
    setActiveProject(null);
    navigate('/research/projects');
    loadProjects();
  };

  // Create clean isolated project (Sections 14, 20)
  const handleCreateProject = async (data) => {
    setError('');
    try {
      const res = await researchApi.createProject(data);
      const created = res.data?.project;
      if (created) {
        setProjects((prev) => [created, ...prev]);
        setActiveProject(created);
        // Opens Step 1 clean
        navigate(`/research/projects/${created._id}/step/1`);
        return created;
      }
    } catch (err) {
      console.error('Failed to create research project:', err);
      const msg = err.response?.data?.message || err.message || 'Failed to create research project';
      setError(msg);
      throw new Error(msg);
    }
  };

  // Rename Project
  const handleRenameProject = async (id, updates) => {
    try {
      const res = await researchApi.updateProject(id, updates);
      const updated = res.data?.project;
      if (updated) {
        setProjects((prev) =>
          prev.map((p) => (p._id === id ? { ...p, ...updates } : p))
        );
        if (activeProject?._id === id) {
          setActiveProject((prev) => ({ ...prev, ...updates }));
        }
      }
    } catch (err) {
      console.error('Failed to rename project:', err);
      setError('Could not rename project');
    }
  };

  // Delete Project with state update
  const handleDeleteProject = async (id) => {
    try {
      await researchApi.deleteProject(id);
      setProjects((prev) => prev.filter((p) => p._id !== id));
      if (activeProject?._id === id) {
        setActiveProject(null);
        navigate('/research/projects');
      }
    } catch (err) {
      console.error('Failed to delete project:', err);
      setError('Could not delete project');
    }
  };

  // In-workspace project updates
  const handleProjectUpdated = (updated) => {
    setActiveProject(updated);
    setProjects((prev) =>
      prev.map((p) => (p._id === updated._id ? updated : p))
    );
  };

  return (
    <div className="space-y-6">
      {/* Top Bar Navigation: AI Research Workspace vs System Evaluation */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white sm:text-3xl">
            AI Research Workspace
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            From literature review to research gap, methodology, results, and full paper drafting.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-1 rounded-xl bg-slate-100 dark:bg-slate-800 p-1 border border-slate-200 dark:border-slate-700">
          <button
            type="button"
            onClick={() => {
              setActiveTab('workspace');
            }}
            className={`flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-bold transition-all ${
              activeTab === 'workspace'
                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Sparkles size={14} />
            <span>Research Workspace</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('evaluation')}
            className={`flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-bold transition-all ${
              activeTab === 'evaluation'
                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <BarChart3 size={14} />
            <span>System Evaluation</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-3 rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/40 p-4 text-sm text-rose-700 dark:text-rose-300">
          <AlertCircle size={18} className="shrink-0 text-rose-600 dark:text-rose-400" />
          <p>{error}</p>
        </div>
      )}

      {/* Main Content Area */}
      {activeTab === 'workspace' && (
        <>
          {loadingProject ? (
            <div className="p-16 text-center text-slate-500 dark:text-slate-400 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
              <Loader2 size={28} className="animate-spin mx-auto text-indigo-600 dark:text-indigo-400 mb-3" />
              <p className="text-sm font-medium">Restoring Research Project Workspace...</p>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                Loading saved literature, methodology, results, and draft state.
              </p>
            </div>
          ) : activeProject ? (
            <ResearchWorkspaceShell
              project={activeProject}
              initialStep={routeStep || activeProject.currentStep || 1}
              onBackToProjects={handleBackToProjects}
              onProjectUpdated={handleProjectUpdated}
              onStepChange={handleStepChange}
              onCreateNewProject={handleCreateProject}
            />
          ) : (
            <ProjectListScreen
              projects={projects}
              loading={loadingProjects}
              onSelectProject={handleSelectProject}
              onOpenManuscript={handleOpenManuscript}
              onCreateProject={handleCreateProject}
              onRenameProject={handleRenameProject}
              onDeleteProject={handleDeleteProject}
            />
          )}
        </>
      )}

      {/* System Evaluation Workbench */}
      {activeTab === 'evaluation' && <EvaluationWorkbench />}
    </div>
  );
};

export default Research;
