import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FolderKanban,
  Plus,
  FilePlus,
  Settings,
  MoreVertical,
  MessageSquare,
  FileText,
  Sparkles,
  ArrowRight,
  Search,
  CheckCircle2,
  Clock,
  AlertCircle,
  UploadCloud,
  GitCompare,
} from 'lucide-react';
import ProjectOverflowMenu from './ProjectOverflowMenu';
import DocumentOverflowMenu from './DocumentOverflowMenu';
import ChatOverflowMenu from './ChatOverflowMenu';

const SUGGESTED_PROMPTS = [
  {
    title: 'Summarize project documents',
    prompt: 'Please provide a comprehensive summary of all documents in this project, highlighting the core objectives and findings.',
    icon: '📊',
  },
  {
    title: 'Compare selected documents',
    prompt: 'Compare the primary specifications and requirements outlined across the project documents.',
    icon: '🔍',
  },
  {
    title: 'Find key requirements',
    prompt: 'Extract and list all functional requirements, constraints, and dependencies described in the documentation.',
    icon: '📋',
  },
  {
    title: 'Identify inconsistencies',
    prompt: 'Check the project documentation for any conflicting definitions, gaps, or architectural inconsistencies.',
    icon: '⚠️',
  },
];

const ProjectHomeView = ({
  project,
  chats = [],
  documents = [],
  onNewChatWithPrompt,
  onOpenAddFiles,
  onOpenSettings,
  onSelectChat,
  onRenameChat,
  onTogglePinChat,
  onMoveChat,
  onRemoveChatFromProject,
  onToggleArchiveChat,
  onDeleteChat,
  onOpenDoc,
  onExtractDoc,
  onReprocessDoc,
  onRemoveDocFromProject,
  onDeleteDoc,
  onProjectAction,
}) => {
  const navigate = useNavigate();
  const [docSearch, setDocSearch] = useState('');
  const [activeMenu, setActiveMenu] = useState(null); // { type: 'project'|'chat'|'doc', item, rect }

  if (!project) return null;

  const projectDocs = documents.filter((doc) =>
    (project.documentIds || []).some(
      (id) => String(id._id || id) === String(doc._id)
    )
  );

  const filteredDocs = projectDocs.filter((d) =>
    (d.name || d.originalName || '').toLowerCase().includes(docSearch.toLowerCase())
  );

  const handleOpenMenu = (e, type, item) => {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    setActiveMenu({ type, item, rect });
  };

  const closeMenu = () => setActiveMenu(null);

  return (
    <div className="flex-1 overflow-y-auto bg-[#f8f9fa] dark:bg-slate-950 p-4 sm:p-8 select-none">
      <div className="mx-auto max-w-5xl space-y-8">
        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-3xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-xs">
          <div className="flex items-start gap-4 min-w-0">
            <div
              className="flex h-12 w-12 items-center justify-center rounded-2xl text-white shadow-sm font-bold text-lg shrink-0"
              style={{ backgroundColor: project.color || '#4f46e5' }}
            >
              <FolderKanban size={24} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2.5">
                <h1 className="text-xl font-bold text-slate-900 dark:text-white truncate" title={project.name}>
                  {project.name}
                </h1>
                {project.isPinned && (
                  <span className="rounded-full bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 text-[10px] font-bold text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                    Pinned
                  </span>
                )}
                {project.status === 'archived' && (
                  <span className="rounded-full bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-[10px] font-semibold text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                    Archived
                  </span>
                )}
              </div>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 leading-relaxed max-w-2xl">
                {project.description || 'Dedicated workspace for project documents, custom instructions, and conversations.'}
              </p>
              <div className="mt-2.5 flex items-center gap-3 text-xs font-medium text-slate-400 dark:text-slate-500">
                <span>{projectDocs.length} document{projectDocs.length === 1 ? '' : 's'}</span>
                <span>•</span>
                <span>{chats.length} conversation{chats.length === 1 ? '' : 's'}</span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 shrink-0 self-start sm:self-center">
            <button
              type="button"
              onClick={() => onNewChatWithPrompt('')}
              className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3.5 py-2 text-xs font-bold text-white shadow-xs hover:bg-indigo-700 dark:hover:bg-indigo-500 transition cursor-pointer"
            >
              <Plus size={15} />
              <span>New Chat</span>
            </button>
            <button
              type="button"
              onClick={onOpenAddFiles}
              className="flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:border-slate-300 dark:hover:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-750 transition cursor-pointer"
            >
              <FilePlus size={14} className="text-slate-400 dark:text-slate-500" />
              <span>Add Files</span>
            </button>
            <button
              type="button"
              onClick={() => navigate(`/projects/${project._id}/compare`)}
              className="flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:border-slate-300 dark:hover:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-750 transition cursor-pointer"
              title="Compare documents in this workspace"
            >
              <GitCompare size={14} className="text-slate-400 dark:text-slate-500" />
              <span>Compare</span>
            </button>
            <button
              type="button"
              onClick={onOpenSettings}
              className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-2 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-750 hover:text-slate-700 dark:hover:text-slate-200 transition cursor-pointer"
              title="Project Settings"
            >
              <Settings size={15} />
            </button>
            <button
              type="button"
              onClick={(e) => handleOpenMenu(e, 'project', project)}
              className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-2 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-750 hover:text-slate-700 dark:hover:text-slate-200 transition cursor-pointer"
              title="More options"
            >
              <MoreVertical size={15} />
            </button>
          </div>
        </div>

        {/* Project Instructions Banner */}
        <div className="rounded-2xl border border-indigo-100 dark:border-indigo-900/50 bg-indigo-50/40 dark:bg-indigo-950/30 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-bold text-indigo-950 dark:text-indigo-200">
              <Sparkles size={14} className="text-indigo-600 dark:text-indigo-400" />
              <span>Custom Instructions for this Workspace</span>
            </div>
            <button
              type="button"
              onClick={onOpenSettings}
              className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 cursor-pointer"
            >
              Edit instructions
            </button>
          </div>
          <p className="mt-1.5 text-xs text-slate-600 dark:text-slate-300 italic">
            {project.instructions?.trim()
              ? `"${project.instructions}"`
              : 'No custom instructions configured yet. Add rules like "Cite specific sections" or "Use technical terminology" in Project Settings.'}
          </p>
        </div>

        {/* Suggested Prompt Cards */}
        <div>
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-3">
            Suggested Actions &amp; Prompts
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {SUGGESTED_PROMPTS.map((item, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => onNewChatWithPrompt(item.prompt)}
                className="group flex items-start gap-3 rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 text-left shadow-2xs hover:border-indigo-300 dark:hover:border-indigo-500/60 hover:shadow-xs transition cursor-pointer"
              >
                <span className="text-xl shrink-0">{item.icon}</span>
                <div className="min-w-0 flex-1">
                  <h3 className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition">
                    {item.title}
                  </h3>
                  <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                    {item.prompt}
                  </p>
                </div>
                <ArrowRight size={14} className="text-slate-300 dark:text-slate-600 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition shrink-0 mt-0.5" />
              </button>
            ))}
          </div>
        </div>

        {/* Main 2-Column Split: Documents & Recent Chats */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Column A: Project Documents */}
          <div className="rounded-3xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <FileText size={16} className="text-indigo-600 dark:text-indigo-400" />
                <h2 className="text-xs font-bold text-slate-900 dark:text-white">Project Documents</h2>
                <span className="rounded-full bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-[10px] font-bold text-slate-600 dark:text-slate-300">
                  {projectDocs.length}
                </span>
              </div>
              <button
                type="button"
                onClick={onOpenAddFiles}
                className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 cursor-pointer"
              >
                + Add files
              </button>
            </div>

            {/* Document Search */}
            {projectDocs.length > 3 && (
              <div className="mt-3 flex items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2.5 py-1.5 text-xs">
                <Search size={13} className="text-slate-400 dark:text-slate-500" />
                <input
                  value={docSearch}
                  onChange={(e) => setDocSearch(e.target.value)}
                  placeholder="Filter files..."
                  className="w-full bg-transparent outline-none placeholder:text-slate-400 dark:placeholder:text-slate-500 text-slate-700 dark:text-white text-xs"
                />
              </div>
            )}

            <div className="mt-3 space-y-1.5 flex-1 min-h-[140px] max-h-72 overflow-y-auto pr-1">
              {filteredDocs.map((doc) => {
                const isReady = doc.status === 'ready';
                const isFailed = [
                  'failed',
                  'extraction_failed',
                  'index_failed',
                  'document_extraction_failed',
                ].includes(doc.status);

                return (
                  <div
                    key={doc._id}
                    className="group flex items-center justify-between p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 hover:bg-white dark:hover:bg-slate-800 hover:border-slate-200 dark:hover:border-slate-700 transition text-xs"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <FileText size={14} className="text-slate-400 dark:text-slate-500 shrink-0" />
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-800 dark:text-white truncate" title={doc.name || doc.originalName}>
                          {doc.name || doc.originalName}
                        </p>
                        <div className="flex items-center gap-1.5 text-[10px] text-slate-400 dark:text-slate-500">
                          {isReady ? (
                            <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                              <CheckCircle2 size={10} /> Ready for RAG
                            </span>
                          ) : isFailed ? (
                            <span className="flex items-center gap-1 text-rose-500 dark:text-rose-400">
                              <AlertCircle size={10} /> Needs Reprocessing
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-amber-500 dark:text-amber-400">
                              <Clock size={10} /> Processing
                            </span>
                          )}
                          <span>•</span>
                          <span>{doc.fileType?.toUpperCase() || 'PDF'}</span>
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => handleOpenMenu(e, 'doc', doc)}
                      className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-700 dark:hover:text-slate-200 transition cursor-pointer shrink-0"
                    >
                      <MoreVertical size={13} />
                    </button>
                  </div>
                );
              })}

              {projectDocs.length === 0 && (
                <div className="flex flex-col items-center justify-center py-8 text-center text-slate-400 dark:text-slate-500">
                  <UploadCloud size={32} className="text-slate-300 dark:text-slate-600 mb-2" />
                  <p className="text-xs font-medium text-slate-600 dark:text-slate-300">No documents in this project yet</p>
                  <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">Attach documents from your library to ground AI answers.</p>
                  <button
                    type="button"
                    onClick={onOpenAddFiles}
                    className="mt-3 rounded-xl bg-slate-900 dark:bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 dark:hover:bg-indigo-500 transition cursor-pointer"
                  >
                    Add Documents
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Column B: Recent Project Chats */}
          <div className="rounded-3xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <MessageSquare size={16} className="text-indigo-600 dark:text-indigo-400" />
                <h2 className="text-xs font-bold text-slate-900 dark:text-white">Conversations</h2>
                <span className="rounded-full bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-[10px] font-bold text-slate-600 dark:text-slate-300">
                  {chats.length}
                </span>
              </div>
              <button
                type="button"
                onClick={() => onNewChatWithPrompt('')}
                className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 cursor-pointer"
              >
                + New chat
              </button>
            </div>

            <div className="mt-3 space-y-1.5 flex-1 min-h-[140px] max-h-72 overflow-y-auto pr-1">
              {chats.map((chat) => (
                <div
                  key={chat._id}
                  onClick={() => onSelectChat(chat._id)}
                  className="group flex items-center justify-between p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 hover:bg-white dark:hover:bg-slate-800 hover:border-slate-200 dark:hover:border-slate-700 transition text-xs cursor-pointer"
                >
                  <div className="min-w-0 flex-1 pr-2">
                    <p className="font-semibold text-slate-800 dark:text-white truncate">
                      {chat.title || 'New chat'}
                    </p>
                    {chat.lastMessagePreview && (
                      <p className="text-[11px] text-slate-400 dark:text-slate-500 truncate mt-0.5">
                        {chat.lastMessagePreview}
                      </p>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={(e) => handleOpenMenu(e, 'chat', chat)}
                    className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-700 dark:hover:text-slate-200 transition cursor-pointer shrink-0"
                  >
                    <MoreVertical size={13} />
                  </button>
                </div>
              ))}

              {chats.length === 0 && (
                <div className="flex flex-col items-center justify-center py-8 text-center text-slate-400 dark:text-slate-500">
                  <MessageSquare size={32} className="text-slate-300 dark:text-slate-600 mb-2" />
                  <p className="text-xs font-medium text-slate-600 dark:text-slate-300">No conversations in this workspace</p>
                  <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">Start a new chat to test questions against project context.</p>
                  <button
                    type="button"
                    onClick={() => onNewChatWithPrompt('')}
                    className="mt-3 rounded-xl bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700 dark:hover:bg-indigo-500 transition cursor-pointer"
                  >
                    Start First Chat
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Overflow Dropdowns */}
      {activeMenu?.type === 'project' && (
        <ProjectOverflowMenu
          isOpen={true}
          onClose={closeMenu}
          triggerRect={activeMenu.rect}
          project={activeMenu.item}
          onNewChat={() => onNewChatWithPrompt('')}
          onAddFiles={onOpenAddFiles}
          onRename={() => onProjectAction('rename', activeMenu.item)}
          onTogglePin={() => onProjectAction('pin', activeMenu.item)}
          onOpenSettings={onOpenSettings}
          onToggleArchive={() => onProjectAction('archive', activeMenu.item)}
          onDelete={() => onProjectAction('delete', activeMenu.item)}
        />
      )}

      {activeMenu?.type === 'chat' && (
        <ChatOverflowMenu
          isOpen={true}
          onClose={closeMenu}
          triggerRect={activeMenu.rect}
          chat={activeMenu.item}
          isProjectChat={true}
          onRename={onRenameChat}
          onTogglePin={onTogglePinChat}
          onMoveToProject={onMoveChat}
          onRemoveFromProject={onRemoveChatFromProject}
          onToggleArchive={onToggleArchiveChat}
          onDelete={onDeleteChat}
        />
      )}

      {activeMenu?.type === 'doc' && (
        <DocumentOverflowMenu
          isOpen={true}
          onClose={closeMenu}
          triggerRect={activeMenu.rect}
          doc={activeMenu.item}
          isProjectDoc={true}
          onOpenDoc={onOpenDoc}
          onUseInChat={(doc) => onNewChatWithPrompt(`Tell me about this document: ${doc.name}`)}
          onExtract={onExtractDoc}
          onReprocess={onReprocessDoc}
          onRemoveFromProject={onRemoveDocFromProject}
          onDeleteDoc={onDeleteDoc}
        />
      )}
    </div>
  );
};

export default ProjectHomeView;
