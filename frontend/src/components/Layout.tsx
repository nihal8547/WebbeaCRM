import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  LayoutDashboard, Briefcase, FileText, CreditCard,
  ClipboardList, MessageSquare, BarChart2, Settings, LogOut,
  ChevronDown, Menu, X, FolderKanban, Building2
} from 'lucide-react';

const menuItems = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard, permission: 'dashboard:view' },
  { path: '/clients', label: 'Clients', icon: Building2, permission: 'clients:view' },
  { path: '/client-works', label: 'Client Works', icon: Briefcase, permission: 'client-works:view' },
  { path: '/enquiries', label: 'Enquiries', icon: MessageSquare, permission: 'enquiries:view' },
  {
    label: 'Tasks', icon: ClipboardList, permission: 'tasks:view',
    children: [
      { path: '/tasks', label: 'All Tasks' },
      { path: '/task-groups', label: 'Task Groups' },
    ]
  },
  { path: '/quotations', label: 'Quotations', icon: FileText, permission: 'quotations:view' },
  { path: '/payments', label: 'Payments', icon: CreditCard, permission: 'payments:view' },
  { path: '/reports', label: 'Work Reports', icon: BarChart2, permission: 'reports:view' },
  {
    label: 'Admin', icon: Settings, permission: 'users:view',
    children: [
      { path: '/users', label: 'Users' },
      { path: '/roles', label: 'Roles & Permissions' },
    ]
  },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout, can } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [expandedMenus, setExpandedMenus] = useState<string[]>(['Tasks', 'Admin']);

  const toggleMenu = (label: string) => {
    setExpandedMenus((prev) => prev.includes(label) ? prev.filter((m) => m !== label) : [...prev, label]);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* Sidebar */}
      <aside
        className="flex flex-col transition-all duration-300"
        style={{
          width: sidebarOpen ? 240 : 0,
          minWidth: sidebarOpen ? 240 : 0,
          background: '#1e293b',
          overflow: 'hidden',
        }}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-5 py-5 border-b border-white/10">
          <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
            <FolderKanban size={18} color="white" />
          </div>
          <span className="text-white font-bold text-lg whitespace-nowrap">WebbeaCRM</span>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          {menuItems.map((item) => {
            if (!can(item.permission)) return null;

            if (item.children) {
              const expanded = expandedMenus.includes(item.label);
              return (
                <div key={item.label}>
                  <button
                    onClick={() => toggleMenu(item.label)}
                    className="sidebar-link w-full justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <item.icon size={18} />
                      <span className="whitespace-nowrap">{item.label}</span>
                    </div>
                    <ChevronDown size={14} className={`transition-transform ${expanded ? 'rotate-180' : ''}`} />
                  </button>
                  {expanded && (
                    <div className="ml-4 mt-1 space-y-1 pl-4 border-l border-white/10">
                      {item.children.map((child) => (
                        <Link
                          key={child.path}
                          to={child.path}
                          className={`sidebar-link text-xs ${isActive(child.path) ? 'active' : ''}`}
                        >
                          {child.label}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              );
            }

            return (
              <Link
                key={item.path}
                to={item.path!}
                className={`sidebar-link ${isActive(item.path!) ? 'active' : ''}`}
              >
                <item.icon size={18} />
                <span className="whitespace-nowrap">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* User */}
        <div className="p-3 border-t border-white/10">
          <div className="flex items-center gap-3 px-2 py-2">
            <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
              {user?.name[0].toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-medium truncate">{user?.name}</p>
              <p className="text-slate-400 text-xs capitalize">{user?.role}</p>
            </div>
            <button onClick={handleLogout} className="text-slate-400 hover:text-white">
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center gap-4 flex-shrink-0">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="text-gray-500 hover:text-gray-700"
          >
            {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
          <div className="flex-1" />
          <div className="text-sm text-gray-600">
            Welcome, <span className="font-semibold text-gray-800">{user?.name}</span>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
