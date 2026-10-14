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

const qc = new QueryClient({ defaultOptions: { queries: { retry: 1, staleTime: 30000 } } });

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return (
    <div className="flex items-center justify-center h-screen">
      <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full"></div>
    </div>
  );
  if (!user) return <Navigate to="/login" />;
  return <Layout>{children}</Layout>;
}

function AppRoutes() {
  const { user } = useAuth();
  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" /> : <Login />} />
      <Route path="/" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
      <Route path="/clients" element={<PrivateRoute><Clients /></PrivateRoute>} />
      <Route path="/client-works" element={<PrivateRoute><ClientWorks /></PrivateRoute>} />
      <Route path="/enquiries" element={<PrivateRoute><Enquiries /></PrivateRoute>} />
      <Route path="/tasks" element={<PrivateRoute><Tasks /></PrivateRoute>} />
      <Route path="/task-groups" element={<PrivateRoute><TaskGroups /></PrivateRoute>} />
      <Route path="/quotations" element={<PrivateRoute><Quotations /></PrivateRoute>} />
      <Route path="/payments" element={<PrivateRoute><Payments /></PrivateRoute>} />
      <Route path="/reports" element={<PrivateRoute><Reports /></PrivateRoute>} />
      <Route path="/works" element={<PrivateRoute><Works /></PrivateRoute>} />
      <Route path="/users" element={<PrivateRoute><Users /></PrivateRoute>} />
      <Route path="/roles" element={<PrivateRoute><Roles /></PrivateRoute>} />
      <Route path="/profile" element={<PrivateRoute><Profile /></PrivateRoute>} />
      <Route path="/products" element={<PrivateRoute><Products /></PrivateRoute>} />
      <Route path="/calendar" element={<PrivateRoute><Calendar /></PrivateRoute>} />
      <Route path="/attendance" element={<PrivateRoute><Attendance /></PrivateRoute>} />
      <Route path="/activity-log" element={<PrivateRoute><ActivityLog /></PrivateRoute>} />
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
