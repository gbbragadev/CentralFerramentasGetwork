import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from '@/auth/ProtectedRoute';

// Auth pages
import { LoginPage } from '@/pages/LoginPage';
import { RegisterPage } from '@/pages/RegisterPage';
import { ForgotPasswordPage } from '@/pages/ForgotPasswordPage';
import { ResetPasswordPage } from '@/pages/ResetPasswordPage';

// Main pages
import { TenantsPage } from '@/pages/TenantsPage';
import { TenantProductsPage } from '@/pages/TenantProductsPage';
import { TenantDetailPage } from '@/pages/TenantDetailPage';
import { ProductsPage } from '@/pages/ProductsPage';

// WhatsApp pages (nova estrutura)
import { SourcesPage } from '@/pages/SourcesPage';
import { TemplatesPage } from '@/pages/TemplatesPage';
import { JobsPage } from '@/pages/JobsPage';

// Monitoring pages
import { OutboxPage } from '@/pages/OutboxPage';
import { LogsPage } from '@/pages/LogsPage';

// Support pages
import { DocsPage } from '@/pages/DocsPage';

export function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Auth routes (public) */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />

        {/* Gestão */}
        <Route
          path="/tenants"
          element={
            <ProtectedRoute>
              <TenantsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/tenants/:tenantId"
          element={
            <ProtectedRoute>
              <TenantDetailPage />
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

        {/* Automação WhatsApp */}
        <Route
          path="/sources"
          element={
            <ProtectedRoute>
              <SourcesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/templates"
          element={
            <ProtectedRoute>
              <TemplatesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/jobs"
          element={
            <ProtectedRoute>
              <JobsPage />
            </ProtectedRoute>
          }
        />

        {/* Monitoramento */}
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

        {/* Suporte */}
        <Route
          path="/docs"
          element={
            <ProtectedRoute>
              <DocsPage />
            </ProtectedRoute>
          }
        />

        {/* Default redirect */}
        <Route path="/" element={<Navigate to="/tenants" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
