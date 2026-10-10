import React from 'react';

const variantClasses = {
  indigo: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  amber: 'bg-amber-50 text-amber-700 border-amber-200',
  rose: 'bg-rose-50 text-rose-700 border-rose-200',
  purple: 'bg-purple-50 text-purple-700 border-purple-200',
  blue: 'bg-blue-50 text-blue-700 border-blue-200',
  slate: 'bg-slate-100 text-slate-700 border-slate-200',
};

const Badge = ({ children, variant = 'indigo', icon: Icon, className = '' }) => {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${
        variantClasses[variant] || variantClasses.indigo
      } ${className}`}
    >
      {Icon && <Icon size={12} className="shrink-0" />}
      <span>{children}</span>
    </span>
  );
};

export default Badge;
