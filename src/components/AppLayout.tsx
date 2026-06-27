import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/AppSidebar';
import { Outlet, Navigate } from 'react-router-dom';
import { useApp } from '@/contexts/AppContext';
import { Badge } from '@/components/ui/badge';
import { Role } from '@/data/mockData';

const roleLabels: Record<Role, string> = {
  admin: 'Administrador',
  professor: 'Professor',
  aluno: 'Aluno',
};

export function AppLayout() {
  const { currentRole, currentUser, loading } = useApp();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  // If user still has primeiro_acesso=true (e.g. navigated directly),
  // redirect back to login to complete setup
  if (currentUser.primeiro_acesso) {
    return <Navigate to="/login" replace />;
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-14 flex items-center justify-between border-b bg-card px-4 shrink-0 gap-4">
            <div className="flex items-center gap-3">
              <SidebarTrigger />
            </div>
            <div className="flex items-center gap-3 text-sm">
              <span className="font-medium text-slate-200">{currentUser?.nome}</span>
              <Badge variant="secondary" className="capitalize">{roleLabels[currentRole]}</Badge>
            </div>
          </header>
          <main className="flex-1 overflow-auto p-6 bg-background">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
