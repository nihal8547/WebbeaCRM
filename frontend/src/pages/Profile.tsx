import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { User, Lock, Save, Eye, EyeOff, CheckCircle } from 'lucide-react';

export default function Profile() {
  const { user, setUser } = useAuth();
  const qc = useQueryClient();
  const [tab, setTab] = useState<'profile' | 'password'>('profile');
  const [saved, setSaved] = useState(false);
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [profileForm, setProfileForm] = useState({ name: user?.name || '', phone: user?.phone || '', email: user?.email || '' });
  const [pwForm, setPwForm] = useState({ oldPassword: '', newPassword: '', confirmPassword: '' });
  const [pwError, setPwError] = useState('');

  const saveProfile = useMutation({
    mutationFn: (data: any) => api.put(`/users/${user?.id}/profile`, data),
    onSuccess: (res) => {
      if (setUser) setUser({ ...user!, ...res.data });
      qc.invalidateQueries({ queryKey: ['users'] });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    },
  });

  const changePassword = useMutation({
    mutationFn: (data: any) => api.put(`/users/${user?.id}/password`, data),
    onSuccess: () => {
      setPwForm({ oldPassword: '', newPassword: '', confirmPassword: '' });
      setPwError('');
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    },
    onError: (err: any) => setPwError(err?.response?.data?.message || 'Failed to change password'),
  });

  const handlePwSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPwError('');
    if (pwForm.newPassword !== pwForm.confirmPassword) { setPwError('Passwords do not match'); return; }
    if (pwForm.newPassword.length < 6) { setPwError('Password must be at least 6 characters'); return; }
    changePassword.mutate({ oldPassword: pwForm.oldPassword, newPassword: pwForm.newPassword });
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">My Profile</h1>
        <p className="text-gray-500 text-sm">Manage your account settings</p>
      </div>

      {/* Avatar card */}
      <div className="card flex items-center gap-5">
        <div className="w-16 h-16 rounded-2xl bg-blue-600 flex items-center justify-center text-white text-2xl font-bold flex-shrink-0">
          {user?.name?.[0]?.toUpperCase()}
        </div>
        <div>
          <p className="text-lg font-bold text-gray-900">{user?.name}</p>
          <p className="text-sm text-gray-500">{user?.email}</p>
          <span className="badge bg-blue-100 text-blue-700 mt-1 capitalize">{user?.role}</span>
        </div>
        {saved && (
          <div className="ml-auto flex items-center gap-2 text-green-600 text-sm font-medium">
            <CheckCircle size={16} /> Saved!
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200">
        <button
          onClick={() => setTab('profile')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${tab === 'profile' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
        >
          <User size={15} /> Profile Info
        </button>
        <button
          onClick={() => setTab('password')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${tab === 'password' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
        >
          <Lock size={15} /> Change Password
        </button>
      </div>

      {tab === 'profile' && (
        <div className="card">
          <h2 className="text-base font-semibold text-gray-900 mb-5">Personal Information</h2>
          <form onSubmit={(e) => { e.preventDefault(); saveProfile.mutate(profileForm); }} className="space-y-4">
            <div>
              <label className="form-label">Full Name *</label>
              <input className="form-input" value={profileForm.name} onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })} required />
            </div>
            <div>
              <label className="form-label">Email Address</label>
              <input type="email" className="form-input bg-gray-50" value={profileForm.email} readOnly />
              <p className="text-xs text-gray-400 mt-1">Email cannot be changed. Contact admin.</p>
            </div>
            <div>
              <label className="form-label">Phone Number</label>
              <input className="form-input" value={profileForm.phone} onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })} />
            </div>
            <div className="flex gap-3 pt-2">
              <button type="submit" disabled={saveProfile.isPending} className="btn-primary flex items-center gap-2">
                <Save size={15} /> {saveProfile.isPending ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      )}

      {tab === 'password' && (
        <div className="card">
          <h2 className="text-base font-semibold text-gray-900 mb-5">Change Password</h2>
          {pwError && <div className="mb-4 px-4 py-3 bg-red-50 text-red-700 rounded-lg text-sm">{pwError}</div>}
          <form onSubmit={handlePwSubmit} className="space-y-4">
            <div>
              <label className="form-label">Current Password *</label>
              <div className="relative">
                <input type={showOld ? 'text' : 'password'} className="form-input pr-10" value={pwForm.oldPassword} onChange={(e) => setPwForm({ ...pwForm, oldPassword: e.target.value })} required />
                <button type="button" onClick={() => setShowOld(!showOld)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                  {showOld ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>
            <div>
              <label className="form-label">New Password *</label>
              <div className="relative">
                <input type={showNew ? 'text' : 'password'} className="form-input pr-10" value={pwForm.newPassword} onChange={(e) => setPwForm({ ...pwForm, newPassword: e.target.value })} required minLength={6} />
                <button type="button" onClick={() => setShowNew(!showNew)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                  {showNew ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>
            <div>
              <label className="form-label">Confirm New Password *</label>
              <div className="relative">
                <input type={showConfirm ? 'text' : 'password'} className="form-input pr-10" value={pwForm.confirmPassword} onChange={(e) => setPwForm({ ...pwForm, confirmPassword: e.target.value })} required />
                <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                  {showConfirm ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button type="submit" disabled={changePassword.isPending} className="btn-primary flex items-center gap-2">
                <Lock size={15} /> {changePassword.isPending ? 'Changing...' : 'Change Password'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
