import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useData, type Evaluation } from '@/contexts/DataContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Star } from 'lucide-react';

function RatingStars({ value }: { value: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 10 }, (_, i) => (
        <Star key={i} className={`w-3 h-3 ${i < value ? 'fill-status-absent text-status-absent' : 'text-muted-foreground/30'}`} />
      ))}
      <span className="ml-1 text-xs text-muted-foreground">{value}/10</span>
    </div>
  );
}

export default function TeacherEvaluations() {
  const { user } = useAuth();
  const { schedules, evaluations, setEvaluations, users } = useData();

  const mySchedules = schedules.filter(s => s.teacherId === user?.id);
  const myStudentIds = [...new Set(mySchedules.map(s => s.studentId))];
  const myEvals = evaluations.filter(e => e.teacherId === user?.id);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ studentId: '', technique: 5, theory: 5, commitment: 5, notes: '' });

  const handleSave = () => {
    const newEval: Evaluation = {
      id: `e${Date.now()}`,
      teacherId: user!.id,
      studentId: form.studentId,
      date: new Date().toISOString().split('T')[0],
      technique: form.technique,
      theory: form.theory,
      commitment: form.commitment,
      notes: form.notes,
    };
    setEvaluations(prev => [...prev, newEval]);
    setDialogOpen(false);
    setForm({ studentId: '', technique: 5, theory: 5, commitment: 5, notes: '' });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold">Avaliações Privadas</h1>
          <p className="text-sm text-muted-foreground mt-1">Visíveis apenas para professores e administradores.</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="w-4 h-4 mr-2" />Nova Avaliação</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Nova Avaliação</DialogTitle></DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label>Aluno</Label>
                <Select value={form.studentId} onValueChange={v => setForm(f => ({ ...f, studentId: v }))}>
                  <SelectTrigger><SelectValue placeholder="Selecionar..." /></SelectTrigger>
                  <SelectContent>
                    {myStudentIds.map(sid => {
                      const s = users.find(u => u.id === sid);
                      return <SelectItem key={sid} value={sid}>{s?.name}</SelectItem>;
                    })}
                  </SelectContent>
                </Select>
              </div>
              {(['technique', 'theory', 'commitment'] as const).map(field => (
                <div key={field} className="space-y-2">
                  <Label>{field === 'technique' ? 'Técnica' : field === 'theory' ? 'Teoria' : 'Empenho'}</Label>
                  <Input
                    type="number" min={0} max={10}
                    value={form[field]}
                    onChange={e => setForm(f => ({ ...f, [field]: Math.min(10, Math.max(0, parseInt(e.target.value) || 0)) }))}
                  />
                </div>
              ))}
              <div className="space-y-2">
                <Label>Observações</Label>
                <Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
              </div>
              <Button onClick={handleSave} className="w-full">Guardar</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Aluno</TableHead>
                <TableHead>Técnica</TableHead>
                <TableHead>Teoria</TableHead>
                <TableHead>Empenho</TableHead>
                <TableHead>Observações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {myEvals.map(ev => (
                <TableRow key={ev.id}>
                  <TableCell>{new Date(ev.date).toLocaleDateString('pt-PT')}</TableCell>
                  <TableCell className="font-medium">{users.find(u => u.id === ev.studentId)?.name}</TableCell>
                  <TableCell><RatingStars value={ev.technique} /></TableCell>
                  <TableCell><RatingStars value={ev.theory} /></TableCell>
                  <TableCell><RatingStars value={ev.commitment} /></TableCell>
                  <TableCell className="text-muted-foreground max-w-[200px] truncate">{ev.notes || '—'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
