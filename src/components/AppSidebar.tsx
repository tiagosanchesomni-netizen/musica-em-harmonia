import { useAuth } from '@/contexts/AuthContext';
import { useData } from '@/contexts/DataContext';
import { NavLink } from '@/components/NavLink';
import { useLocation } from 'react-router-dom';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  useSidebar,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import {
  LayoutDashboard, Users, DoorOpen, CalendarDays,
  BookOpen, Star, FileText, Calendar, AlertTriangle,
  LogOut, Bell
} from 'lucide-react';
import logoGrt from '@/assets/logo-grt.jpg';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

interface NavItem {
  title: string;
  url: string;
  icon: React.ComponentType<{ className?: string }>;
}

const adminItems: NavItem[] = [
  { title: 'Painel', url: '/admin', icon: LayoutDashboard },
  { title: 'Utilizadores', url: '/admin/utilizadores', icon: Users },
  { title: 'Salas', url: '/admin/salas', icon: DoorOpen },
  { title: 'Horários', url: '/admin/horarios', icon: CalendarDays },
];

const teacherItems: NavItem[] = [
  { title: 'Painel', url: '/professor', icon: LayoutDashboard },
  { title: 'Sumários', url: '/professor/sumarios', icon: BookOpen },
  { title: 'Avaliações', url: '/professor/avaliacoes', icon: Star },
  { title: 'Documentos', url: '/professor/documentos', icon: FileText },
];

const studentItems: NavItem[] = [
  { title: 'Painel', url: '/aluno', icon: LayoutDashboard },
  { title: 'Calendário', url: '/aluno/calendario', icon: Calendar },
  { title: 'Sumários', url: '/aluno/sumarios', icon: BookOpen },
  { title: 'Documentos', url: '/aluno/documentos', icon: FileText },
  { title: 'Avisar Falta', url: '/aluno/falta', icon: AlertTriangle },
];

export function AppSidebar() {
  const { user, logout } = useAuth();
  const { notifications, setNotifications } = useData();
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';
  const location = useLocation();

  if (!user) return null;

  const items = user.role === 'admin' ? adminItems : user.role === 'teacher' ? teacherItems : studentItems;
  const roleLabel = user.role === 'admin' ? 'Administração' : user.role === 'teacher' ? 'Professor' : 'Aluno';

  const userNotifs = notifications.filter(n => n.userId === user.id);
  const unreadCount = userNotifs.filter(n => !n.read).length;

  const markAllRead = () => {
    setNotifications(prev => prev.map(n => n.userId === user.id ? { ...n, read: true } : n));
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        <SidebarGroup>
          <div className="flex items-center gap-2 px-3 py-4">
            <div className="w-8 h-8 bg-sidebar-primary rounded-lg flex items-center justify-center shrink-0">
              <Music className="w-4 h-4 text-sidebar-primary-foreground" />
            </div>
            {!collapsed && <span className="font-display font-bold text-sidebar-accent-foreground text-sm">Escola de Música</span>}
          </div>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>{roleLabel}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map(item => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end={item.url === '/admin' || item.url === '/professor' || item.url === '/aluno'}
                      className="hover:bg-sidebar-accent/50"
                      activeClassName="bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                    >
                      <item.icon className="mr-2 h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-3 space-y-2">
        <Popover>
          <PopoverTrigger asChild>
            <button className="relative flex items-center gap-2 w-full px-2 py-1.5 rounded-md text-sm text-sidebar-foreground hover:bg-sidebar-accent/50 transition-colors">
              <Bell className="w-4 h-4" />
              {!collapsed && <span>Notificações</span>}
              {unreadCount > 0 && (
                <span className="absolute top-0 left-4 w-4 h-4 bg-status-canceled text-status-canceled-foreground text-[10px] font-bold rounded-full flex items-center justify-center">
                  {unreadCount}
                </span>
              )}
            </button>
          </PopoverTrigger>
          <PopoverContent side="right" align="end" className="w-80 p-0">
            <div className="p-3 border-b flex items-center justify-between">
              <span className="font-display font-semibold text-sm">Notificações</span>
              {unreadCount > 0 && (
                <button onClick={markAllRead} className="text-xs text-muted-foreground hover:text-foreground">
                  Marcar todas como lidas
                </button>
              )}
            </div>
            <div className="max-h-60 overflow-y-auto">
              {userNotifs.length === 0 ? (
                <p className="p-4 text-sm text-muted-foreground text-center">Sem notificações</p>
              ) : (
                userNotifs.map(n => (
                  <div key={n.id} className={`p-3 border-b last:border-0 text-sm ${n.read ? 'opacity-60' : ''}`}>
                    <p className="text-foreground">{n.message}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(n.createdAt).toLocaleDateString('pt-PT')}
                    </p>
                  </div>
                ))
              )}
            </div>
          </PopoverContent>
        </Popover>

        <div className="flex items-center gap-2 px-2 text-xs text-sidebar-muted">
          {!collapsed && <span className="truncate">{user.name}</span>}
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={logout}
          className="w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
        >
          <LogOut className="w-4 h-4 mr-2" />
          {!collapsed && 'Sair'}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
