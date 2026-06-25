import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/AppSidebar';
import { Outlet, useNavigate } from 'react-router-dom';
import { useApp } from '@/contexts/AppContext';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Role } from '@/data/mockData';

const roleLabels: Record<Role, string> = {
  admin: 'Administrador',
  professor: 'Professor',
  aluno: 'Aluno',
};

const roleHome: Record<Role, string> = {
  admin: '/admin/aulas',
  professor: '/professor/aulas',
  aluno: '/aluno/aulas',
};

export function AppLayout() {
  const { currentRole, setCurrentRole, currentUser, profiles, currentUserId, setCurrentUserId } = useApp();
  const navigate = useNavigate();

  const usersOfRole = profiles.filter(p => p.role === currentRole);

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-14 flex items-center justify-between border-b bg-card px-4 shrink-0 gap-4">
            <div className="flex items-center gap-3">
              <SidebarTrigger />
              <Badge variant="outline" className="hidden sm:inline-flex">Modo Demonstração</Badge>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground hidden md:inline">Perfil de teste:</span>
              <Select value={currentRole} onValueChange={(v) => { setCurrentRole(v as Role); setTimeout(() => navigate(roleHome[v as Role]), 0); }}>
                <SelectTrigger className="w-[160px] h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">{roleLabels.admin}</SelectItem>
                  <SelectItem value="professor">{roleLabels.professor}</SelectItem>
                  <SelectItem value="aluno">{roleLabels.aluno}</SelectItem>
                </SelectContent>
              </Select>
              <Select value={currentUserId} onValueChange={setCurrentUserId}>
                <SelectTrigger className="w-[200px] h-9">
                  <SelectValue placeholder={currentUser?.nome} />
                </SelectTrigger>
                <SelectContent>
                  {usersOfRole.map(u => (
                    <SelectItem key={u.id} value={u.id}>{u.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
