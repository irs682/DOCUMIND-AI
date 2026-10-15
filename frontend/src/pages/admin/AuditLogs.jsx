const logs = [
  { id: 'AL-001', event: 'User login', actor: 'alice@example.com', time: '2 minutes ago' },
  { id: 'AL-002', event: 'Document uploaded', actor: 'bob@example.com', time: '12 minutes ago' },
  { id: 'AL-003', event: 'Permission changed', actor: 'admin@example.com', time: '1 hour ago' },
];

const AuditLogs = () => {
  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm font-semibold uppercase text-indigo-600 dark:text-indigo-400">Audit logs</p>
        <h1 className="mt-3 text-3xl font-bold text-slate-900 dark:text-white">Security events</h1>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Review the latest audit events for compliance and governance.</p>
      </div>

      <div className="overflow-hidden rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
        <table className="w-full text-left text-sm text-slate-700 dark:text-slate-300">
          <thead className="bg-slate-50 dark:bg-slate-850 text-slate-500 dark:text-slate-400 border-b border-slate-200/80 dark:border-slate-800">
            <tr>
              <th className="px-6 py-4">Event</th>
              <th className="px-6 py-4">Actor</th>
              <th className="px-6 py-4">Time</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {logs.map((log) => (
              <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                <td className="px-6 py-4 font-medium text-slate-900 dark:text-white">{log.event}</td>
                <td className="px-6 py-4">{log.actor}</td>
                <td className="px-6 py-4 text-slate-500 dark:text-slate-400">{log.time}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AuditLogs;
