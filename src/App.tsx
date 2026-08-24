import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './context/AuthContext';
import { RoleSwitcher } from './components/common/RoleSwitcher';
import { Navbar } from './components/common/Navbar';

import { LoginPage } from './pages/auth/LoginPage';
import { RegisterPage } from './pages/auth/RegisterPage';
import { PublicTrackingPage } from './pages/public/PublicTrackingPage';

import { CustomerDashboardPage } from './pages/customer/CustomerDashboardPage';
import { BookDeliveryPage } from './pages/customer/BookDeliveryPage';
import { CustomerOrdersPage } from './pages/customer/CustomerOrdersPage';
import { OrderTrackingPage } from './pages/customer/OrderTrackingPage';

import { AgentDashboardPage } from './pages/agent/AgentDashboardPage';
import { AgentDeliveriesPage } from './pages/agent/AgentDeliveriesPage';

import { AdminDashboardPage } from './pages/admin/AdminDashboardPage';
import { AdminOrdersPage } from './pages/admin/AdminOrdersPage';
import { AdminFleetPage } from './pages/admin/AdminFleetPage';
import { AdminZonesPage } from './pages/admin/AdminZonesPage';
import { AdminPricingPage } from './pages/admin/AdminPricingPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

const ProtectedRoute: React.FC<{
  children: React.ReactNode;
  allowedRoles?: ('CUSTOMER' | 'AGENT' | 'ADMIN')[];
}> = ({ children, allowedRoles }) => {
  const { user, isLoading, isAuthenticated } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center text-slate-400 text-sm">
        Authenticating session...
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    if (user.role === 'ADMIN') return <Navigate to="/admin" replace />;
    if (user.role === 'AGENT') return <Navigate to="/agent" replace />;
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

const RootRedirector: React.FC = () => {
  const { user, isLoading, isAuthenticated } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center text-slate-400 text-sm">
        Loading MileZero Platform...
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  if (user.role === 'ADMIN') return <Navigate to="/admin" replace />;
  if (user.role === 'AGENT') return <Navigate to="/agent" replace />;
  return <Navigate to="/dashboard" replace />;
};

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <div className="min-h-screen bg-gray-50 text-gray-900 flex flex-col selection:bg-brand-100 selection:text-brand-700">
            {/* Top 1-Click Role Switcher for Evaluators */}
            <RoleSwitcher />

            {/* Navigation Header */}
            <Navbar />

            {/* Main Application Body */}
            <main className="flex-1">
              <Routes>
                {/* Root Redirection */}
                <Route path="/" element={<RootRedirector />} />

                {/* Public Routes */}
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />
                <Route path="/track" element={<PublicTrackingPage />} />
                <Route path="/track/:trackingNumber" element={<PublicTrackingPage />} />

                {/* Customer Routes */}
                <Route
                  path="/dashboard"
                  element={
                    <ProtectedRoute allowedRoles={['CUSTOMER']}>
                      <CustomerDashboardPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/book"
                  element={
                    <ProtectedRoute allowedRoles={['CUSTOMER', 'ADMIN']}>
                      <BookDeliveryPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/orders"
                  element={
                    <ProtectedRoute allowedRoles={['CUSTOMER']}>
                      <CustomerOrdersPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/orders/:id"
                  element={
                    <ProtectedRoute>
                      <OrderTrackingPage />
                    </ProtectedRoute>
                  }
                />

                {/* Agent Routes */}
                <Route
                  path="/agent"
                  element={
                    <ProtectedRoute allowedRoles={['AGENT']}>
                      <AgentDashboardPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/agent/deliveries"
                  element={
                    <ProtectedRoute allowedRoles={['AGENT']}>
                      <AgentDeliveriesPage />
                    </ProtectedRoute>
                  }
                />

                {/* Admin Routes */}
                <Route
                  path="/admin"
                  element={
                    <ProtectedRoute allowedRoles={['ADMIN']}>
                      <AdminDashboardPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/orders"
                  element={
                    <ProtectedRoute allowedRoles={['ADMIN']}>
                      <AdminOrdersPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/fleet"
                  element={
                    <ProtectedRoute allowedRoles={['ADMIN']}>
                      <AdminFleetPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/zones"
                  element={
                    <ProtectedRoute allowedRoles={['ADMIN']}>
                      <AdminZonesPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/pricing"
                  element={
                    <ProtectedRoute allowedRoles={['ADMIN']}>
                      <AdminPricingPage />
                    </ProtectedRoute>
                  }
                />

                {/* Fallback */}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </main>
          </div>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
