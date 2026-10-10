import React from 'react';
import { FolderOpen } from 'lucide-react';
import Button from './Button';

const EmptyState = ({
  title = 'No items found',
  description = 'Get started by creating a new item or uploading documents.',
  icon: Icon = FolderOpen,
  actionLabel,
  onAction,
  className = '',
}) => {
  return (
    <div className={`flex flex-col items-center justify-center p-12 text-center rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/50 ${className}`}>
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 mb-4 shadow-xs">
        <Icon size={32} />
      </div>
      <h3 className="text-base font-bold text-slate-900">{title}</h3>
      <p className="mt-1.5 max-w-sm text-sm text-slate-500">{description}</p>
      {actionLabel && onAction && (
        <div className="mt-6">
          <Button onClick={onAction}>{actionLabel}</Button>
        </div>
      )}
    </div>
  );
};

export default EmptyState;
