import React, { useState, useRef, useEffect } from 'react';
import {
  Bell,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Sparkles,
  BookOpen,
  Check,
  X,
} from 'lucide-react';

const initialNotifications = [
  {
    id: 'n1',
    category: 'Research',
    title: 'Quality Audit Complete',
    message: '19-dimensional scientific validation scored 72% on pre-experimental draft.',
    time: '10m ago',
    read: false,
    type: 'success',
  },
  {
    id: 'n2',
    category: 'Research',
    title: 'Research Gap Verification',
    message: '3 evidence-grounded research gaps synthesized from ingested papers.',
    time: '1h ago',
    read: false,
    type: 'info',
  },
  {
    id: 'n3',
    category: 'Documents',
    title: 'Paper Ingestion Ready',
    message: 'Document parsing and OCR completed for benchmark papers.',
    time: '2h ago',
    read: true,
    type: 'info',
  },
  {
    id: 'n4',
    category: 'System',
    title: 'Storage Optimization',
    message: 'Vector index synced and memory cache refreshed.',
    time: 'Yesterday',
    read: true,
    type: 'system',
  },
];

const NotificationCenter = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  const [notifications, setNotifications] = useState(initialNotifications);
  const panelRef = useRef(null);

  const unreadCount = notifications.filter((n) => !n.read).length;

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const markAsRead = (id) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const filteredNotifications = notifications.filter((n) => {
    if (activeTab === 'all') return true;
    return n.category.toLowerCase() === activeTab.toLowerCase();
  });

  return (
    <div className="relative" ref={panelRef}>
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        title="Notifications"
        aria-label="View notifications"
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-600" />
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl z-50 overflow-hidden animate-scale-in">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Notifications
              </span>
              {unreadCount > 0 && (
                <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400">
                  {unreadCount} new
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
              >
                <Check size={12} /> Mark all read
              </button>
            )}
          </div>

          {/* Filter Tabs */}
          <div className="flex px-3 pt-2 gap-1 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50">
            {['all', 'research', 'documents', 'system'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-2.5 py-1 text-[11px] font-medium rounded-lg capitalize transition-colors ${
                  activeTab === tab
                    ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-xs font-semibold'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* List */}
          <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60">
            {filteredNotifications.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">
                No notifications in this category.
              </div>
            ) : (
              filteredNotifications.map((n) => (
                <div
                  key={n.id}
                  onClick={() => markAsRead(n.id)}
                  className={`p-3.5 flex items-start gap-3 transition-colors cursor-pointer ${
                    n.read
                      ? 'bg-transparent hover:bg-slate-50/60 dark:hover:bg-slate-800/40'
                      : 'bg-indigo-50/30 dark:bg-indigo-950/20 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/40'
                  }`}
                >
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 bg-slate-100 dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 mt-0.5">
                    {n.category === 'Research' && <Sparkles size={14} />}
                    {n.category === 'Documents' && <FileText size={14} />}
                    {n.category === 'System' && <CheckCircle2 size={14} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                        {n.title}
                      </p>
                      <span className="text-[10px] text-slate-400 shrink-0">{n.time}</span>
                    </div>
                    <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5 line-clamp-2">
                      {n.message}
                    </p>
                  </div>
                  {!n.read && (
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 dark:bg-indigo-400 shrink-0 mt-2" />
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationCenter;
