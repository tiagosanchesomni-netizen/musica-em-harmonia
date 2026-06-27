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
import { Plus, Key, Trash2, Eye, Play, Pause } from 'lucide-react';
import { toast } from 'sonner';



export default function Utilizadores() {
  const { profiles, setProfiles, reloadProfiles, suspenderUtilizador, reativarUtilizador } = useApp();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ nome: 'Aluno. ', role: 'aluno' as Role });
  const [creating, setCreating] = useState(false);

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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Utilizadores</h1>
          <p className="text-sm text-muted-foreground">Gere as contas de administradores, professores e alunos.</p>
        </div>
        <Dialog open={open} onOpenChange={handleOpenChange}>
          <DialogTrigger asChild>
            <Button><Plus className="w-4 h-4 mr-2" />Novo Utilizador</Button>
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

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Perfil</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {profiles.map(p => (
              <TableRow key={p.id}>
                <TableCell className="font-medium">{p.nome}</TableCell>
                <TableCell>{p.email || <span className="text-muted-foreground italic">Não associado</span>}</TableCell>
                <TableCell><Badge variant="secondary">{roleLabel[p.role]}</Badge></TableCell>
                <TableCell>
                  {p.suspenso ? (
                    <Badge className="bg-destructive text-white hover:bg-destructive">Fora temporariamente</Badge>
                  ) : p.primeiro_acesso ? (
                    <Badge className="bg-status-absent text-status-absent-foreground">1.º acesso pendente</Badge>
                  ) : (
                    <Badge className="bg-status-taught text-status-taught-foreground">Ativo</Badge>
                  )}
                </TableCell>
                <TableCell className="text-right space-x-1">
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
    </div>
  );
}
