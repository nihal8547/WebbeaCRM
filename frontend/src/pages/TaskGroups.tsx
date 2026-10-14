import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '../lib/api';
import { Plus, Edit, Trash2, FolderKanban, ChevronDown, ChevronRight } from 'lucide-react';

export default function TaskGroups() {
  const qc = useQueryClient();
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState<any>({ name: '', description: '' });
  const [expanded, setExpanded] = useState<number[]>([]);

  const { data: groups = [], isLoading } = useQuery<any[]>({
    queryKey: ['task-groups'],
    queryFn: () => api.get('/task-groups').then((r) => r.data),
  });

  const save = useMutation({
    mutationFn: (data: any) => editing ? api.put(`/task-groups/${editing.id}`, data) : api.post('/task-groups', data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['task-groups'] }); toast.success(editing ? 'Group updated' : 'Group created'); setModal(false); },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed to save'),
  });

  const del = useMutation({
    mutationFn: (id: number) => api.delete(`/task-groups/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['task-groups'] }); toast.success('Group deleted'); },
    onError: () => toast.error('Failed to delete'),
  });

  const toggleExpand = (id: number) => setExpanded((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);

  const statusColor: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-800',
    in_progress: 'bg-blue-100 text-blue-800',
    completed: 'bg-green-100 text-green-800',
    cancelled: 'bg-red-100 text-red-800',
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Task Groups</h1>
          <p className="text-gray-500 text-sm">Group related tasks together</p>
        </div>
        <button onClick={() => { setEditing(null); setForm({ name: '', description: '' }); setModal(true); }} className="btn-primary flex items-center gap-2">
          <Plus size={16} /> New Group
        </button>
      </div>

      {isLoading && <div className="card p-8 text-center text-gray-400">Loading...</div>}
      {!isLoading && groups.length === 0 && <div className="card p-8 text-center text-gray-400">No task groups yet</div>}

      <div className="space-y-4">
        {groups.map((g) => {
          const isOpen = expanded.includes(g.id);
          const completed = g.tasks.filter((t: any) => t.status === 'completed').length;
          const total = g.tasks.length;
          return (
            <div key={g.id} className="card p-0 overflow-hidden">
              <div
                className="flex items-center gap-3 p-4 cursor-pointer hover:bg-gray-50"
                onClick={() => toggleExpand(g.id)}
              >
                <div className="w-9 h-9 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <FolderKanban size={18} className="text-purple-600" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-gray-900">{g.name}</h3>
                    <span className={`badge ${g.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>{g.status}</span>
                  </div>
                  {g.description && <p className="text-sm text-gray-500">{g.description}</p>}
                  <div className="flex items-center gap-4 mt-1">
                    <span className="text-xs text-gray-400">{total} tasks</span>
                    <span className="text-xs text-green-600">{completed} completed</span>
                    {total > 0 && (
                      <div className="flex items-center gap-1">
                        <div className="w-20 bg-gray-200 rounded-full h-1.5">
                          <div className="bg-green-500 h-1.5 rounded-full" style={{ width: `${(completed / total) * 100}%` }} />
                        </div>
                        <span className="text-xs text-gray-400">{Math.round((completed / total) * 100)}%</span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={(e) => { e.stopPropagation(); setEditing(g); setForm({ name: g.name, description: g.description, status: g.status }); setModal(true); }} className="text-blue-600 hover:text-blue-800 p-1">
                    <Edit size={15} />
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); del.mutate(g.id); }} className="text-red-500 hover:text-red-700 p-1">
                    <Trash2 size={15} />
                  </button>
                  {isOpen ? <ChevronDown size={16} className="text-gray-400" /> : <ChevronRight size={16} className="text-gray-400" />}
                </div>
              </div>

              {isOpen && g.tasks.length > 0 && (
                <div className="border-t border-gray-100">
                  {g.tasks.map((t: any) => (
                    <div key={t.id} className="flex items-center justify-between px-4 py-3 border-b border-gray-50 last:border-0 hover:bg-gray-50">
                      <div className="flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full ${t.status === 'completed' ? 'bg-green-500' : t.status === 'in_progress' ? 'bg-blue-500' : 'bg-yellow-400'}`} />
                        <div>
                          <p className="text-sm font-medium text-gray-800">{t.title}</p>
                          {t.assignedTo && <p className="text-xs text-gray-400">{t.assignedTo.name}</p>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {t.dueDate && <span className="text-xs text-gray-400">{new Date(t.dueDate).toLocaleDateString()}</span>}
                        <span className={`badge ${statusColor[t.status] || 'bg-gray-100 text-gray-600'}`}>{t.status}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {isOpen && g.tasks.length === 0 && (
                <div className="p-4 text-center text-gray-400 text-sm border-t">No tasks in this group</div>
              )}
            </div>
          );
        })}
      </div>

      {modal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md">
            <div className="p-6 border-b">
              <h2 className="text-lg font-semibold">{editing ? 'Edit Group' : 'New Task Group'}</h2>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); save.mutate(form); }} className="p-6 space-y-4">
              <div>
                <label className="form-label">Group Name *</label>
                <input className="form-input" value={form.name || ''} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
              </div>
              <div>
                <label className="form-label">Description</label>
                <textarea className="form-input" rows={3} value={form.description || ''} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </div>
              {editing && (
                <div>
                  <label className="form-label">Status</label>
                  <select className="form-input" value={form.status || 'active'} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                    <option value="active">Active</option>
                    <option value="completed">Completed</option>
                    <option value="archived">Archived</option>
                  </select>
                </div>
              )}
              <div className="flex gap-3">
                <button type="submit" disabled={save.isPending} className="btn-primary flex-1">{save.isPending ? 'Saving...' : 'Save'}</button>
                <button type="button" onClick={() => setModal(false)} className="btn-secondary flex-1">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
