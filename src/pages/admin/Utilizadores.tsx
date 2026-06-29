import { useState } from 'react';
import { useApp } from '@/contexts/AppContext';
import { Role } from '@/data/mockData';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Key, Trash2, Eye, Play, Pause, Edit2, Check, X } from 'lucide-react';
import { toast } from 'sonner';
import { Profile } from '@/data/mockData';



export default function Utilizadores() {
  const { profiles, setProfiles, reloadProfiles, suspenderUtilizador, reativarUtilizador } = useApp();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ nome: 'Aluno. ', role: 'aluno' as Role });
  const [creating, setCreating] = useState(false);
  
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('todos');
  const [roleFilter, setRoleFilter] = useState<string>('todos');
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null);
  const [isEditingInPopup, setIsEditingInPopup] = useState(false);
  const [popupEditingName, setPopupEditingName] = useState('');

  const filteredAndSortedProfiles = [...profiles]
    .filter(p => {
      if (statusFilter === 'ativo') return !p.suspenso && !p.primeiro_acesso;
      if (statusFilter === 'pendente') return !p.suspenso && p.primeiro_acesso;
      if (statusFilter === 'suspenso') return p.suspenso;
      return true;
    })
    .filter(p => {
      if (roleFilter !== 'todos') return p.role === roleFilter;
      return true;
    })
    .sort((a, b) => a.nome.localeCompare(b.nome));

  const handleSaveName = async (id: string) => {
    if (!editingName.trim()) {
      toast.error('O nome não pode estar vazio');
      return;
    }
    try {
      await setProfiles(prev => prev.map(p => p.id === id ? { ...p, nome: editingName.trim() } : p));
      toast.success('Nome atualizado com sucesso');
      setEditingId(null);
    } catch (err) {
      toast.error('Erro ao atualizar nome');
    }
  };

  const handleRoleChange = (role: Role) => {
    const prefixes: Record<Role, string> = {
      aluno: 'Aluno. ',
      professor: 'Prof. ',
      admin: 'Admin. ',
    };
    const otherPrefixes = ['Aluno. ', 'Prof. ', 'Admin. '];
    const matchedPrefix = otherPrefixes.find(p => form.nome.startsWith(p));
    
    if (matchedPrefix) {
      const nameWithoutPrefix = form.nome.slice(matchedPrefix.length);
      setForm({ nome: prefixes[role] + nameWithoutPrefix, role });
    } else {
      setForm({ nome: prefixes[role] + form.nome, role });
    }
  };

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (isOpen) {
      setForm({ nome: 'Aluno. ', role: 'aluno' });
    }
  };

  const handleCreate = async () => {
    if (!form.nome) return toast.error('Preencha o nome do utilizador');
    
    setCreating(true);
    const chave = Math.random().toString(36).slice(2, 8).toUpperCase();
    const tempEmail = `temp_${Date.now()}@grt.pt`;

    try {
      // Call Supabase Edge Function to create both the auth user and profile row
      const { data, error } = await supabase.functions.invoke('admin-create-user', {
        body: {
          email: tempEmail,
          password: chave,
          name: form.nome,
          role: form.role === 'aluno' ? 'student' : form.role === 'professor' ? 'teacher' : 'admin',
        }
      });

      if (error || (data && data.error)) {
        throw new Error(error?.message || data?.error || 'Erro ao criar utilizador');
      }

      // Reload profiles from DB (edge function already inserted the profile row)
      await reloadProfiles();

      toast.success(`Utilizador criado. Chave provisória: ${chave}`);
      setOpen(false);
      setForm({ nome: 'Aluno. ', role: 'aluno' });
    } catch (err: any) {
      toast.error(err.message || 'Erro ao criar utilizador');
    } finally {
      setCreating(false);
    }
  };

  const resetPassword = async (p: Profile) => {
    if (p.role === 'admin') return toast.error('Não é possível repor a chave de um administrador');
    const chave = Math.random().toString(36).slice(2, 8).toUpperCase();

    try {
      const { data, error } = await supabase.functions.invoke('admin-reset-password', {
        body: {
          user_id: p.id,
          new_password: chave,
        }
      });

      if (error || (data && data.error)) {
        throw new Error(error?.message || data?.error || 'Erro ao repor chave');
      }

      await setProfiles(prev => prev.map(x => x.id === p.id ? { ...x, primeiro_acesso: true, chave_provisoria: chave } : x));
      toast.success(`Nova chave provisória para ${p.nome}: ${chave}`);
    } catch (err: any) {
      toast.error(err.message || 'Erro ao repor chave');
    }
  };

  const showProvisionalKey = (p: Profile) => {
    const key = p.chave_provisoria || 'Não definida';
    navigator.clipboard.writeText(key);
    toast.info(`Chave provisória de ${p.nome}: ${key} (Copiada)`);
  };

  const remove = async (id: string) => {
    const target = profiles.find(p => p.id === id);
    if (target?.role === 'admin') return toast.error('Não é possível eliminar um administrador');
    
    try {
      const { data, error } = await supabase.functions.invoke('admin-delete-user', {
        body: { user_id: id }
      });
        
      if (error || (data && data.error)) {
        throw new Error(error?.message || data?.error || 'Erro ao eliminar utilizador');
      }

      setProfiles(prev => prev.filter(p => p.id !== id));
      toast.success('Utilizador e credenciais eliminados com sucesso.');
    } catch (err: any) {
      toast.error(err.message || 'Erro ao eliminar utilizador');
    }
  };

  const handleSuspender = async (id: string) => {
    try {
      await suspenderUtilizador(id);
      toast.success("Utilizador colocado Fora temporariamente e removido de aulas futuras.");
    } catch (err) {
      toast.error("Erro ao suspender utilizador");
    }
  };

  const handleReativar = async (id: string) => {
    try {
      await reativarUtilizador(id);
      toast.success("Atividade retomada e aulas restabelecidas.");
    } catch (err) {
      toast.error("Erro ao reativar utilizador");
    }
  };

  const roleLabel: Record<Role, string> = { admin: 'Admin', professor: 'Professor', aluno: 'Aluno' };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Utilizadores</h1>
          <p className="text-sm text-muted-foreground">Gere as contas de administradores, professores e alunos.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full sm:w-auto">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Filtrar por estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os estados</SelectItem>
              <SelectItem value="ativo">Ativo</SelectItem>
              <SelectItem value="pendente">1.º acesso pendente</SelectItem>
              <SelectItem value="suspenso">Fora temporariamente</SelectItem>
            </SelectContent>
          </Select>

          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Filtrar por perfil" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os perfis</SelectItem>
              <SelectItem value="admin">Administrador</SelectItem>
              <SelectItem value="professor">Professor</SelectItem>
              <SelectItem value="aluno">Aluno</SelectItem>
            </SelectContent>
          </Select>

          <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogTrigger asChild>
              <Button className="w-full sm:w-auto"><Plus className="w-4 h-4 mr-2" />Novo Utilizador</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Criar Utilizador</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div><Label>Nome</Label><Input value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })} /></div>
                <div><Label>Perfil</Label>
                  <Select value={form.role} onValueChange={handleRoleChange}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Administrador</SelectItem>
                      <SelectItem value="professor">Professor</SelectItem>
                      <SelectItem value="aluno">Aluno</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <p className="text-xs text-muted-foreground">Será gerada uma chave provisória que o utilizador usa no primeiro acesso.</p>
              </div>
              <DialogFooter>
                <Button onClick={handleCreate} disabled={creating}>
                  {creating ? 'A criar...' : 'Criar'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead className="hidden md:table-cell">Email</TableHead>
              <TableHead className="hidden md:table-cell">Perfil</TableHead>
              <TableHead className="hidden md:table-cell">Estado</TableHead>
              <TableHead className="hidden md:table-cell text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredAndSortedProfiles.map(p => (
              <TableRow 
                key={p.id}
                onClick={() => {
                  if (window.innerWidth < 768) {
                    setSelectedUser(p);
                  }
                }}
                className="cursor-pointer md:cursor-default hover:bg-muted/40 md:hover:bg-transparent"
              >
                <TableCell className="font-medium">
                  {editingId === p.id ? (
                    <div className="flex items-center space-x-2" onClick={e => e.stopPropagation()}>
                      <Input
                        value={editingName}
                        onChange={e => setEditingName(e.target.value)}
                        className="h-8 py-1 max-w-[200px]"
                        autoFocus
                        onKeyDown={e => {
                          if (e.key === 'Enter') handleSaveName(p.id);
                          if (e.key === 'Escape') setEditingId(null);
                        }}
                      />
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50"
                        onClick={() => handleSaveName(p.id)}
                      >
                        <Check className="w-4 h-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-destructive hover:text-destructive hover:bg-red-50"
                        onClick={() => setEditingId(null)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between md:justify-start space-x-2 group w-full">
                      <div className="flex items-center space-x-2">
                        <span>{p.nome}</span>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 opacity-0 md:group-hover:opacity-100 transition-opacity"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingId(p.id);
                            setEditingName(p.nome);
                          }}
                        >
                          <Edit2 className="w-3.5 h-3.5 text-muted-foreground hover:text-foreground" />
                        </Button>
                      </div>

                      <div className="md:hidden shrink-0">
                        {p.suspenso ? (
                          <Badge className="bg-destructive text-white hover:bg-destructive text-[10px] px-1.5 py-0">Fora</Badge>
                        ) : p.primeiro_acesso ? (
                          <Badge className="bg-status-absent text-status-absent-foreground text-[10px] px-1.5 py-0">1.º ac.</Badge>
                        ) : (
                          <Badge className="bg-status-taught text-status-taught-foreground text-[10px] px-1.5 py-0">Ativo</Badge>
                        )}
                      </div>
                    </div>
                  )}
                </TableCell>
                <TableCell className="hidden md:table-cell">{p.email || <span className="text-muted-foreground italic">Não associado</span>}</TableCell>
                <TableCell className="hidden md:table-cell"><Badge variant="secondary">{roleLabel[p.role]}</Badge></TableCell>
                <TableCell className="hidden md:table-cell">
                  {p.suspenso ? (
                    <Badge className="bg-destructive text-white hover:bg-destructive">Fora temporariamente</Badge>
                  ) : p.primeiro_acesso ? (
                    <Badge className="bg-status-absent text-status-absent-foreground">1.º acesso pendente</Badge>
                  ) : (
                    <Badge className="bg-status-taught text-status-taught-foreground">Ativo</Badge>
                  )}
                </TableCell>
                <TableCell className="hidden md:table-cell text-right space-x-1" onClick={e => e.stopPropagation()}>
                  {p.primeiro_acesso && !p.suspenso && (
                    <Button size="sm" variant="ghost" onClick={() => showProvisionalKey(p)} className="text-primary hover:text-primary">
                      <Eye className="w-4 h-4 mr-1" />Mostrar chave
                    </Button>
                  )}
                  {!p.suspenso && (
                    <Button size="sm" variant="ghost" onClick={() => resetPassword(p)}><Key className="w-4 h-4 mr-1" />Repor chave</Button>
                  )}
                  {p.role !== 'admin' && (
                    p.suspenso ? (
                      <Button size="sm" variant="ghost" onClick={() => handleReativar(p.id)} className="text-green-600 hover:text-green-700">
                        <Play className="w-4 h-4 mr-1" />Retomar atividade
                      </Button>
                    ) : (
                      <Button size="sm" variant="ghost" onClick={() => handleSuspender(p.id)} className="text-amber-600 hover:text-amber-700">
                        <Pause className="w-4 h-4 mr-1" />Fora temporariamente
                      </Button>
                    )
                  )}
                  <Button size="sm" variant="ghost" onClick={() => remove(p.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={!!selectedUser} onOpenChange={o => { if(!o) { setSelectedUser(null); setIsEditingInPopup(false); } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Detalhes do Utilizador</DialogTitle>
          </DialogHeader>
          {selectedUser && (
            <div className="space-y-4 pt-2">
              <div className="space-y-1">
                <span className="text-xs font-semibold text-muted-foreground block">Nome</span>
                {isEditingInPopup ? (
                  <div className="flex items-center space-x-2 mt-1">
                    <Input
                      value={popupEditingName}
                      onChange={e => setPopupEditingName(e.target.value)}
                      className="h-9 py-1 flex-1"
                      autoFocus
                    />
                    <Button
                      size="sm"
                      className="bg-green-600 hover:bg-green-700 text-white shrink-0"
                      onClick={async () => {
                        if (!popupEditingName.trim()) {
                          toast.error('O nome não pode estar vazio');
                          return;
                        }
                        try {
                          await setProfiles(prev => prev.map(p => p.id === selectedUser.id ? { ...p, nome: popupEditingName.trim() } : p));
                          toast.success('Nome atualizado com sucesso');
                          setSelectedUser(prev => prev ? { ...prev, nome: popupEditingName.trim() } : null);
                          setIsEditingInPopup(false);
                        } catch (err) {
                          toast.error('Erro ao atualizar nome');
                        }
                      }}
                    >
                      Guardar
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="shrink-0"
                      onClick={() => setIsEditingInPopup(false)}
                    >
                      Cancelar
                    </Button>
                  </div>
                ) : (
                  <span className="text-sm font-medium text-foreground block">{selectedUser.nome}</span>
                )}
              </div>
              <div className="space-y-1">
                <span className="text-xs font-semibold text-muted-foreground block">Email</span>
                <span className="text-sm text-foreground">{selectedUser.email || 'Não associado'}</span>
              </div>
              <div className="space-y-1">
                <span className="text-xs font-semibold text-muted-foreground block">Perfil</span>
                <div>
                  <Badge variant="secondary">{roleLabel[selectedUser.role]}</Badge>
                </div>
              </div>
              <div className="space-y-1">
                <span className="text-xs font-semibold text-muted-foreground block">Estado</span>
                <div>
                  {selectedUser.suspenso ? (
                    <Badge className="bg-destructive text-white">Fora temporariamente</Badge>
                  ) : selectedUser.primeiro_acesso ? (
                    <Badge className="bg-status-absent text-status-absent-foreground">1.º acesso pendente</Badge>
                  ) : (
                    <Badge className="bg-status-taught text-status-taught-foreground">Ativo</Badge>
                  )}
                </div>
              </div>

              <div className="border-t pt-3 space-y-2">
                <span className="text-xs font-semibold text-muted-foreground block">Ações</span>
                <div className="flex flex-col gap-2">
                  {!isEditingInPopup && (
                    <Button size="sm" variant="outline" onClick={() => { setIsEditingInPopup(true); setPopupEditingName(selectedUser.nome); }} className="w-full justify-start">
                      <Edit2 className="w-4 h-4 mr-2" />Alterar Nome
                    </Button>
                  )}
                  {selectedUser.primeiro_acesso && !selectedUser.suspenso && (
                    <Button size="sm" variant="outline" onClick={() => { showProvisionalKey(selectedUser); setSelectedUser(null); }} className="w-full justify-start text-primary">
                      <Eye className="w-4 h-4 mr-2" />Mostrar chave
                    </Button>
                  )}
                  {!selectedUser.suspenso && (
                    <Button size="sm" variant="outline" onClick={() => { resetPassword(selectedUser); setSelectedUser(null); }} className="w-full justify-start">
                      <Key className="w-4 h-4 mr-2" />Repor chave
                    </Button>
                  )}
                  {selectedUser.role !== 'admin' && (
                    selectedUser.suspenso ? (
                      <Button size="sm" variant="outline" onClick={() => { handleReativar(selectedUser.id); setSelectedUser(null); }} className="w-full justify-start text-green-600 hover:text-green-700">
                        <Play className="w-4 h-4 mr-2" />Retomar atividade
                      </Button>
                    ) : (
                      <Button size="sm" variant="outline" onClick={() => { handleSuspender(selectedUser.id); setSelectedUser(null); }} className="w-full justify-start text-amber-600 hover:text-amber-700">
                        <Pause className="w-4 h-4 mr-2" />Fora temporariamente
                      </Button>
                    )
                  )}
                  <Button size="sm" variant="destructive" onClick={() => { remove(selectedUser.id); setSelectedUser(null); }} className="w-full justify-start">
                    <Trash2 className="w-4 h-4 mr-2" />Eliminar Utilizador
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
