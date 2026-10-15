import React from 'react';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';
import Badge from '../common/Badge';

const StatCard = ({ title, value, change, trend = 'up', icon: Icon, subtitle }) => {
  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs transition hover:shadow-md space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">{title}</span>
        {Icon && (
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 font-bold">
            <Icon size={18} />
          </div>
        )}
      </div>

      <div className="flex items-baseline justify-between gap-2">
        <h3 className="text-2xl font-extrabold text-slate-900 dark:text-white">{value}</h3>
        {change && (
          <Badge variant={trend === 'up' ? 'emerald' : 'rose'}>
            {trend === 'up' ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
            <span>{change}</span>
          </Badge>
        )}
      </div>

      {subtitle && <p className="text-xs text-slate-400 dark:text-slate-500 font-medium">{subtitle}</p>}
    </div>
  );
};

export default StatCard;
