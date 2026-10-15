import { Link } from 'react-router-dom';

const adminDocs = [
  { id: 'D-101', title: 'Security policy', owner: 'Alice', status: 'Approved' },
  { id: 'D-102', title: 'Quarterly report', owner: 'Bob', status: 'Processing' },
  { id: 'D-103', title: 'Training manual', owner: 'Claire', status: 'Needs review' },
];

const Documents = () => {
  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase text-indigo-600 dark:text-indigo-400">Administration</p>
          <h1 className="mt-3 text-3xl font-bold text-slate-900 dark:text-white">Managed documents</h1>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Review document submissions and processing status for your organization.</p>
        </div>
        <button className="rounded-full bg-indigo-600 px-5 py-3 text-sm font-semibold text-white hover:bg-indigo-700 transition">
          Upload document
        </button>
      </div>

      <div className="overflow-hidden rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
        <table className="w-full text-left text-sm text-slate-700 dark:text-slate-300">
          <thead className="bg-slate-50 dark:bg-slate-850 text-slate-500 dark:text-slate-400 border-b border-slate-200/80 dark:border-slate-800">
            <tr>
              <th className="px-6 py-4">Document</th>
              <th className="px-6 py-4">Owner</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {adminDocs.map((doc) => (
              <tr key={doc.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                <td className="px-6 py-4 font-medium text-slate-900 dark:text-white">{doc.title}</td>
                <td className="px-6 py-4">{doc.owner}</td>
                <td className="px-6 py-4">{doc.status}</td>
                <td className="px-6 py-4">
                  <Link to="/admin/documents" className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 font-medium">
                    Review
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Documents;
