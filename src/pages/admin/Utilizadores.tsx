import { useState } from 'react';
import { useApp } from '@/contexts/AppContext';
import { Profile, Role } from '@/data/mockData';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Key, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

export default function Utilizadores() {
  const { profiles, setProfiles } = useApp();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ nome: '', email: '', role: 'aluno' as Role });

  const handleCreate = () => {
    if (!form.nome || !form.email) return toast.error('Preenche todos os campos');
    const chave = Math.random().toString(36).slice(2, 8).toUpperCase();
    const novo: Profile = {
      id: 'u' + Date.now(),
      nome: form.nome, email: form.email, role: form.role, primeiro_acesso: true,
    };
    setProfiles(p => [...p, novo]);
    toast.success(`Utilizador criado. Chave provisória: ${chave}`);
    setOpen(false);
    setForm({ nome: '', email: '', role: 'aluno' });
  };

  const resetPassword = (p: Profile) => {
    const chave = Math.random().toString(36).slice(2, 8).toUpperCase();
    setProfiles(prev => prev.map(x => x.id === p.id ? { ...x, primeiro_acesso: true } : x));
    toast.success(`Nova chave provisória para ${p.nome}: ${chave}`);
  };

  const remove = (id: string) => {
    setProfiles(prev => prev.filter(p => p.id !== id));
    toast.success('Utilizador eliminado');
  };

  const roleLabel: Record<Role, string> = { admin: 'Admin', professor: 'Professor', aluno: 'Aluno' };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Utilizadores</h1>
          <p className="text-sm text-muted-foreground">Gere as contas de administradores, professores e alunos.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="w-4 h-4 mr-2" />Novo Utilizador</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Criar Utilizador</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Nome</Label><Input value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })} /></div>
              <div><Label>Email</Label><Input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></div>
              <div><Label>Perfil</Label>
                <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v as Role })}>
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
            <DialogFooter><Button onClick={handleCreate}>Criar</Button></DialogFooter>
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
                <TableCell>{p.email}</TableCell>
                <TableCell><Badge variant="secondary">{roleLabel[p.role]}</Badge></TableCell>
                <TableCell>
                  {p.primeiro_acesso
                    ? <Badge className="bg-status-absent text-status-absent-foreground">1.º acesso pendente</Badge>
                    : <Badge className="bg-status-taught text-status-taught-foreground">Ativo</Badge>}
                </TableCell>
                <TableCell className="text-right space-x-1">
                  <Button size="sm" variant="ghost" onClick={() => resetPassword(p)}><Key className="w-4 h-4 mr-1" />Repor chave</Button>
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
