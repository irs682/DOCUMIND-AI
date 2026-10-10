import React, { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Sparkles,
  FileText,
  Database,
  MessageSquare,
  Search,
  GitCompare,
  Settings,
  ChevronLeft,
  ChevronRight,
  Shield,
  BookOpen,
  Bot,
  Activity,
} from 'lucide-react';
import { useAuthContext } from '../../context/AuthContext';
import { researchApi } from '../../services/researchApi';
import { fetchDocuments } from '../../api/documentsApi';

const Sidebar = ({ isCollapsed, onToggleCollapse, mobileOpen, onCloseMobile }) => {
  const { user } = useAuthContext();
  const location = useLocation();
  const [projectCount, setProjectCount] = useState(0);
  const [documentCount, setDocumentCount] = useState(0);

  // Fetch real counts for badge counters
  useEffect(() => {
    let isMounted = true;
    const fetchCounts = async () => {
      try {
        const [projRes, docs] = await Promise.allSettled([
          researchApi.getProjects(),
          fetchDocuments(),
        ]);
        if (isMounted) {
          if (projRes.status === 'fulfilled' && projRes.value?.data?.projects) {
            setProjectCount(projRes.value.data.projects.length);
          }
          if (docs.status === 'fulfilled' && Array.isArray(docs.value)) {
            setDocumentCount(docs.value.length);
          }
        }
      } catch (err) {
        console.warn('Could not fetch sidebar counts:', err);
      }
    };
    fetchCounts();
    return () => {
      isMounted = false;
    };
  }, [location.pathname]);

  const navGroups = [
    {
      groupTitle: 'Workspace',
      items: [
        {
          to: '/dashboard',
          label: 'Dashboard',
          icon: LayoutDashboard,
        },
        {
          to: '/research',
          label: 'Research Projects',
          icon: Sparkles,
          badge: projectCount > 0 ? projectCount : null,
          badgeColor: 'bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300',
        },
        {
          to: '/documents',
          label: 'Documents',
          icon: FileText,
          badge: documentCount > 0 ? documentCount : null,
          badgeColor: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300',
        },
        {
          to: '/knowledge-bases',
          label: 'Knowledge Bases',
          icon: Database,
        },
      ],
    },
    {
      groupTitle: 'Intelligence',
      items: [
        {
          to: '/chat',
          label: 'AI Chat',
          icon: MessageSquare,
        },
        {
          to: '/search',
          label: 'Semantic Search',
          icon: Search,
        },
        {
          to: '/compare',
          label: 'Paper Comparison',
          icon: GitCompare,
        },
        {
          to: '/agents',
          label: 'Research Agents',
          icon: Bot,
        },
      ],
    },
    {
      groupTitle: 'System',
      items: [
        {
          to: '/analytics',
          label: 'Analytics',
          icon: Activity,
        },
        {
          to: '/settings',
          label: 'Settings',
          icon: Settings,
        },
        ...(user?.role === 'admin'
          ? [
              {
                to: '/admin',
                label: 'Admin Console',
                icon: Shield,
                badge: 'Admin',
                badgeColor: 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300',
              },
            ]
          : []),
      ],
    },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-xs md:hidden"
          onClick={onCloseMobile}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-40 flex flex-col border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 transition-all duration-200 ease-in-out ${
          isCollapsed ? 'w-20' : 'w-64'
        } ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        {/* Brand Logo Header */}
        <div className="flex h-16 items-center justify-between px-4 border-b border-slate-200 dark:border-slate-800">
          <NavLink
            to="/dashboard"
            onClick={onCloseMobile}
            className="flex items-center gap-3 overflow-hidden"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-500 text-white font-bold text-lg shadow-xs">
              <Sparkles size={20} />
            </div>
            {!isCollapsed && (
              <div className="flex flex-col animate-fade-in truncate">
                <span className="text-sm font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
                  DOCUMIND<span className="text-indigo-600 dark:text-indigo-400">-AI</span>
                </span>
                <span className="text-[10px] text-slate-400 font-medium tracking-wide">
                  Research Intelligence
                </span>
              </div>
            )}
          </NavLink>
        </div>

        {/* Navigation Link Groups */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
          {navGroups.map((group, groupIdx) => (
            <div key={groupIdx} className="space-y-1">
              {!isCollapsed && (
                <div className="px-3 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  {group.groupTitle}
                </div>
              )}
              {group.items.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname.startsWith(item.to);

                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    onClick={onCloseMobile}
                    title={isCollapsed ? item.label : undefined}
                    className={`group relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                      isActive
                        ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-bold'
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100/70 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-slate-200'
                    }`}
                  >
                    {/* Active Indicator Bar */}
                    {isActive && (
                      <span className="absolute left-0 top-1.5 bottom-1.5 w-1 rounded-r-full bg-indigo-600 dark:bg-indigo-400" />
                    )}

                    <Icon
                      size={18}
                      className={`shrink-0 transition-transform ${
                        isActive
                          ? 'text-indigo-600 dark:text-indigo-400'
                          : 'text-slate-400 dark:text-slate-500 group-hover:scale-105 group-hover:text-slate-700 dark:group-hover:text-slate-300'
                      }`}
                    />

                    {!isCollapsed && (
                      <span className="flex-1 truncate animate-fade-in">{item.label}</span>
                    )}

                    {!isCollapsed && item.badge && (
                      <span
                        className={`px-1.5 py-0.5 rounded-md text-[10px] font-bold shrink-0 ${
                          item.badgeColor || 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </NavLink>
                );
              })}
            </div>
          ))}
        </div>

        {/* Collapse Toggle Footer */}
        <div className="p-3 border-t border-slate-200 dark:border-slate-800 hidden md:block">
          <button
            type="button"
            onClick={onToggleCollapse}
            className="w-full flex items-center justify-center gap-2 p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-xs font-medium"
            title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {isCollapsed ? (
              <ChevronRight size={18} />
            ) : (
              <>
                <ChevronLeft size={18} />
                <span className="text-[11px]">Collapse sidebar</span>
              </>
            )}
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
