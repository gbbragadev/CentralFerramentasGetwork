import { NavLink } from 'react-router-dom';
import { 
  Users, Package, Database, MessageSquareText, 
  Zap, Send, FileCheck, Book 
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { BrandMark } from '@/components/BrandMark';

const navSections = [
  {
    title: 'Gestão',
    items: [
      { to: '/tenants', icon: Users, label: 'Tenants' },
      { to: '/products', icon: Package, label: 'Produtos' },
    ],
  },
  {
    title: 'Automação WhatsApp',
    items: [
      { to: '/sources', icon: Database, label: 'Fontes de Dados' },
      { to: '/templates', icon: MessageSquareText, label: 'Templates' },
      { to: '/jobs', icon: Zap, label: 'Jobs' },
    ],
  },
  {
    title: 'Monitoramento',
    items: [
      { to: '/outbox', icon: Send, label: 'Mensagens' },
      { to: '/logs', icon: FileCheck, label: 'Logs' },
    ],
  },
  {
    title: 'Suporte',
    items: [
      { to: '/docs', icon: Book, label: 'Documentação' },
    ],
  },
];

export function Sidebar() {
  return (
    <aside className="w-64 bg-slate-950 text-white flex flex-col h-screen fixed left-0 top-0 border-r border-slate-800/80">
      {/* Logo */}
      <div className="p-5 border-b border-slate-800/80">
        <BrandMark variant="light" size="sm" />
      </div>

      <nav className="flex-1 px-4 py-5 space-y-6 overflow-y-auto">
        {navSections.map((section) => (
          <div key={section.title}>
            <h2 className="px-4 text-[11px] font-semibold text-slate-500 uppercase tracking-[0.2em] mb-2">
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
                        ? 'bg-slate-800 text-white shadow-sm'
                        : 'text-slate-300 hover:bg-slate-900 hover:text-white'
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
