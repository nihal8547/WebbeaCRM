import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '../lib/api';
import {
  Plus, Edit, Trash2, Search, Calendar, ListTodo, Loader, CheckCircle,
  AlertCircle, Paperclip, Upload, X, Check
} from 'lucide-react';
import SlidePanel from '../components/SlidePanel';
import FileAttachments from '../components/FileAttachments';

interface TaskFile {
  id: number;
  entityId: number;
  fileName: string;
  originalName: string;
  fileSize?: number;
  mimeType?: string;
  createdAt: string;
}

interface Task {
  id: number;
  title: string;
  description?: string;
  type: string;
  status: string;
  priority: string;
  groupId?: number;
  assignedToId?: number;
  startDate?: string;
  dueDate?: string;
  completedAt?: string;
  createdAt?: string;
  assignedTo?: { id: number; name: string };
  createdBy?: { id: number; name: string };
  group?: { id: number; name: string };
  files?: TaskFile[];
}

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  in_progress: 'bg-blue-100 text-blue-800',
  completed: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
};

const priorityOrder: Record<string, number> = { urgent: 0, high: 1, medium: 2, low: 3 };

function formatFileSize(bytes?: number) {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function Tasks() {
  const qc = useQueryClient();
  const completionFileInputRef = useRef<HTMLInputElement | null>(null);

  // Filters & State
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [sortBy, setSortBy] = useState('createdAt_desc');
  const [panel, setPanel] = useState(false);
  const [editing, setEditing] = useState<Task | null>(null);
  const [form, setForm] = useState<any>({ title: '', type: 'daily', status: 'pending', priority: 'medium' });

  // Completion Modal State
  const [completingTask, setCompletingTask] = useState<Task | null>(null);
  const [completionFile, setCompletionFile] = useState<File | null>(null);
  const [completionNotes, setCompletionNotes] = useState('');
  const [isSubmittingCompletion, setIsSubmittingCompletion] = useState(false);

  // View Files Modal State
  const [viewingFilesTask, setViewingFilesTask] = useState<Task | null>(null);

  // File upload state in SlidePanel
  const [panelFile, setPanelFile] = useState<File | null>(null);

  const { data: tasks = [], isLoading } = useQuery<Task[]>({
    queryKey: ['tasks'],
    queryFn: () => api.get('/tasks').then((r) => r.data),
  });

  const { data: users = [] } = useQuery<any[]>({
    queryKey: ['users'],
    queryFn: () => api.get('/users').then((r) => r.data),
  });

  const { data: groups = [] } = useQuery<any[]>({
    queryKey: ['task-groups'],
    queryFn: () => api.get('/task-groups').then((r) => r.data),
  });

  const save = useMutation({
    mutationFn: async (data: any) => {
      const res = editing ? await api.put(`/tasks/${editing.id}`, data) : await api.post('/tasks', data);
      const savedTask = res.data;

      // If user selected an optional file in SlidePanel
      if (panelFile && savedTask?.id) {
        const fd = new FormData();
        fd.append('file', panelFile);
        fd.append('module', 'tasks');
        fd.append('entityId', String(savedTask.id));
        await api.post('/files/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      }

      return savedTask;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tasks'] });
      toast.success(editing ? 'Task updated' : 'Task created');
      setPanelFile(null);
      closePanel();
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed to save task'),
  });

  const del = useMutation({
    mutationFn: (id: number) => api.delete(`/tasks/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tasks'] });
      toast.success('Task deleted');
    },
    onError: () => toast.error('Failed to delete task'),
  });

  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) => api.put(`/tasks/${id}`, { status }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tasks'] });
      toast.success('Status updated');
    },
  });

  // Handle Complete with Optional File
  const handleCompleteWithFile = async () => {
    if (!completingTask) return;
    setIsSubmittingCompletion(true);
    try {
      // 1. Upload optional file if selected
      if (completionFile) {
        const fd = new FormData();
        fd.append('file', completionFile);
        fd.append('module', 'tasks');
        fd.append('entityId', String(completingTask.id));
        await api.post('/files/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      }

      // 2. Update task status to completed (and append notes if provided)
      const payload: any = { status: 'completed' };
      if (completionNotes.trim()) {
        const existingDesc = completingTask.description || '';
        payload.description = existingDesc
          ? `${existingDesc}\n\n[Completion Remark]: ${completionNotes.trim()}`
          : `[Completion Remark]: ${completionNotes.trim()}`;
      }

      await api.put(`/tasks/${completingTask.id}`, payload);
      qc.invalidateQueries({ queryKey: ['tasks'] });

      toast.success(
        completionFile
          ? 'Task marked as completed with attachment!'
          : 'Task marked as completed!'
      );
      closeCompleteModal();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to complete task');
    } finally {
      setIsSubmittingCompletion(false);
    }
  };

  const closeCompleteModal = () => {
    setCompletingTask(null);
    setCompletionFile(null);
    setCompletionNotes('');
    if (completionFileInputRef.current) completionFileInputRef.current.value = '';
  };

  const openAdd = () => {
    setEditing(null);
    setPanelFile(null);
    setForm({ title: '', type: 'daily', status: 'pending', priority: 'medium' });
    setPanel(true);
  };

  const openEdit = (t: Task) => {
    setEditing(t);
    setPanelFile(null);
    setForm({
      ...t,
      groupId: t.groupId || '',
      assignedToId: t.assignedToId || '',
      startDate: t.startDate?.split('T')[0] || '',
      dueDate: t.dueDate?.split('T')[0] || '',
    });
    setPanel(true);
  };

  const closePanel = () => {
    setPanel(false);
    setEditing(null);
    setPanelFile(null);
  };

  const isOverdue = (t: Task) => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'completed';

  const pendingCount = tasks.filter((t) => t.status === 'pending').length;
  const inProgressCount = tasks.filter((t) => t.status === 'in_progress').length;
  const completedCount = tasks.filter((t) => t.status === 'completed').length;
  const overdueCount = tasks.filter((t) => isOverdue(t)).length;

  const filtered = tasks
    .filter((t) => {
      const matchSearch = t.title.toLowerCase().includes(search.toLowerCase());
      const matchType = !filterType || t.type === filterType;
      const matchStatus = !filterStatus || t.status === filterStatus;
      return matchSearch && matchType && matchStatus;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'priority': return (priorityOrder[a.priority] ?? 9) - (priorityOrder[b.priority] ?? 9);
        case 'dueDate_asc': return (a.dueDate || '9999').localeCompare(b.dueDate || '9999');
        case 'dueDate_desc': return (b.dueDate || '').localeCompare(a.dueDate || '');
        case 'title_asc': return a.title.localeCompare(b.title);
        case 'createdAt_asc': return (a.createdAt || '').localeCompare(b.createdAt || '');
        default: return (b.createdAt || '').localeCompare(a.createdAt || '');
      }
    });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tasks</h1>
          <p className="text-gray-500 text-sm">{tasks.length} total tasks</p>
        </div>
        <button onClick={openAdd} className="btn-primary flex items-center gap-2">
          <Plus size={16} /> Add Task
        </button>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div
          className="card flex items-center gap-4 cursor-pointer hover:border-yellow-200"
          onClick={() => setFilterStatus(filterStatus === 'pending' ? '' : 'pending')}
        >
          <div className="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center">
            <ListTodo size={22} className="text-yellow-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">{pendingCount}</p>
            <p className="text-sm text-gray-500">Pending</p>
          </div>
        </div>
        <div
          className="card flex items-center gap-4 cursor-pointer hover:border-blue-200"
          onClick={() => setFilterStatus(filterStatus === 'in_progress' ? '' : 'in_progress')}
        >
          <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
            <Loader size={22} className="text-blue-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">{inProgressCount}</p>
            <p className="text-sm text-gray-500">In Progress</p>
          </div>
        </div>
        <div
          className="card flex items-center gap-4 cursor-pointer hover:border-green-200"
          onClick={() => setFilterStatus(filterStatus === 'completed' ? '' : 'completed')}
        >
          <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
            <CheckCircle size={22} className="text-green-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">{completedCount}</p>
            <p className="text-sm text-gray-500">Completed</p>
          </div>
        </div>
        <div className="card flex items-center gap-4">
          <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
            <AlertCircle size={22} className="text-red-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">{overdueCount}</p>
            <p className="text-sm text-gray-500">Overdue</p>
          </div>
        </div>
      </div>

      <div className="card p-4 flex flex-row items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            className="form-input pl-9"
            placeholder="Search tasks..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select className="form-input w-36" value={filterType} onChange={(e) => setFilterType(e.target.value)}>
          <option value="">All Types</option>
          <option value="daily">Daily</option>
          <option value="monthly">Monthly</option>
          <option value="weekly">Weekly</option>
          <option value="one_time">One Time</option>
        </select>
        <select className="form-input w-40" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
          <option value="">All Status</option>
          <option value="pending">Pending</option>
          <option value="in_progress">In Progress</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>
        <select className="form-input w-44" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
          <option value="createdAt_desc">Newest First</option>
          <option value="createdAt_asc">Oldest First</option>
          <option value="dueDate_asc">Due Date (Soonest)</option>
          <option value="dueDate_desc">Due Date (Latest)</option>
          <option value="priority">By Priority</option>
          <option value="title_asc">Title A–Z</option>
        </select>
      </div>

      <div className="card p-0 overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-gray-400">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-gray-400">No tasks found</div>
        ) : (
          <table className="w-full">
            <thead>
              <tr>
                <th className="table-header">Task</th>
                <th className="table-header">Type</th>
                <th className="table-header">Assigned To</th>
                <th className="table-header">Due Date</th>
                <th className="table-header">Status</th>
                <th className="table-header">Files</th>
                <th className="table-header">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((t) => (
                <tr key={t.id} className="hover:bg-gray-50">
                  <td className="table-cell">
                    <div>
                      <p className="font-medium text-gray-900">{t.title}</p>
                      {t.description && (
                        <p className="text-xs text-gray-400 truncate max-w-48">{t.description}</p>
                      )}
                      {t.group && (
                        <span className="text-xs bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded">
                          Group: {t.group.name}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="table-cell">
                    <span className="badge bg-indigo-100 text-indigo-700 capitalize">
                      {t.type.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="table-cell text-gray-600">{t.assignedTo?.name || '-'}</td>
                  <td className="table-cell">
                    {t.dueDate ? (
                      <div className={`flex items-center gap-1 text-sm ${isOverdue(t) ? 'text-red-600' : 'text-gray-600'}`}>
                        <Calendar size={12} />
                        {new Date(t.dueDate).toLocaleDateString()}
                        {isOverdue(t) && <span className="badge bg-red-100 text-red-700 ml-1">Late</span>}
                      </div>
                    ) : (
                      '-'
                    )}
                  </td>
                  <td className="table-cell">
                    <select
                      className={`text-xs px-2.5 py-1 rounded-full border-0 font-medium cursor-pointer ${
                        statusColors[t.status] || 'bg-gray-100'
                      }`}
                      value={t.status}
                      onChange={(e) => {
                        const newStatus = e.target.value;
                        if (newStatus === 'completed') {
                          // Prompt for optional file upload upon completion!
                          setCompletingTask(t);
                        } else {
                          updateStatus.mutate({ id: t.id, status: newStatus });
                        }
                      }}
                    >
                      <option value="pending">Pending</option>
                      <option value="in_progress">In Progress</option>
                      <option value="completed">Completed</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </td>

                  {/* Files Attachment Column */}
                  <td className="table-cell">
                    {t.files && t.files.length > 0 ? (
                      <button
                        onClick={() => setViewingFilesTask(t)}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded-lg border border-blue-200 transition-colors"
                        title="View attached files"
                      >
                        <Paperclip size={12} />
                        <span>{t.files.length}</span>
                      </button>
                    ) : (
                      <span className="text-gray-300 text-xs">-</span>
                    )}
                  </td>

                  <td className="table-cell">
                    <div className="flex items-center gap-2">
                      {/* Quick Complete Button with optional file upload */}
                      {t.status !== 'completed' && (
                        <button
                          onClick={() => setCompletingTask(t)}
                          className="text-emerald-600 hover:text-emerald-800 p-1 hover:bg-emerald-50 rounded transition-colors"
                          title="Complete Task (optional file attachment)"
                        >
                          <CheckCircle size={16} />
                        </button>
                      )}
                      <button
                        onClick={() => openEdit(t)}
                        className="text-blue-600 hover:text-blue-800 p-1 hover:bg-blue-50 rounded transition-colors"
                        title="Edit Task"
                      >
                        <Edit size={15} />
                      </button>
                      <button
                        onClick={() => del.mutate(t.id)}
                        className="text-red-500 hover:text-red-700 p-1 hover:bg-red-50 rounded transition-colors"
                        title="Delete Task"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* ============================================================== */}
      {/* TASK COMPLETION MODAL WITH OPTIONAL FILE UPLOAD */}
      {/* ============================================================== */}
      {completingTask && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-gray-100 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="px-6 py-4 bg-gradient-to-r from-emerald-600 to-teal-600 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
                  <CheckCircle size={20} className="text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-base leading-tight">Complete Task</h3>
                  <p className="text-xs text-white/80">Confirm completion & attach deliverables</p>
                </div>
              </div>
              <button
                onClick={closeCompleteModal}
                className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10"
              >
                <X size={18} />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-4">
              {/* Task Details Banner */}
              <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 text-xs space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-gray-900 text-sm truncate">{completingTask.title}</span>
                  <span className="badge bg-indigo-100 text-indigo-700 capitalize">
                    {completingTask.type.replace('_', ' ')}
                  </span>
                </div>
                {completingTask.assignedTo && (
                  <p className="text-gray-500">Assigned To: <span className="font-medium text-gray-800">{completingTask.assignedTo.name}</span></p>
                )}
                {completingTask.dueDate && (
                  <p className="text-gray-500">Due Date: <span className="font-medium text-gray-800">{new Date(completingTask.dueDate).toLocaleDateString()}</span></p>
                )}
              </div>

              {/* Optional File Upload Box */}
              <div>
                <label className="form-label font-semibold text-gray-800 flex items-center justify-between">
                  <span>Proof of Work / File Attachment <span className="text-gray-400 font-normal">(Optional)</span></span>
                  {completionFile && (
                    <button
                      type="button"
                      onClick={() => {
                        setCompletionFile(null);
                        if (completionFileInputRef.current) completionFileInputRef.current.value = '';
                      }}
                      className="text-xs text-red-500 hover:text-red-700 font-medium"
                    >
                      Clear File
                    </button>
                  )}
                </label>

                <input
                  ref={completionFileInputRef}
                  type="file"
                  onChange={(e) => setCompletionFile(e.target.files?.[0] || null)}
                  className="hidden"
                  id="completion-file-input"
                />

                {!completionFile ? (
                  <label
                    htmlFor="completion-file-input"
                    className="border-2 border-dashed border-gray-300 hover:border-emerald-500 hover:bg-emerald-50/20 rounded-xl p-4 text-center flex flex-col items-center justify-center cursor-pointer transition-colors"
                  >
                    <div className="w-9 h-9 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mb-1.5">
                      <Upload size={16} />
                    </div>
                    <p className="text-xs font-semibold text-gray-800">
                      Click to attach file or deliverable
                    </p>
                    <p className="text-[11px] text-gray-400 mt-0.5">
                      Supports images, PDFs, documents, screenshots, ZIPs (optional)
                    </p>
                  </label>
                ) : (
                  <div className="flex items-center gap-3 p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                    <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0">
                      <Paperclip size={16} />
                    </div>
                    <div className="flex-1 min-w-0 text-xs">
                      <p className="font-bold text-gray-900 truncate">{completionFile.name}</p>
                      <p className="text-[11px] text-emerald-700">
                        {formatFileSize(completionFile.size)} · Ready to upload
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setCompletionFile(null);
                        if (completionFileInputRef.current) completionFileInputRef.current.value = '';
                      }}
                      className="p-1 text-gray-400 hover:text-red-600"
                    >
                      <X size={16} />
                    </button>
                  </div>
                )}
              </div>

              {/* Optional Completion Remarks */}
              <div>
                <label className="form-label font-semibold text-gray-800">
                  Completion Remarks <span className="text-gray-400 font-normal">(Optional)</span>
                </label>
                <textarea
                  rows={3}
                  placeholder="Add any notes, submission remarks, or output links..."
                  value={completionNotes}
                  onChange={(e) => setCompletionNotes(e.target.value)}
                  className="form-input text-xs"
                />
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="px-6 py-3.5 bg-gray-50 border-t border-gray-100 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={closeCompleteModal}
                className="btn-secondary text-xs py-2 px-3.5"
                disabled={isSubmittingCompletion}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCompleteWithFile}
                disabled={isSubmittingCompletion}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs py-2 px-4 rounded-lg flex items-center gap-1.5 shadow-xs transition-colors"
              >
                {isSubmittingCompletion ? (
                  <>
                    <Loader size={14} className="animate-spin" />
                    <span>Completing...</span>
                  </>
                ) : (
                  <>
                    <Check size={14} />
                    <span>{completionFile ? 'Complete & Upload File' : 'Mark as Completed'}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* VIEW ATTACHED FILES MODAL */}
      {/* ============================================================== */}
      {viewingFilesTask && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Paperclip size={18} className="text-blue-400" />
                <div>
                  <h3 className="font-bold text-sm">Attached Deliverables & Files</h3>
                  <p className="text-xs text-slate-400 truncate max-w-xs">{viewingFilesTask.title}</p>
                </div>
              </div>
              <button
                onClick={() => setViewingFilesTask(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6">
              <FileAttachments module="tasks" entityId={viewingFilesTask.id} />
            </div>

            <div className="px-6 py-3 bg-gray-50 border-t border-gray-100 flex justify-end">
              <button
                onClick={() => {
                  setViewingFilesTask(null);
                  qc.invalidateQueries({ queryKey: ['tasks'] });
                }}
                className="btn-primary text-xs"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* SLIDE PANEL FOR ADD / EDIT TASK */}
      {/* ============================================================== */}
      <SlidePanel
        open={panel}
        onClose={closePanel}
        title={editing ? 'Edit Task' : 'Add Task'}
        subtitle={editing ? `Editing: ${editing.title}` : 'Create a new task and assign it'}
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            save.mutate(form);
          }}
          className="p-6 space-y-5"
        >
          <div>
            <label className="form-label">Title *</label>
            <input
              className="form-input"
              placeholder="Task title..."
              value={form.title || ''}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label">Type</label>
              <select
                className="form-input"
                value={form.type || 'daily'}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="one_time">One Time</option>
              </select>
            </div>
            <div>
              <label className="form-label">Priority</label>
              <select
                className="form-input"
                value={form.priority || 'medium'}
                onChange={(e) => setForm({ ...form, priority: e.target.value })}
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
            <div>
              <label className="form-label">Status</label>
              <select
                className="form-input"
                value={form.status || 'pending'}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
              >
                <option value="pending">Pending</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
            <div>
              <label className="form-label">Task Group</label>
              <select
                className="form-input"
                value={form.groupId || ''}
                onChange={(e) => setForm({ ...form, groupId: e.target.value })}
              >
                <option value="">No Group</option>
                {groups.map((g: any) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-span-2">
              <label className="form-label">Assign To</label>
              <select
                className="form-input"
                value={form.assignedToId || ''}
                onChange={(e) => setForm({ ...form, assignedToId: e.target.value })}
              >
                <option value="">Unassigned</option>
                {users.map((u: any) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="form-label">Start Date</label>
              <input
                type="date"
                className="form-input"
                value={form.startDate || ''}
                onChange={(e) => setForm({ ...form, startDate: e.target.value })}
              >
              </input>
            </div>
            <div>
              <label className="form-label">Due Date</label>
              <input
                type="date"
                className="form-input"
                value={form.dueDate || ''}
                onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
              >
              </input>
            </div>
          </div>

          <div>
            <label className="form-label">Description</label>
            <textarea
              className="form-input"
              rows={4}
              placeholder="Task details..."
              value={form.description || ''}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>

          {/* Optional File Attachment when completing in SlidePanel */}
          {form.status === 'completed' && (
            <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-emerald-800 flex items-center gap-1.5">
                  <Paperclip size={13} /> Attach Completion File (Optional)
                </span>
                {panelFile && (
                  <button
                    type="button"
                    onClick={() => setPanelFile(null)}
                    className="text-red-500 hover:text-red-700 text-xs font-medium"
                  >
                    Clear
                  </button>
                )}
              </div>
              <input
                type="file"
                onChange={(e) => setPanelFile(e.target.files?.[0] || null)}
                className="text-xs text-gray-600 file:mr-2 file:py-1 file:px-2.5 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-emerald-600 file:text-white hover:file:bg-emerald-700 cursor-pointer"
              />
              {panelFile && (
                <p className="text-[11px] text-emerald-700">
                  Attached: {panelFile.name} ({formatFileSize(panelFile.size)})
                </p>
              )}
            </div>
          )}

          {/* Existing File Attachments if editing an existing task */}
          {editing && (
            <div className="pt-4 border-t border-gray-100">
              <FileAttachments module="tasks" entityId={editing.id} />
            </div>
          )}

          <div className="flex gap-3 pt-2 border-t border-gray-100">
            <button
              type="submit"
              disabled={save.isPending}
              className="btn-primary flex-1 py-2.5"
            >
              {save.isPending ? 'Saving...' : editing ? 'Update Task' : 'Add Task'}
            </button>
            <button
              type="button"
              onClick={closePanel}
              className="btn-secondary flex-1 py-2.5"
            >
              Cancel
            </button>
          </div>
        </form>
      </SlidePanel>
    </div>
  );
}
