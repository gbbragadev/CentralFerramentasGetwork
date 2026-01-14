import { LogOut, User } from 'lucide-react';
import { useAuth } from '@/auth/AuthContext';

interface HeaderProps {
  title: string;
}

export function Header({ title }: HeaderProps) {
  const { user, logout } = useAuth();

  return (
    <header className="bg-white border-b border-slate-200 h-16 flex items-center justify-between px-8">
      <h1 className="text-2xl font-semibold text-slate-900">{title}</h1>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 text-sm text-slate-600">
          <User className="h-4 w-4" />
          <span>{user?.email}</span>
        </div>

        <button
          onClick={logout}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-md transition"
        >
          <LogOut className="h-4 w-4" />
          Sair
        </button>
      </div>
    </header>
  );
}
