import { ReactNode } from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';

interface AppLayoutProps {
  title: string;
  children: ReactNode;
}

export function AppLayout({ title, children }: AppLayoutProps) {
  return (
    <div className="flex h-screen bg-slate-50">
      <Sidebar />
      <div className="flex-1 ml-64 flex flex-col">
        <Header title={title} />
        <main className="flex-1 overflow-auto p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
