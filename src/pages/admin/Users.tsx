import { useState } from 'react';
import { useProfiles } from '@/hooks/useSupabaseData';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Plus, Pencil, Archive, RotateCcw, KeyRound, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function AdminUsers() {
  const { data: profiles, loading, refetch } = useProfiles();
  const [filter, setFilter] = useState<'all' | 'teacher' | 'student'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'archived'>('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'student' as 'teacher' | 'student' });
  const [saving, setSaving] = useState(false);

  // Reset password state
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [resetUser, setResetUser] = useState<any | null>(null);
  const [resetPassword, setResetPassword] = useState('');
  const [resetting, setResetting] = useState(false);

  const filtered = profiles.filter(u => {
    if (u.role === 'admin') return false;
    if (filter !== 'all' && u.role !== filter) return false;
    if (statusFilter !== 'all' && u.status !== statusFilter) return false;
    return true;
  });

  const openCreate = () => {
    setEditing(null);
    setForm({ name: '', email: '', password: '', role: 'student' });
    setDialogOpen(true);
  };

  const openEdit = (user: any) => {
    setEditing(user);
    setForm({ name: user.name, email: user.email, password: '', role: user.role as 'teacher' | 'student' });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (editing) {
        await (supabase.from('profiles') as any).update({ name: form.name, email: form.email }).eq('id', editing.id);
        toast.success('Utilizador atualizado.');
      } else {
        const { data, error } = await supabase.auth.signUp({
          email: form.email,
          password: form.password,
          options: { data: { name: form.name, role: form.role } },
        });
        if (error) throw error;
        toast.success('Utilizador criado com sucesso.');
      }
      refetch();
      setDialogOpen(false);
    } catch (err: any) {
      toast.error(err.message || 'Erro ao guardar.');
    }
    setSaving(false);
  };

  const toggleArchive = async (user: any) => {
    const newStatus = user.status === 'active' ? 'archived' : 'active';
    await (supabase.from('profiles') as any).update({ status: newStatus }).eq('id', user.id);
    refetch();
    toast.success(newStatus === 'archived' ? 'Utilizador arquivado.' : 'Utilizador reativado.');
  };

  const openResetPassword = (user: any) => {
    setResetUser(user);
    setResetPassword('');
    setResetDialogOpen(true);
  };

  const handleResetPassword = async () => {
    if (!resetUser || resetPassword.length < 6) {
      toast.error('A palavra-passe deve ter pelo menos 6 caracteres.');
      return;
    }
    setResetting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const resp = await supabase.functions.invoke('admin-reset-password', {
        body: { user_id: resetUser.id, new_password: resetPassword },
      });
      if (resp.error) throw resp.error;
      if (resp.data?.error) throw new Error(resp.data.error);
      toast.success('Palavra-passe reposta. O utilizador terá de a alterar no próximo login.');
      setResetDialogOpen(false);
      refetch();
    } catch (err: any) {
      toast.error(err.message || 'Erro ao repor palavra-passe.');
    }
    setResetting(false);
  };

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-display font-bold">Utilizadores</h1>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreate}><Plus className="w-4 h-4 mr-2" />Novo Utilizador</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editing ? 'Editar Utilizador' : 'Novo Utilizador'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label>Nome</Label>
                <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} disabled={!!editing} />
              </div>
              {!editing && (
                <div className="space-y-2">
                  <Label>Palavra-passe Temporária</Label>
                  <Input type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} placeholder="Mínimo 6 caracteres" />
                </div>
              )}
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select value={form.role} onValueChange={v => setForm(f => ({ ...f, role: v as 'teacher' | 'student' }))} disabled={!!editing}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="teacher">Professor</SelectItem>
                    <SelectItem value="student">Aluno</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleSave} className="w-full" disabled={saving}>
                {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Guardar
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex gap-2">
        <Select value={filter} onValueChange={v => setFilter(v as typeof filter)}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="teacher">Professores</SelectItem>
            <SelectItem value="student">Alunos</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={v => setStatusFilter(v as typeof statusFilter)}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os estados</SelectItem>
            <SelectItem value="active">Ativos</SelectItem>
            <SelectItem value="archived">Arquivados</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(user => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.name}</TableCell>
                  <TableCell className="text-muted-foreground">{user.email}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">
                      {user.role === 'teacher' ? 'Professor' : 'Aluno'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={user.status === 'active' ? 'default' : 'outline'}>
                      {user.status === 'active' ? 'Ativo' : 'Arquivado'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right space-x-1">
                    <Button size="icon" variant="ghost" onClick={() => openEdit(user)} title="Editar">
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => openResetPassword(user)} title="Repor Palavra-passe">
                      <KeyRound className="w-4 h-4" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => toggleArchive(user)} title={user.status === 'active' ? 'Arquivar' : 'Reativar'}>
                      {user.status === 'active' ? <Archive className="w-4 h-4" /> : <RotateCcw className="w-4 h-4" />}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Reset Password Dialog */}
      <Dialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Repor Palavra-passe</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <p className="text-sm text-muted-foreground">
              Definir nova palavra-passe temporária para <strong>{resetUser?.name}</strong>. O utilizador será obrigado a alterá-la no próximo login.
            </p>
            <div className="space-y-2">
              <Label>Nova Palavra-passe Temporária</Label>
              <Input type="password" value={resetPassword} onChange={e => setResetPassword(e.target.value)} placeholder="Mínimo 6 caracteres" />
            </div>
            <Button onClick={handleResetPassword} className="w-full" disabled={resetting}>
              {resetting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Repor Palavra-passe
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
