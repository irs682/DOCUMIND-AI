import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

/**
 * FloatingMenu - Portal-rendered overflow menu that never gets clipped by parent overflow containers.
 */
const FloatingMenu = ({ isOpen, onClose, triggerRect, children, width = 'w-48' }) => {
  const menuRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleClickOutside, true);
    document.addEventListener('touchstart', handleClickOutside, true);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside, true);
      document.removeEventListener('touchstart', handleClickOutside, true);
    };
  }, [isOpen, onClose]);

  if (!isOpen || !triggerRect) return null;

  // Calculate coordinates
  const spaceBelow = window.innerHeight - triggerRect.bottom;
  const menuHeight = 220; // estimated max height
  const showAbove = spaceBelow < menuHeight && triggerRect.top > menuHeight;

  const top = showAbove ? triggerRect.top - 6 : triggerRect.bottom + 6;
  const left = Math.min(
    Math.max(8, triggerRect.right - 192), // align right edge with trigger
    window.innerWidth - 200
  );

  return createPortal(
    <div
      ref={menuRef}
      style={{
        position: 'fixed',
        top: `${top}px`,
        left: `${left}px`,
        transform: showAbove ? 'translateY(-100%)' : 'none',
      }}
      className={`z-50 ${width} rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-1.5 shadow-xl dark:shadow-2xl dark:shadow-slate-950/80 text-xs text-slate-700 dark:text-slate-200 space-y-0.5 animate-in fade-in zoom-in-95 duration-100 select-none`}
      onClick={(e) => e.stopPropagation()}
    >
      {children}
    </div>,
    document.body
  );
};

export default FloatingMenu;
