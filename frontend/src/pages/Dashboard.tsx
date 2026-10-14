import { useQuery } from '@tanstack/react-query';
import api from '../lib/api';
import { Users, ClipboardList, TrendingUp, MessageSquare, Briefcase, AlertTriangle } from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';

const statusColor: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  in_progress: 'bg-blue-100 text-blue-800',
  completed: 'bg-green-100 text-green-800',
  new: 'bg-purple-100 text-purple-800',
  cancelled: 'bg-red-100 text-red-800',
};

const PIE_COLORS = ['#6366f1', '#3b82f6', '#10b981', '#f59e0b', '#ef4444'];

export default function Dashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => api.get('/dashboard/stats').then((r) => r.data),
  });

  const { data: revenueChart } = useQuery({
    queryKey: ['chart-revenue'],
    queryFn: () => api.get('/dashboard/charts/revenue').then((r) => r.data),
  });

  const { data: tasksChart } = useQuery({
    queryKey: ['chart-tasks'],
    queryFn: () => api.get('/dashboard/charts/tasks').then((r) => r.data),
  });

  const { data: enquiriesChart } = useQuery({
    queryKey: ['chart-enquiries'],
    queryFn: () => api.get('/dashboard/charts/enquiries').then((r) => r.data),
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

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue Chart */}
        <div className="card lg:col-span-2">
          <h2 className="font-semibold text-gray-800 mb-4">Monthly Revenue (₹)</h2>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={revenueChart || []} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <defs>
                <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(v: any) => [`₹${Number(v).toLocaleString()}`, 'Revenue']} />
              <Area type="monotone" dataKey="revenue" stroke="#3b82f6" fill="url(#revGrad)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Task Status Pie */}
        <div className="card">
          <h2 className="font-semibold text-gray-800 mb-4">Task Status</h2>
          {tasksChart && tasksChart.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={tasksChart} dataKey="count" nameKey="status" cx="50%" cy="50%" outerRadius={70} label={({ status, percent }) => `${status} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                  {tasksChart.map((_: any, i: number) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: any, n: any) => [v, n]} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[220px] flex items-center justify-center text-gray-400 text-sm">No task data</div>
          )}
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Enquiry Status Bar */}
        <div className="card">
          <h2 className="font-semibold text-gray-800 mb-4">Enquiry Pipeline</h2>
          {enquiriesChart && enquiriesChart.length > 0 ? (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={enquiriesChart} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="status" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="count" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[180px] flex items-center justify-center text-gray-400 text-sm">No enquiry data</div>
          )}
        </div>

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
      </div>
    </div>
  );
}
