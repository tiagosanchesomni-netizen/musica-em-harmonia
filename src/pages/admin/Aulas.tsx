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
import { estadoConfig, formatDataHora, formatData, formatHora } from '@/lib/aulaHelpers';

export default function AdminAulas() {
  const { aulas, setAulas, salas, profiles, getSala, getProfile, assiduidades, setAssiduidades, setNotificacoes } = useApp();
  const professores = profiles.filter(p => p.role === 'professor');
  const alunos = profiles.filter(p => p.role === 'aluno');

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Aula | null>(null);
  const [form, setForm] = useState<{
    sala_id: string; data: string; hora: string; duracao: number;
    professores: string[]; alunos: string[]; semanal: boolean;
  }>({ sala_id: '', data: '', hora: '10:00', duracao: 60, professores: [], alunos: [], semanal: false });

  const openCreate = () => {
    setEditing(null);
    setForm({ 
      sala_id: salas[0]?.id || '', 
      data: new Date().toISOString().slice(0, 10), 
      hora: '10:00', 
      duracao: 60, 
      professores: [], 
      alunos: [],
      semanal: false 
    });
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
      const originalAlunos = editing.alunos;
      const newAlunos = form.alunos;
      const added = newAlunos.filter(x => !originalAlunos.includes(x));
      const removed = originalAlunos.filter(x => !newAlunos.includes(x));

      setAulas(prev => prev.map(a => {
        // Se for a aula que está a ser editada, atualiza todos os campos
        if (a.id === editing.id) {
          return { 
            ...a, 
            sala_id: form.sala_id, 
            data_hora, 
            duracao: form.duracao, 
            professores: form.professores, 
            alunos: form.alunos 
          };
        }
        // Se pertencer ao mesmo grupo de repetição semanal e for uma aula futura
        if (a.grupo_id && a.grupo_id === editing.grupo_id && new Date(a.data_hora).getTime() > new Date(editing.data_hora).getTime()) {
          const updatedAlunos = [
            ...a.alunos.filter(alId => !removed.includes(alId)),
            ...added.filter(alId => !a.alunos.includes(alId))
          ];
          return {
            ...a,
            professores: form.professores, // mantém professores em sincronia
            alunos: updatedAlunos
          };
        }
        return a;
      }));
      toast.success('Aula atualizada');
    } else {
      if (form.semanal) {
        const grupoId = 'g-' + Date.now();
        const novasAulas: Aula[] = [];
        
        for (let i = 0; i < 4; i++) {
          const dataObj = new Date(`${form.data}T${form.hora}:00`);
          dataObj.setDate(dataObj.getDate() + (i * 7));
          
          novasAulas.push({
            id: 'au-' + Date.now() + '-' + i,
            sala_id: form.sala_id,
            data_hora: dataObj.toISOString(),
            duracao: form.duracao,
            tipo: 'normal',
            estado: 'agendada',
            professores: form.professores,
            alunos: form.alunos,
            grupo_id: grupoId
          });
        }
        
        setAulas(prev => [...prev, ...novasAulas]);
        toast.success('Série de 4 aulas semanais criada com sucesso');
      } else {
        const nova: Aula = {
          id: 'au' + Date.now(), 
          sala_id: form.sala_id, 
          data_hora, 
          duracao: form.duracao,
          tipo: 'normal', 
          estado: 'agendada', 
          professores: form.professores, 
          alunos: form.alunos,
        };
        setAulas(prev => [...prev, nova]);
        toast.success('Aula criada');
      }
    }
    setOpen(false);
  };

  const handleStopWeekly = () => {
    if (!editing || !editing.grupo_id) return;
    
    setAulas(prev => {
      // 1. Elimina todas as aulas futuras do mesmo grupo
      const cleanAulas = prev.filter(a => {
        if (a.grupo_id === editing.grupo_id && new Date(a.data_hora).getTime() > new Date(editing.data_hora).getTime()) {
          return false;
        }
        return true;
      });

      // 2. Remove o grupo_id da aula editada atual, tornando-a avulsa/não recorrente
      return cleanAulas.map(a => {
        if (a.id === editing.id) {
          const { grupo_id, ...rest } = a;
          return rest as Aula;
        }
        return a;
      });
    });

    toast.success('Aula semanal interrompida. Aulas futuras eliminadas.');
    setOpen(false);
  };

  const handleCancelClass = () => {
    if (!editing) return;
    
    setAulas(prev => prev.map(a => a.id === editing.id ? { ...a, estado: 'pendente_reposicao' } : a));
    
    const professorNames = editing.professores.map(pId => getProfile(pId)?.nome || '').join(', ');

    const adminNotif = {
      id: 'n-adm-canc-' + Date.now(),
      mensagem: `Aula de ${formatDataHora(editing.data_hora)} (Prof. ${professorNames}) foi cancelada e precisa de reposição`,
      lida: false,
      tipo: 'cancelamento' as const,
      criado_em: new Date().toISOString(),
      destinatario_role: 'admin' as const,
    };

    const alunoNotifs = editing.alunos.map((alunoId, idx) => ({
      id: `n-al-canc-${Date.now()}-${idx}`,
      mensagem: `A sua aula de ${formatDataHora(editing.data_hora)} com o(a) Prof. ${professorNames} foi cancelada.`,
      lida: false,
      tipo: 'cancelamento' as const,
      criado_em: new Date().toISOString(),
      destinatario_role: 'aluno' as const,
      aluno_id: alunoId,
    }));

    setNotificacoes(prev => [adminNotif, ...alunoNotifs, ...prev]);

    // Simulate sending email to each student
    editing.alunos.forEach(alunoId => {
      const p = getProfile(alunoId);
      if (p && p.email) {
        toast.info(`E-mail enviado para ${p.email}: A aula no dia ${formatData(editing.data_hora)} na hora ${formatHora(editing.data_hora)} foi cancelada pelo professor.`, { duration: 6000 });
      }
    });

    toast.success('Aula cancelada e enviada para reposições');
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
      semanal: !!aula.grupo_id,
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
                    {a.grupo_id && <Badge variant="outline" className="ml-1 bg-primary/10 text-primary border-primary/20">Semanal</Badge>}
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

          {!editing && (
            <div className="flex items-center space-x-2 mt-2 bg-muted/40 p-2.5 rounded-md border">
              <Checkbox 
                id="semanal" 
                checked={form.semanal} 
                onCheckedChange={v => setForm({ ...form, semanal: !!v })} 
              />
              <Label htmlFor="semanal" className="cursor-pointer text-sm font-medium">
                Repetição semanal
              </Label>
            </div>
          )}

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
          <DialogFooter className="flex items-center justify-between gap-2">
            <div className="flex gap-2">
              {editing && editing.estado === 'agendada' && (
                <Button type="button" variant="destructive" onClick={handleCancelClass}>
                  Cancelar esta aula
                </Button>
              )}
              {editing?.grupo_id && (
                <Button type="button" variant="destructive" onClick={handleStopWeekly}>
                  Parar Aula Semanal
                </Button>
              )}
            </div>
            <Button onClick={handleSave} className="ml-auto">
              <CalendarDays className="w-4 h-4 mr-2" />Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
