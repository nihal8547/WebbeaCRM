import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  LayoutDashboard, Briefcase, FileText, CreditCard,
  ClipboardList, MessageSquare, BarChart2, Settings, LogOut,
  ChevronDown, Menu, X, FolderKanban, Building2, Hammer,
  Package, Calendar, Clock, Search, User, KeyRound
} from 'lucide-react';
import NotificationBell from './NotificationBell';
import GlobalSearch from './GlobalSearch';
import InactivityGuard from './InactivityGuard';

const menuSections = [
  {
    label: 'Main',
    items: [
      { path: '/', label: 'Dashboard', icon: LayoutDashboard, permission: 'dashboard:view' },
    ],
  },
  {
    label: 'CRM',
    items: [
      { path: '/clients', label: 'Clients', icon: Building2, permission: 'clients:view' },
      { path: '/client-works', label: 'Client Works', icon: Briefcase, permission: 'client-works:view' },
      { path: '/credentials', label: 'Credentials', icon: KeyRound, permission: 'clients:view' },
      { path: '/enquiries', label: 'Enquiries', icon: MessageSquare, permission: 'enquiries:view' },
    ],
  },
  {
    label: 'Work',
    items: [
      {
        label: 'Tasks', icon: ClipboardList, permission: 'tasks:view',
        children: [
          { path: '/tasks', label: 'All Tasks', permission: 'tasks:view' },
          { path: '/task-groups', label: 'Groups', permission: 'task-groups:view' },
        ],
      },
      { path: '/works', label: 'My Works', icon: Hammer, permission: 'works:view' },
      { path: '/reports', label: 'Work Reports', icon: BarChart2, permission: 'reports:view' },
    ],
  },
  {
    label: 'Finance',
    items: [
      { path: '/quotations', label: 'Quotations', icon: FileText, permission: 'quotations:view' },
      { path: '/payments', label: 'Payments', icon: CreditCard, permission: 'payments:view' },
      { path: '/products', label: 'Products', icon: Package, permission: 'products:view' },
    ],
  },
  {
    label: 'Tools',
    items: [
      { path: '/calendar', label: 'Calendar', icon: Calendar, permission: 'calendar:view' },
      { path: '/attendance', label: 'Attendance', icon: Clock, permission: 'attendance:view' },
    ],
  },
  {
    label: 'Admin',
    items: [
      {
        label: 'Admin', icon: Settings,
        children: [
          { path: '/users', label: 'Users', permission: 'users:view' },
          { path: '/roles', label: 'Roles & Permissions', permission: 'roles:view' },
          { path: '/activity-log', label: 'Activity Log', permission: 'activity-logs:view' },
        ],
      },
    ],
  },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout, can } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [expandedMenus, setExpandedMenus] = useState<string[]>(['Tasks', 'Admin']);
  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

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
        <nav className="sidebar-nav flex-1 overflow-y-auto py-2 px-2">
          {menuSections.map((section) => {
            const visibleItems = section.items
              .map((item: any) => {
                if (item.children) {
                  const visibleChildren = item.children.filter((child: any) => !child.permission || can(child.permission));
                  if (visibleChildren.length === 0) return null;
                  return { ...item, children: visibleChildren };
                }
                return (!item.permission || can(item.permission)) ? item : null;
              })
              .filter(Boolean) as any[];

            if (visibleItems.length === 0) return null;

            return (
              <div key={section.label}>
                <p className="sidebar-section-label">{section.label}</p>
                <div className="space-y-0.5 mb-1">
                  {visibleItems.map((item: any) => {
                    if (item.children) {
                      const expanded = expandedMenus.includes(item.label);
                      return (
                        <div key={item.label}>
                          <button
                            onClick={() => toggleMenu(item.label)}
                            className="sidebar-link w-full justify-between"
                          >
                            <div className="flex items-center gap-3">
                              <item.icon size={16} className="flex-shrink-0 opacity-75" />
                              <span className="whitespace-nowrap">{item.label}</span>
                            </div>
                            <ChevronDown size={12} className={`opacity-50 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`} />
                          </button>
                          {expanded && (
                            <div className="ml-2 mt-0.5 mb-1 space-y-0.5 pl-5 border-l border-white/10">
                              {item.children.map((child: any) => (
                                <Link
                                  key={child.path}
                                  to={child.path}
                                  className={`sidebar-link py-1.5 text-xs ${isActive(child.path) ? 'active' : ''}`}
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
                        <item.icon size={16} className="flex-shrink-0 opacity-75" />
                        <span className="whitespace-nowrap">{item.label}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </nav>

        {/* User footer */}
        <div className="px-2 py-3 border-t border-white/10 flex-shrink-0">
          <Link
            to="/profile"
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/8 transition-colors group"
          >
            <div className="w-7 h-7 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
              {user?.name[0].toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-xs font-medium truncate leading-tight">{user?.name}</p>
              <p className="text-slate-500 text-[10px] capitalize mt-0.5">{user?.role}</p>
            </div>
          </Link>
          <button
            onClick={handleLogout}
            className="mt-1 w-full flex items-center gap-3 px-3 py-2 rounded-lg text-slate-500 hover:text-red-400 hover:bg-white/5 transition-colors text-xs"
          >
            <LogOut size={14} />
            <span>Sign out</span>
          </button>
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

          {/* Search trigger */}
          <button
            onClick={() => setSearchOpen(true)}
            className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-400 text-sm transition-colors"
          >
            <Search size={14} />
            <span className="hidden sm:inline">Search...</span>
            <kbd className="hidden sm:inline bg-white text-gray-400 text-xs px-1.5 py-0.5 rounded border border-gray-200 ml-2">⌘K</kbd>
          </button>

          <div className="flex-1" />

          <NotificationBell />

          <Link
            to="/profile"
            className={`flex items-center gap-2 p-2 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors ${location.pathname === '/profile' ? 'bg-gray-100 text-gray-700' : ''}`}
          >
            <User size={18} />
          </Link>

          <div className="text-sm text-gray-600 hidden sm:block">
            Welcome, <span className="font-semibold text-gray-800">{user?.name}</span>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>

      {/* Global Search */}
      {searchOpen && <GlobalSearch onClose={() => setSearchOpen(false)} />}

      {/* Inactivity Guard */}
      <InactivityGuard />
    </div>
  );
}
