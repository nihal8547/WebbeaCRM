import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import ErrorBoundary from './components/ErrorBoundary';
import Layout from './components/Layout';
import MobileBlocker from './components/MobileBlocker';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Clients from './pages/Clients';
import ClientWorks from './pages/ClientWorks';
import Enquiries from './pages/Enquiries';
import Tasks from './pages/Tasks';
import TaskGroups from './pages/TaskGroups';
import Quotations from './pages/Quotations';
import Payments from './pages/Payments';
import Reports from './pages/Reports';
import Works from './pages/Works';
import Users from './pages/Users';
import Roles from './pages/Roles';
import Profile from './pages/Profile';
import Products from './pages/Products';
import Calendar from './pages/Calendar';
import Attendance from './pages/Attendance';
import ActivityLog from './pages/ActivityLog';
import Credentials from './pages/Credentials';
import SocialMediaCalendar from './pages/SocialMediaCalendar';

const qc = new QueryClient({ defaultOptions: { queries: { retry: 1, staleTime: 30000 } } });

function PrivateRoute({ children, permission }: { children: React.ReactNode; permission?: string }) {
  const { user, loading, can } = useAuth();
  if (loading) return (
    <div className="flex items-center justify-center h-screen">
      <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full"></div>
    </div>
  );
  if (!user) return <Navigate to="/login" />;
  if (permission && !can(permission)) {
    return (
      <Layout>
        <div className="card p-12 text-center max-w-lg mx-auto mt-12">
          <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4 font-bold text-xl">
            !
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-500 text-sm">
            You do not have permission to view this page. Please contact your administrator if you need access.
          </p>
        </div>
      </Layout>
    );
  }
  return <Layout>{children}</Layout>;
}

function AppRoutes() {
  const { user } = useAuth();
  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" /> : <Login />} />
      <Route path="/" element={<PrivateRoute permission="dashboard:view"><Dashboard /></PrivateRoute>} />
      <Route path="/clients" element={<PrivateRoute permission="clients:view"><Clients /></PrivateRoute>} />
      <Route path="/client-works" element={<PrivateRoute permission="client-works:view"><ClientWorks /></PrivateRoute>} />
      <Route path="/enquiries" element={<PrivateRoute permission="enquiries:view"><Enquiries /></PrivateRoute>} />
      <Route path="/tasks" element={<PrivateRoute permission="tasks:view"><Tasks /></PrivateRoute>} />
      <Route path="/task-groups" element={<PrivateRoute permission="task-groups:view"><TaskGroups /></PrivateRoute>} />
      <Route path="/quotations" element={<PrivateRoute permission="quotations:view"><Quotations /></PrivateRoute>} />
      <Route path="/payments" element={<PrivateRoute permission="payments:view"><Payments /></PrivateRoute>} />
      <Route path="/reports" element={<PrivateRoute permission="reports:view"><Reports /></PrivateRoute>} />
      <Route path="/works" element={<PrivateRoute permission="works:view"><Works /></PrivateRoute>} />
      <Route path="/users" element={<PrivateRoute permission="users:view"><Users /></PrivateRoute>} />
      <Route path="/roles" element={<PrivateRoute permission="roles:view"><Roles /></PrivateRoute>} />
      <Route path="/profile" element={<PrivateRoute><Profile /></PrivateRoute>} />
      <Route path="/products" element={<PrivateRoute permission="products:view"><Products /></PrivateRoute>} />
      <Route path="/calendar" element={<PrivateRoute permission="calendar:view"><Calendar /></PrivateRoute>} />
      <Route path="/social-media-calendar" element={<PrivateRoute permission="clients:view"><SocialMediaCalendar /></PrivateRoute>} />
      <Route path="/attendance" element={<PrivateRoute permission="attendance:view"><Attendance /></PrivateRoute>} />
      <Route path="/activity-log" element={<PrivateRoute permission="activity-logs:view"><ActivityLog /></PrivateRoute>} />
      <Route path="/credentials" element={<PrivateRoute permission="clients:view"><Credentials /></PrivateRoute>} />
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={qc}>
        <BrowserRouter>
          <MobileBlocker>
            <AuthProvider>
              <AppRoutes />
              <Toaster
                position="top-right"
                toastOptions={{
                  duration: 3000,
                  style: { fontSize: '14px', maxWidth: '380px' },
                  success: { iconTheme: { primary: '#16a34a', secondary: '#fff' } },
                  error: { iconTheme: { primary: '#dc2626', secondary: '#fff' } },
                }}
              />
            </AuthProvider>
          </MobileBlocker>
        </BrowserRouter>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
