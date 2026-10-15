import { useEffect, useState } from 'react';
import { FolderKanban, Plus, Search, MessageSquare, FileText, Trash2, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { projectApi } from '../../services/projectApi';

const colors = ['#4f46e5', '#0891b2', '#059669', '#d97706', '#db2777'];

const Projects = () => {
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [query, setQuery] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', instructions: '', color: colors[0] });
  const [error, setError] = useState('');

  const loadProjects = async () => {
    try {
      const { data } = await projectApi.list();
      setProjects(data.projects || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not load projects.');
    }
  };

  useEffect(() => { loadProjects(); }, []);

  const createProject = async (event) => {
    event.preventDefault();
    if (!form.name.trim()) return;
    try {
      const { data } = await projectApi.create(form);
      setProjects((current) => [data.project, ...current]);
      setForm({ name: '', description: '', instructions: '', color: colors[0] });
      setIsCreating(false);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not create project.');
    }
  };

  const deleteProject = async (project) => {
    if (!window.confirm(`Delete "${project.name}"? Its chats and files will remain available outside the project.`)) return;
    await projectApi.remove(project._id);
    setProjects((current) => current.filter((item) => item._id !== project._id));
  };

  const visibleProjects = projects.filter((project) =>
    `${project.name} ${project.description}`.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="space-y-7">
      <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-indigo-600 dark:text-indigo-400">
            <FolderKanban size={16} /> Workspace
          </div>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950 dark:text-white">Projects</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400">
            Keep each initiative focused with its own files, conversations, and AI instructions.
          </p>
        </div>
        <button onClick={() => setIsCreating(true)} className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 transition">
          <Plus size={17} /> New project
        </button>
      </div>

      {error && <div className="rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/40 px-4 py-3 text-sm text-rose-700 dark:text-rose-300">{error}</div>}

      <div className="flex items-center gap-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 shadow-sm">
        <Search size={17} className="text-slate-400 dark:text-slate-500" />
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search projects..." className="w-full bg-transparent text-sm text-slate-900 dark:text-white outline-none placeholder:text-slate-400 dark:placeholder:text-slate-500" />
      </div>

      {isCreating && (
        <form onSubmit={createProject} className="rounded-2xl border border-indigo-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-lg shadow-indigo-100/40 dark:shadow-none">
          <div className="mb-5 flex items-center justify-between">
            <div><h2 className="font-bold text-slate-900 dark:text-white">Create a project</h2><p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Give your AI a focused workspace and point of view.</p></div>
            <button type="button" onClick={() => setIsCreating(false)} className="text-sm text-slate-400 hover:text-slate-700 dark:hover:text-slate-200">Cancel</button>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <input required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Project name" className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-850 px-3.5 py-3 text-sm text-slate-900 dark:text-white outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900/40 placeholder:text-slate-400 dark:placeholder:text-slate-500" />
            <input value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} placeholder="Short description" className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-850 px-3.5 py-3 text-sm text-slate-900 dark:text-white outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900/40 placeholder:text-slate-400 dark:placeholder:text-slate-500" />
          </div>
          <textarea rows={3} value={form.instructions} onChange={(event) => setForm({ ...form, instructions: event.target.value })} placeholder="How should the AI answer in this project? e.g. Use concise executive summaries and cite page numbers." className="mt-4 w-full resize-none rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-850 px-3.5 py-3 text-sm text-slate-900 dark:text-white outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900/40 placeholder:text-slate-400 dark:placeholder:text-slate-500" />
          <div className="mt-4 flex items-center justify-between gap-4">
            <div className="flex gap-2">{colors.map((color) => <button type="button" key={color} onClick={() => setForm({ ...form, color })} className={`h-6 w-6 rounded-full ${form.color === color ? 'ring-2 ring-offset-2 ring-slate-400' : ''}`} style={{ backgroundColor: color }} aria-label="Choose project color" />)}</div>
            <button type="submit" className="rounded-xl bg-slate-900 dark:bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-700 dark:hover:bg-indigo-500 transition">Create project</button>
          </div>
        </form>
      )}

      {visibleProjects.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900 px-6 py-16 text-center">
          <FolderKanban className="mx-auto text-slate-300 dark:text-slate-700" size={42} />
          <h2 className="mt-4 font-bold text-slate-900 dark:text-white">No projects yet</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Create a project to keep its files and AI conversations together.</p>
        </div>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {visibleProjects.map((project) => (
            <article key={project._id} className="group rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-indigo-200 dark:hover:border-indigo-700 hover:shadow-lg">
              <div className="flex items-start justify-between">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl text-white" style={{ backgroundColor: project.color || colors[0] }}><FolderKanban size={21} /></div>
                <div className="flex gap-1 opacity-0 transition group-hover:opacity-100">
                  <button onClick={() => navigate(`/ai-chat?project=${project._id}`)} className="rounded-lg p-2 text-slate-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 hover:text-indigo-600 dark:hover:text-indigo-400" title="Open project chat"><MessageSquare size={15} /></button>
                  <button onClick={() => deleteProject(project)} className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 hover:text-rose-600 dark:hover:text-rose-400" title="Delete project"><Trash2 size={15} /></button>
                </div>
              </div>
              <h2 className="mt-5 truncate text-lg font-bold text-slate-900 dark:text-white">{project.name}</h2>
              <p className="mt-1 min-h-10 text-sm leading-5 text-slate-500 dark:text-slate-400">{project.description || 'No description yet.'}</p>
              <div className="mt-5 flex items-center gap-4 border-t border-slate-100 dark:border-slate-800 pt-4 text-xs font-medium text-slate-500 dark:text-slate-400">
                <span className="flex items-center gap-1.5"><FileText size={14} /> {project.documentCount || 0} files</span>
                <span className="flex items-center gap-1.5"><MessageSquare size={14} /> {project.chatCount || 0} chats</span>
              </div>
              <button onClick={() => navigate(`/ai-chat?project=${project._id}`)} className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-slate-50 dark:bg-slate-800 py-2.5 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 hover:text-indigo-700 dark:hover:text-indigo-300 transition">Open workspace <ArrowRight size={14} /></button>
            </article>
          ))}
        </div>
      )}
    </div>
  );
};

export default Projects;
