import { useState } from 'react';
import { useApp } from '@/contexts/AppContext';
import { Aula } from '@/data/mockData';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import { formatDataHora } from '@/lib/aulaHelpers';

export default function ProfessorReposicoes() {
  const { aulas, setAulas, currentUserId, getSala, salas, setNotificacoes } = useApp();
  const pendentes = aulas.filter(a => a.estado === 'pendente_reposicao' && a.professores.includes(currentUserId));

  const [sel, setSel] = useState<Aula | null>(null);
  const [form, setForm] = useState({ sala_id: '', data: '', hora: '14:00' });

  const start = (a: Aula) => {
    const d = new Date(); d.setDate(d.getDate() + 7);
    setSel(a);
    setForm({ sala_id: a.sala_id, data: d.toISOString().slice(0, 10), hora: '14:00' });
  };

  const guardar = () => {
    if (!sel) return;
    const data_hora = new Date(`${form.data}T${form.hora}:00`).toISOString();
    setAulas(prev => prev.map(a => a.id === sel.id ? { ...a, estado: 'cancelada' } : a));
    const nova: Aula = {
      id: 'au' + Date.now(), sala_id: form.sala_id, data_hora, duracao: sel.duracao,
      tipo: 'reposicao', estado: 'agendada',
      professores: sel.professores, alunos: sel.alunos,
      aula_original_id: sel.id, data_original: sel.data_hora,
    };
    setAulas(prev => [...prev, nova]);
    setNotificacoes(prev => [{
      id: 'n' + Date.now(),
      mensagem: `Reposição marcada para ${formatDataHora(data_hora)}`,
      lida: false, tipo: 'reposicao_marcada', criado_em: new Date().toISOString(), destinatario_role: 'admin',
    }, ...prev]);
    toast.success('Reposição marcada');
    setSel(null);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Reposições</h1>
        <p className="text-sm text-muted-foreground">Aulas canceladas a aguardar nova marcação.</p>
      </div>

      {pendentes.length === 0 && <Card className="p-8 text-center text-muted-foreground">Sem aulas por repor.</Card>}

      <div className="grid gap-3">
        {pendentes.map(a => (
          <Card key={a.id} className="p-4 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Badge className="bg-status-absent text-status-absent-foreground">Por repor</Badge>
                <span className="font-semibold">Data original: {formatDataHora(a.data_hora)}</span>
              </div>
              <p className="text-sm text-muted-foreground mt-1">{getSala(a.sala_id)?.nome} • {a.duracao} min</p>
            </div>
            <Button onClick={() => start(a)}><RotateCcw className="w-4 h-4 mr-2" />Marcar nova data</Button>
          </Card>
        ))}
      </div>

      <Dialog open={!!sel} onOpenChange={o => !o && setSel(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Marcar Reposição</DialogTitle></DialogHeader>
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
          <DialogFooter><Button onClick={guardar}>Guardar</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
