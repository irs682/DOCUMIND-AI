import React, { useState } from 'react';
import {
  Bot,
  Plus,
  X,
  Search,
  FolderKanban,
  MessageSquare,
  ChevronRight,
  ChevronDown,
  Pin,
  MoreVertical,
  FileText,
  Sparkles,
} from 'lucide-react';
import ProjectOverflowMenu from './ProjectOverflowMenu';
import ChatOverflowMenu from './ChatOverflowMenu';

const ModernChatSidebar = ({
  isOpen,
  onClose,
  projects = [],
  expandedProjectIds = {},
  onToggleProjectExpand,
  activeProjectId = null,
  onSelectProject,
  onNewProject,
  onProjectAction,
  activeConversationId = null,
  onSelectChat,
  onNewChat,
  onChatAction,
  sidebarTab = 'active',
  onSidebarTabChange,
  searchQuery = '',
  onSearchQueryChange,
  pinnedChats = [],
  groupedChats = {},
  projectChatsMap = {},
  isLoading = false,
  sessionDocCount = 0,
  onOpenDocPicker,
}) => {
  const [activeMenu, setActiveMenu] = useState(null); // { type: 'project' | 'chat', item, rect, isProjectChat }

  const handleOpenMenu = (e, type, item, isProjectChat = false) => {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    setActiveMenu({ type, item, rect, isProjectChat });
  };

  const closeMenu = () => setActiveMenu(null);

  // Filter projects by search
  const visibleProjects = projects.filter((p) => {
    if (sidebarTab === 'archived') {
      return p.status === 'archived';
    }
    if (p.status === 'archived') return false;
    if (!searchQuery.trim()) return true;
    return p.name.toLowerCase().includes(searchQuery.toLowerCase());
  });

  // Sort pinned projects first, then by lastActivityAt or updatedAt
  const sortedProjects = [...visibleProjects].sort((a, b) => {
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;
    const timeA = new Date(a.lastActivityAt || a.updatedAt || a.createdAt).getTime();
    const timeB = new Date(b.lastActivityAt || b.updatedAt || b.createdAt).getTime();
    return timeB - timeA;
  });

  return (
    <aside
      className={`${
        isOpen ? 'flex' : 'hidden'
      } absolute inset-y-0 left-0 z-40 w-[290px] shrink-0 flex-col border-r border-slate-200 dark:border-slate-800 bg-[#fbfbfb] dark:bg-slate-900 p-3 text-slate-700 dark:text-slate-200 shadow-xl md:relative md:z-0 md:flex md:shadow-none select-none h-full overflow-hidden`}
    >
      {/* ── Fixed Header ── */}
      <div className="shrink-0">
        <div className="mb-3 flex items-center justify-between px-2">
          <div className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-900 dark:bg-indigo-600 text-white shadow-xs">
              <Bot size={15} />
            </div>
            <span>DOCUMIND AI</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 dark:text-slate-400 md:hidden cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* + New Chat Button */}
        <button
          type="button"
          onClick={() => onNewChat(activeProjectId || null)}
          disabled={isLoading}
          className="mb-2.5 flex w-full items-center justify-between rounded-2xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2.5 text-xs font-bold text-slate-800 dark:text-white shadow-xs transition hover:border-indigo-400 dark:hover:border-indigo-500 hover:bg-indigo-50/50 dark:hover:bg-slate-750 disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
        >
          <div className="flex items-center gap-2.5">
            <Plus size={16} className="text-indigo-600 dark:text-indigo-400" />
            <span>New Chat</span>
          </div>
          {activeProjectId && (
            <span className="rounded-md bg-indigo-50 dark:bg-indigo-950/60 px-1.5 py-0.5 text-[10px] font-semibold text-indigo-700 dark:text-indigo-300">
              In Project
            </span>
          )}
        </button>

        {/* Active vs Archived Tab Switcher */}
        <div className="flex rounded-xl bg-slate-200/60 dark:bg-slate-800/80 p-1 mb-2.5 text-xs font-semibold">
          <button
            type="button"
            onClick={() => onSidebarTabChange('active')}
            className={`flex-1 rounded-lg py-1 text-center transition cursor-pointer ${
              sidebarTab === 'active'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs font-bold'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            Active
          </button>
          <button
            type="button"
            onClick={() => onSidebarTabChange('archived')}
            className={`flex-1 rounded-lg py-1 text-center transition cursor-pointer ${
              sidebarTab === 'archived'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs font-bold'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            Archived
          </button>
        </div>

        {/* Search Field */}
        <label className="mb-2.5 flex items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1.5 text-xs text-slate-400 dark:text-slate-400 shadow-2xs focus-within:border-indigo-400 focus-within:text-indigo-600 dark:focus-within:border-indigo-500 dark:focus-within:text-indigo-400">
          <Search size={13} />
          <input
            value={searchQuery}
            onChange={(e) => onSearchQueryChange(e.target.value)}
            placeholder="Search projects and chats…"
            className="min-w-0 flex-1 bg-transparent text-xs text-slate-700 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 outline-none"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => onSearchQueryChange('')}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 cursor-pointer"
            >
              <X size={12} />
            </button>
          )}
        </label>
      </div>

      {/* ── Scrollable Middle Area ── */}
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto pr-1">
        {/* ── PROJECTS SECTION ── */}
        <div className="space-y-1">
          <div className="flex items-center justify-between px-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            <span className="flex items-center gap-1.5">
              <FolderKanban size={12} className="text-slate-400 dark:text-slate-500" />
              <span>Projects ({sortedProjects.length})</span>
            </span>
            {sidebarTab === 'active' && (
              <button
                type="button"
                onClick={onNewProject}
                className="rounded p-0.5 text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-200 transition cursor-pointer"
                title="New Project"
              >
                <Plus size={13} />
              </button>
            )}
          </div>

          {sortedProjects.map((proj) => {
            const isExpanded = Boolean(expandedProjectIds[proj._id]);
            const isCurrentProject = activeProjectId === proj._id;
            const projectChats = projectChatsMap[proj._id] || [];

            return (
              <div key={proj._id} className="space-y-0.5">
                {/* Project Header Row */}
                <div
                  onClick={() => onSelectProject(proj._id)}
                  className={`group relative flex items-center justify-between rounded-xl px-2 py-1.5 text-xs transition cursor-pointer border ${
                    isCurrentProject && !activeConversationId
                      ? 'bg-white dark:bg-slate-800 border-indigo-200 dark:border-indigo-500/50 text-slate-900 dark:text-white shadow-2xs font-semibold ring-1 ring-indigo-200/50 dark:ring-indigo-500/30'
                      : 'border-transparent text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800/60 hover:border-slate-200/60 dark:hover:border-slate-750'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    {/* Expand/Collapse Chevron */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleProjectExpand(proj._id);
                      }}
                      className="p-0.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded transition cursor-pointer"
                    >
                      {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    </button>

                    {/* Color dot */}
                    <span
                      className="h-2 w-2 rounded-full shrink-0"
                      style={{ backgroundColor: proj.color || '#4f46e5' }}
                    />

                    {/* Project Name */}
                    <span className="truncate font-medium text-slate-800 dark:text-slate-200" title={proj.name}>
                      {proj.name}
                    </span>

                    {/* Pinned star/badge */}
                    {proj.isPinned && (
                      <Pin size={10} className="fill-amber-500 text-amber-500 shrink-0" />
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    {/* Doc count */}
                    <span className="text-[10px] text-slate-400 dark:text-slate-400 font-semibold px-1 rounded bg-slate-100/80 dark:bg-slate-800">
                      {proj.documentIds?.length || 0}
                    </span>

                    {/* Overflow Menu Trigger Button */}
                    <button
                      type="button"
                      onClick={(e) => handleOpenMenu(e, 'project', proj)}
                      className="rounded p-1 text-slate-400 opacity-0 group-hover:opacity-100 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-700 dark:hover:text-slate-200 transition cursor-pointer shrink-0"
                      title="Project actions"
                    >
                      <MoreVertical size={13} />
                    </button>
                  </div>
                </div>

                {/* Expanded Project Chats Subtree */}
                {isExpanded && (
                  <div className="ml-5 pl-2.5 border-l-2 border-slate-200/80 dark:border-slate-800 space-y-0.5 pt-0.5 pb-1">
                    {/* + New Chat in Project */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onNewChat(proj._id);
                      }}
                      className="flex w-full items-center gap-1.5 rounded-lg px-2 py-1 text-[11px] font-medium text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition cursor-pointer"
                    >
                      <Plus size={12} />
                      <span>New chat in project</span>
                    </button>

                    {projectChats.map((chat) => {
                      const isActive = chat._id === activeConversationId;
                      return (
                        <div
                          key={chat._id}
                          onClick={() => onSelectChat(chat._id, proj._id)}
                          className={`group flex items-center justify-between rounded-lg px-2 py-1 text-xs transition cursor-pointer ${
                            isActive
                              ? 'bg-white dark:bg-slate-800 text-indigo-950 dark:text-indigo-200 font-bold border border-indigo-200 dark:border-indigo-500/50 shadow-2xs'
                              : 'text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
                          }`}
                        >
                          <div className="flex items-center gap-1.5 min-w-0 flex-1">
                            <MessageSquare
                              size={12}
                              className={isActive ? 'text-indigo-600 dark:text-indigo-400 shrink-0' : 'text-slate-400 shrink-0'}
                            />
                            <span className="truncate" title={chat.title || 'New chat'}>
                              {chat.title || 'New chat'}
                            </span>
                          </div>

                          <button
                            type="button"
                            onClick={(e) => handleOpenMenu(e, 'chat', chat, true)}
                            className="rounded p-0.5 text-slate-400 opacity-0 group-hover:opacity-100 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-700 dark:hover:text-slate-200 transition cursor-pointer shrink-0"
                          >
                            <MoreVertical size={12} />
                          </button>
                        </div>
                      );
                    })}

                    {projectChats.length === 0 && (
                      <div className="px-2 py-1 text-[11px] text-slate-400 dark:text-slate-500 italic">
                        No chats yet
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {sortedProjects.length === 0 && (
            <div className="px-3 py-2 text-center text-xs text-slate-400 dark:text-slate-500">
              {searchQuery ? 'No matching projects.' : 'No projects created yet.'}
            </div>
          )}
        </div>

        {/* ── RECENT / STANDALONE CHATS SECTION ── */}
        <div className="space-y-2 pt-2 border-t border-slate-200/70 dark:border-slate-800">
          <div className="flex items-center justify-between px-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            <span>Recent Chats</span>
          </div>

          {/* Pinned Standalone Chats */}
          {pinnedChats.length > 0 && sidebarTab === 'active' && (
            <div className="space-y-0.5">
              <div className="flex items-center gap-1 px-2 text-[10px] font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                <Pin size={10} className="fill-amber-500" />
                <span>Pinned</span>
              </div>
              {pinnedChats.map((conv) => {
                const isActive = conv._id === activeConversationId;
                return (
                  <div
                    key={conv._id}
                    onClick={() => onSelectChat(conv._id, null)}
                    className={`group relative flex items-center justify-between rounded-xl px-2.5 py-1.5 text-xs transition cursor-pointer border ${
                      isActive
                        ? 'bg-white dark:bg-slate-800 border-indigo-200 dark:border-indigo-500/50 text-slate-900 dark:text-white shadow-2xs font-semibold ring-1 ring-indigo-200/50 dark:ring-indigo-500/30'
                        : 'border-transparent text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800/60 hover:border-slate-200/60 dark:hover:border-slate-750'
                    }`}
                  >
                    <div className="min-w-0 flex-1 pr-1">
                      <span className="flex items-center gap-1.5 truncate font-semibold text-slate-900 dark:text-white">
                        <MessageSquare size={13} className="shrink-0 text-indigo-500" />
                        <span className="truncate">{conv.title || 'New chat'}</span>
                      </span>
                      {conv.lastMessagePreview && (
                        <p className="mt-0.5 truncate pl-5 text-[11px] text-slate-400 dark:text-slate-500">
                          {conv.lastMessagePreview}
                        </p>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={(e) => handleOpenMenu(e, 'chat', conv, false)}
                      className="rounded p-1 text-slate-400 opacity-0 group-hover:opacity-100 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-700 dark:hover:text-slate-200 transition cursor-pointer shrink-0"
                    >
                      <MoreVertical size={13} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {/* Date-Grouped Standalone Chats */}
          {Object.entries(groupedChats).map(([groupName, items]) => {
            if (!items.length) return null;
            return (
              <div key={groupName} className="space-y-0.5">
                <div className="px-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  {groupName}
                </div>
                {items.map((conv) => {
                  const isActive = conv._id === activeConversationId;
                  return (
                    <div
                      key={conv._id}
                      onClick={() => onSelectChat(conv._id, null)}
                      className={`group relative flex items-center justify-between rounded-xl px-2.5 py-1.5 text-xs transition cursor-pointer border ${
                        isActive
                          ? 'bg-white dark:bg-slate-800 border-indigo-200 dark:border-indigo-500/50 text-slate-900 dark:text-white shadow-2xs font-semibold ring-1 ring-indigo-200/50 dark:ring-indigo-500/30'
                          : 'border-transparent text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-800/60 hover:border-slate-200/60 dark:hover:border-slate-750'
                      }`}
                    >
                      <div className="min-w-0 flex-1 pr-1">
                        <span className="flex items-center gap-1.5 truncate font-semibold">
                          <MessageSquare
                            size={13}
                            className={`shrink-0 ${
                              isActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'
                            }`}
                          />
                          <span className="truncate">{conv.title || 'New chat'}</span>
                        </span>
                        {conv.lastMessagePreview && (
                          <p className="mt-0.5 truncate pl-5 text-[11px] text-slate-400 dark:text-slate-500">
                            {conv.lastMessagePreview}
                          </p>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={(e) => handleOpenMenu(e, 'chat', conv, false)}
                        className="rounded p-1 text-slate-400 opacity-0 group-hover:opacity-100 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-700 dark:hover:text-slate-200 transition cursor-pointer shrink-0"
                      >
                        <MoreVertical size={13} />
                      </button>
                    </div>
                  );
                })}
              </div>
            );
          })}

          {pinnedChats.length === 0 &&
            Object.values(groupedChats).every((list) => list.length === 0) && (
              <div className="text-center py-6 px-3 text-slate-400 dark:text-slate-500 text-xs">
                {searchQuery ? 'No matching conversations.' : 'No standalone chats yet.'}
              </div>
            )}
        </div>
      </div>

      {/* ── Fixed Footer ── */}
      <div className="mt-3 border-t border-slate-200 dark:border-slate-800 pt-2.5 shrink-0">
        <button
          type="button"
          onClick={onOpenDocPicker}
          className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:border-indigo-300 dark:hover:border-indigo-500 hover:text-indigo-700 dark:hover:text-indigo-300 shadow-2xs transition cursor-pointer"
        >
          <span className="flex items-center gap-1.5">
            <FileText size={13} className="text-indigo-600 dark:text-indigo-400" />
            <span>Manage Session Docs</span>
          </span>
          <span className="text-[10px] rounded-full bg-slate-100 dark:bg-slate-700 px-1.5 py-0.2 font-bold text-slate-600 dark:text-slate-300">
            {sessionDocCount}
          </span>
        </button>
      </div>

      {/* ── Overflow Floating Menus ── */}
      {activeMenu?.type === 'project' && (
        <ProjectOverflowMenu
          isOpen={true}
          onClose={closeMenu}
          triggerRect={activeMenu.rect}
          project={activeMenu.item}
          onNewChat={(proj) => {
            onNewChat(proj._id);
          }}
          onAddFiles={(proj) => {
            onProjectAction('addFiles', proj);
          }}
          onRename={(proj) => {
            onProjectAction('rename', proj);
          }}
          onTogglePin={(proj) => {
            onProjectAction('pin', proj);
          }}
          onOpenSettings={(proj) => {
            onProjectAction('settings', proj);
          }}
          onToggleArchive={(proj) => {
            onProjectAction('archive', proj);
          }}
          onDelete={(proj) => {
            onProjectAction('delete', proj);
          }}
        />
      )}

      {activeMenu?.type === 'chat' && (
        <ChatOverflowMenu
          isOpen={true}
          onClose={closeMenu}
          triggerRect={activeMenu.rect}
          chat={activeMenu.item}
          isProjectChat={activeMenu.isProjectChat}
          onRename={(id) => onChatAction('rename', id)}
          onTogglePin={(e, chat) => onChatAction('pin', chat)}
          onMoveToProject={(chat) => onChatAction('move', chat)}
          onRemoveFromProject={(chat) => onChatAction('removeFromProject', chat)}
          onToggleArchive={(e, chat) => onChatAction('archive', chat)}
          onExport={(chat) => onChatAction('export', chat)}
          onDelete={(id) => onChatAction('delete', id)}
        />
      )}
    </aside>
  );
};

export default ModernChatSidebar;
