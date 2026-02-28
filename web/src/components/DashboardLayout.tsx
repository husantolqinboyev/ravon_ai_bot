import { ReactNode } from 'react';
import { DashboardNav } from './DashboardNav';
import type { UserSession } from '@/lib/db';

interface DashboardLayoutProps {
  children: ReactNode;
  user: UserSession;
}

export function DashboardLayout({ children, user }: DashboardLayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      <DashboardNav user={user} />

      {/* Main content */}
      <main className="lg:pl-72 min-h-screen">
        <div className="p-4 lg:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
