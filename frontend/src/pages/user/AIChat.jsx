import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useParams, useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import {
  PanelLeft,
  X,
  FileText,
  ArrowDown,
  Trash2,
} from 'lucide-react';
import { fetchDocuments, deleteDocument } from '../../api/documentsApi';
import DocumentUpload from '../../components/documents/DocumentUpload';
import { chatApi } from '../../services/chatApi';
import { projectApi } from '../../services/projectApi';

// Subcomponents
import ChatHeader from '../../components/chat/ChatHeader';
import ChatMessageRow from '../../components/chat/ChatMessageRow';
import ChatComposer from '../../components/chat/ChatComposer';
import ContextPanel from '../../components/chat/ContextPanel';
import EmptyChatState from '../../components/chat/EmptyChatState';
import DocumentPickerModal from '../../components/chat/DocumentPickerModal';
import ExtractionModal from '../../components/extractions/ExtractionModal';
import { extractionApi } from '../../services/extractionApi';

// New Advanced Project Workspace Subcomponents
import ModernChatSidebar from '../../components/chat/ModernChatSidebar';
import ProjectHomeView from '../../components/chat/ProjectHomeView';
import CreateProjectModal from '../../components/chat/CreateProjectModal';
import MoveChatModal from '../../components/chat/MoveChatModal';
import DeleteProjectModal from '../../components/chat/DeleteProjectModal';
import LinkProjectDocsModal from '../../components/chat/LinkProjectDocsModal';

// ─── Dynamic Date Grouping ──────────────────────────────────────────────────
const categorizeDate = (dateVal) => {
  if (!dateVal) return 'Older';
  const d = new Date(dateVal);
  if (Number.isNaN(d.getTime())) return 'Older';

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfYesterday = new Date(startOfToday.getTime() - 24 * 60 * 60 * 1000);
  const startOf7Days = new Date(startOfToday.getTime() - 7 * 24 * 60 * 60 * 1000);
  const startOf30Days = new Date(startOfToday.getTime() - 30 * 24 * 60 * 60 * 1000);

  if (d >= startOfToday) return 'Today';
  if (d >= startOfYesterday) return 'Yesterday';
  if (d >= startOf7Days) return 'Previous 7 Days';
  if (d >= startOf30Days) return 'Previous 30 Days';
  return 'Older';
};

/**
 * AIChat - Production-grade modern AI Chat and Project Workspace
 */
const AIChat = () => {
  const { id: routeSessionId, projectId: routeProjectId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const queryProjectId = searchParams.get('project');
  const activeProjectId = routeProjectId || queryProjectId || null;

  // ── Project State ──
  const [projects, setProjects] = useState([]);
  const [project, setProject] = useState(null);
  const [expandedProjectIds, setExpandedProjectIds] = useState({});

  // ── Document & Session State ──
  const [documents, setDocuments] = useState([]);
  const [sessionSelectedDocIds, setSessionSelectedDocIds] = useState([]);

  // ── Conversation & Messages State ──
  const [messages, setMessages] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [activeConversationId, setActiveConversationId] = useState(routeSessionId || null);
  const [currentSessionMeta, setCurrentSessionMeta] = useState(null);

  // ── UI Shell States ──
  const [sidebarTab, setSidebarTab] = useState('active'); // 'active' | 'archived'
  const [conversationSearch, setConversationSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isContextPanelOpen, setIsContextPanelOpen] = useState(false);
  const [contextPanelTab, setContextPanelTab] = useState('sources'); // 'sources' | 'documents' | 'memory'
  const [isDocPickerOpen, setIsDocPickerOpen] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  // ── Project Modals State ──
  const [isCreateProjectOpen, setIsCreateProjectOpen] = useState(false);
  const [editProjectData, setEditProjectData] = useState(null);
  const [moveChatTarget, setMoveChatTarget] = useState(null);
  const [deleteProjectTarget, setDeleteProjectTarget] = useState(null);
  const [linkDocsProjectTarget, setLinkDocsProjectTarget] = useState(null);
  const [extractionDocument, setExtractionDocument] = useState(null);
  const [isExtractionModalOpen, setIsExtractionModalOpen] = useState(false);
  const [isStartingExtraction, setIsStartingExtraction] = useState(false);
  const [extractionError, setExtractionError] = useState('');

  // ── Composer & Streaming States ──
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [showJumpToBottom, setShowJumpToBottom] = useState(false);

  // ── Persistent Memory States ──
  const [memories, setMemories] = useState([]);
  const [memoryEnabled, setMemoryEnabled] = useState(true);
  const [isMemoriesLoading, setIsMemoriesLoading] = useState(false);

  // ── References ──
  const abortControllerRef = useRef(null);
  const initialLoadRef = useRef(false);
  const conversationLoadRef = useRef(0);
  const activeConversationRef = useRef(routeSessionId || null);
  const bottomRef = useRef(null);
  const chatContainerRef = useRef(null);
  const deltaBufferRef = useRef('');
  const batchTimerRef = useRef(null);
  const isUserScrolledUpRef = useRef(false);
  const lastUserQuestionRef = useRef('');

  // ── Debounced Search ──
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedSearch(conversationSearch), 250);
    return () => clearTimeout(handler);
  }, [conversationSearch]);

  // ── Smart Scroll Tracking ──
  const handleContainerScroll = () => {
    const el = chatContainerRef.current;
    if (!el) return;
    const isNearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
    isUserScrolledUpRef.current = !isNearBottom;
    setShowJumpToBottom(!isNearBottom);
  };

  const handleJumpToLatest = () => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTo({
        top: chatContainerRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }
    isUserScrolledUpRef.current = false;
    setShowJumpToBottom(false);
  };

  // Auto-scroll inside chatContainer when new tokens/messages arrive if user is not scrolled up
  useEffect(() => {
    if (!isUserScrolledUpRef.current && chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  // ── Load Global Memories ──
  const loadMemories = useCallback(async () => {
    try {
      setIsMemoriesLoading(true);
      const { data } = await chatApi.getMemories();
      setMemories(data.memories || []);
      if (typeof data.memoryEnabled === 'boolean') {
        setMemoryEnabled(data.memoryEnabled);
      }
    } catch (err) {
      console.warn('[MEMORY] Error loading memories:', err?.message);
    } finally {
      setIsMemoriesLoading(false);
    }
  }, []);

  const handleToggleMemory = async () => {
    try {
      const next = !memoryEnabled;
      await chatApi.toggleMemory(next);
      setMemoryEnabled(next);
    } catch (err) {
      alert('Failed to update memory: ' + (err?.response?.data?.message || err.message));
    }
  };

  const handleDeleteMemory = async (id) => {
    try {
      await chatApi.deleteMemory(id);
      setMemories((prev) => prev.filter((m) => m._id !== id));
    } catch (err) {
      alert('Failed to delete memory: ' + (err?.response?.data?.message || err.message));
    }
  };

  // ── Stop Generation Logic ──
  const handleStopGenerating = useCallback(() => {
    if (batchTimerRef.current) {
      clearTimeout(batchTimerRef.current);
      batchTimerRef.current = null;
    }
    const pending = deltaBufferRef.current;
    deltaBufferRef.current = '';

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsStreaming(false);
    setIsLoading(false);
    setMessages((prev) =>
      prev.map((m) =>
        m.streaming
          ? {
              ...m,
              streaming: false,
              loading: false,
              text: (m.text || '') + (pending || ''),
              status: 'cancelled',
            }
          : m
      )
    );
  }, []);

  // ── Load Documents ──
  const loadDocuments = useCallback(async () => {
    try {
      const docs = await fetchDocuments();
      setDocuments(docs || []);
    } catch (err) {
      console.warn('[DOCS] Error loading documents:', err?.message);
    }
  }, []);

  // ── Load Projects ──
  const loadProjects = useCallback(async () => {
    try {
      const { data } = await projectApi.list();
      setProjects(data.projects || []);
    } catch (err) {
      console.warn('[PROJECTS] Error loading projects:', err?.message);
    }
  }, []);

  // Load project details when activeProjectId changes
  useEffect(() => {
    if (!activeProjectId) {
      setProject(null);
      return;
    }
    projectApi
      .get(activeProjectId)
      .then(({ data }) => {
        const p = data.project || data;
        setProject(p);
        setExpandedProjectIds((prev) => ({ ...prev, [activeProjectId]: true }));
      })
      .catch(() => setProject(null));
  }, [activeProjectId]);

  // ── Load Conversation By ID ──
  const loadConversation = useCallback(
    async (id, explicitProjectId = null) => {
      if (!id) return;
      const loadId = ++conversationLoadRef.current;
      activeConversationRef.current = id;
      try {
        const { data } = await chatApi.getConversation(id);
        if (loadId !== conversationLoadRef.current) return;
        const conv = data.conversation;
        setActiveConversationId(id);
        setCurrentSessionMeta(conv);

        // Populate attached documents
        if (Array.isArray(conv.selectedDocumentIds) && conv.selectedDocumentIds.length) {
          setSessionSelectedDocIds(conv.selectedDocumentIds.map((d) => d._id || d));
        } else {
          setSessionSelectedDocIds([]);
        }

        setMessages(
          (conv?.messages || []).map((msg) => ({
            id: msg._id || `${msg.sender}-${msg.timestamp}`,
            sender: msg.sender,
            text: msg.text,
            sources: msg.citations || [],
            timestamp: msg.timestamp,
            status: msg.status || 'completed',
            isBookmarked: Boolean(msg.isBookmarked),
          }))
        );

        const convProjId = conv.projectId?._id || conv.projectId || explicitProjectId || activeProjectId;
        if (convProjId) {
          navigate(`/projects/${convProjId}/chat/${id}`, { replace: true });
        } else {
          navigate(`/chat/${id}`, { replace: true });
        }
      } catch (err) {
        console.warn(`[CHAT] Could not load conversation ${id}:`, err?.message);
        if (loadId === conversationLoadRef.current) {
          setActiveConversationId(null);
          activeConversationRef.current = null;
          setCurrentSessionMeta(null);
          setMessages([]);
          if (activeProjectId) {
            navigate(`/projects/${activeProjectId}`, { replace: true });
          } else {
            navigate('/chat', { replace: true });
          }
        }
      }
    },
    [navigate, activeProjectId]
  );

  // ── Load Conversation List ──
  const loadConversations = useCallback(async () => {
    try {
      const { data } = await chatApi.getConversations({
        status: sidebarTab,
        search: debouncedSearch,
      });
      const items = data.conversations || [];
      setConversations(items);

      if (activeConversationRef.current) {
        const exists = items.some((c) => c._id === activeConversationRef.current);
        if (exists) return;
      }

      if (routeSessionId) {
        await loadConversation(routeSessionId);
      }
    } catch (err) {
      console.warn('[CHAT] Load conversations notice:', err?.message);
    }
  }, [sidebarTab, debouncedSearch, routeSessionId, loadConversation]);

  // Initial Boot
  useEffect(() => {
    loadDocuments();
    loadProjects();
    if (initialLoadRef.current) return;
    initialLoadRef.current = true;
    Promise.all([loadConversations(), loadMemories()]).catch(() => {});
  }, [loadDocuments, loadProjects, loadConversations, loadMemories]);

  // Refetch on tab or search change
  useEffect(() => {
    if (!initialLoadRef.current) return;
    loadConversations();
  }, [sidebarTab, debouncedSearch, loadConversations]);

  // URL Sync
  useEffect(() => {
    if (routeSessionId && routeSessionId !== activeConversationRef.current) {
      loadConversation(routeSessionId, activeProjectId);
    } else if (!routeSessionId && activeConversationRef.current) {
      setActiveConversationId(null);
      activeConversationRef.current = null;
      setCurrentSessionMeta(null);
      setMessages([]);
    }
  }, [routeSessionId, activeProjectId, loadConversation]);

  // ── Group Conversations: Standalone vs Project Chats ──
  const { standaloneChats, projectChatsMap, pinnedStandaloneChats, groupedStandaloneChats } =
    useMemo(() => {
      const standalone = [];
      const projectMap = {};

      projects.forEach((p) => {
        projectMap[p._id] = [];
      });

      conversations.forEach((conv) => {
        const pId = conv.projectId?._id || conv.projectId;
        if (pId && projectMap[pId]) {
          projectMap[pId].push(conv);
        } else if (pId) {
          if (!projectMap[pId]) projectMap[pId] = [];
          projectMap[pId].push(conv);
        } else {
          standalone.push(conv);
        }
      });

      const pinned = [];
      const groups = {
        Today: [],
        Yesterday: [],
        'Previous 7 Days': [],
        'Previous 30 Days': [],
        Older: [],
      };

      standalone.forEach((conv) => {
        if (conv.isPinned && sidebarTab === 'active') {
          pinned.push(conv);
        } else {
          const cat = categorizeDate(conv.lastMessageAt || conv.updatedAt || conv.createdAt);
          if (groups[cat]) groups[cat].push(conv);
          else groups.Older.push(conv);
        }
      });

      return {
        standaloneChats: standalone,
        projectChatsMap: projectMap,
        pinnedStandaloneChats: pinned,
        groupedStandaloneChats: groups,
      };
    }, [conversations, projects, sidebarTab]);

  // ── Navigation & Switching ──
  const handleToggleProjectExpand = (projId) => {
    setExpandedProjectIds((prev) => ({
      ...prev,
      [projId]: !prev[projId],
    }));
  };

  const handleSelectProject = (projId) => {
    if (isStreaming) handleStopGenerating();
    setActiveConversationId(null);
    activeConversationRef.current = null;
    setCurrentSessionMeta(null);
    setMessages([]);
    navigate(`/projects/${projId}`);
    setIsSidebarOpen(false);
  };

  const handleSelectChat = async (id, targetProjectId = null) => {
    if (id === activeConversationId) return;
    if (isStreaming) handleStopGenerating();
    const effectiveProj = targetProjectId || activeProjectId;
    await loadConversation(id, effectiveProj);
    setIsSidebarOpen(false);
  };

  const handleNewChat = (targetProjectId = null) => {
    if (isStreaming) handleStopGenerating();
    activeConversationRef.current = null;
    setActiveConversationId(null);
    setCurrentSessionMeta(null);
    setMessages([]);
    setInputText('');
    setSessionSelectedDocIds([]);
    setIsSidebarOpen(false);

    // Safeguard: make sure targetProjectId is a valid string, not a React MouseEvent object
    const explicitProjectId =
      typeof targetProjectId === 'string' && targetProjectId.trim()
        ? targetProjectId.trim()
        : null;
    const pId = explicitProjectId !== null ? explicitProjectId : activeProjectId;

    if (pId) {
      navigate(`/projects/${pId}/chat`);
    } else {
      navigate('/chat');
    }
  };

  const handleNewChatWithPrompt = (promptText = '') => {
    if (isStreaming) handleStopGenerating();
    activeConversationRef.current = null;
    setActiveConversationId(null);
    setCurrentSessionMeta(null);
    setMessages([]);
    setSessionSelectedDocIds([]);
    setIsSidebarOpen(false);

    const pId = activeProjectId;
    if (pId) {
      navigate(`/projects/${pId}/chat`);
    } else {
      navigate('/chat');
    }

    if (promptText && typeof promptText === 'string' && promptText.trim()) {
      setTimeout(() => {
        handleSend(promptText.trim());
      }, 50);
    }
  };

  // ── Project Operations ──
  const handleCreateOrUpdateProject = async (formData) => {
    try {
      if (editProjectData?._id) {
        const targetId = editProjectData._id;
        const { data } = await projectApi.update(targetId, formData);
        const updated = data.project || data;
        setProjects((prev) => prev.map((p) => (p._id === targetId ? updated : p)));
        if (project?._id === targetId) setProject(updated);
      } else {
        const { data } = await projectApi.create(formData);
        const created = data.project || data;
        setProjects((prev) => [created, ...prev]);
        setExpandedProjectIds((prev) => ({ ...prev, [created._id]: true }));
        navigate(`/projects/${created._id}`);
      }
      setIsCreateProjectOpen(false);
      setEditProjectData(null);
    } catch (err) {
      alert('Failed to save project: ' + (err?.response?.data?.message || err.message));
    }
  };

  const handleProjectAction = async (action, targetProject) => {
    if (!targetProject) return;
    switch (action) {
      case 'rename':
      case 'settings':
        setEditProjectData(targetProject);
        setIsCreateProjectOpen(true);
        break;
      case 'pin':
        try {
          const nextPinned = !targetProject.isPinned;
          setProjects((prev) =>
            prev.map((p) => (p._id === targetProject._id ? { ...p, isPinned: nextPinned } : p))
          );
          await projectApi.pin(targetProject._id, nextPinned);
        } catch (_) {
          loadProjects();
        }
        break;
      case 'archive':
        try {
          const nextStatus = targetProject.status === 'archived' ? 'active' : 'archived';
          setProjects((prev) =>
            prev.map((p) => (p._id === targetProject._id ? { ...p, status: nextStatus } : p))
          );
          await projectApi.archive(targetProject._id, nextStatus);
          if (activeProjectId === targetProject._id && nextStatus === 'archived') {
            navigate('/chat');
          }
        } catch (_) {
          loadProjects();
        }
        break;
      case 'delete':
        setDeleteProjectTarget(targetProject);
        break;
      case 'addFiles':
        setLinkDocsProjectTarget(targetProject);
        break;
      default:
        break;
    }
  };

  const handleConfirmDeleteProject = async (projectId, { deleteChats }) => {
    try {
      await projectApi.remove(projectId, { deleteChats });
      setProjects((prev) => prev.filter((p) => p._id !== projectId));
      setDeleteProjectTarget(null);
      if (activeProjectId === projectId) {
        navigate('/chat');
      }
      await loadConversations();
    } catch (err) {
      alert('Failed to delete project: ' + (err?.response?.data?.message || err.message));
    }
  };

  const handleSaveProjectDocs = async (projId, docIds) => {
    try {
      const { data } = await projectApi.linkDocuments(projId, docIds);
      const updated = data.project;
      setProjects((prev) => prev.map((p) => (p._id === projId ? updated : p)));
      if (project?._id === projId) setProject(updated);
      setLinkDocsProjectTarget(null);
    } catch (err) {
      alert('Failed to update project documents: ' + (err?.response?.data?.message || err.message));
    }
  };

  const handleRemoveDocFromProject = async (doc) => {
    if (!project) return;
    try {
      const { data } = await projectApi.removeDocument(project._id, doc._id);
      const updated = data.project;
      setProjects((prev) => prev.map((p) => (p._id === project._id ? updated : p)));
      setProject(updated);
    } catch (err) {
      alert('Failed to remove document from project: ' + (err?.response?.data?.message || err.message));
    }
  };

  const handleOpenExtraction = (doc) => {
    setExtractionDocument({
      ...doc,
      id: doc.id || doc._id,
      projectId: doc.projectId || activeProjectId,
    });
    setExtractionError('');
    setIsExtractionModalOpen(true);
  };

  const handleStartExtraction = async (payload) => {
    try {
      setIsStartingExtraction(true);
      setExtractionError('');
      const { extraction } = await extractionApi.create(payload);
      const extractionId = extraction?._id || extraction?.id;
      if (!extractionId) throw new Error('The extraction service did not return a result identifier.');

      setIsExtractionModalOpen(false);
      navigate(`/extractions/${extractionId}`, { state: { extraction } });
    } catch (requestError) {
      setExtractionError(
        requestError.response?.data?.message ||
        requestError.message ||
        'Unable to start information extraction. Please try again.'
      );
    } finally {
      setIsStartingExtraction(false);
    }
  };

  // ── Chat Session Actions: Pin, Archive, Rename, Move, Delete ──
  const handleTogglePin = async (e, conv) => {
    if (e) e.stopPropagation();
    const target = conv || currentSessionMeta;
    if (!target) return;
    try {
      const nextPinned = !target.isPinned;
      setConversations((prev) =>
        prev.map((c) => (c._id === target._id ? { ...c, isPinned: nextPinned } : c))
      );
      if (currentSessionMeta && currentSessionMeta._id === target._id) {
        setCurrentSessionMeta((prev) => ({ ...prev, isPinned: nextPinned }));
      }
      await chatApi.pinConversation(target._id, nextPinned);
    } catch (_) {
      loadConversations();
    }
  };

  const handleToggleArchive = async (e, conv) => {
    if (e) e.stopPropagation();
    const target = conv || currentSessionMeta;
    if (!target) return;
    try {
      const nextStatus = target.status === 'archived' ? 'active' : 'archived';
      setConversations((prev) => prev.filter((c) => c._id !== target._id));
      await chatApi.archiveConversation(target._id, nextStatus);
      if (target._id === activeConversationId) {
        handleNewChat();
      }
    } catch (_) {
      loadConversations();
    }
  };

  const handleRenameChat = async (targetId = null) => {
    const id = targetId || activeConversationId;
    const current = conversations.find((c) => c._id === id) || currentSessionMeta;
    if (!current) return;
    const title = window.prompt('Rename conversation', current.title || 'New chat');
    if (!title?.trim()) return;

    try {
      setConversations((prev) =>
        prev.map((c) => (c._id === id ? { ...c, title: title.trim(), titleSource: 'user' } : c))
      );
      if (currentSessionMeta && currentSessionMeta._id === id) {
        setCurrentSessionMeta((prev) => ({ ...prev, title: title.trim(), titleSource: 'user' }));
      }
      await chatApi.updateConversation(id, { title: title.trim() });
    } catch (_) {
      loadConversations();
    }
  };

  const handleConfirmMoveChat = async (chatId, targetProjectId) => {
    try {
      const { data } = await chatApi.moveConversation(chatId, targetProjectId);
      const updatedConv = data.conversation;
      setConversations((prev) =>
        prev.map((c) => (c._id === chatId ? { ...c, projectId: targetProjectId } : c))
      );
      if (currentSessionMeta && currentSessionMeta._id === chatId) {
        setCurrentSessionMeta((prev) => ({ ...prev, projectId: targetProjectId }));
      }
      setMoveChatTarget(null);

      // If moved while active, update URL cleanly
      if (activeConversationId === chatId) {
        if (targetProjectId) {
          navigate(`/projects/${targetProjectId}/chat/${chatId}`, { replace: true });
        } else {
          navigate(`/chat/${chatId}`, { replace: true });
        }
      }
    } catch (err) {
      alert('Failed to move conversation: ' + (err?.response?.data?.message || err.message));
    }
  };

  const handleRemoveChatFromProject = async (chat) => {
    await handleConfirmMoveChat(chat._id, null);
  };

  const handleChatAction = (action, targetItem) => {
    switch (action) {
      case 'rename':
        handleRenameChat(typeof targetItem === 'string' ? targetItem : targetItem._id);
        break;
      case 'pin':
        handleTogglePin(null, targetItem);
        break;
      case 'archive':
        handleToggleArchive(null, targetItem);
        break;
      case 'move':
        setMoveChatTarget(targetItem);
        break;
      case 'removeFromProject':
        handleRemoveChatFromProject(targetItem);
        break;
      case 'export':
        handleExportChat('txt');
        break;
      case 'delete':
        setConfirmDeleteId(typeof targetItem === 'string' ? targetItem : targetItem._id);
        break;
      default:
        break;
    }
  };

  const handleConfirmDelete = async () => {
    const id = confirmDeleteId;
    if (!id) return;
    setConfirmDeleteId(null);
    try {
      await chatApi.deleteConversation(id);
      const remaining = conversations.filter((c) => c._id !== id);
      setConversations(remaining);
      if (id === activeConversationId) {
        activeConversationRef.current = null;
        if (activeProjectId) {
          navigate(`/projects/${activeProjectId}`, { replace: true });
        } else if (remaining.length) {
          await loadConversation(remaining[0]._id);
        } else {
          handleNewChat();
        }
      }
    } catch (err) {
      alert('Failed to delete chat: ' + (err?.response?.data?.message || err.message));
    }
  };

  // ── Session Document Attachment Management ──
  const handleToggleSessionDoc = async (docId) => {
    const exists = sessionSelectedDocIds.includes(docId);
    const updated = exists
      ? sessionSelectedDocIds.filter((id) => id !== docId)
      : [...sessionSelectedDocIds, docId];

    setSessionSelectedDocIds(updated);
    if (activeConversationId) {
      try {
        await chatApi.updateSessionDocuments(activeConversationId, updated);
      } catch (_) {}
    }
  };

  const handleRemoveSessionDoc = async (docId) => {
    const updated = sessionSelectedDocIds.filter((id) => id !== docId);
    setSessionSelectedDocIds(updated);
    if (activeConversationId) {
      try {
        await chatApi.updateSessionDocuments(activeConversationId, updated);
      } catch (_) {}
    }
  };

  // ── Delete Document from Picker (permanent) ──
  const handleDeleteDocumentFromPicker = async (docId) => {
    await deleteDocument(docId);
    // Remove from document list
    setDocuments((prev) => prev.filter((d) => (d._id || d.id) !== docId));
    // Remove from session selection if attached
    if (sessionSelectedDocIds.includes(docId)) {
      const updated = sessionSelectedDocIds.filter((id) => id !== docId);
      setSessionSelectedDocIds(updated);
      if (activeConversationId) {
        chatApi.updateSessionDocuments(activeConversationId, updated).catch(() => {});
      }
    }
  };

  // ── Message Actions: Bookmark & Edit ──
  const handleBookmarkMessage = async (messageId, isBookmarked) => {
    if (!activeConversationId) return;
    setMessages((prev) =>
      prev.map((m) => (m.id === messageId ? { ...m, isBookmarked } : m))
    );
    try {
      await chatApi.bookmarkMessage(activeConversationId, messageId, isBookmarked);
    } catch (err) {
      console.warn('[BOOKMARK] Error toggling bookmark:', err?.message);
    }
  };

  const handleEditAndResend = (messageId, newContent) => {
    if (isStreaming) handleStopGenerating();
    const idx = messages.findIndex((m) => m.id === messageId);
    if (idx !== -1) {
      setMessages((prev) => prev.slice(0, idx));
    }
    handleSend(newContent);
  };

  // ── Export Chat ──
  const handleExportChat = (format = 'txt') => {
    if (!messages.length) return;
    const currentTitle = currentSessionMeta?.title || 'documind-conversation';
    let content = '';
    let filename = '';
    let mimeType = '';

    if (format === 'md') {
      content = `# ${currentTitle}\n\n*Exported from DOCUMIND-AI on ${new Date().toLocaleString()}*\n\n---\n\n`;
      messages.forEach((m) => {
        const role = m.sender === 'user' ? '### 👤 User' : '### 🤖 DOCUMIND AI';
        content += `${role} *(${m.timestamp || ''})*\n\n${m.text}\n\n`;
        if (m.sources && m.sources.length) {
          content += `> **Sources (${m.sources.length}):**\n`;
          m.sources.forEach((s) => {
            content += `> - ${s.documentName} (Score: ${(s.score * 100).toFixed(0)}%)\n`;
          });
          content += '\n';
        }
        content += '---\n\n';
      });
      filename = `${currentTitle.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.md`;
      mimeType = 'text/markdown;charset=utf-8';
    } else {
      content = `DOCUMIND-AI Conversation: ${currentTitle}\nExported: ${new Date().toLocaleString()}\n\n`;
      messages.forEach((m) => {
        content += `[${m.timestamp || ''}] ${m.sender === 'user' ? 'You' : 'DOCUMIND AI'}:\n${m.text}\n\n`;
      });
      filename = `${currentTitle.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.txt`;
      mimeType = 'text/plain;charset=utf-8';
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  };

  // ── Send Message & SSE Streaming Flow ──
  const handleSend = useCallback(
    async (textOverride) => {
      const question = (textOverride || inputText).trim();
      if (!question) return;

      if (isStreaming) {
        handleStopGenerating();
      }

      lastUserQuestionRef.current = question;
      deltaBufferRef.current = '';
      setInputText('');

      const userMsg = {
        id: `u-${Date.now()}`,
        sender: 'user',
        text: question,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      const placeholderId = `a-${Date.now()}`;
      const placeholderMsg = {
        id: placeholderId,
        sender: 'assistant',
        text: '',
        sources: [],
        loading: true,
        streaming: true,
        phase: 'Searching document context…',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, userMsg, placeholderMsg]);
      setIsLoading(true);
      setIsStreaming(true);

      const abortController = new AbortController();
      abortControllerRef.current = abortController;

      const flushDeltaBuffer = () => {
        if (batchTimerRef.current) {
          clearTimeout(batchTimerRef.current);
          batchTimerRef.current = null;
        }
        const toAppend = deltaBufferRef.current;
        deltaBufferRef.current = '';
        if (toAppend) {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === placeholderId
                ? { ...m, loading: false, text: (m.text || '') + toAppend }
                : m
            )
          );
        }
      };

      try {
        let convId = activeConversationId;
        const effectiveProjectId =
          activeProjectId ||
          currentSessionMeta?.projectId?._id ||
          currentSessionMeta?.projectId ||
          null;

        // Lazy session creation on first user message
        if (!convId) {
          const { data: newConv } = await chatApi.createConversation({
            title: question.slice(0, 80),
            selectedDocumentIds: sessionSelectedDocIds,
            projectId: effectiveProjectId || null,
          });
          convId = newConv.conversation._id;
          setActiveConversationId(convId);
          activeConversationRef.current = convId;
          setCurrentSessionMeta(newConv.conversation);
          setConversations((prev) => [newConv.conversation, ...prev]);

          if (effectiveProjectId) {
            navigate(`/projects/${effectiveProjectId}/chat/${convId}`, { replace: true });
          } else {
            navigate(`/chat/${convId}`, { replace: true });
          }
        }

        const effectiveDocId =
          sessionSelectedDocIds.length === 1 ? sessionSelectedDocIds[0] : null;

        await chatApi.sendMessageStream(convId, {
          message: question,
          documentId: effectiveDocId,
          projectId: effectiveProjectId || null,
          signal: abortController.signal,
          onStart: () => {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === placeholderId ? { ...m, phase: 'Retrieving passages…' } : m
              )
            );
          },
          onMetadata: (meta) => {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === placeholderId
                  ? {
                      ...m,
                      phase: meta.retrievedChunks
                        ? `Found ${meta.retrievedChunks} passages. Formulating response…`
                        : 'Formulating response…',
                    }
                  : m
              )
            );
          },
          onCitation: (citations) => {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === placeholderId ? { ...m, sources: citations || [] } : m
              )
            );
          },
          onDelta: (delta) => {
            deltaBufferRef.current += delta;
            if (!batchTimerRef.current) {
              batchTimerRef.current = setTimeout(() => {
                batchTimerRef.current = null;
                const toAppend = deltaBufferRef.current;
                deltaBufferRef.current = '';
                if (toAppend) {
                  setMessages((prev) =>
                    prev.map((m) =>
                      m.id === placeholderId
                        ? { ...m, loading: false, text: (m.text || '') + toAppend }
                        : m
                    )
                  );
                }
              }, 30);
            }
          },
          onDone: (data) => {
            flushDeltaBuffer();
            setMessages((prev) =>
              prev.map((m) =>
                m.id === placeholderId
                  ? {
                      ...m,
                      loading: false,
                      streaming: false,
                      status: 'completed',
                      text: data.fullText || m.text || 'No answer generated.',
                      sources: data.sources || m.sources || [],
                    }
                  : m
              )
            );

            if (data.conversationTitle || convId) {
              setConversations((prev) =>
                prev.map((c) =>
                  c._id === convId
                    ? {
                        ...c,
                        title: data.conversationTitle || c.title,
                        lastMessagePreview: (data.fullText || '').slice(0, 100),
                        lastMessageAt: new Date().toISOString(),
                        updatedAt: new Date().toISOString(),
                      }
                    : c
                )
              );
              if (currentSessionMeta && currentSessionMeta._id === convId) {
                setCurrentSessionMeta((prev) => ({
                  ...prev,
                  title: data.conversationTitle || prev.title,
                }));
              }
            }
            loadMemories().catch(() => {});
          },
          onError: (err) => {
            if (err.name === 'AbortError') return;
            flushDeltaBuffer();
            const errMsg = err?.message || 'Error occurred while streaming response.';
            setMessages((prev) =>
              prev.map((m) =>
                m.id === placeholderId
                  ? {
                      ...m,
                      loading: false,
                      streaming: false,
                      status: 'interrupted',
                      text: m.text
                        ? `${m.text}\n\n⚠️ *[Response interrupted: ${errMsg}]*`
                        : `⚠️ Error: ${errMsg}`,
                    }
                  : m
              )
            );
          },
        });
      } catch (err) {
        if (err.name !== 'AbortError') {
          flushDeltaBuffer();
          const errText =
            err?.response?.data?.message ||
            err.message ||
            'Unable to generate a response. Please try again.';
          setMessages((prev) =>
            prev.map((m) =>
              m.id === placeholderId
                ? {
                    ...m,
                    loading: false,
                    streaming: false,
                    status: 'interrupted',
                    text: m.text
                      ? `${m.text}\n\n⚠️ *[Interrupted: ${errText}]*`
                      : `⚠️ Error: ${errText}`,
                  }
                : m
            )
          );
        }
      } finally {
        setIsLoading(false);
        setIsStreaming(false);
        abortControllerRef.current = null;
      }
    },
    [
      inputText,
      isStreaming,
      activeConversationId,
      sessionSelectedDocIds,
      activeProjectId,
      currentSessionMeta,
      navigate,
      handleStopGenerating,
      loadMemories,
    ]
  );

  const handleRegenerate = useCallback(
    (messageId) => {
      if (isStreaming) handleStopGenerating();
      let questionToUse = lastUserQuestionRef.current;
      if (messageId) {
        const idx = messages.findIndex((m) => m.id === messageId);
        if (idx > 0 && messages[idx - 1]?.sender === 'user') {
          questionToUse = messages[idx - 1].text;
        }
        setMessages((prev) => prev.filter((m) => m.id !== messageId));
      }
      if (questionToUse) {
        handleSend(questionToUse);
      }
    },
    [isStreaming, messages, handleStopGenerating, handleSend]
  );

  const handleUploadSuccess = async (uploadedDoc) => {
    loadDocuments();
    if (uploadedDoc && (uploadedDoc._id || uploadedDoc.id)) {
      const newId = uploadedDoc._id || uploadedDoc.id;
      handleToggleSessionDoc(newId);

      // If inside an active project, auto-link to project as well
      if (activeProjectId) {
        try {
          const currentDocIds = project?.documentIds || [];
          const updatedDocIds = [
            ...currentDocIds.map((d) => (typeof d === 'string' ? d : d._id || d)),
            newId,
          ];
          await projectApi.linkDocuments(activeProjectId, updatedDocIds);
          loadProjects();
          if (project) {
            setProject((prev) => ({ ...prev, documentIds: updatedDocIds }));
          }
        } catch (_) {}
      }
    }
    setIsUploadModalOpen(false);
  };

  // Extract latest sources for ContextPanel
  const latestSources = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].sender === 'assistant' && messages[i].sources?.length) {
        return messages[i].sources;
      }
    }
    return [];
  }, [messages]);

  // Map session doc IDs to full document objects
  const sessionDocs = useMemo(() => {
    return sessionSelectedDocIds
      .map((id) => documents.find((d) => (d._id || d.id) === id))
      .filter(Boolean);
  }, [sessionSelectedDocIds, documents]);

  // Is viewing Project Home (strictly when at /projects/:projectId and not in a chat route)
  const isChatRoute = location.pathname.includes('/chat') || location.pathname.includes('/ai-chat');
  const isViewingProjectHome = Boolean(activeProjectId && !activeConversationId && !isChatRoute);

  return (
    <div className="relative flex h-full min-h-0 overflow-hidden rounded-2xl md:rounded-3xl border border-slate-200/90 bg-[#f8f9fa] shadow-xl shadow-slate-200/40">
      {/* Mobile Sidebar Backdrop */}
      {isSidebarOpen && (
        <button
          type="button"
          aria-label="Close chat sidebar"
          onClick={() => setIsSidebarOpen(false)}
          className="absolute inset-0 z-30 bg-slate-950/20 backdrop-blur-2xs md:hidden cursor-pointer"
        />
      )}

      {/* ── REGION 1: Left Project & Chat Sidebar ──────────────────────────── */}
      <ModernChatSidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        projects={projects}
        expandedProjectIds={expandedProjectIds}
        onToggleProjectExpand={handleToggleProjectExpand}
        activeProjectId={activeProjectId}
        onSelectProject={handleSelectProject}
        onNewProject={() => {
          setEditProjectData(null);
          setIsCreateProjectOpen(true);
        }}
        onProjectAction={handleProjectAction}
        activeConversationId={activeConversationId}
        onSelectChat={handleSelectChat}
        onNewChat={handleNewChat}
        onChatAction={handleChatAction}
        sidebarTab={sidebarTab}
        onSidebarTabChange={setSidebarTab}
        searchQuery={conversationSearch}
        onSearchQueryChange={setConversationSearch}
        pinnedChats={pinnedStandaloneChats}
        groupedChats={groupedStandaloneChats}
        projectChatsMap={projectChatsMap}
        isLoading={isLoading}
        sessionDocCount={sessionSelectedDocIds.length}
        onOpenDocPicker={() => setIsDocPickerOpen(true)}
      />

      {/* ── REGION 2: Center Main Workspace ─────────────────────────────── */}
      {isViewingProjectHome ? (
        <main className="flex min-w-0 flex-1 flex-col relative bg-[#f8f9fa] overflow-hidden">
          {/* Mobile Bar */}
          <div className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-2.5 md:hidden">
            <button
              type="button"
              onClick={() => setIsSidebarOpen(true)}
              className="rounded-xl border border-slate-200 p-2 text-slate-500 hover:bg-slate-50 cursor-pointer"
            >
              <PanelLeft size={16} />
            </button>
            <span className="text-xs font-bold text-slate-900 truncate">
              {project?.name || 'Project Workspace'}
            </span>
            <div className="w-8" />
          </div>

          <ProjectHomeView
            project={project}
            chats={projectChatsMap[activeProjectId] || []}
            documents={documents}
            onNewChatWithPrompt={handleNewChatWithPrompt}
            onOpenAddFiles={() => setLinkDocsProjectTarget(project)}
            onOpenSettings={() => {
              setEditProjectData(project);
              setIsCreateProjectOpen(true);
            }}
            onSelectChat={(id) => handleSelectChat(id, activeProjectId)}
            onRenameChat={(id) => handleRenameChat(id)}
            onTogglePinChat={(e, c) => handleTogglePin(e, c)}
            onMoveChat={(c) => setMoveChatTarget(c)}
            onRemoveChatFromProject={handleRemoveChatFromProject}
            onToggleArchiveChat={(e, c) => handleToggleArchive(e, c)}
            onDeleteChat={(id) => setConfirmDeleteId(id)}
            onOpenDoc={(doc) => navigate(`/documents/${doc._id}`)}
            onExtractDoc={handleOpenExtraction}
            onReprocessDoc={() => alert('Document processing is scheduled.')}
            onRemoveDocFromProject={handleRemoveDocFromProject}
            onDeleteDoc={async (doc) => {
              if (window.confirm(`Delete "${doc.name}" from your document library?`)) {
                await deleteDocument(doc._id);
                loadDocuments();
              }
            }}
            onProjectAction={handleProjectAction}
          />
        </main>
      ) : (
        <main className="flex min-w-0 flex-1 flex-col relative bg-[#f8f9fa] overflow-hidden">
          {/* Header */}
          <ChatHeader
            title={
              currentSessionMeta?.title ||
              (activeProjectId
                ? project?.name
                  ? `${project.name} · New Chat`
                  : 'New Project Chat'
                : 'New Conversation')
            }
            isPinned={currentSessionMeta?.isPinned}
            status={currentSessionMeta?.status || 'active'}
            sessionDocCount={sessionSelectedDocIds.length}
            project={project}
            onViewProjectHome={() => activeProjectId && handleSelectProject(activeProjectId)}
            onOpenSidebar={() => setIsSidebarOpen(true)}
            onRename={() => handleRenameChat()}
            onTogglePin={() => handleTogglePin()}
            onToggleArchive={() => handleToggleArchive()}
            onExport={handleExportChat}
            onDelete={() => activeConversationId && setConfirmDeleteId(activeConversationId)}
            onToggleContextPanel={() => setIsContextPanelOpen(!isContextPanelOpen)}
            isContextPanelOpen={isContextPanelOpen}
            sourcesCount={latestSources.length}
            memoriesCount={memories.length}
          />

          {/* Messages Scroll Area */}
          <div
            ref={chatContainerRef}
            onScroll={handleContainerScroll}
            className="flex-1 min-h-0 overflow-y-auto p-3 sm:p-5 relative"
          >
            {messages.length === 0 ? (
              <div className="max-w-4xl mx-auto min-h-full flex flex-col justify-center">
                <EmptyChatState
                  sessionDocCount={sessionSelectedDocIds.length}
                  selectedDocName={sessionDocs[0]?.name || ''}
                  onSelectPrompt={(prompt) => handleSend(prompt)}
                />
              </div>
            ) : (
              <div className="w-full max-w-4xl mx-auto flex flex-col space-y-2 pb-6">
                {messages.map((msg) => (
                  <ChatMessageRow
                    key={msg.id}
                    message={msg}
                    onRegenerate={handleRegenerate}
                    onBookmark={handleBookmarkMessage}
                    onEditAndResend={handleEditAndResend}
                    onOpenContextPanel={() => {
                      setIsContextPanelOpen(true);
                      setContextPanelTab('sources');
                    }}
                  />
                ))}
                <div ref={bottomRef} className="h-2" />
              </div>
            )}

            {/* Floating Jump-to-Latest Button */}
            {showJumpToBottom && (
              <div className="sticky bottom-4 flex justify-center pointer-events-none z-10">
                <button
                  type="button"
                  onClick={handleJumpToLatest}
                  className="pointer-events-auto inline-flex items-center gap-1.5 rounded-full bg-slate-900 text-white px-3.5 py-1.5 text-xs font-semibold shadow-lg hover:bg-slate-800 transition cursor-pointer"
                >
                  <ArrowDown size={13} />
                  <span>Jump to latest</span>
                </button>
              </div>
            )}
          </div>

          {/* Composer */}
          <div className="shrink-0">
            <ChatComposer
              inputText={inputText}
              onChangeInput={setInputText}
              onSend={() => handleSend()}
              onStop={handleStopGenerating}
              isLoading={isLoading}
              isStreaming={isStreaming}
              sessionDocs={sessionDocs}
              onRemoveSessionDoc={handleRemoveSessionDoc}
              onOpenDocPicker={() => setIsDocPickerOpen(true)}
              onOpenUpload={() => setIsUploadModalOpen(true)}
            />
          </div>
        </main>
      )}

      {/* ── REGION 3: Collapsible Right Context Panel ───────────────────────── */}
      <ContextPanel
        isOpen={isContextPanelOpen}
        onClose={() => setIsContextPanelOpen(false)}
        activeTab={contextPanelTab}
        setActiveTab={setContextPanelTab}
        sources={latestSources}
        documents={documents}
        sessionDocIds={sessionSelectedDocIds}
        onAttachDoc={handleToggleSessionDoc}
        onRemoveDoc={handleRemoveSessionDoc}
        onOpenUpload={() => setIsUploadModalOpen(true)}
        memories={memories}
        memoryEnabled={memoryEnabled}
        onToggleMemory={handleToggleMemory}
        onDeleteMemory={handleDeleteMemory}
        memoryLoading={isMemoriesLoading}
      />

      {/* ── Modals ────────────────────────────────────────────────────────── */}

      {/* Create / Edit Project Modal */}
      <CreateProjectModal
        isOpen={isCreateProjectOpen}
        onClose={() => {
          setIsCreateProjectOpen(false);
          setEditProjectData(null);
        }}
        onSubmit={handleCreateOrUpdateProject}
        initialData={editProjectData}
      />

      {/* Move Chat Modal */}
      <MoveChatModal
        isOpen={Boolean(moveChatTarget)}
        onClose={() => setMoveChatTarget(null)}
        chat={moveChatTarget}
        projects={projects}
        onMove={handleConfirmMoveChat}
      />

      {/* Delete Project Modal */}
      <DeleteProjectModal
        isOpen={Boolean(deleteProjectTarget)}
        onClose={() => setDeleteProjectTarget(null)}
        project={deleteProjectTarget}
        onConfirm={handleConfirmDeleteProject}
      />

      {/* Link Project Documents Modal */}
      <LinkProjectDocsModal
        isOpen={Boolean(linkDocsProjectTarget)}
        onClose={() => setLinkDocsProjectTarget(null)}
        project={linkDocsProjectTarget}
        allDocuments={documents}
        onSave={handleSaveProjectDocs}
      />

      <ExtractionModal
        isOpen={isExtractionModalOpen}
        onClose={() => {
          setIsExtractionModalOpen(false);
          setExtractionError('');
        }}
        document={extractionDocument}
        onSubmit={handleStartExtraction}
        isSubmitting={isStartingExtraction}
        error={extractionError}
      />

      {/* Manage Session Documents Picker */}
      <DocumentPickerModal
        isOpen={isDocPickerOpen}
        onClose={() => setIsDocPickerOpen(false)}
        documents={documents}
        selectedDocIds={sessionSelectedDocIds}
        onToggleDoc={handleToggleSessionDoc}
        onOpenUpload={() => setIsUploadModalOpen(true)}
        onDeleteDoc={handleDeleteDocumentFromPicker}
      />

      {/* Upload Modal */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-in fade-in duration-150 select-none">
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                  <FileText size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Upload New File</h3>
                  <p className="text-xs text-slate-500">Supports PDF, Word, TXT, CSV, JSON</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsUploadModalOpen(false)}
                className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 transition cursor-pointer"
              >
                <X size={17} />
              </button>
            </div>
            <DocumentUpload onUploadSuccess={handleUploadSuccess} projectId={activeProjectId} />
          </div>
        </div>
      )}

      {/* Chat Delete Confirmation Modal */}
      {confirmDeleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-in fade-in duration-150 select-none">
          <div className="w-full max-w-sm rounded-3xl bg-white p-5 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 shrink-0">
                <Trash2 size={20} />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900">Delete Conversation?</h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  This will remove the chat history. Uploaded documents and persistent memories remain intact.
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setConfirmDeleteId(null)}
                className="px-3.5 py-1.5 text-xs font-semibold rounded-xl text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-4 py-1.5 text-xs font-bold rounded-xl bg-rose-600 text-white hover:bg-rose-700 shadow-xs cursor-pointer"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AIChat;
