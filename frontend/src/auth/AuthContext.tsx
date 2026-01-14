import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { apiClient } from '@/api/client';
import { User } from '@/api/types';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  checkAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const checkAuth = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      setLoading(false);
      return;
    }

    const response = await apiClient.get<User>('/auth/me');
    if (response.data) {
      setUser(response.data);
    } else {
      localStorage.removeItem('token');
    }
    setLoading(false);
  };

  useEffect(() => {
    checkAuth();
  }, []);

  const login = async (email: string, password: string) => {
    const response = await apiClient.post<{ token: string; user: User }>('/auth/login', {
      email,
      password,
    });

    if (response.data) {
      localStorage.setItem('token', response.data.token);
      setUser(response.data.user);
      return { success: true };
    }

    return {
      success: false,
      error: response.error?.message || 'Erro ao fazer login',
    };
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, checkAuth }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
