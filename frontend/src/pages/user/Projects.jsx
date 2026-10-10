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
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-indigo-600">
            <FolderKanban size={16} /> Workspace
          </div>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">Projects</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
            Keep each initiative focused with its own files, conversations, and AI instructions.
          </p>
        </div>
        <button onClick={() => setIsCreating(true)} className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700">
          <Plus size={17} /> New project
        </button>
      </div>

      {error && <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}

      <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
        <Search size={17} className="text-slate-400" />
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search projects..." className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400" />
      </div>

      {isCreating && (
        <form onSubmit={createProject} className="rounded-2xl border border-indigo-100 bg-white p-5 shadow-lg shadow-indigo-100/40">
          <div className="mb-5 flex items-center justify-between">
            <div><h2 className="font-bold text-slate-900">Create a project</h2><p className="mt-1 text-xs text-slate-500">Give your AI a focused workspace and point of view.</p></div>
            <button type="button" onClick={() => setIsCreating(false)} className="text-sm text-slate-400 hover:text-slate-700">Cancel</button>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <input required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Project name" className="rounded-xl border border-slate-200 px-3.5 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100" />
            <input value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} placeholder="Short description" className="rounded-xl border border-slate-200 px-3.5 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100" />
          </div>
          <textarea rows={3} value={form.instructions} onChange={(event) => setForm({ ...form, instructions: event.target.value })} placeholder="How should the AI answer in this project? e.g. Use concise executive summaries and cite page numbers." className="mt-4 w-full resize-none rounded-xl border border-slate-200 px-3.5 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100" />
          <div className="mt-4 flex items-center justify-between gap-4">
            <div className="flex gap-2">{colors.map((color) => <button type="button" key={color} onClick={() => setForm({ ...form, color })} className={`h-6 w-6 rounded-full ${form.color === color ? 'ring-2 ring-offset-2 ring-slate-400' : ''}`} style={{ backgroundColor: color }} aria-label="Choose project color" />)}</div>
            <button type="submit" className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-700">Create project</button>
          </div>
        </form>
      )}

      {visibleProjects.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
          <FolderKanban className="mx-auto text-slate-300" size={42} />
          <h2 className="mt-4 font-bold text-slate-900">No projects yet</h2>
          <p className="mt-1 text-sm text-slate-500">Create a project to keep its files and AI conversations together.</p>
        </div>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {visibleProjects.map((project) => (
            <article key={project._id} className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-lg">
              <div className="flex items-start justify-between">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl text-white" style={{ backgroundColor: project.color || colors[0] }}><FolderKanban size={21} /></div>
                <div className="flex gap-1 opacity-0 transition group-hover:opacity-100">
                  <button onClick={() => navigate(`/ai-chat?project=${project._id}`)} className="rounded-lg p-2 text-slate-400 hover:bg-indigo-50 hover:text-indigo-600" title="Open project chat"><MessageSquare size={15} /></button>
                  <button onClick={() => deleteProject(project)} className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600" title="Delete project"><Trash2 size={15} /></button>
                </div>
              </div>
              <h2 className="mt-5 truncate text-lg font-bold text-slate-900">{project.name}</h2>
              <p className="mt-1 min-h-10 text-sm leading-5 text-slate-500">{project.description || 'No description yet.'}</p>
              <div className="mt-5 flex items-center gap-4 border-t border-slate-100 pt-4 text-xs font-medium text-slate-500">
                <span className="flex items-center gap-1.5"><FileText size={14} /> {project.documentCount || 0} files</span>
                <span className="flex items-center gap-1.5"><MessageSquare size={14} /> {project.chatCount || 0} chats</span>
              </div>
              <button onClick={() => navigate(`/ai-chat?project=${project._id}`)} className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-slate-50 py-2.5 text-xs font-bold text-slate-700 hover:bg-indigo-50 hover:text-indigo-700">Open workspace <ArrowRight size={14} /></button>
            </article>
          ))}
        </div>
      )}
    </div>
  );
};

export default Projects;
