import { ReactNode } from 'react';
import { DashboardNav } from './DashboardNav';
import type { UserSession } from '@/lib/db';

interface DashboardLayoutProps {
  children: ReactNode;
  user: UserSession;
  onLogout: () => void;
}

export function DashboardLayout({ children, user, onLogout }: DashboardLayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      <DashboardNav user={user} onLogout={onLogout} />
      
      {/* Main content */}
      <main className="lg:pl-72 min-h-screen">
        <div className="p-4 lg:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
