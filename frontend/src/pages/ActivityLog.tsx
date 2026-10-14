import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../lib/api';
import { Activity, Search, Download, Filter } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface Log {
  id: number;
  userId?: number;
  action: string;
  module: string;
  entityId?: number;
  entityName?: string;
  details?: string;
  ipAddress?: string;
  createdAt: string;
  user?: { id: number; name: string };
}

const moduleColors: Record<string, string> = {
  auth: 'bg-blue-100 text-blue-700',
  users: 'bg-indigo-100 text-indigo-700',
  clients: 'bg-emerald-100 text-emerald-700',
  tasks: 'bg-orange-100 text-orange-700',
  enquiries: 'bg-purple-100 text-purple-700',
  payments: 'bg-green-100 text-green-700',
  reports: 'bg-teal-100 text-teal-700',
};

export default function ActivityLog() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [search, setSearch] = useState('');
  const [filterModule, setFilterModule] = useState('');

  const { data: logs = [], isLoading } = useQuery<Log[]>({
    queryKey: ['activity-logs', filterModule],
    queryFn: () => api.get(`/activity-logs${filterModule ? `?module=${filterModule}` : ''}`).then((r) => r.data),
  });

  const modules = [...new Set(logs.map((l) => l.module))].sort();

  const filtered = logs.filter((l) =>
    l.action.toLowerCase().includes(search.toLowerCase()) ||
    (l.entityName || '').toLowerCase().includes(search.toLowerCase()) ||
    (l.user?.name || '').toLowerCase().includes(search.toLowerCase())
  );

  const exportCSV = () => {
    const headers = ['Time', 'User', 'Action', 'Module', 'Entity', 'Details', 'IP'];
    const rows = filtered.map((l) => [
      new Date(l.createdAt).toLocaleString(),
      l.user?.name || 'System',
      l.action,
      l.module,
      l.entityName || '',
      l.details || '',
      l.ipAddress || '',
    ]);
    const csv = [headers, ...rows].map((r) => r.map((v) => `"${v}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `activity_log_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Activity Log</h1>
          <p className="text-gray-500 text-sm">
            {isAdmin ? 'All user activity and audit trail' : 'Your activity history'}
          </p>
        </div>
        <button onClick={exportCSV} className="btn-secondary flex items-center gap-2">
          <Download size={15} /> Export CSV
        </button>
      </div>

      <div className="card p-4 flex flex-row items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input className="form-input pl-9" placeholder="Search activity..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="flex items-center gap-2">
          <Filter size={15} className="text-gray-400" />
          <select className="form-input" style={{ width: 160 }} value={filterModule} onChange={(e) => setFilterModule(e.target.value)}>
            <option value="">All Modules</option>
            {modules.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </div>
        <span className="text-sm text-gray-500">{filtered.length} entries</span>
      </div>

      <div className="card p-0 overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-gray-400">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-gray-400">No activity found.</div>
        ) : (
          <table className="w-full">
            <thead>
              <tr>
                <th className="table-header">Time</th>
                {isAdmin && <th className="table-header">User</th>}
                <th className="table-header">Action</th>
                <th className="table-header">Module</th>
                <th className="table-header">Entity</th>
                <th className="table-header">Details</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((log) => (
                <tr key={log.id} className="hover:bg-gray-50">
                  <td className="table-cell text-xs text-gray-500 whitespace-nowrap">
                    {new Date(log.createdAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                  </td>
                  {isAdmin && (
                    <td className="table-cell">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 text-xs font-bold">
                          {(log.user?.name || 'S')[0].toUpperCase()}
                        </div>
                        <span className="text-sm text-gray-700">{log.user?.name || 'System'}</span>
                      </div>
                    </td>
                  )}
                  <td className="table-cell">
                    <div className="flex items-center gap-2">
                      <Activity size={13} className="text-gray-400" />
                      <span className="text-sm font-medium text-gray-800 capitalize">{log.action.replace(/_/g, ' ')}</span>
                    </div>
                  </td>
                  <td className="table-cell">
                    <span className={`badge capitalize ${moduleColors[log.module] || 'bg-gray-100 text-gray-600'}`}>
                      {log.module}
                    </span>
                  </td>
                  <td className="table-cell text-sm text-gray-600">
                    {log.entityName || (log.entityId ? `#${log.entityId}` : '—')}
                  </td>
                  <td className="table-cell text-xs text-gray-500 max-w-48 truncate">
                    {log.details || '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
