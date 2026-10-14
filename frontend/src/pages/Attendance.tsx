import { useQuery } from '@tanstack/react-query';
import api from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { Clock, Calendar, Users, CheckCircle, XCircle, Download } from 'lucide-react';
import { useState } from 'react';

interface Attendance {
  id: number;
  userId: number;
  date: string;
  checkIn: string;
  checkOut?: string;
  totalHours?: number;
  status: string;
  notes?: string;
  user?: { id: number; name: string };
}

export default function Attendance() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [filterDate, setFilterDate] = useState(() => new Date().toISOString().split('T')[0]);

  const { data: attendance = [], isLoading } = useQuery<Attendance[]>({
    queryKey: ['attendance', filterDate],
    queryFn: () => api.get(`/attendance?date=${filterDate}`).then((r) => r.data),
  });

  const { data: summary } = useQuery({
    queryKey: ['attendance-summary'],
    queryFn: () => api.get('/attendance/summary').then((r) => r.data),
  });

  const presentCount = attendance.filter((a) => a.status === 'present').length;
  const absentCount = (summary?.totalUsers || 0) - presentCount;

  const exportCSV = () => {
    const headers = isAdmin
      ? ['Employee', 'Date', 'Check In', 'Check Out', 'Total Hours', 'Status']
      : ['Date', 'Check In', 'Check Out', 'Total Hours', 'Status'];

    const rows = attendance.map((a) => {
      const base = [
        new Date(a.checkIn).toLocaleTimeString(),
        a.checkOut ? new Date(a.checkOut).toLocaleTimeString() : '',
        a.totalHours?.toFixed(2) || '',
        a.status,
      ];
      if (isAdmin) return [a.user?.name || '', new Date(a.date).toLocaleDateString(), ...base];
      return [new Date(a.date).toLocaleDateString(), ...base];
    });

    const csv = [headers, ...rows].map((r) => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `attendance_${filterDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Attendance</h1>
          <p className="text-gray-500 text-sm">
            {isAdmin ? 'All employees attendance records' : 'Your attendance records'}
          </p>
        </div>
        <button onClick={exportCSV} className="btn-secondary flex items-center gap-2">
          <Download size={15} /> Export CSV
        </button>
      </div>

      {isAdmin && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="card flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
              <Users size={22} className="text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{summary?.totalUsers || 0}</p>
              <p className="text-sm text-gray-500">Total Employees</p>
            </div>
          </div>
          <div className="card flex items-center gap-4">
            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
              <CheckCircle size={22} className="text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{presentCount}</p>
              <p className="text-sm text-gray-500">Present Today</p>
            </div>
          </div>
          <div className="card flex items-center gap-4">
            <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
              <XCircle size={22} className="text-red-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{absentCount}</p>
              <p className="text-sm text-gray-500">Absent Today</p>
            </div>
          </div>
          <div className="card flex items-center gap-4">
            <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
              <Clock size={22} className="text-orange-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {attendance.filter((a) => a.checkIn && !a.checkOut).length}
              </p>
              <p className="text-sm text-gray-500">Still Working</p>
            </div>
          </div>
        </div>
      )}

      <div className="card p-4 flex items-center gap-3">
        <Calendar size={16} className="text-gray-400" />
        <input
          type="date"
          className="form-input"
          style={{ width: 200 }}
          value={filterDate}
          onChange={(e) => setFilterDate(e.target.value)}
        />
        <span className="text-sm text-gray-500">
          {attendance.length} record{attendance.length !== 1 ? 's' : ''} found
        </span>
      </div>

      <div className="card p-0 overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-gray-400">Loading...</div>
        ) : attendance.length === 0 ? (
          <div className="p-8 text-center text-gray-400">No attendance records for this date.</div>
        ) : (
          <table className="w-full">
            <thead>
              <tr>
                {isAdmin && <th className="table-header">Employee</th>}
                <th className="table-header">Date</th>
                <th className="table-header">Check In</th>
                <th className="table-header">Check Out</th>
                <th className="table-header">Total Hours</th>
                <th className="table-header">Status</th>
              </tr>
            </thead>
            <tbody>
              {attendance.map((a) => (
                <tr key={a.id} className="hover:bg-gray-50">
                  {isAdmin && <td className="table-cell font-medium text-gray-900">{a.user?.name || '-'}</td>}
                  <td className="table-cell text-sm text-gray-600">{new Date(a.date).toLocaleDateString()}</td>
                  <td className="table-cell">
                    <div className="flex items-center gap-1 text-sm text-gray-600">
                      <Clock size={12} className="text-green-500" />
                      {new Date(a.checkIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </td>
                  <td className="table-cell">
                    {a.checkOut ? (
                      <div className="flex items-center gap-1 text-sm text-gray-600">
                        <Clock size={12} className="text-red-400" />
                        {new Date(a.checkOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    ) : (
                      <span className="badge bg-blue-100 text-blue-700">Working</span>
                    )}
                  </td>
                  <td className="table-cell text-sm text-gray-600">
                    {a.totalHours ? `${a.totalHours.toFixed(2)}h` : '—'}
                  </td>
                  <td className="table-cell">
                    <span className={`badge capitalize ${
                      a.status === 'present' ? 'bg-green-100 text-green-700' :
                      a.status === 'absent' ? 'bg-red-100 text-red-700' :
                      'bg-gray-100 text-gray-600'
                    }`}>
                      {a.status}
                    </span>
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
