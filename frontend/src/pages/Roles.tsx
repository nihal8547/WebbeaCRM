import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '../lib/api';
import { Plus, Edit, Shield, Check } from 'lucide-react';

export default function Roles() {
  const qc = useQueryClient();
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState<any>({ name: '', description: '', permissionIds: [] as number[] });

  const { data: roles = [], isLoading } = useQuery<any[]>({
    queryKey: ['roles'],
    queryFn: () => api.get('/roles').then((r) => r.data),
  });

  const { data: permissions = [] } = useQuery<any[]>({
    queryKey: ['permissions'],
    queryFn: () => api.get('/roles/permissions').then((r) => r.data),
  });

  const save = useMutation({
    mutationFn: (data: any) => editing ? api.put(`/roles/${editing.id}`, data) : api.post('/roles', data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['roles'] }); toast.success(editing ? 'Role updated' : 'Role created'); setModal(false); },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed to save role'),
  });

  const openAdd = () => { setEditing(null); setForm({ name: '', description: '', permissionIds: [] }); setModal(true); };
  const openEdit = (r: any) => {
    setEditing(r);
    const ids = r.permissions.map((rp: any) => rp.permission.id);
    setForm({ name: r.name, description: r.description, permissionIds: ids });
    setModal(true);
  };

  const togglePermission = (id: number) => {
    const ids = form.permissionIds as number[];
    setForm({ ...form, permissionIds: ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id] });
  };

  const toggleModule = (modulePerms: any[]) => {
    const ids = form.permissionIds as number[];
    const moduleIds = modulePerms.map((p) => p.id);
    const allSelected = moduleIds.every((id) => ids.includes(id));
    if (allSelected) {
      setForm({ ...form, permissionIds: ids.filter((id) => !moduleIds.includes(id)) });
    } else {
      setForm({ ...form, permissionIds: [...new Set([...ids, ...moduleIds])] });
    }
  };

  const moduleLabels: Record<string, string> = {
    'dashboard': 'Dashboard',
    'clients': 'Clients',
    'client-works': 'Client Works',
    'enquiries': 'Enquiries & Leads',
    'tasks': 'Tasks',
    'task-groups': 'Task Groups',
    'works': 'My Works',
    'reports': 'Work Reports',
    'quotations': 'Quotations',
    'payments': 'Payments',
    'products': 'Products & Services',
    'calendar': 'Calendar',
    'attendance': 'Attendance',
    'activity-logs': 'Activity Logs',
    'notifications': 'Notifications',
    'files': 'File Attachments',
    'users': 'Users',
    'roles': 'Roles & Permissions',
    'social-media': 'Social Media Calendar',
  };

  const grouped = permissions.reduce((acc: any, p: any) => {
    if (!acc[p.module]) acc[p.module] = [];
    acc[p.module].push(p);
    return acc;
  }, {});

  const selectAll = () => {
    setForm({ ...form, permissionIds: permissions.map((p) => p.id) });
  };

  const clearAll = () => {
    setForm({ ...form, permissionIds: [] });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Roles & Permissions</h1>
          <p className="text-gray-500 text-sm">Manage access control across all pages</p>
        </div>
        <button onClick={openAdd} className="btn-primary flex items-center gap-2">
          <Plus size={16} /> New Role
        </button>
      </div>

      {isLoading ? <div className="card p-8 text-center text-gray-400">Loading...</div> : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {roles.map((r) => (
            <div key={r.id} className="card">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                    <Shield size={20} className="text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 capitalize">{r.name}</h3>
                    <p className="text-xs text-gray-500">{r.description}</p>
                  </div>
                </div>
                <button onClick={() => openEdit(r)} className="text-blue-600 hover:text-blue-800 p-1">
                  <Edit size={16} />
                </button>
              </div>
              <div className="space-y-2">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Permissions ({r.permissions.length})</p>
                <div className="flex flex-wrap gap-1.5">
                  {r.permissions.slice(0, 14).map((rp: any) => (
                    <span key={rp.permission.id} className="badge bg-indigo-50 text-indigo-700 text-xs">
                      {moduleLabels[rp.permission.module] || rp.permission.module}:{rp.permission.action}
                    </span>
                  ))}
                  {r.permissions.length > 14 && (
                    <span className="badge bg-gray-100 text-gray-500 text-xs">+{r.permissions.length - 14} more</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {modal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b">
              <h2 className="text-lg font-semibold">{editing ? 'Edit Role' : 'New Role'}</h2>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); save.mutate(form); }} className="p-6 space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="form-label">Role Name *</label>
                  <input className="form-input" value={form.name || ''} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
                </div>
                <div>
                  <label className="form-label">Description</label>
                  <input className="form-input" value={form.description || ''} onChange={(e) => setForm({ ...form, description: e.target.value })} />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-3">
                  <p className="form-label mb-0">Module Permissions ({Object.keys(grouped).length} Pages/Modules)</p>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={selectAll}
                      className="text-xs text-blue-600 hover:text-blue-800 font-medium cursor-pointer"
                    >
                      Select All
                    </button>
                    <span className="text-gray-300">|</span>
                    <button
                      type="button"
                      onClick={clearAll}
                      className="text-xs text-gray-500 hover:text-gray-700 font-medium cursor-pointer"
                    >
                      Clear All
                    </button>
                  </div>
                </div>

                <div className="space-y-4 max-h-80 overflow-y-auto border rounded-lg p-4 bg-gray-50/50">
                  {Object.entries(grouped).map(([module, perms]: [string, any]) => {
                    const allSelected = (perms as any[]).every((p) => (form.permissionIds as number[]).includes(p.id));
                    return (
                      <div key={module} className="bg-white p-3 rounded-lg border border-gray-100 shadow-xs">
                        <div className="flex items-center gap-2 mb-2">
                          <button
                            type="button"
                            onClick={() => toggleModule(perms)}
                            className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 cursor-pointer ${allSelected ? 'bg-blue-600 border-blue-600' : 'border-gray-300 bg-white'}`}
                          >
                            {allSelected && <Check size={12} color="white" strokeWidth={3} />}
                          </button>
                          <span className="text-sm font-semibold text-gray-800">
                            {moduleLabels[module] || module.replace(/-/g, ' ')}
                          </span>
                        </div>
                        <div className="ml-7 flex flex-wrap gap-2">
                          {(perms as any[]).map((p) => {
                            const selected = (form.permissionIds as number[]).includes(p.id);
                            return (
                              <button
                                key={p.id}
                                type="button"
                                onClick={() => togglePermission(p.id)}
                                className={`text-xs px-3 py-1.5 rounded-full border transition-colors cursor-pointer ${selected ? 'bg-blue-600 text-white border-blue-600 font-medium' : 'bg-gray-50 text-gray-600 border-gray-200 hover:border-blue-400'}`}
                              >
                                {p.action}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
                <p className="text-xs text-gray-500 mt-2 font-medium">{(form.permissionIds as number[]).length} of {permissions.length} permissions selected</p>
              </div>

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
