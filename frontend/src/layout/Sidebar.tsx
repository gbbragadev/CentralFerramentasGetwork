import { NavLink } from 'react-router-dom';
import { Building2, Users, FileText, Calendar, Send, FileCheck, Package, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';

const navSections = [
  {
    title: 'Gestão',
    items: [
      { to: '/tenants', icon: Users, label: 'Tenants' },
      { to: '/products', icon: Package, label: 'Produtos' },
    ],
  },
  {
    title: 'Automação',
    items: [
      { to: '/rules', icon: FileText, label: 'Regras' },
      { to: '/schedules', icon: Calendar, label: 'Agendamentos' },
    ],
  },
  {
    title: 'Monitoramento',
    items: [
      { to: '/outbox', icon: Send, label: 'Mensagens' },
      { to: '/logs', icon: FileCheck, label: 'Logs' },
    ],
  },
];

export function Sidebar() {
  return (
    <aside className="w-64 bg-slate-900 text-white flex flex-col h-screen fixed left-0 top-0">
      <div className="p-6 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/20 flex items-center justify-center">
            <Building2 className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-lg font-bold">Forbiz & GetWork</h1>
            <p className="text-xs text-slate-400">Central de Ferramentas</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-6 overflow-y-auto">
        {navSections.map((section) => (
          <div key={section.title}>
            <h2 className="px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
              {section.title}
            </h2>
            <div className="space-y-1">
              {section.items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors',
                      isActive
                        ? 'bg-primary text-white'
                        : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                    )
                  }
                >
                  <item.icon className="h-5 w-5" />
                  <span className="font-medium text-sm">{item.label}</span>
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>

      <div className="p-4 border-t border-slate-800">
        <p className="text-xs text-slate-500 text-center">
          © 2026 Forbiz & GetWork
        </p>
      </div>
    </aside>
  );
}
