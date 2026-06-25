import { NavLink, useLocation } from 'react-router-dom';
import { useApp } from '@/contexts/AppContext';
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent,
  SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem,
  SidebarFooter, useSidebar,
} from '@/components/ui/sidebar';
import {
  Users, DoorOpen, CalendarDays, RotateCcw, FileText, Bell,
  BookOpen, FolderOpen,
} from 'lucide-react';
import logoGrt from '@/assets/logo-grt.jpg';
import { Role } from '@/data/mockData';

interface NavItem {
  title: string;
  url: string;
  icon: React.ComponentType<{ className?: string }>;
}

const itemsByRole: Record<Role, NavItem[]> = {
  admin: [
    { title: 'Utilizadores', url: '/admin/utilizadores', icon: Users },
    { title: 'Salas', url: '/admin/salas', icon: DoorOpen },
    { title: 'Aulas', url: '/admin/aulas', icon: CalendarDays },
    { title: 'Reposições', url: '/admin/reposicoes', icon: RotateCcw },
    { title: 'Documentos', url: '/admin/documentos', icon: FileText },
    { title: 'Notificações', url: '/admin/notificacoes', icon: Bell },
  ],
  professor: [
    { title: 'Aulas', url: '/professor/aulas', icon: BookOpen },
    { title: 'Reposições', url: '/professor/reposicoes', icon: RotateCcw },
    { title: 'Documentos', url: '/professor/documentos', icon: FolderOpen },
  ],
  aluno: [
    { title: 'Aulas', url: '/aluno/aulas', icon: BookOpen },
    { title: 'Reposições', url: '/aluno/reposicoes', icon: RotateCcw },
    { title: 'Documentos', url: '/aluno/documentos', icon: FolderOpen },
  ],
};

const roleLabel: Record<Role, string> = {
  admin: 'Administração',
  professor: 'Professor',
  aluno: 'Aluno',
};

export function AppSidebar() {
  const { currentRole, currentUser, notificacoes } = useApp();
  const { state } = useSidebar();
  const { pathname } = useLocation();
  const collapsed = state === 'collapsed';

  const items = itemsByRole[currentRole];
  const unread = notificacoes.filter(n => !n.lida && n.destinatario_role === currentRole).length;

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        <SidebarGroup>
          <div className="flex items-center gap-2 px-3 py-4">
            <div className="w-8 h-8 rounded-lg overflow-hidden shrink-0 bg-white">
              <img src={logoGrt} alt="Logo GRT" className="w-full h-full object-cover" />
            </div>
            {!collapsed && (
              <div className="flex flex-col leading-tight">
                <span className="font-display font-bold text-sidebar-accent-foreground text-sm">Escola de Música GRT</span>
                <span className="text-[10px] text-sidebar-muted uppercase tracking-wider">Sistema de gestão</span>
              </div>
            )}
          </div>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>{roleLabel[currentRole]}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map(item => {
                const active = pathname.startsWith(item.url);
                const showBadge = item.title === 'Notificações' && unread > 0;
                return (
                  <SidebarMenuItem key={item.url}>
                    <SidebarMenuButton asChild isActive={active}>
                      <NavLink to={item.url} className="flex items-center gap-2">
                        <item.icon className="h-4 w-4" />
                        {!collapsed && <span className="flex-1">{item.title}</span>}
                        {!collapsed && showBadge && (
                          <span className="ml-auto h-5 min-w-5 px-1 rounded-full bg-status-canceled text-status-canceled-foreground text-[10px] font-bold flex items-center justify-center">
                            {unread}
                          </span>
                        )}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-3">
        {!collapsed && currentUser && (
          <div className="px-2 py-1 text-xs text-sidebar-muted">
            <p className="text-sidebar-accent-foreground font-medium truncate">{currentUser.nome}</p>
            <p className="truncate">{currentUser.email}</p>
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
