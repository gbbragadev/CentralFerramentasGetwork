import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from '@/auth/ProtectedRoute';
import { LoginPage } from '@/pages/LoginPage';
import { TenantsPage } from '@/pages/TenantsPage';
import { TenantProductsPage } from '@/pages/TenantProductsPage';
import { ProductsPage } from '@/pages/ProductsPage';
import { RulesPage } from '@/pages/RulesPage';
import { SchedulesPage } from '@/pages/SchedulesPage';
import { OutboxPage } from '@/pages/OutboxPage';
import { LogsPage } from '@/pages/LogsPage';
import { DocsPage } from '@/pages/DocsPage';

export function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/tenants"
          element={
            <ProtectedRoute>
              <TenantsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/tenants/:tenantId/products"
          element={
            <ProtectedRoute>
              <TenantProductsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/products"
          element={
            <ProtectedRoute>
              <ProductsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/rules"
          element={
            <ProtectedRoute>
              <RulesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/schedules"
          element={
            <ProtectedRoute>
              <SchedulesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/outbox"
          element={
            <ProtectedRoute>
              <OutboxPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/logs"
          element={
            <ProtectedRoute>
              <LogsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/docs"
          element={
            <ProtectedRoute>
              <DocsPage />
            </ProtectedRoute>
          }
        />
        <Route path="/" element={<Navigate to="/tenants" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
