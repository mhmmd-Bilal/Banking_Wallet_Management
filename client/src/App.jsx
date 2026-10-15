import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { RealtimeProvider } from './context/RealtimeContext';
import ProtectedRoute, { homeFor } from './components/ProtectedRoute';
import { Spinner } from './components/ui';
import AppLayout from './layouts/AppLayout';
import AuthLayout from './layouts/AuthLayout';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import Dashboard from './pages/user/Dashboard';
import Account from './pages/user/Account';
import OpenAccount from './pages/user/OpenAccount';
import { DepositPage, TransferPage, WithdrawPage } from './pages/user/FinancialAction';
import Transactions from './pages/user/Transactions';
import Notifications from './pages/user/Notifications';
import Verification from './pages/user/Verification';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminVerification from './pages/admin/AdminVerification';
import AdminAccounts from './pages/admin/AdminAccounts';
import AdminTransactions from './pages/admin/AdminTransactions';
import AdminReports from './pages/admin/AdminReports';

function RootRedirect() {
  const { user, loading } = useAuth();
  if (loading) return <div className="grid min-h-screen place-items-center"><Spinner /></div>;
  return <Navigate to={user ? homeFor(user) : '/login'} replace />;
}

function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-2">
      <p className="text-5xl font-semibold tracking-tight text-slate-900">404</p>
      <p className="text-slate-500">That page does not exist.</p>
      <a href="/" className="font-semibold text-brand-600 hover:underline">Go home</a>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <RealtimeProvider>
          <Routes>
            <Route path="/" element={<RootRedirect />} />
            <Route element={<AuthLayout />}>
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
            </Route>

            <Route element={<ProtectedRoute role="USER" />}>
              <Route element={<AppLayout />}>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/account" element={<Account />} />
                <Route path="/open-account" element={<OpenAccount />} />
                <Route path="/deposit" element={<DepositPage />} />
                <Route path="/withdraw" element={<WithdrawPage />} />
                <Route path="/transfer" element={<TransferPage />} />
                <Route path="/transactions" element={<Transactions />} />
                <Route path="/notifications" element={<Notifications />} />
                <Route path="/verification" element={<Verification />} />
              </Route>
            </Route>

            <Route element={<ProtectedRoute role="ADMIN" />}>
              <Route element={<AppLayout />}>
                <Route path="/admin" element={<AdminDashboard />} />
                <Route path="/admin/verification" element={<AdminVerification />} />
                <Route path="/admin/accounts" element={<AdminAccounts />} />
                <Route path="/admin/transactions" element={<AdminTransactions />} />
                <Route path="/admin/reports" element={<AdminReports />} />
              </Route>
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
        </RealtimeProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
