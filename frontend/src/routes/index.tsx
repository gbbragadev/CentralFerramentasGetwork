import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from '@/auth/ProtectedRoute';
import { LoginPage } from '@/pages/LoginPage';
import { TenantsPage } from '@/pages/TenantsPage';
import { RulesPage } from '@/pages/RulesPage';
import { SchedulesPage } from '@/pages/SchedulesPage';
import { OutboxPage } from '@/pages/OutboxPage';
import { LogsPage } from '@/pages/LogsPage';

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
        <Route path="/" element={<Navigate to="/tenants" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
