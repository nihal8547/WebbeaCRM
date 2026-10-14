import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { FolderKanban, BarChart3, Users, FileText, Shield } from 'lucide-react';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/');
    } catch {
      setError('Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left side – branding panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-blue-900 via-blue-800 to-indigo-900 flex-col justify-between p-12 relative overflow-hidden">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -left-40 w-96 h-96 bg-blue-600/30 rounded-full blur-3xl" />
          <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-indigo-700/30 rounded-full blur-3xl" />
        </div>

        <div className="relative flex items-center gap-3">
          <div className="w-12 h-12 bg-white/15 backdrop-blur-sm rounded-2xl flex items-center justify-center border border-white/20">
            <FolderKanban size={26} color="white" />
          </div>
          <div>
            <span className="text-white text-xl font-bold block">WebbeaCRM</span>
            <span className="text-blue-300 text-xs">Business Management System</span>
          </div>
        </div>

        <div className="relative space-y-8">
          <div>
            <h2 className="text-4xl font-bold text-white leading-tight">
              Manage your business<br />with confidence
            </h2>
            <p className="text-blue-200 mt-4 text-lg leading-relaxed">
              Complete CRM for clients, tasks, payments, and your entire team.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {[
              { icon: Users, label: 'Client Management', desc: 'Track all your clients' },
              { icon: BarChart3, label: 'Dashboard Analytics', desc: 'Real-time insights' },
              { icon: FileText, label: 'Quotations & Payments', desc: 'Billing made easy' },
              { icon: Shield, label: 'Role-Based Access', desc: 'Secure permissions' },
            ].map(({ icon: Icon, label, desc }) => (
              <div key={label} className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/10">
                <Icon size={18} className="text-blue-300 mb-2" />
                <p className="text-white text-sm font-medium leading-tight">{label}</p>
                <p className="text-blue-300 text-xs mt-0.5">{desc}</p>
              </div>
            ))}
          </div>
        </div>

        <p className="relative text-blue-400 text-xs">© 2024 WebbeaCRM. All rights reserved.</p>
      </div>

      {/* Right side – login form */}
      <div className="flex-1 flex items-center justify-center bg-slate-50 p-8">
        <div className="w-full max-w-md">
          {/* Mobile brand header */}
          <div className="flex items-center gap-3 mb-8 lg:hidden">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
              <FolderKanban size={22} color="white" />
            </div>
            <div>
              <p className="text-xl font-bold text-gray-900">WebbeaCRM</p>
              <p className="text-xs text-gray-500">Business Management System</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-1">Welcome back</h2>
            <p className="text-gray-500 text-sm mb-8">Sign in to your account to continue</p>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6 text-sm flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-red-200 text-red-700 text-xs flex items-center justify-center font-bold flex-shrink-0">!</span>
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="form-label">Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="form-input"
                  placeholder="your@email.com"
                  required
                />
              </div>
              <div>
                <label className="form-label">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="form-input"
                  placeholder="••••••••"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white py-3 px-4 rounded-xl text-sm font-semibold transition-all duration-200 flex items-center justify-center gap-2 mt-2"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Signing in...
                  </>
                ) : 'Sign In →'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
