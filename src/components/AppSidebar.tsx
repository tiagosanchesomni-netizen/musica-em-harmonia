import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useApp } from '@/contexts/AppContext';
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent,
  SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem,
  SidebarFooter, useSidebar,
} from '@/components/ui/sidebar';
import {
  Users, DoorOpen, CalendarDays, RotateCcw, FileText, Bell,
  BookOpen, FolderOpen, LogOut, BarChart3, Settings, ShieldAlert, Key, Mail, User
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import logoGrt from '@/assets/logo-grt.jpg';
import { Role } from '@/data/mockData';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

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
    { title: 'Sumários', url: '/admin/sumarios', icon: FileText },
    { title: 'Reposições', url: '/admin/reposicoes', icon: RotateCcw },
    { title: 'Documentos', url: '/admin/documentos', icon: FileText },
    { title: 'Estatísticas', url: '/admin/estatisticas', icon: BarChart3 },
    { title: 'Notificações', url: '/admin/notificacoes', icon: Bell },
  ],
  professor: [
    { title: 'Aulas', url: '/professor/aulas', icon: BookOpen },
    { title: 'Sumários', url: '/professor/sumarios', icon: FileText },
    { title: 'Reposições', url: '/professor/reposicoes', icon: RotateCcw },
    { title: 'Documentos', url: '/professor/documentos', icon: FolderOpen },
    { title: 'Estatísticas', url: '/professor/estatisticas', icon: BarChart3 },
  ],
  aluno: [
    { title: 'Aulas', url: '/aluno/aulas', icon: BookOpen },
    { title: 'Reposições', url: '/aluno/reposicoes', icon: RotateCcw },
    { title: 'Documentos', url: '/aluno/documentos', icon: FolderOpen },
    { title: 'Estatísticas', url: '/aluno/estatisticas', icon: BarChart3 },
    { title: 'Notificações', url: '/aluno/notificacoes', icon: Bell },
  ],
};

const roleLabel: Record<Role, string> = {
  admin: 'Administração',
  professor: 'Professor',
  aluno: 'Aluno',
};

export function AppSidebar() {
  const { currentRole, currentUser, currentUserId, notificacoes, logout, profiles, setProfiles } = useApp();
  const { state } = useSidebar();
  const { pathname } = useLocation();
  const collapsed = state === 'collapsed';

  // Settings states
  const [openSettings, setOpenSettings] = useState(false);
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [receberEmails, setReceberEmails] = useState(true);
  const [saving, setSaving] = useState(false);

  // Verification states
  const [verifying, setVerifying] = useState<'none' | 'old_email' | 'new_email'>('none');
  const [inputCode, setInputCode] = useState('');
  const [generatedCode, setGeneratedCode] = useState('');
  const [tempNewEmail, setTempNewEmail] = useState('');

  // Confirmation modal states
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [showPasswordConfirmModal, setShowPasswordConfirmModal] = useState(false);

  const prefixByRole: Record<string, string> = {
    admin: 'Admin. ',
    professor: 'Prof. ',
    aluno: 'Aluno. ',
  };

  const handleOpenSettings = () => {
    if (currentUser) {
      setNome(currentUser.nome || '');
      setEmail(currentUser.email || '');
      setReceberEmails(currentUser.receber_emails !== false);
    }
    setVerifying('none');
    setInputCode('');
    setGeneratedCode('');
    setTempNewEmail('');
    setOpenSettings(true);
  };

  const handleNameChange = (val: string) => {
    const prefix = prefixByRole[currentUser?.role || ''] || '';
    if (val.length < prefix.length) {
      setNome(prefix);
    } else if (!val.startsWith(prefix)) {
      const clean = val.replace(/^(Admin\.|Prof\.|Aluno\.)\s*/i, '');
      setNome(prefix + clean);
    } else {
      setNome(val);
    }
  };

  const handleReceberEmailsChange = (checked: boolean) => {
    if (!checked) {
      setShowWarningModal(true);
    } else {
      setReceberEmails(true);
    }
  };

  const handleSaveSettings = async () => {
    if (!currentUser) return;
    if (!nome.trim()) return toast.error('O nome não pode estar vazio.');

    setSaving(true);
    try {
      const emailChanged = email.trim().toLowerCase() !== currentUser.email?.trim().toLowerCase();

      if (emailChanged) {
        const code = Math.floor(100000 + Math.random() * 900000).toString();
        setGeneratedCode(code);
        setTempNewEmail(email.trim().toLowerCase());

        await supabase.functions.invoke('send-email', {
          body: {
            to: currentUser.email,
            subject: '🔑 Código de Confirmação (E-mail Atual)',
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; background: #f9fafb; padding: 32px; border-radius: 12px;">
                <h1 style="color: #1e1b4b; font-size: 20px; text-align: center; margin: 0 0 16px;">🎵 Escola de Música GRT</h1>
                <div style="background: white; border-radius: 8px; padding: 24px; border: 1px solid #e5e7eb;">
                  <p style="color: #374151; margin: 0 0 16px;">Introduza este código de confirmação no sistema para validar a alteração de e-mail a partir da sua conta atual:</p>
                  <div style="text-align: center; background: #f3f4f6; border-radius: 8px; padding: 16px; margin: 16px 0;">
                    <span style="font-size: 28px; font-weight: bold; letter-spacing: 4px; color: #4f46e5; font-family: monospace;">${code}</span>
                  </div>
                </div>
              </div>
            `,
          },
        });

        setInputCode('');
        setVerifying('old_email');
        setSaving(false);
        return;
      }

      const { error: profileErr } = await supabase
        .from('app_profiles')
        .update({
          nome: nome.trim(),
          receber_emails: receberEmails,
        })
        .eq('id', currentUser.id);

      if (profileErr) throw profileErr;

      setProfiles(prev => prev.map(p => p.id === currentUser.id ? { ...p, nome: nome.trim(), receber_emails: receberEmails } : p));
      
      toast.success('Definições guardadas com sucesso.');
      setOpenSettings(false);
    } catch (err: any) {
      toast.error(err.message || 'Erro ao guardar definições.');
    } finally {
      setSaving(false);
    }
  };

  const handleVerifyCode = async () => {
    if (inputCode.trim() !== generatedCode) {
      return toast.error('Código incorreto. Tente novamente.');
    }

    if (verifying === 'old_email') {
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      setGeneratedCode(code);

      setSaving(true);
      try {
        await supabase.functions.invoke('send-email', {
          body: {
            to: tempNewEmail,
            subject: '🔑 Código de Confirmação (Novo E-mail)',
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; background: #f9fafb; padding: 32px; border-radius: 12px;">
                <h1 style="color: #1e1b4b; font-size: 20px; text-align: center; margin: 0 0 16px;">🎵 Escola de Música GRT</h1>
                <div style="background: white; border-radius: 8px; padding: 24px; border: 1px solid #e5e7eb;">
                  <p style="color: #374151; margin: 0 0 16px;">Introduza este código de confirmação no sistema para validar a associação deste novo e-mail à sua conta:</p>
                  <div style="text-align: center; background: #f3f4f6; border-radius: 8px; padding: 16px; margin: 16px 0;">
                    <span style="font-size: 28px; font-weight: bold; letter-spacing: 4px; color: #10b981; font-family: monospace;">${code}</span>
                  </div>
                </div>
              </div>
            `,
          },
        });
        setInputCode('');
        setVerifying('new_email');
      } catch (err: any) {
        toast.error('Erro ao enviar código para o novo e-mail.');
      } finally {
        setSaving(false);
      }
    } 
    
    else if (verifying === 'new_email') {
      setSaving(true);
      try {
        const { data, error } = await supabase.functions.invoke('user-settings-action', {
          body: {
            action: 'change-email',
            new_email: tempNewEmail,
          },
        });

        if (error || (data && data.error)) {
          throw new Error(error?.message || data?.error || 'Erro ao redefinir e-mail');
        }

        const { error: profileErr } = await supabase
          .from('app_profiles')
          .update({
            nome: nome.trim(),
            email: tempNewEmail,
            receber_emails: receberEmails,
          })
          .eq('id', currentUser?.id);

        if (profileErr) throw profileErr;

        setProfiles(prev => prev.map(p => p.id === currentUser?.id ? { 
          ...p, 
          nome: nome.trim(), 
          email: tempNewEmail, 
          receber_emails: receberEmails 
        } : p));

        toast.success('E-mail e definições atualizados com sucesso!');
        setVerifying('none');
        setOpenSettings(false);
      } catch (err: any) {
        toast.error(err.message || 'Erro ao finalizar atualização de e-mail.');
      } finally {
        setSaving(false);
      }
    }
  };

  const handleRequestNewPass = async () => {
    if (!currentUser) return;
    setSaving(true);
    try {
      const { data, error } = await supabase.functions.invoke('user-settings-action', {
        body: {
          action: 'request-provisional-pass',
        },
      });

      if (error || (data && data.error)) {
        throw new Error(error?.message || data?.error || 'Erro ao gerar palavra-passe temporária');
      }

      toast.success('Palavra-passe temporária enviada para o seu email com sucesso!');
      setOpenSettings(false);
      setShowPasswordConfirmModal(false);
      await logout();
    } catch (err: any) {
      toast.error(err.message || 'Erro ao redefinir palavra-passe.');
    } finally {
      setSaving(false);
    }
  };

  const items = itemsByRole[currentRole];
  const unread = notificacoes.filter(n => 
    !n.lida && 
    n.destinatario_role === currentRole && 
    (currentRole !== 'aluno' || n.aluno_id === currentUserId)
  ).length;

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

      <SidebarFooter className="p-2 space-y-1">
        {!collapsed && currentUser && (
          <div className="px-2 py-1 text-xs text-sidebar-muted">
            <p className="text-sidebar-accent-foreground font-medium truncate">{currentUser.nome}</p>
            <p className="truncate text-[10px] opacity-75">{currentUser.email}</p>
          </div>
        )}
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={handleOpenSettings} 
          className="w-full justify-start text-xs text-muted-foreground hover:text-foreground"
        >
          <Settings className="h-4 w-4 mr-2" />
          {!collapsed && <span>Definições</span>}
        </Button>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={logout} 
          className="w-full justify-start text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10"
        >
          <LogOut className="h-4 w-4 mr-2" />
          {!collapsed && <span>Sair</span>}
        </Button>
      </SidebarFooter>

      {/* Settings Dialog */}
      <Dialog open={openSettings} onOpenChange={o => { if(!saving) setOpenSettings(o); }}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5 text-primary" /> Definições de Conta
            </DialogTitle>
          </DialogHeader>

          {verifying === 'none' ? (
            <div className="space-y-4 py-2">
              <div className="space-y-1">
                <Label htmlFor="settings-nome">Nome</Label>
                <div className="relative">
                  <User className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input 
                    id="settings-nome"
                    value={nome}
                    onChange={e => handleNameChange(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <p className="text-[10px] text-muted-foreground">O prefixo do seu perfil não pode ser alterado.</p>
              </div>

              <div className="space-y-1">
                <Label htmlFor="settings-email">E-mail</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input 
                    id="settings-email"
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="pl-9"
                  />
                </div>
                {email.trim().toLowerCase() !== currentUser?.email?.trim().toLowerCase() && (
                  <p className="text-xs text-amber-600 font-medium mt-1">⚠️ A alteração do e-mail exigirá dupla validação de código.</p>
                )}
              </div>

              <div className="flex items-center space-x-2 border rounded-md p-3 bg-muted/20">
                <Checkbox 
                  id="settings-emails"
                  checked={receberEmails}
                  onCheckedChange={handleReceberEmailsChange}
                />
                <div className="grid gap-1.5 leading-none">
                  <Label htmlFor="settings-emails" className="cursor-pointer font-medium text-sm">Notificações por E-mail</Label>
                  <p className="text-xs text-muted-foreground">Receber avisos automáticos sobre agendamentos, cancelamentos e reposições.</p>
                </div>
              </div>

              <div className="border-t pt-3">
                <Button 
                  type="button"
                  variant="outline"
                  onClick={() => setShowPasswordConfirmModal(true)}
                  className="w-full flex items-center justify-center gap-2 text-xs"
                >
                  <Key className="w-4 h-4" /> Alterar Palavra-passe
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4 py-4 text-center">
              <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto mb-2">
                <Mail className="w-6 h-6" />
              </div>
              <h3 className="font-semibold text-sm">
                {verifying === 'old_email' 
                  ? `Verificação do E-mail Atual` 
                  : `Verificação do Novo E-mail`}
              </h3>
              <p className="text-xs text-muted-foreground px-4">
                {verifying === 'old_email'
                  ? `Enviámos um código de 6 dígitos para o seu e-mail atual (${currentUser?.email}). Introduza-o abaixo:`
                  : `Enviámos um código de 6 dígitos para o seu novo e-mail (${tempNewEmail}). Introduza-o abaixo:`}
              </p>
              
              <div className="max-w-[200px] mx-auto">
                <Input 
                  placeholder="000000"
                  value={inputCode}
                  onChange={e => setInputCode(e.target.value.slice(0,6))}
                  className="text-center text-lg font-bold letter-spacing-4 h-12"
                />
              </div>

              <div className="flex gap-2 justify-center pt-2">
                <Button size="sm" variant="ghost" onClick={() => setVerifying('none')} disabled={saving}>Cancelar</Button>
                <Button size="sm" onClick={handleVerifyCode} disabled={saving}>
                  {saving ? 'A verificar...' : 'Confirmar Código'}
                </Button>
              </div>
            </div>
          )}

          {verifying === 'none' && (
            <DialogFooter className="border-t pt-3">
              <Button size="sm" variant="ghost" onClick={() => setOpenSettings(false)} disabled={saving}>Cancelar</Button>
              <Button size="sm" onClick={handleSaveSettings} disabled={saving}>
                {saving ? 'A guardar...' : 'Guardar Alterações'}
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>

      {/* Warn Email Deactivation Modal */}
      <Dialog open={showWarningModal} onOpenChange={setShowWarningModal}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-600">
              <ShieldAlert className="w-5 h-5" /> Desativar e-mails informativos?
            </DialogTitle>
          </DialogHeader>
          <div className="py-2">
            <p className="text-sm text-muted-foreground leading-relaxed">
              Tem a certeza que quer desativar? Os e-mails são informativos para saber quando uma aula é cancelada ou reposta.
            </p>
          </div>
          <DialogFooter className="gap-2">
            <Button size="sm" variant="outline" onClick={() => { setReceberEmails(true); setShowWarningModal(false); }}>
              Cancelar
            </Button>
            <Button size="sm" variant="destructive" onClick={() => { setReceberEmails(false); setShowWarningModal(false); }}>
              Continuar mesmo assim
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm Password Change Modal */}
      <Dialog open={showPasswordConfirmModal} onOpenChange={setShowPasswordConfirmModal}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Key className="w-5 h-5 text-primary" /> Alterar Palavra-passe?
            </DialogTitle>
          </DialogHeader>
          <div className="py-2">
            <p className="text-sm text-muted-foreground leading-relaxed">
              Esta ação irá encerrar a sua sessão imediatamente e enviar uma palavra-passe provisória por e-mail. Ao reentrar com essa chave provisória, poderá definir a sua nova palavra-passe definitiva.
            </p>
          </div>
          <DialogFooter className="gap-2">
            <Button size="sm" variant="outline" onClick={() => setShowPasswordConfirmModal(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button size="sm" onClick={handleRequestNewPass} disabled={saving}>
              {saving ? 'A processar...' : 'Confirmar e Sair'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Sidebar>
  );
}
