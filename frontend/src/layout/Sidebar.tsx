import { NavLink } from 'react-router-dom';
import { Building2, Users, FileText, Calendar, Send, FileCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { to: '/tenants', icon: Users, label: 'Tenants' },
  { to: '/rules', icon: FileText, label: 'Regras' },
  { to: '/schedules', icon: Calendar, label: 'Agendamentos' },
  { to: '/outbox', icon: Send, label: 'Mensagens' },
  { to: '/logs', icon: FileCheck, label: 'Logs' },
];

export function Sidebar() {
  return (
    <aside className="w-64 bg-slate-900 text-white flex flex-col h-screen fixed left-0 top-0">
      <div className="p-6 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <Building2 className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-lg font-bold">Forbiz & GetWork</h1>
            <p className="text-xs text-slate-400">Central de Ferramentas</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-4 py-3 rounded-lg transition-colors',
                isActive
                  ? 'bg-primary text-white'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              )
            }
          >
            <item.icon className="h-5 w-5" />
            <span className="font-medium">{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="p-4 border-t border-slate-800">
        <p className="text-xs text-slate-500 text-center">
          © 2024 Forbiz & GetWork
        </p>
      </div>
    </aside>
  );
}
