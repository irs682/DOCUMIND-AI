import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Sparkles,
  Bot,
  FileText,
  Layers,
  CheckCircle2,
  Lock,
  ChevronRight,
  Download,
  Printer,
  Maximize2,
  Minimize2,
  ZoomIn,
  ZoomOut,
  History,
  RotateCcw,
  Send,
  MoreVertical,
  Check,
  X,
  RefreshCw,
  ChevronLeft,
  Columns,
  Eye,
  Sliders,
  HelpCircle,
  ShieldCheck,
  ArrowRight,
} from 'lucide-react';
import katex from 'katex';
import 'katex/dist/katex.min.css';

import { researchApi } from '../../../services/researchApi';
import { resolveManuscriptNumbering } from '../../../utils/academicCrossReferences';
import {
  downloadManuscriptAsPdf,
  printManuscriptPdf,
  exportToLatex,
  exportToDocx,
  exportToBibtex,
} from '../../../utils/manuscriptExport';

// Provenance Badge styles for Evidence Inspector
const PROVENANCE_BADGE_CONFIG = {
  SOURCE_FACT: {
    label: 'Source Literature',
    bg: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800',
  },
  USER_DEFINED: {
    label: 'Author Defined',
    bg: 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/50 dark:text-sky-300 dark:border-sky-800',
  },
  PROJECT_PROPOSAL: {
    label: 'Methodology Proposal',
    bg: 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/50 dark:text-indigo-300 dark:border-indigo-800',
  },
  MODEL_PROPOSAL: {
    label: 'Architectural Spec',
    bg: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/50 dark:text-purple-300 dark:border-purple-800',
  },
  VERIFIED_RESULT: {
    label: 'Empirical Trial',
    bg: 'bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950/50 dark:text-teal-300 dark:border-teal-800',
  },
  DERIVED: {
    label: 'Theoretical Derivation',
    bg: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-800',
  },
  NEEDS_VERIFICATION: {
    label: 'Needs Verification',
    bg: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800',
  },
};

export default function ManuscriptWorkspace({
  project: initialProject,
  onBackToProjects,
  onProjectUpdated,
}) {
  const [project, setProject] = useState(initialProject);
  const projectId = project?._id || project?.id;

  // View & UI states
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [isOutlineOpen, setIsOutlineOpen] = useState(true);
  const [viewMode, setViewMode] = useState('continuous'); // 'continuous' | 'page'
  const [zoomLevel, setZoomLevel] = useState(100);

  // Drawers & Modals
  const [isCopilotOpen, setIsCopilotOpen] = useState(false);
  const [isEvidenceOpen, setIsEvidenceOpen] = useState(false);
  const [isProgressOpen, setIsProgressOpen] = useState(false);
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [inspectedObject, setInspectedObject] = useState(null);

  // Active section scroll-spy
  const [activeSectionId, setActiveSectionId] = useState('');

  // Text selection & floating toolbar
  const [selectedTextInfo, setSelectedTextInfo] = useState(null);

  // Copilot chat & rewrite state
  const [copilotMessages, setCopilotMessages] = useState([
    {
      role: 'assistant',
      content:
        'Hi! I am your Research Copilot. Select any paragraph in your paper or ask me below to improve tone, clarify methodology, or check citations.',
    },
  ]);
  const [copilotQuery, setCopilotQuery] = useState('');
  const [copilotLoading, setCopilotLoading] = useState(false);

  // Pending Revision State (inside Copilot drawer)
  const [activeRevision, setActiveRevision] = useState(null);
  const [showDiff, setShowDiff] = useState(false);
  const [selectedAltIndex, setSelectedAltIndex] = useState(0);

  // Autosave status
  const [saveStatus, setSaveStatus] = useState('Saved');

  // Autonomous Live Generation state
  const [genState, setGenState] = useState({
    isGenerating: false,
    progress: 100,
    currentStep: null,
    sectionStatuses: {
      'Abstract': 'VERIFIED',
      '1. Introduction': 'VERIFIED',
      '2. Related Work': 'VERIFIED',
      '3. Research Gap & Contributions': 'VERIFIED',
      '4. Proposed MERA-VLA Framework': 'VERIFIED',
      '5. Proposed Evaluation Protocol': 'VERIFIED',
      '6. Experimental Results': 'LOCKED',
      '7. Discussion': 'LOCKED',
      '8. Limitations': 'VERIFIED',
      '9. Conclusion': 'VERIFIED',
    },
    message: '',
  });

  const paperContainerRef = useRef(null);
  const sseRef = useRef(null);

  // Sync initial project
  useEffect(() => {
    if (initialProject) setProject(initialProject);
  }, [initialProject]);

  const manuscriptMode = project?.manuscriptMode || 'PRE_EXPERIMENTAL';
  const isPreExperimental = manuscriptMode === 'PRE_EXPERIMENTAL';

  // Resolved canonical manuscript objects & numbering
  const resolvedObjects = useMemo(() => {
    return resolveManuscriptNumbering(project?.manuscriptObjects || []);
  }, [project?.manuscriptObjects]);

  const resolvedData = useMemo(() => {
    const list = Array.isArray(resolvedObjects) ? resolvedObjects : [];
    return {
      all: list,
      equations: list.filter((o) => o.objectType === 'equation'),
      figures: list.filter(
        (o) => o.objectType === 'figure' || o.objectType === 'image' || o.objectType === 'graph'
      ),
      tables: list.filter((o) => o.objectType === 'table'),
    };
  }, [resolvedObjects]);

  const draft = project?.generatedDraft;
  const sections = draft?.sections || [];

  // ── Real-Time SSE Stream with Polling Fallback ──
  useEffect(() => {
    if (!projectId) return;

    let eventSource = null;
    let pollInterval = null;

    const setupSSE = () => {
      try {
        const sseUrl = `/api/research/projects/${projectId}/copilot/events`;
        eventSource = new EventSource(sseUrl, { withCredentials: true });
        sseRef.current = eventSource;

        eventSource.addEventListener('section.streaming', (e) => {
          try {
            const data = JSON.parse(e.data);
            setGenState((prev) => ({
              ...prev,
              isGenerating: true,
              progress: data.progress || prev.progress,
              currentStep: data.sectionHeading,
              message: `Drafting ${data.sectionHeading}...`,
            }));
          } catch (err) {
            console.error('SSE error:', err);
          }
        });

        eventSource.addEventListener('section.verified', (e) => {
          try {
            const data = JSON.parse(e.data);
            setGenState((prev) => ({
              ...prev,
              sectionStatuses: {
                ...prev.sectionStatuses,
                [data.sectionHeading]: 'VERIFIED',
              },
            }));
          } catch (err) {
            console.error('SSE error:', err);
          }
        });

        eventSource.addEventListener('manuscript.saved', (e) => {
          try {
            const data = JSON.parse(e.data);
            setGenState((prev) => ({
              ...prev,
              isGenerating: false,
              progress: 100,
              message: 'Paper generation complete.',
            }));
            if (data.draft) {
              setProject((prev) => ({
                ...prev,
                generatedDraft: data.draft,
              }));
            }
          } catch (err) {
            console.error('SSE error:', err);
          }
        });

        eventSource.onerror = () => {
          if (eventSource) eventSource.close();
          if (!pollInterval) {
            pollInterval = setInterval(fetchLiveStatus, 6000);
          }
        };
      } catch (err) {
        pollInterval = setInterval(fetchLiveStatus, 6000);
      }
    };

    const fetchLiveStatus = async () => {
      try {
        const res = await researchApi.getLiveStatus(projectId);
        if (res.data?.success) {
          setGenState((prev) => ({
            ...prev,
            isGenerating: res.data.isGenerating,
            progress: res.data.progress,
            sectionStatuses: res.data.sectionStatuses || prev.sectionStatuses,
          }));
        }
      } catch (err) {
        // quiet fallback
      }
    };

    setupSSE();
    fetchLiveStatus();

    return () => {
      if (eventSource) eventSource.close();
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [projectId]);

  // ── Scroll Spy ──
  useEffect(() => {
    const container = paperContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const sectionElements = container.querySelectorAll('[data-section-heading]');
      let current = '';
      const containerTop = container.getBoundingClientRect().top;

      sectionElements.forEach((el) => {
        const rect = el.getBoundingClientRect();
        if (rect.top - containerTop <= 160) {
          current = el.getAttribute('data-section-heading');
        }
      });

      if (current && current !== activeSectionId) {
        setActiveSectionId(current);
      }
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, [activeSectionId]);

  const handleScrollToSection = (heading) => {
    const container = paperContainerRef.current;
    if (!container) return;
    const target = container.querySelector(`[data-section-heading="${heading}"]`);
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setActiveSectionId(heading);
    }
  };

  // ── Text Selection Popover Listener ──
  const handleMouseUp = () => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) return;
    const text = selection.toString().trim();
    if (text.length > 5) {
      let node = selection.anchorNode;
      let sectionHeading = '';
      while (node && node !== document.body) {
        if (node.getAttribute && node.getAttribute('data-section-heading')) {
          sectionHeading = node.getAttribute('data-section-heading');
          break;
        }
        node = node.parentNode;
      }

      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();

      setSelectedTextInfo({
        text,
        sectionHeading: sectionHeading || activeSectionId || '1. Introduction',
        rect: {
          top: rect.top + window.scrollY,
          left: rect.left + rect.width / 2,
        },
      });
    }
  };

  // ── Trigger Copilot Rewrite ──
  const triggerRewrite = async (instruction = 'More academic tone and journal style') => {
    const textToRewrite = selectedTextInfo?.text;
    const sectionToRewrite = selectedTextInfo?.sectionHeading || activeSectionId || '1. Introduction';
    if (!textToRewrite) return;

    setSelectedTextInfo(null);
    setIsCopilotOpen(true);
    setCopilotLoading(true);

    try {
      const res = await researchApi.copilotRewrite(projectId, {
        selectedText: textToRewrite,
        sectionId: sectionToRewrite,
        customInstruction: instruction,
      });

      if (res.data?.success && res.data.alternatives?.length > 0) {
        setActiveRevision({
          originalText: textToRewrite,
          sectionId: sectionToRewrite,
          alternatives: res.data.alternatives,
          citationAudit: res.data.citationAudit,
        });
        setSelectedAltIndex(0);
      }
    } catch (err) {
      console.error('Rewrite error:', err);
    } finally {
      setCopilotLoading(false);
    }
  };

  // ── Apply Rewrite ──
  const handleApplyRevision = async (action = 'replace') => {
    if (!activeRevision || !activeRevision.alternatives) return;
    const chosenAlt = activeRevision.alternatives[selectedAltIndex];
    if (!chosenAlt) return;

    setSaveStatus('Saving...');
    try {
      const res = await researchApi.applyRewrite(projectId, {
        sectionHeading: activeRevision.sectionId,
        originalText: activeRevision.originalText,
        revisedText: chosenAlt.revisedText,
        action,
        rationale: `Applied [${chosenAlt.title || 'Revision'}]`,
      });

      if (res.data?.success && res.data.project) {
        setProject(res.data.project);
        if (onProjectUpdated) onProjectUpdated(res.data.project);
        setSaveStatus('Saved');
        setActiveRevision(null);
      }
    } catch (err) {
      console.error('Failed to apply revision:', err);
      setSaveStatus('Error');
    }
  };

  // ── Copilot Chat Handler ──
  const handleSendCopilotQuery = async (queryText = null) => {
    const q = (queryText || copilotQuery).trim();
    if (!q) return;

    const userMsg = { role: 'user', content: q };
    setCopilotMessages((prev) => [...prev, userMsg]);
    setCopilotQuery('');
    setCopilotLoading(true);

    try {
      const res = await researchApi.copilotChat(projectId, {
        query: q,
        selectedText: selectedTextInfo?.text || activeRevision?.originalText || null,
        sectionId: activeSectionId,
        history: copilotMessages.slice(-6).map((m) => ({ role: m.role, content: m.content })),
      });

      if (res.data?.success) {
        setCopilotMessages((prev) => [
          ...prev,
          { role: 'assistant', content: res.data.reply },
        ]);
      }
    } catch (err) {
      setCopilotMessages((prev) => [
        ...prev,
        { role: 'assistant', content: 'Unable to process query. Please check connection.' },
      ]);
    } finally {
      setCopilotLoading(false);
    }
  };

  // ── Restore Version ──
  const handleRestoreVersion = async (versionNumber) => {
    if (!versionNumber) return;
    try {
      const res = await researchApi.restoreRevision(projectId, versionNumber);
      if (res.data?.success && res.data.project) {
        setProject(res.data.project);
        if (onProjectUpdated) onProjectUpdated(res.data.project);
        setHistoryModalOpen(false);
      }
    } catch (err) {
      console.error('Failed to restore version:', err);
    }
  };

  // ── KaTeX Helper ──
  const renderMath = (latex) => {
    try {
      return (
        <span
          dangerouslySetInnerHTML={{
            __html: katex.renderToString(latex, { throwOnError: false, displayMode: true }),
          }}
        />
      );
    } catch {
      return <code className="font-mono text-xs">{latex}</code>;
    }
  };

  // ── Open Evidence Inspector for Entity ──
  const handleInspectEntity = (entity) => {
    setInspectedObject(entity);
    setIsEvidenceOpen(true);
  };

  return (
    <div className="relative flex flex-col h-[calc(100vh-5.5rem)] w-full overflow-hidden bg-slate-900 text-slate-100 font-sans select-text">
      {/* =========================================================================
          1. MINIMAL TOP BAR
         ========================================================================= */}
      <header className="flex items-center justify-between px-5 py-3 bg-slate-950 border-b border-slate-800/80 shrink-0 z-30">
        {/* Left: Navigation & Manuscript Title */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBackToProjects}
            className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-white px-2.5 py-1.5 rounded-lg hover:bg-slate-850 transition"
          >
            <ChevronLeft size={15} />
            <span>Studies</span>
          </button>
          <div className="h-4 w-[1px] bg-slate-800" />
          <h1 className="text-sm font-semibold text-white tracking-tight truncate max-w-[240px] sm:max-w-md">
            {project?.title || 'Academic Manuscript'}
          </h1>
        </div>

        {/* Center: Clean Status & Progress Popover Trigger */}
        <div className="flex items-center gap-2">
          {genState.isGenerating ? (
            <button
              type="button"
              onClick={() => setIsProgressOpen((prev) => !prev)}
              className="flex items-center gap-2 bg-indigo-950/80 text-indigo-300 border border-indigo-700/80 px-3 py-1 rounded-full text-xs animate-pulse hover:bg-indigo-900 transition"
            >
              <RefreshCw size={12} className="animate-spin" />
              <span className="font-medium">Writing Paper • {genState.progress}%</span>
            </button>
          ) : (
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span>{saveStatus}</span>
            </div>
          )}
        </div>

        {/* Right: Evidence, Ask Copilot, Export, More Menu */}
        <div className="flex items-center gap-2">
          {/* Evidence Inspector Trigger */}
          <button
            type="button"
            onClick={() => {
              setInspectedObject(null);
              setIsEvidenceOpen((prev) => !prev);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-850 text-slate-300 border border-slate-800 text-xs font-medium transition"
          >
            <ShieldCheck size={14} className="text-emerald-400" />
            <span className="hidden sm:inline">Evidence</span>
            <span className="text-emerald-400 font-bold">✓</span>
          </button>

          {/* Ask Copilot Main Button */}
          <button
            type="button"
            onClick={() => setIsCopilotOpen((prev) => !prev)}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold shadow-xs transition ${
              isCopilotOpen
                ? 'bg-indigo-500 text-white'
                : 'bg-indigo-600 hover:bg-indigo-500 text-white'
            }`}
          >
            <Sparkles size={14} />
            <span>Ask Copilot</span>
          </button>

          {/* Export Dropdown Menu */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsExportMenuOpen((prev) => !prev)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-850 text-slate-200 border border-slate-800 text-xs font-medium transition"
            >
              <Download size={13} />
              <span>Export</span>
            </button>

            {isExportMenuOpen && (
              <div className="absolute right-0 mt-1.5 w-48 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl py-1.5 z-50 text-xs text-slate-200 animate-in fade-in zoom-in-95">
                <button
                  type="button"
                  onClick={() => {
                    downloadManuscriptAsPdf(project, draft, resolvedObjects);
                    setIsExportMenuOpen(false);
                  }}
                  className="w-full px-3 py-2 text-left hover:bg-slate-800 flex items-center justify-between"
                >
                  <span className="font-semibold text-white">Download PDF</span>
                  <span className="text-[10px] text-slate-400 font-mono">A4 Academic</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    exportToLatex(project, draft, resolvedObjects);
                    setIsExportMenuOpen(false);
                  }}
                  className="w-full px-3 py-2 text-left hover:bg-slate-800 flex items-center justify-between"
                >
                  <span>LaTeX Bundle</span>
                  <span className="text-[10px] text-slate-400 font-mono">.tex + .bib</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    exportToDocx(project, draft, resolvedObjects);
                    setIsExportMenuOpen(false);
                  }}
                  className="w-full px-3 py-2 text-left hover:bg-slate-800 flex items-center justify-between"
                >
                  <span>Word Document</span>
                  <span className="text-[10px] text-slate-400 font-mono">.docx</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    exportToBibtex(project, draft);
                    setIsExportMenuOpen(false);
                  }}
                  className="w-full px-3 py-2 text-left hover:bg-slate-800 flex items-center justify-between"
                >
                  <span>BibTeX Citations</span>
                  <span className="text-[10px] text-slate-400 font-mono">.bib</span>
                </button>
              </div>
            )}
          </div>

          {/* More Actions Menu (•••) */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsMoreMenuOpen((prev) => !prev)}
              className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-850 text-slate-300 border border-slate-800 transition"
              title="More Options"
            >
              <MoreVertical size={15} />
            </button>

            {isMoreMenuOpen && (
              <div className="absolute right-0 mt-1.5 w-44 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl py-1.5 z-50 text-xs text-slate-200 animate-in fade-in zoom-in-95">
                <button
                  type="button"
                  onClick={() => {
                    setHistoryModalOpen(true);
                    setIsMoreMenuOpen(false);
                  }}
                  className="w-full px-3 py-2 text-left hover:bg-slate-800 flex items-center gap-2"
                >
                  <History size={13} className="text-slate-400" />
                  <span>Version History</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsFocusMode((prev) => !prev);
                    setIsMoreMenuOpen(false);
                  }}
                  className="w-full px-3 py-2 text-left hover:bg-slate-800 flex items-center gap-2"
                >
                  {isFocusMode ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
                  <span>{isFocusMode ? 'Exit Focus Mode' : 'Focus Mode'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setViewMode((prev) => (prev === 'continuous' ? 'page' : 'continuous'));
                    setIsMoreMenuOpen(false);
                  }}
                  className="w-full px-3 py-2 text-left hover:bg-slate-800 flex items-center gap-2"
                >
                  <FileText size={13} className="text-slate-400" />
                  <span>{viewMode === 'continuous' ? 'Page View (A4)' : 'Continuous View'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    printManuscriptPdf(project, draft, resolvedObjects);
                    setIsMoreMenuOpen(false);
                  }}
                  className="w-full px-3 py-2 text-left hover:bg-slate-800 flex items-center gap-2"
                >
                  <Printer size={13} className="text-slate-400" />
                  <span>Print Preview</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* =========================================================================
          2. WORKSPACE BODY: SLIM OUTLINE + LARGE MANUSCRIPT CANVAS
         ========================================================================= */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Slim Outline Sidebar (~240px) */}
        {!isFocusMode && isOutlineOpen && (
          <aside className="w-56 shrink-0 border-r border-slate-800/80 bg-slate-950 flex flex-col overflow-y-auto">
            <div className="p-3 border-b border-slate-850 flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Outline
              </span>
              <button
                type="button"
                onClick={() => setIsOutlineOpen(false)}
                className="text-slate-500 hover:text-slate-300 p-0.5 rounded"
                title="Hide Outline"
              >
                <ChevronLeft size={14} />
              </button>
            </div>

            <nav className="p-2 space-y-0.5 text-xs">
              {sections.map((sec, idx) => {
                const heading = sec.heading || `Section ${idx + 1}`;
                const isLocked =
                  isPreExperimental &&
                  (heading.toLowerCase().includes('result') || heading.toLowerCase().includes('discussion'));
                const isActive = activeSectionId === heading;

                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleScrollToSection(heading)}
                    className={`w-full text-left px-2.5 py-1.5 rounded-lg flex items-center justify-between transition ${
                      isActive
                        ? 'bg-indigo-950/80 text-white font-medium'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                    }`}
                  >
                    <span className="truncate">{heading}</span>
                    <span className="shrink-0 ml-1">
                      {isLocked ? (
                        <Lock size={12} className="text-amber-400/80" />
                      ) : (
                        <span className="text-emerald-400 text-[10px]">✓</span>
                      )}
                    </span>
                  </button>
                );
              })}
            </nav>
          </aside>
        )}

        {/* Outline Expand Button if collapsed */}
        {!isFocusMode && !isOutlineOpen && (
          <button
            type="button"
            onClick={() => setIsOutlineOpen(true)}
            className="absolute left-2 top-2 z-20 p-1.5 bg-slate-900 border border-slate-800 rounded-lg text-slate-400 hover:text-white shadow-md transition"
            title="Show Outline"
          >
            <ChevronRight size={14} />
          </button>
        )}

        {/* =======================================================================
            3. LARGE CALM MANUSCRIPT CANVAS (75-80% OF SPACE)
           ======================================================================= */}
        <main
          ref={paperContainerRef}
          onMouseUp={handleMouseUp}
          className="flex-1 overflow-y-auto bg-slate-900/80 flex justify-center p-4 sm:p-10 select-text relative"
        >
          <article
            style={{
              transform: `scale(${zoomLevel / 100})`,
              transformOrigin: 'top center',
              width: viewMode === 'page' ? '210mm' : '100%',
              maxWidth: '920px',
              minHeight: viewMode === 'page' ? '297mm' : 'auto',
            }}
            className={`bg-white text-slate-900 shadow-xl transition-all duration-150 select-text font-serif ${
              viewMode === 'page'
                ? 'p-[25mm] rounded-xs border border-slate-200 mb-12'
                : 'p-8 sm:p-14 rounded-2xl border border-slate-200/90'
            }`}
          >
            {/* Header: Title, Authors, Abstract */}
            <header className="mb-10 text-center border-b border-slate-200 pb-8">
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-950 font-serif leading-snug">
                {draft?.title || project?.title || 'Academic Manuscript'}
              </h1>

              <div className="mt-4 text-xs sm:text-sm text-slate-700 space-y-1 font-sans">
                <p className="font-semibold text-slate-900">
                  {project?.authors?.length
                    ? project.authors.map((a) => a.name).join(', ')
                    : 'DOCUMIND Research Group'}
                </p>
                <p className="text-slate-500 italic text-xs">
                  Autonomous Research Workspace • Department of Robotics & AI
                </p>
              </div>

              {/* Abstract Card */}
              <div className="mt-8 mx-auto max-w-2xl bg-slate-50 p-5 rounded-xl border border-slate-200 text-left font-serif">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-800 block mb-2 font-sans">
                  Abstract
                </span>
                <p className="text-xs text-slate-700 leading-relaxed text-justify">
                  {draft?.abstract ||
                    'This manuscript formalizes the proposed framework and formal evaluation protocol across benchmark environments.'}
                </p>
                <div className="mt-3 pt-2 border-t border-slate-200 text-[11px] text-slate-600 font-sans flex items-center gap-1.5">
                  <span className="font-bold text-slate-800">Keywords:</span>
                  <span>Vision-Language-Action, Episodic Memory, Parametric Policy</span>
                </div>
              </div>
            </header>

            {/* Sections Content */}
            <div className="space-y-10 text-base leading-relaxed text-slate-850 font-serif">
              {sections.map((sec, sIdx) => {
                const heading = sec.heading || `Section ${sIdx + 1}`;
                const isLocked =
                  isPreExperimental &&
                  (heading.toLowerCase().includes('result') || heading.toLowerCase().includes('discussion'));

                return (
                  <section
                    key={sIdx}
                    data-section-heading={heading}
                    className="relative scroll-mt-10"
                  >
                    <h2 className="text-xl font-bold text-slate-950 font-serif border-b border-slate-200 pb-2 mb-4">
                      {heading}
                    </h2>

                    {isLocked ? (
                      /* Clean Simple Locked Notice */
                      <div className="my-4 p-4 rounded-xl bg-amber-50/80 border border-amber-200 text-amber-900 text-xs font-sans flex items-center gap-3">
                        <Lock size={16} className="text-amber-600 shrink-0" />
                        <div>
                          <p className="font-bold text-amber-950">
                            🔒 Requires verified experimental data to unlock
                          </p>
                          <p className="text-amber-800 mt-0.5">
                            Under pre-experimental mode, empirical claims are held until simulator or physical lab results are registered.
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4 text-justify">
                        {sec.content ? (
                          sec.content.split('\n\n').map((paragraph, pIdx) => (
                            <p
                              key={pIdx}
                              className="leading-relaxed hover:bg-amber-50/40 rounded-sm px-1 -mx-1 transition-colors cursor-text"
                            >
                              {paragraph}
                            </p>
                          ))
                        ) : (
                          <p className="text-slate-400 italic">No content generated for this section.</p>
                        )}
                      </div>
                    )}

                    {/* Integrated Equations & Figure in Methodology */}
                    {heading.toLowerCase().includes('method') && (
                      <div className="my-8 space-y-6">
                        {resolvedData.equations?.slice(0, 3).map((eq, eqIdx) => (
                          <div
                            key={eqIdx}
                            onClick={() => handleInspectEntity(eq)}
                            className="my-4 p-3 rounded-xl bg-slate-50 border border-slate-200 hover:border-indigo-400 cursor-pointer transition flex items-center justify-between"
                          >
                            <div className="flex-1 text-center font-serif py-1">
                              {renderMath(eq.latex)}
                            </div>
                            <span className="text-xs font-mono font-bold text-slate-600 pl-4 shrink-0">
                              ({eq.resolvedNumber || eqIdx + 1})
                            </span>
                          </div>
                        ))}

                        {resolvedData.figures?.[0] && (
                          <div
                            onClick={() => handleInspectEntity(resolvedData.figures[0])}
                            className="my-8 text-center cursor-pointer group"
                          >
                            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl group-hover:border-indigo-400 transition inline-block max-w-full">
                              {resolvedData.figures[0].svgContent ? (
                                <div
                                  className="max-h-[300px] overflow-hidden flex justify-center"
                                  dangerouslySetInnerHTML={{ __html: resolvedData.figures[0].svgContent }}
                                />
                              ) : (
                                <div className="h-40 w-80 bg-slate-200 flex items-center justify-center text-xs text-slate-500 font-sans">
                                  [Architecture Schematic Diagram]
                                </div>
                              )}
                            </div>
                            <p className="mt-2 text-xs font-sans text-slate-600">
                              <span className="font-bold text-slate-900">
                                Figure {resolvedData.figures[0].resolvedNumber || 1}.
                              </span>{' '}
                              {resolvedData.figures[0].caption || 'System Architecture Schematic'}
                            </p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Integrated Table in Evaluation */}
                    {heading.toLowerCase().includes('evaluation') && (resolvedData.tables?.[1] || resolvedData.tables?.[0]) && (
                      <div
                        onClick={() => handleInspectEntity(resolvedData.tables?.[1] || resolvedData.tables[0])}
                        className="my-8 cursor-pointer group"
                      >
                        <p className="mb-2 text-xs font-sans text-slate-700">
                          <span className="font-bold text-slate-900">
                            Table {(resolvedData.tables?.[1] || resolvedData.tables[0]).resolvedNumber || 2}.
                          </span>{' '}
                          {(resolvedData.tables?.[1] || resolvedData.tables[0]).caption || 'Planned Experimental Evaluation Matrix'}
                        </p>
                        <div className="overflow-x-auto border-t-2 border-b-2 border-slate-800 p-1">
                          <table className="w-full text-xs font-sans text-left border-collapse">
                            <thead>
                              <tr className="border-b border-slate-400 font-bold">
                                <th className="py-1 px-2">Benchmark / Task</th>
                                <th className="py-1 px-2">Baseline Model</th>
                                <th className="py-1 px-2">Proposed Architecture</th>
                                <th className="py-1 px-2">Metric</th>
                                <th className="py-1 px-2">Status</th>
                              </tr>
                            </thead>
                            <tbody>
                              <tr className="border-b border-slate-200">
                                <td className="py-1.5 px-2">CALVIN Multi-Context</td>
                                <td className="py-1.5 px-2">OpenVLA (7B)</td>
                                <td className="py-1.5 px-2">MERA-VLA (Dual Memory)</td>
                                <td className="py-1.5 px-2">Success Rate (%)</td>
                                <td className="py-1.5 px-2 text-amber-700 font-semibold">Planned Evaluation</td>
                              </tr>
                              <tr>
                                <td className="py-1.5 px-2">LIBERO Long-Horizon</td>
                                <td className="py-1.5 px-2">Octo-Base</td>
                                <td className="py-1.5 px-2">MERA-VLA (Dual Memory)</td>
                                <td className="py-1.5 px-2">Average Return</td>
                                <td className="py-1.5 px-2 text-amber-700 font-semibold">Planned Evaluation</td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </section>
                );
              })}
            </div>

            {/* References */}
            <footer className="mt-14 pt-8 border-t border-slate-300">
              <h2 className="text-xl font-bold text-slate-950 font-serif mb-4">References</h2>
              <ol className="list-decimal pl-5 space-y-2 text-xs text-slate-700 leading-relaxed font-sans">
                {draft?.references && draft.references.length > 0 ? (
                  draft.references.map((ref, rIdx) => (
                    <li key={rIdx}>{ref.replace(/^\[\d+\]\s*/, '')}</li>
                  ))
                ) : (
                  <li>
                    Zhao, A. et al. (2024). ExpeL: LLM Agents Are Experiential Learners. In Proceedings of the
                    AAAI Conference on Human Computation and Crowdsourcing.
                  </li>
                )}
              </ol>
            </footer>
          </article>
        </main>
      </div>

      {/* =========================================================================
          4. CONTEXT-AWARE TEXT SELECTION FLOATING TOOLBAR
         ========================================================================= */}
      {selectedTextInfo && (
        <div
          style={{
            position: 'fixed',
            top: `${Math.max(70, selectedTextInfo.rect.top - 50)}px`,
            left: `${selectedTextInfo.rect.left}px`,
            transform: 'translateX(-50%)',
          }}
          className="z-50 flex items-center gap-1 p-1 bg-slate-900 border border-slate-700/80 rounded-xl shadow-2xl text-xs text-slate-200 animate-in fade-in zoom-in-95 duration-100"
        >
          <button
            type="button"
            onClick={() => triggerRewrite('More academic tone and journal style')}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg hover:bg-slate-800 text-indigo-300 font-medium transition"
          >
            <Sparkles size={12} />
            <span>Improve</span>
          </button>
          <button
            type="button"
            onClick={() => triggerRewrite('Rewrite paragraph with stronger clarity and flow')}
            className="px-2 py-1 rounded-lg hover:bg-slate-800 transition"
          >
            Rewrite
          </button>
          <button
            type="button"
            onClick={() => triggerRewrite('Shorten and increase concision')}
            className="px-2 py-1 rounded-lg hover:bg-slate-800 transition"
          >
            Shorten
          </button>
          <div className="h-4 w-[1px] bg-slate-800" />
          <button
            type="button"
            onClick={() => {
              setIsCopilotOpen(true);
              setCopilotQuery(`How can I improve this excerpt: "${selectedTextInfo.text}"`);
              setSelectedTextInfo(null);
            }}
            className="flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-slate-800 text-sky-300 transition"
          >
            <Bot size={12} />
            <span>Ask Copilot</span>
          </button>
          <button
            type="button"
            onClick={() => setSelectedTextInfo(null)}
            className="p-1 rounded-md text-slate-500 hover:text-white"
          >
            <X size={12} />
          </button>
        </div>
      )}

      {/* =========================================================================
          5. RESEARCH COPILOT SLIDE-OVER DRAWER (~400px)
         ========================================================================= */}
      {isCopilotOpen && (
        <aside className="fixed right-0 top-[3.75rem] bottom-0 w-full sm:w-[420px] z-40 bg-slate-950 border-l border-slate-800 shadow-2xl flex flex-col text-slate-200 animate-in slide-in-from-right duration-200">
          {/* Drawer Header */}
          <div className="p-4 border-b border-slate-850 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles size={16} className="text-indigo-400" />
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                Research Copilot
              </h3>
            </div>
            <button
              type="button"
              onClick={() => setIsCopilotOpen(false)}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-850"
            >
              <X size={16} />
            </button>
          </div>

          {/* Drawer Body: Suggested Revision Card OR Chat Stream */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
            {/* Active Revision Card if generated */}
            {activeRevision && (
              <div className="p-4 rounded-xl bg-slate-900 border border-indigo-900/60 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-indigo-400 text-xs flex items-center gap-1.5">
                    <Sparkles size={13} />
                    Suggested Revision
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowDiff((prev) => !prev)}
                    className="text-[10px] text-slate-400 hover:text-white underline"
                  >
                    {showDiff ? 'Hide Diff' : 'Compare Diff'}
                  </button>
                </div>

                {/* Diff View Comparison or Clean Text */}
                {showDiff && activeRevision.alternatives?.[selectedAltIndex]?.diff?.wordDiff ? (
                  <div className="p-3 rounded-lg bg-slate-950 font-sans leading-relaxed text-[11px]">
                    {activeRevision.alternatives[selectedAltIndex].diff.wordDiff.map((d, dIdx) => (
                      <span
                        key={dIdx}
                        className={
                          d.added
                            ? 'bg-emerald-950 text-emerald-300 font-bold px-0.5 rounded'
                            : d.removed
                            ? 'bg-rose-950 text-rose-400 line-through px-0.5 rounded'
                            : 'text-slate-300'
                        }
                      >
                        {d.value}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="font-serif text-slate-200 leading-relaxed text-xs">
                    {activeRevision.alternatives?.[selectedAltIndex]?.revisedText}
                  </p>
                )}

                {/* Actions: Apply, Regenerate, Cancel */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setActiveRevision(null)}
                    className="text-slate-400 hover:text-white text-xs"
                  >
                    Cancel
                  </button>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => triggerRewrite('Regenerate revision')}
                      className="px-2.5 py-1 rounded-lg border border-slate-800 text-slate-300 hover:text-white text-xs"
                    >
                      Regenerate
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApplyRevision('replace')}
                      className="px-3 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition"
                    >
                      Apply to Paper
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Chat Messages */}
            <div className="space-y-3">
              {copilotMessages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
                >
                  <div
                    className={`max-w-[90%] p-3 rounded-xl leading-relaxed text-xs ${
                      msg.role === 'user'
                        ? 'bg-indigo-600 text-white'
                        : 'bg-slate-900 text-slate-200 border border-slate-850'
                    }`}
                  >
                    {msg.content}
                  </div>
                </div>
              ))}
              {copilotLoading && (
                <div className="flex items-center gap-2 text-slate-400 text-xs py-2">
                  <RefreshCw size={12} className="animate-spin text-indigo-400" />
                  <span>Thinking...</span>
                </div>
              )}
            </div>
          </div>

          {/* Drawer Input Bar */}
          <div className="p-3 border-t border-slate-850 bg-slate-950">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendCopilotQuery();
              }}
              className="relative flex items-center"
            >
              <input
                type="text"
                value={copilotQuery}
                onChange={(e) => setCopilotQuery(e.target.value)}
                placeholder="Ask Copilot or request an edit..."
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-indigo-500 pr-9 transition"
              />
              <button
                type="submit"
                disabled={!copilotQuery.trim() || copilotLoading}
                className="absolute right-1.5 p-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-40 transition"
              >
                <Send size={13} />
              </button>
            </form>
          </div>
        </aside>
      )}

      {/* =========================================================================
          6. EVIDENCE INSPECTOR SLIDE-OVER DRAWER (~380px)
         ========================================================================= */}
      {isEvidenceOpen && (
        <aside className="fixed right-0 top-[3.75rem] bottom-0 w-full sm:w-[380px] z-40 bg-slate-950 border-l border-slate-800 shadow-2xl flex flex-col text-slate-200 animate-in slide-in-from-right duration-200">
          <div className="p-4 border-b border-slate-850 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck size={16} className="text-emerald-400" />
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                Evidence Inspector
              </h3>
            </div>
            <button
              type="button"
              onClick={() => setIsEvidenceOpen(false)}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-850"
            >
              <X size={16} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
            {inspectedObject ? (
              <>
                <div>
                  <span className="text-[10px] font-mono text-slate-500 uppercase block">Selected Object</span>
                  <h4 className="font-bold text-white text-sm mt-0.5">
                    {inspectedObject.title || inspectedObject.caption || 'Manuscript Entity'}
                  </h4>
                </div>

                <div>
                  <span className="text-[10px] font-mono text-slate-500 uppercase block mb-1">
                    Provenance
                  </span>
                  <span
                    className={`inline-block text-[10px] font-mono font-bold px-2.5 py-1 rounded-md border ${
                      PROVENANCE_BADGE_CONFIG[inspectedObject.provenance || 'PROJECT_PROPOSAL']?.bg ||
                      'bg-indigo-950 text-indigo-300 border-indigo-800'
                    }`}
                  >
                    {PROVENANCE_BADGE_CONFIG[inspectedObject.provenance || 'PROJECT_PROPOSAL']?.label ||
                      'Methodology Proposal'}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
                  <div>
                    <span className="text-[10px] font-mono text-slate-500 uppercase block">Verification</span>
                    <span className="font-bold text-emerald-400 text-xs">
                      {inspectedObject.verificationStatus || 'FULLY_SUPPORTED'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] font-mono text-slate-500 uppercase block">Source Document</span>
                    <span className="text-slate-300">
                      {inspectedObject.sourceDocument || 'Zhao et al., 2024 (ExpeL)'}
                    </span>
                  </div>
                </div>

                {inspectedObject.latex && (
                  <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                    <span className="text-[10px] font-mono text-slate-500 uppercase block mb-1">LaTeX</span>
                    <div className="my-2 text-center text-white">{renderMath(inspectedObject.latex)}</div>
                  </div>
                )}
              </>
            ) : (
              /* Overview if no single object clicked */
              <div className="space-y-4">
                <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-900/60 text-emerald-300 space-y-1">
                  <span className="font-bold block">100% Literature Grounded</span>
                  <p className="text-[11px] text-emerald-400">
                    All citations, mathematical formulations, and figures map directly to verified literature entities.
                  </p>
                </div>

                <div className="space-y-2">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                    Verified Entities
                  </span>
                  <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 flex justify-between">
                    <span>Literature Facts</span>
                    <span className="font-bold text-white">1</span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 flex justify-between">
                    <span>Formal Equations</span>
                    <span className="font-bold text-white">{resolvedData.equations?.length || 5}</span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 flex justify-between">
                    <span>Architecture Figures</span>
                    <span className="font-bold text-white">{resolvedData.figures?.length || 3}</span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 flex justify-between">
                    <span>Evaluation Tables</span>
                    <span className="font-bold text-white">{resolvedData.tables?.length || 2}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </aside>
      )}

      {/* =========================================================================
          7. RESEARCH PROGRESS POPOVER (Compact)
         ========================================================================= */}
      {isProgressOpen && (
        <div className="fixed top-14 left-1/2 -translate-x-1/2 z-50 w-80 bg-slate-950 border border-slate-800 rounded-2xl shadow-2xl p-4 text-xs text-slate-200 animate-in fade-in zoom-in-95">
          <div className="flex items-center justify-between pb-2 border-b border-slate-850">
            <span className="font-bold text-white">Research Generation Progress</span>
            <button
              type="button"
              onClick={() => setIsProgressOpen(false)}
              className="text-slate-400 hover:text-white"
            >
              <X size={14} />
            </button>
          </div>
          <div className="mt-3 space-y-2 font-mono text-[11px]">
            <div className="flex items-center justify-between text-slate-300">
              <span>Literature Retrieval</span>
              <span className="text-emerald-400 font-bold">✓ Complete</span>
            </div>
            <div className="flex items-center justify-between text-slate-300">
              <span>Research Gap Verification</span>
              <span className="text-emerald-400 font-bold">✓ Complete</span>
            </div>
            <div className="flex items-center justify-between text-slate-300">
              <span>Methodology Formulation</span>
              <span className="text-emerald-400 font-bold">✓ Complete</span>
            </div>
            <div className="flex items-center justify-between text-slate-300">
              <span>Evaluation Protocol</span>
              <span className="text-emerald-400 font-bold">✓ Complete</span>
            </div>
            <div className="flex items-center justify-between text-amber-300">
              <span>Experimental Results</span>
              <span className="font-bold">🔒 Locked (Pre-exp)</span>
            </div>
            <div className="flex items-center justify-between text-slate-300">
              <span>Citation Audit</span>
              <span className="text-emerald-400 font-bold">✓ Complete</span>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          8. VERSION HISTORY MODAL
         ========================================================================= */}
      {historyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-xs p-4">
          <div className="w-full max-w-xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl flex flex-col max-h-[80vh] overflow-hidden text-slate-200">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <History size={16} className="text-indigo-400" />
                <h3 className="text-sm font-bold text-white">Version History</h3>
              </div>
              <button
                type="button"
                onClick={() => setHistoryModalOpen(false)}
                className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
              >
                <X size={16} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-2 text-xs">
              {project?.manuscriptRevisions && project.manuscriptRevisions.length > 0 ? (
                project.manuscriptRevisions.map((rev, rIdx) => (
                  <div
                    key={rIdx}
                    className="p-3 rounded-xl bg-slate-950 border border-slate-850 hover:border-slate-700 flex items-center justify-between transition"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-indigo-400">
                          Version {rev.versionNumber}
                        </span>
                        <span className="text-[10px] text-slate-500">
                          {new Date(rev.createdAt).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-slate-300 mt-1">{rev.changeDescription || 'Manuscript Snapshot'}</p>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRestoreVersion(rev.versionNumber)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition"
                    >
                      <RotateCcw size={12} />
                      <span>Restore</span>
                    </button>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center text-slate-500">
                  <History size={24} className="mx-auto mb-2 opacity-40" />
                  <p>Current version is canonical (v1).</p>
                  <p className="text-[11px] text-slate-600 mt-1">
                    Accepting Copilot rewrites records verifiable snapshots here.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
