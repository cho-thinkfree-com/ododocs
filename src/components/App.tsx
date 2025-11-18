import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AuthProvider, useAuth } from '../context/AuthContext';
import AuthLayout from '../layouts/AuthLayout';
import LoginPage from '../pages/auth/LoginPage';
import SignupPage from '../pages/auth/SignupPage';
import MainLayout from '../layouts/MainLayout';
import WorkspaceDashboardPage from '../pages/dashboard/WorkspaceDashboardPage';
import WorkspacePage from '../pages/workspace/WorkspacePage';
import WorkspaceSettingsPage from '../pages/workspace/WorkspaceSettingsPage';
import WorkspaceMembersPage from '../pages/workspace/WorkspaceMembersPage';
import EditorPage from '../pages/editor/EditorPage';

const ProtectedRoute = () => {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <Outlet /> : <Navigate to="/login" replace />;
};

const AppRoutes = () => {
  const { isAuthenticated } = useAuth();

  return (
    <Routes>
      <Route
        path="/"
        element={
          isAuthenticated ? <Navigate to="/dashboard" replace /> : <Navigate to="/login" replace />
        }
      />

      {/* Authenticated Routes */}
      <Route element={<ProtectedRoute />}>
        <Route element={<MainLayout />}>
          <Route path="/dashboard" element={<WorkspaceDashboardPage />} />
          <Route path="/workspace/:workspaceId" element={<WorkspacePage />} />
          <Route path="/workspace/:workspaceId/settings" element={<WorkspaceSettingsPage />} />
          <Route path="/workspace/:workspaceId/members" element={<WorkspaceMembersPage />} />
        </Route>
        {/* Editor route is outside MainLayout to have its own full-screen layout */}
        <Route path="/document/:documentId" element={<EditorPage />} />
      </Route>

      {/* Auth Routes */}
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
      </Route>

      {/* Fallback Route */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

const App = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
};

export default App;