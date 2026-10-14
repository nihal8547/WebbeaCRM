import { useQuery } from '@tanstack/react-query';
import api from '../lib/api';
import { Users, ClipboardList, TrendingUp, MessageSquare, Briefcase, AlertTriangle } from 'lucide-react';

const statusColor: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  in_progress: 'bg-blue-100 text-blue-800',
  completed: 'bg-green-100 text-green-800',
  new: 'bg-purple-100 text-purple-800',
  cancelled: 'bg-red-100 text-red-800',
};

export default function Dashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => api.get('/dashboard/stats').then((r) => r.data),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  const stats = data?.stats || {};

  const statCards = [
    { label: 'Active Clients', value: stats.totalClients, icon: Users, color: 'bg-blue-500', bg: 'bg-blue-50' },
    { label: 'Pending Tasks', value: stats.pendingTasks, icon: ClipboardList, color: 'bg-orange-500', bg: 'bg-orange-50' },
    { label: 'New Enquiries', value: stats.newEnquiries, icon: MessageSquare, color: 'bg-purple-500', bg: 'bg-purple-50' },
    { label: 'Active Works', value: stats.activeClientWorks, icon: Briefcase, color: 'bg-green-500', bg: 'bg-green-50' },
    { label: 'Total Revenue', value: `₹${(stats.totalRevenue || 0).toLocaleString()}`, icon: TrendingUp, color: 'bg-emerald-500', bg: 'bg-emerald-50' },
    { label: 'Pending Payments', value: `₹${(stats.pendingPayments || 0).toLocaleString()}`, icon: AlertTriangle, color: 'bg-red-500', bg: 'bg-red-50' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 text-sm mt-1">Overview of your business operations</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        {statCards.map((s) => (
          <div key={s.label} className="card p-4">
            <div className={`w-10 h-10 ${s.bg} rounded-lg flex items-center justify-center mb-3`}>
              <s.icon size={20} className={s.color.replace('bg-', 'text-')} />
            </div>
            <p className="text-2xl font-bold text-gray-900">{s.value}</p>
            <p className="text-xs text-gray-500 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Tasks */}
        <div className="card">
          <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <ClipboardList size={18} className="text-blue-500" /> Recent Tasks
          </h2>
          <div className="space-y-3">
            {data?.recentTasks?.length === 0 && <p className="text-gray-400 text-sm">No tasks yet</p>}
            {data?.recentTasks?.map((t: any) => (
              <div key={t.id} className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{t.title}</p>
                  <p className="text-xs text-gray-400">{t.assignedTo?.name || 'Unassigned'}</p>
                </div>
                <span className={`badge ${statusColor[t.status] || 'bg-gray-100 text-gray-600'} flex-shrink-0`}>
                  {t.status}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Enquiries */}
        <div className="card">
          <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <MessageSquare size={18} className="text-purple-500" /> Recent Enquiries
          </h2>
          <div className="space-y-3">
            {data?.recentEnquiries?.length === 0 && <p className="text-gray-400 text-sm">No enquiries yet</p>}
            {data?.recentEnquiries?.map((e: any) => (
              <div key={e.id} className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{e.name}</p>
                  <p className="text-xs text-gray-400 truncate">{e.subject}</p>
                </div>
                <span className={`badge ${statusColor[e.status] || 'bg-gray-100 text-gray-600'} flex-shrink-0`}>
                  {e.status}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Overdue Works */}
        <div className="card">
          <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <AlertTriangle size={18} className="text-red-500" /> Overdue Works
          </h2>
          <div className="space-y-3">
            {data?.overdueWorks?.length === 0 && (
              <p className="text-gray-400 text-sm">No overdue works</p>
            )}
            {data?.overdueWorks?.map((w: any) => (
              <div key={w.id} className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{w.title}</p>
                  <p className="text-xs text-gray-400 truncate">{w.client?.name}</p>
                </div>
                <span className="badge bg-red-100 text-red-700 flex-shrink-0">overdue</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
