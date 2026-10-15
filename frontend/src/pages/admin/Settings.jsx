import { useState } from 'react';

const Settings = () => {
  const [auditEnabled, setAuditEnabled] = useState(true);
  const [autoApprove, setAutoApprove] = useState(false);

  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm font-semibold uppercase text-indigo-600 dark:text-indigo-400">Admin settings</p>
        <h1 className="mt-3 text-3xl font-bold text-slate-900 dark:text-white">Platform controls</h1>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Configure security, approval, and monitoring settings for your organization.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Audit logging</h2>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Enable or disable audit logging for admin activity.</p>
          <label className="mt-5 flex items-center gap-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 px-4 py-4 cursor-pointer">
            <input
              type="checkbox"
              checked={auditEnabled}
              onChange={() => setAuditEnabled((value) => !value)}
              className="h-5 w-5 rounded border-slate-300 dark:border-slate-700 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
            />
            <span className="text-sm text-slate-700 dark:text-slate-200 font-medium">Enable audit logs</span>
          </label>
        </div>

        <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Document workflow</h2>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Control whether new documents require manual approval.</p>
          <label className="mt-5 flex items-center gap-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 px-4 py-4 cursor-pointer">
            <input
              type="checkbox"
              checked={autoApprove}
              onChange={() => setAutoApprove((value) => !value)}
              className="h-5 w-5 rounded border-slate-300 dark:border-slate-700 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
            />
            <span className="text-sm text-slate-700 dark:text-slate-200 font-medium">Auto-approve new documents</span>
          </label>
        </div>
      </div>
    </div>
  );
};

export default Settings;
