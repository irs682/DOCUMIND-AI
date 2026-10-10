const logs = [
  { id: 'AL-001', event: 'User login', actor: 'alice@example.com', time: '2 minutes ago' },
  { id: 'AL-002', event: 'Document uploaded', actor: 'bob@example.com', time: '12 minutes ago' },
  { id: 'AL-003', event: 'Permission changed', actor: 'admin@example.com', time: '1 hour ago' },
];

const AuditLogs = () => {
  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm font-semibold uppercase text-indigo-600">Audit logs</p>
        <h1 className="mt-3 text-3xl font-bold text-slate-900">Security events</h1>
        <p className="mt-2 text-sm text-slate-500">Review the latest audit events for compliance and governance.</p>
      </div>

      <div className="overflow-hidden rounded-3xl bg-white shadow-sm">
        <table className="w-full text-left text-sm text-slate-700">
          <thead className="bg-slate-50 text-slate-500">
            <tr>
              <th className="px-6 py-4">Event</th>
              <th className="px-6 py-4">Actor</th>
              <th className="px-6 py-4">Time</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {logs.map((log) => (
              <tr key={log.id} className="hover:bg-slate-50">
                <td className="px-6 py-4 font-medium text-slate-900">{log.event}</td>
                <td className="px-6 py-4">{log.actor}</td>
                <td className="px-6 py-4">{log.time}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AuditLogs;
