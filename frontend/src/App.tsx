import { AuthProvider } from '@/auth/AuthContext';
import { AppRoutes } from '@/routes';
import { Toaster } from 'sonner';

function App() {
  return (
    <AuthProvider>
      <AppRoutes />
      <Toaster position="top-right" richColors />
    </AuthProvider>
  );
}

export default App;
