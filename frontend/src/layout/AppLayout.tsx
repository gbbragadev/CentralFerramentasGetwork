import { ReactNode } from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';

interface AppLayoutProps {
  title: string;
  children: ReactNode;
}

export function AppLayout({ title, children }: AppLayoutProps) {
  return (
    <div className="flex h-screen bg-slate-100">
      <Sidebar />
      <div className="flex-1 ml-64 flex flex-col">
        <Header title={title} />
        <main className="flex-1 overflow-auto px-8 py-6">
          {children}
        </main>
      </div>
    </div>
  );
}
