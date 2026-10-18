import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import {
  Clock,
  Calendar,
  Users,
  CheckCircle,
  XCircle,
  Download,
  Search,
  LogIn,
  LogOut,
  UserCheck,
  Smartphone,
  ShieldOff,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react';
import toast from 'react-hot-toast';

function isMobileBrowser(): boolean {
  return /android|iphone|ipad|ipod|mobile|blackberry|windows phone/i.test(navigator.userAgent);
}

interface UserItem {
  id: number;
  name: string;
  email: string;
  role?: { name: string };
}

interface Attendance {
  id: number;
  userId: number;
  date: string;
  checkIn: string;
  checkOut?: string | null;
  totalHours?: number | null;
  status: string;
  notes?: string | null;
  user?: {
    id: number;
    name: string;
    email: string;
    role?: { id: number; name: string };
  };
}

export default function Attendance() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const role = user?.role?.toLowerCase();
  const isAdmin = role === 'admin' || role === 'manager';
  const isMobile = useMemo(() => isMobileBrowser(), []);

  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  const [filterDate, setFilterDate] = useState<string>(todayStr);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Fetch app settings
  const { data: settings = {} } = useQuery<Record<string, string>>({
    queryKey: ['settings'],
    queryFn: () => api.get('/settings').then((r) => r.data),
  });
  const blockMobileCheckin = settings['blockMobileCheckin'] === 'true';

  // Toggle setting mutation (admin only)
  const toggleMobileSetting = useMutation({
    mutationFn: (value: boolean) => api.put('/settings/blockMobileCheckin', { value: String(value) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['settings'] }); toast.success('Setting updated'); },
    onError: () => toast.error('Failed to update setting'),
  });

  // Fetch users list for admin filter dropdown
  const { data: users = [] } = useQuery<UserItem[]>({
    queryKey: ['users-list'],
    queryFn: () => api.get('/users').then((r) => r.data),
    enabled: isAdmin,
  });

  // Fetch attendance list based on date and user filter
  const { data: attendance = [], isLoading } = useQuery<Attendance[]>({
    queryKey: ['attendance', filterDate, selectedUserId],
    queryFn: () => {
      const params = new URLSearchParams();
      if (filterDate) params.append('date', filterDate);
      if (selectedUserId) params.append('userId', selectedUserId);
      return api.get(`/attendance?${params.toString()}`).then((r) => r.data);
    },
  });

  // Admin summary
  const { data: summary } = useQuery({
    queryKey: ['attendance-summary'],
    queryFn: () => api.get('/attendance/summary').then((r) => r.data),
    enabled: isAdmin,
  });

  // Today's record for current user
  const { data: todayRecord } = useQuery<Attendance | null>({
    queryKey: ['attendance-today'],
    queryFn: () => api.get('/attendance/today').then((r) => r.data),
  });

  // Check in mutation
  const checkInMutation = useMutation({
    mutationFn: () => api.post('/attendance/checkin', {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['attendance'] });
      qc.invalidateQueries({ queryKey: ['attendance-today'] });
      qc.invalidateQueries({ queryKey: ['attendance-summary'] });
      toast.success('Successfully checked in!');
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Check-in failed');
    },
  });

  // Check out mutation
  const checkOutMutation = useMutation({
    mutationFn: () => api.put('/attendance/checkout', {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['attendance'] });
      qc.invalidateQueries({ queryKey: ['attendance-today'] });
      qc.invalidateQueries({ queryKey: ['attendance-summary'] });
      toast.success('Successfully checked out!');
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Check-out failed');
    },
  });

  // Filter records by search & status in memory
  const filteredAttendance = useMemo(() => {
    return attendance.filter((a) => {
      if (statusFilter !== 'all' && a.status.toLowerCase() !== statusFilter.toLowerCase()) {
        return false;
      }
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const userName = a.user?.name?.toLowerCase() || '';
        const userEmail = a.user?.email?.toLowerCase() || '';
        const notes = a.notes?.toLowerCase() || '';
        if (!userName.includes(query) && !userEmail.includes(query) && !notes.includes(query)) {
          return false;
        }
      }
      return true;
    });
  }, [attendance, statusFilter, searchTerm]);

  // Statistics
  const totalEmployees = summary?.totalUsers || users.length || 0;
  const presentCount = attendance.filter((a) => a.status === 'present').length;
  const absentCount = totalEmployees > presentCount ? totalEmployees - presentCount : 0;
  const workingCount = attendance.filter((a) => a.checkIn && !a.checkOut).length;

  const exportCSV = () => {
    const headers = isAdmin
      ? ['Employee Name', 'Employee Email', 'Role', 'Date', 'Check In', 'Check Out', 'Total Hours', 'Status', 'Notes']
      : ['Date', 'Check In', 'Check Out', 'Total Hours', 'Status', 'Notes'];

    const rows = filteredAttendance.map((a) => {
      const checkInStr = a.checkIn ? new Date(a.checkIn).toLocaleTimeString() : '';
      const checkOutStr = a.checkOut ? new Date(a.checkOut).toLocaleTimeString() : '';
      const hoursStr = a.totalHours != null ? a.totalHours.toFixed(2) : '';
      const dateStr = a.date ? new Date(a.date).toLocaleDateString() : '';

      if (isAdmin) {
        return [
          `"${a.user?.name || ''}"`,
          `"${a.user?.email || ''}"`,
          `"${a.user?.role?.name || ''}"`,
          `"${dateStr}"`,
          `"${checkInStr}"`,
          `"${checkOutStr}"`,
          `"${hoursStr}"`,
          `"${a.status}"`,
          `"${a.notes || ''}"`,
        ];
      }
      return [
        `"${dateStr}"`,
        `"${checkInStr}"`,
        `"${checkOutStr}"`,
        `"${hoursStr}"`,
        `"${a.status}"`,
        `"${a.notes || ''}"`,
      ];
    });

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `attendance_${filterDate || 'all'}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Attendance</h1>
          <p className="text-gray-500 text-sm">
            {isAdmin
              ? 'View and monitor attendance records for all employees'
              : 'Your daily check-in and attendance history'}
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap justify-end">
          {/* Admin toggle: block mobile check-in */}
          {isAdmin && (
            <button
              onClick={() => toggleMobileSetting.mutate(!blockMobileCheckin)}
              disabled={toggleMobileSetting.isPending}
              title={blockMobileCheckin ? 'Mobile check-in is BLOCKED — click to allow' : 'Mobile check-in is ALLOWED — click to block'}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                blockMobileCheckin
                  ? 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100'
                  : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
              }`}
            >
              <Smartphone size={14} />
              {blockMobileCheckin ? 'Mobile: Blocked' : 'Mobile: Allowed'}
              {blockMobileCheckin ? <ToggleRight size={14} /> : <ToggleLeft size={14} />}
            </button>
          )}

          {/* Quick Check-in / Check-out button for today */}
          {blockMobileCheckin && isMobile ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-red-100 text-red-700">
              <ShieldOff size={14} /> Desktop Only
            </span>
          ) : !todayRecord ? (
            <button
              onClick={() => checkInMutation.mutate()}
              disabled={checkInMutation.isPending}
              className="btn-primary bg-emerald-600 hover:bg-emerald-700 flex items-center gap-2"
            >
              <LogIn size={16} />
              {checkInMutation.isPending ? 'Checking In...' : 'Check In Today'}
            </button>
          ) : !todayRecord.checkOut ? (
            <button
              onClick={() => checkOutMutation.mutate()}
              disabled={checkOutMutation.isPending}
              className="btn-primary bg-amber-600 hover:bg-amber-700 flex items-center gap-2"
            >
              <LogOut size={16} />
              {checkOutMutation.isPending ? 'Checking Out...' : 'Check Out Today'}
            </button>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-100 text-emerald-800">
              <UserCheck size={14} /> Completed Today ({todayRecord.totalHours?.toFixed(1) || '0'}h)
            </span>
          )}

          <button onClick={exportCSV} className="btn-secondary flex items-center gap-2">
            <Download size={15} /> Export CSV
          </button>
        </div>
      </div>

      {/* Mobile blocked warning banner */}
      {blockMobileCheckin && isMobile && (
        <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
          <Smartphone size={18} className="text-red-500 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-red-700">Mobile Check-In Disabled</p>
            <p className="text-xs text-red-500 mt-0.5">Your admin has restricted attendance marking to desktop computers only. Please use a desktop browser to check in.</p>
          </div>
        </div>
      )}

      {/* Admin KPI summary cards */}
      {isAdmin && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="card flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center shrink-0">
              <Users size={22} className="text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{totalEmployees}</p>
              <p className="text-sm text-gray-500">Total Employees</p>
            </div>
          </div>
          <div className="card flex items-center gap-4">
            <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center shrink-0">
              <CheckCircle size={22} className="text-emerald-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-emerald-700">{presentCount}</p>
              <p className="text-sm text-gray-500">Present {filterDate === todayStr ? 'Today' : ''}</p>
            </div>
          </div>
          <div className="card flex items-center gap-4">
            <div className="w-12 h-12 bg-rose-100 rounded-xl flex items-center justify-center shrink-0">
              <XCircle size={22} className="text-rose-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-rose-700">{absentCount}</p>
              <p className="text-sm text-gray-500">Absent {filterDate === todayStr ? 'Today' : ''}</p>
            </div>
          </div>
          <div className="card flex items-center gap-4">
            <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center shrink-0">
              <Clock size={22} className="text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-amber-700">{workingCount}</p>
              <p className="text-sm text-gray-500">Currently Working</p>
            </div>
          </div>
        </div>
      )}

      {/* Filter and Control Bar */}
      <div className="card p-4 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          {/* Date Picker */}
          <div className="flex items-center gap-2">
            <Calendar size={18} className="text-gray-400 shrink-0" />
            <input
              type="date"
              className="form-input text-sm w-full"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
            />
            <button
              onClick={() => setFilterDate(todayStr)}
              className={`px-2.5 py-1 text-xs font-medium rounded border ${
                filterDate === todayStr
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
              title="Filter Today"
            >
              Today
            </button>
            <button
              onClick={() => setFilterDate('')}
              className={`px-2.5 py-1 text-xs font-medium rounded border ${
                !filterDate
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
              title="Show All Dates"
            >
              All
            </button>
          </div>

          {/* User selector for Admin */}
          {isAdmin ? (
            <div className="flex items-center gap-2">
              <Users size={18} className="text-gray-400 shrink-0" />
              <select
                className="form-input text-sm w-full"
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
              >
                <option value="">All Employees (Everyone)</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.role?.name || u.email})
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div />
          )}

          {/* Status Filter */}
          <div>
            <select
              className="form-input text-sm w-full"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">All Statuses</option>
              <option value="present">Present</option>
              <option value="absent">Absent</option>
            </select>
          </div>

          {/* Search by employee name / email */}
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search employee / notes..."
              className="form-input text-sm pl-9 w-full"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="flex items-center justify-between text-xs text-gray-500 pt-1 border-t border-gray-100">
          <span>
            Showing <strong className="text-gray-800">{filteredAttendance.length}</strong> record
            {filteredAttendance.length !== 1 ? 's' : ''}
            {filterDate ? ` for ${filterDate}` : ' across all dates'}
            {selectedUserId && ` (filtered by employee)`}
          </span>
          {(filterDate !== todayStr || selectedUserId || searchTerm || statusFilter !== 'all') && (
            <button
              onClick={() => {
                setFilterDate(todayStr);
                setSelectedUserId('');
                setSearchTerm('');
                setStatusFilter('all');
              }}
              className="text-blue-600 hover:underline font-medium"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Attendance Records Table */}
      <div className="card p-0 overflow-hidden shadow-sm">
        {isLoading ? (
          <div className="p-12 text-center text-gray-400">Loading attendance records...</div>
        ) : filteredAttendance.length === 0 ? (
          <div className="p-12 text-center text-gray-400">
            <Clock size={36} className="mx-auto mb-2 text-gray-300" />
            <p className="text-base font-medium text-gray-600">No attendance records found</p>
            <p className="text-sm text-gray-400 mt-1">
              {filterDate
                ? `No check-ins recorded for ${filterDate}`
                : 'No attendance records match your current filters.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50/80 border-b border-gray-200">
                  {isAdmin && <th className="table-header">Employee</th>}
                  <th className="table-header">Date</th>
                  <th className="table-header">Check In</th>
                  <th className="table-header">Check Out</th>
                  <th className="table-header">Total Hours</th>
                  <th className="table-header">Status</th>
                  <th className="table-header">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredAttendance.map((a) => {
                  const initials = a.user?.name
                    ? a.user.name
                        .split(' ')
                        .map((n) => n[0])
                        .slice(0, 2)
                        .join('')
                        .toUpperCase()
                    : 'U';

                  return (
                    <tr key={a.id} className="hover:bg-gray-50/80 transition-colors">
                      {isAdmin && (
                        <td className="table-cell">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-semibold flex items-center justify-center text-xs shrink-0">
                              {initials}
                            </div>
                            <div>
                              <div className="font-semibold text-gray-900 text-sm">
                                {a.user?.name || 'Unknown Employee'}
                              </div>
                              <div className="text-xs text-gray-500">{a.user?.email}</div>
                            </div>
                          </div>
                        </td>
                      )}
                      <td className="table-cell text-sm text-gray-700 whitespace-nowrap">
                        {new Date(a.date).toLocaleDateString(undefined, {
                          weekday: 'short',
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </td>
                      <td className="table-cell whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-100">
                          <Clock size={12} className="text-emerald-500" />
                          {new Date(a.checkIn).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </div>
                      </td>
                      <td className="table-cell whitespace-nowrap">
                        {a.checkOut ? (
                          <div className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-700 bg-gray-100 px-2.5 py-1 rounded-md">
                            <Clock size={12} className="text-gray-500" />
                            {new Date(a.checkOut).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-blue-100 text-blue-800 animate-pulse">
                            Working
                          </span>
                        )}
                      </td>
                      <td className="table-cell text-sm font-medium text-gray-800 whitespace-nowrap">
                        {a.totalHours != null ? `${a.totalHours.toFixed(2)}h` : '—'}
                      </td>
                      <td className="table-cell whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${
                            a.status === 'present'
                              ? 'bg-emerald-100 text-emerald-800'
                              : a.status === 'absent'
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          {a.status}
                        </span>
                      </td>
                      <td className="table-cell text-xs text-gray-500 max-w-xs truncate">
                        {a.notes || '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
