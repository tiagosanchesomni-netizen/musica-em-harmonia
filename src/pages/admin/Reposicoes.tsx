import { useState } from 'react';
import { useApp } from '@/contexts/AppContext';
import { Aula } from '@/data/mockData';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Pencil } from 'lucide-react';
import { toast } from 'sonner';
import { formatDataHora, formatData, formatHora } from '@/lib/aulaHelpers';

export default function AdminReposicoes() {
  const { aulas, setAulas, salas, getSala, getProfile, setNotificacoes } = useApp();
  const pendentes = aulas.filter(a => a.estado === 'pendente_reposicao');
  const repostas = aulas.filter(a => a.tipo === 'reposicao');

  const [editing, setEditing] = useState<Aula | null>(null);
  const [form, setForm] = useState({ sala_id: '', data: '', hora: '', duracao: 60 });

  const start = (a: Aula) => {
    const d = new Date(); d.setDate(d.getDate() + 7);
    setEditing(a);
    setForm({ sala_id: a.sala_id, data: d.toISOString().slice(0, 10), hora: '14:00', duracao: a.duracao });
  };

  const marcar = () => {
    if (!editing) return;
    const data_hora = new Date(`${form.data}T${form.hora}:00`).toISOString();
    setAulas(prev => prev.map(a =>
      a.id === editing.id
        ? { ...a, estado: 'cancelada' as const }
        : a
    ));
    const nova: Aula = {
      id: 'au' + Date.now(), sala_id: form.sala_id, data_hora, duracao: form.duracao,
      tipo: 'reposicao', estado: 'agendada',
      professores: editing.professores, alunos: editing.alunos,
      aula_original_id: editing.id, data_original: editing.data_hora,
    };
    setAulas(prev => [...prev, nova]);

    // Criar notificações para cada aluno inscrito na reposição
    const alunoNotifs = editing.alunos.map((alunoId, idx) => ({
      id: `n-rep-adm-${Date.now()}-${idx}`,
      mensagem: `Foi marcada uma nova aula de reposição para ${formatDataHora(data_hora)}.`,
      lida: false,
      tipo: 'reposicao_marcada' as const,
      criado_em: new Date().toISOString(),
      destinatario_role: 'aluno' as Role,
      aluno_id: alunoId,
    }));
    setNotificacoes(prev => [...alunoNotifs, ...prev]);

    // Simulate sending email to each student
    editing.alunos.forEach(alunoId => {
      const p = getProfile(alunoId);
      if (p && p.email) {
        toast.info(`E-mail enviado para ${p.email}: A aula de ${formatData(editing.data_hora)} às ${formatHora(editing.data_hora)} que foi cancelada foi reposta para ${formatData(data_hora)}, às ${formatHora(data_hora)}`, { duration: 8000 });
      }
    });

    toast.success('Reposição marcada');
    setEditing(null);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Reposições</h1>
        <p className="text-sm text-muted-foreground">Aulas canceladas a aguardar nova marcação e histórico das já repostas.</p>
      </div>

      <Card>
        <div className="px-4 py-3 border-b font-semibold flex items-center gap-2">
          <Badge className="bg-status-absent text-status-absent-foreground">Por repor</Badge>
          <span>{pendentes.length} aulas</span>
        </div>
        <Table>
          <TableHeader>
            <TableRow><TableHead>Data original</TableHead><TableHead>Sala</TableHead><TableHead>Professores</TableHead><TableHead>Alunos</TableHead><TableHead className="text-right">Ações</TableHead></TableRow>
          </TableHeader>
          <TableBody>
            {pendentes.length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">Sem aulas pendentes</TableCell></TableRow>}
            {pendentes.map(a => (
              <TableRow key={a.id}>
                <TableCell>{formatDataHora(a.data_hora)}</TableCell>
                <TableCell>{getSala(a.sala_id)?.nome}</TableCell>
                <TableCell className="text-xs">{a.professores.map(p => getProfile(p)?.nome).join(', ')}</TableCell>
                <TableCell className="text-xs">{a.alunos.map(p => getProfile(p)?.nome).join(', ')}</TableCell>
                <TableCell className="text-right">
                  <Button size="sm" variant="outline" onClick={() => start(a)}><Pencil className="w-4 h-4 mr-1" />Marcar reposição</Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <Card>
        <div className="px-4 py-3 border-b font-semibold flex items-center gap-2">
          <Badge className="bg-status-scheduled text-status-scheduled-foreground">Reposições marcadas</Badge>
          <span>{repostas.length} aulas</span>
        </div>
        <Table>
          <TableHeader>
            <TableRow><TableHead>Original</TableHead><TableHead>Nova data</TableHead><TableHead>Sala</TableHead><TableHead>Alunos</TableHead></TableRow>
          </TableHeader>
          <TableBody>
            {repostas.map(a => (
              <TableRow key={a.id}>
                <TableCell className="text-muted-foreground line-through">{a.data_original ? formatDataHora(a.data_original) : '—'}</TableCell>
                <TableCell className="font-medium">{formatDataHora(a.data_hora)}</TableCell>
                <TableCell>{getSala(a.sala_id)?.nome}</TableCell>
                <TableCell className="text-xs">{a.alunos.map(p => getProfile(p)?.nome).join(', ')}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Marcar reposição</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2"><Label>Sala</Label>
              <Select value={form.sala_id} onValueChange={v => setForm({ ...form, sala_id: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{salas.map(s => <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Data</Label><Input type="date" value={form.data} onChange={e => setForm({ ...form, data: e.target.value })} /></div>
            <div><Label>Hora</Label><Input type="time" value={form.hora} onChange={e => setForm({ ...form, hora: e.target.value })} /></div>
          </div>
          <DialogFooter><Button onClick={marcar}>Guardar</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
