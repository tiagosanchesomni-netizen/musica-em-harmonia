import { useState } from 'react';
import { useApp } from '@/contexts/AppContext';
import { Aula } from '@/data/mockData';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Pencil, CalendarDays } from 'lucide-react';
import { toast } from 'sonner';
import { estadoConfig, formatDataHora } from '@/lib/aulaHelpers';

export default function AdminAulas() {
  const { aulas, setAulas, salas, profiles, getSala, getProfile, assiduidades, setAssiduidades } = useApp();
  const professores = profiles.filter(p => p.role === 'professor');
  const alunos = profiles.filter(p => p.role === 'aluno');

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Aula | null>(null);
  const [form, setForm] = useState<{
    sala_id: string; data: string; hora: string; duracao: number;
    professores: string[]; alunos: string[];
  }>({ sala_id: '', data: '', hora: '10:00', duracao: 60, professores: [], alunos: [] });

  const openCreate = () => {
    setEditing(null);
    setForm({ sala_id: salas[0]?.id || '', data: new Date().toISOString().slice(0, 10), hora: '10:00', duracao: 60, professores: [], alunos: [] });
    setOpen(true);
  };

  const toggle = (key: 'professores' | 'alunos', id: string) => {
    setForm(f => ({ ...f, [key]: f[key].includes(id) ? f[key].filter(x => x !== id) : [...f[key], id] }));
  };

  const handleSave = () => {
    if (!form.sala_id || !form.data || !form.hora) return toast.error('Preenche os campos');
    if (form.professores.length === 0) return toast.error('Adiciona pelo menos um professor');
    if (form.alunos.length === 0) return toast.error('Adiciona pelo menos um aluno');
    const data_hora = new Date(`${form.data}T${form.hora}:00`).toISOString();
    if (editing) {
      setAulas(prev => prev.map(a => a.id === editing.id ? { ...a, sala_id: form.sala_id, data_hora, duracao: form.duracao, professores: form.professores, alunos: form.alunos } : a));
      toast.success('Aula atualizada');
    } else {
      const nova: Aula = {
        id: 'au' + Date.now(), sala_id: form.sala_id, data_hora, duracao: form.duracao,
        tipo: 'normal', estado: 'agendada', professores: form.professores, alunos: form.alunos,
      };
      setAulas(prev => [...prev, nova]);
      toast.success('Aula criada');
    }
    setOpen(false);
  };

  const togglePresenca = (aulaId: string, alunoId: string) => {
    const existing = assiduidades.find(a => a.aula_id === aulaId && a.aluno_id === alunoId);
    if (existing) {
      setAssiduidades(prev => prev.map(a => a.id === existing.id ? { ...a, presente: !a.presente } : a));
    } else {
      setAssiduidades(prev => [...prev, { id: 'as' + Date.now(), aula_id: aulaId, aluno_id: alunoId, presente: true }]);
    }
  };

  const startEdit = (aula: Aula) => {
    setEditing(aula);
    const d = new Date(aula.data_hora);
    setForm({
      sala_id: aula.sala_id,
      data: d.toISOString().slice(0, 10),
      hora: d.toTimeString().slice(0, 5),
      duracao: aula.duracao,
      professores: aula.professores,
      alunos: aula.alunos,
    });
    setOpen(true);
  };

  const sorted = [...aulas].sort((a, b) => new Date(a.data_hora).getTime() - new Date(b.data_hora).getTime());

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Aulas</h1>
          <p className="text-sm text-muted-foreground">Vista global de todas as aulas da escola.</p>
        </div>
        <Button onClick={openCreate}><Plus className="w-4 h-4 mr-2" />Nova Aula</Button>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data / Hora</TableHead>
              <TableHead>Sala</TableHead>
              <TableHead>Professores</TableHead>
              <TableHead>Alunos</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.map(a => {
              const cfg = estadoConfig[a.estado];
              return (
                <TableRow key={a.id}>
                  <TableCell className="font-medium">{formatDataHora(a.data_hora)}</TableCell>
                  <TableCell>{getSala(a.sala_id)?.nome || '—'}</TableCell>
                  <TableCell className="text-xs">{a.professores.map(p => getProfile(p)?.nome).join(', ')}</TableCell>
                  <TableCell className="text-xs">
                    <div className="space-y-1">
                      {a.alunos.map(aId => {
                        const al = getProfile(aId);
                        const ass = assiduidades.find(x => x.aula_id === a.id && x.aluno_id === aId);
                        return (
                          <div key={aId} className="flex items-center gap-2">
                            <Checkbox checked={!!ass?.presente} onCheckedChange={() => togglePresenca(a.id, aId)} />
                            <span>{al?.nome}</span>
                          </div>
                        );
                      })}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={cfg.className}>{cfg.label}</Badge>
                    {a.tipo === 'reposicao' && <Badge variant="outline" className="ml-1">Reposição</Badge>}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button size="sm" variant="ghost" onClick={() => startEdit(a)}><Pencil className="w-4 h-4" /></Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>{editing ? 'Editar Aula' : 'Nova Aula'}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Sala</Label>
              <Select value={form.sala_id} onValueChange={v => setForm({ ...form, sala_id: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{salas.map(s => <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Duração (min)</Label><Input type="number" value={form.duracao} onChange={e => setForm({ ...form, duracao: +e.target.value })} /></div>
            <div><Label>Data</Label><Input type="date" value={form.data} onChange={e => setForm({ ...form, data: e.target.value })} /></div>
            <div><Label>Hora</Label><Input type="time" value={form.hora} onChange={e => setForm({ ...form, hora: e.target.value })} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3 mt-2">
            <div>
              <Label className="mb-2 block">Professores</Label>
              <div className="space-y-1 max-h-40 overflow-auto border rounded p-2">
                {professores.map(p => (
                  <label key={p.id} className="flex items-center gap-2 text-sm cursor-pointer">
                    <Checkbox checked={form.professores.includes(p.id)} onCheckedChange={() => toggle('professores', p.id)} />
                    {p.nome}
                  </label>
                ))}
              </div>
            </div>
            <div>
              <Label className="mb-2 block">Alunos</Label>
              <div className="space-y-1 max-h-40 overflow-auto border rounded p-2">
                {alunos.map(a => (
                  <label key={a.id} className="flex items-center gap-2 text-sm cursor-pointer">
                    <Checkbox checked={form.alunos.includes(a.id)} onCheckedChange={() => toggle('alunos', a.id)} />
                    {a.nome}
                  </label>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter><Button onClick={handleSave}><CalendarDays className="w-4 h-4 mr-2" />Guardar</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
