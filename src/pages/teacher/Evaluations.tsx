import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useSchedules, useEvaluations, useProfiles, useScheduleTeachers, useScheduleStudents, getScheduleStudentIds } from '@/hooks/useSupabaseData';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Star, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

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
  const { data: schedules } = useSchedules();
  const { data: evaluations, loading, refetch } = useEvaluations();
  const { data: profiles } = useProfiles();
  const { data: scheduleTeachers } = useScheduleTeachers();
  const { data: scheduleStudents } = useScheduleStudents();

  const myScheduleIds = scheduleTeachers.filter(st => st.teacher_id === user?.id).map(st => st.schedule_id);
  const mySchedules = schedules.filter(s => myScheduleIds.includes(s.id));
  const myStudentIds = [...new Set(mySchedules.flatMap(s => getScheduleStudentIds(s.id, scheduleStudents)))];
  const myEvals = evaluations.filter(e => e.teacher_id === user?.id);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ student_id: '', technique: 5, theory: 5, commitment: 5, notes: '' });

  const handleSave = async () => {
    setSaving(true);
    try {
      await (supabase.from('evaluations') as any).insert({
        teacher_id: user!.id,
        student_id: form.student_id,
        date: new Date().toISOString().split('T')[0],
        technique: form.technique,
        theory: form.theory,
        commitment: form.commitment,
        notes: form.notes,
      });
      toast.success('Avaliação guardada.');
      refetch();
      setDialogOpen(false);
      setForm({ student_id: '', technique: 5, theory: 5, commitment: 5, notes: '' });
    } catch (err: any) {
      toast.error(err.message);
    }
    setSaving(false);
  };

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;
  }

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
                <Select value={form.student_id} onValueChange={v => setForm(f => ({ ...f, student_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Selecionar..." /></SelectTrigger>
                  <SelectContent>
                    {myStudentIds.map(sid => {
                      const s = profiles.find(u => u.id === sid);
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
              <Button onClick={handleSave} className="w-full" disabled={saving}>
                {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Guardar
              </Button>
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
                  <TableCell className="font-medium">{profiles.find(u => u.id === ev.student_id)?.name}</TableCell>
                  <TableCell><RatingStars value={ev.technique} /></TableCell>
                  <TableCell><RatingStars value={ev.theory} /></TableCell>
                  <TableCell><RatingStars value={ev.commitment} /></TableCell>
                  <TableCell className="text-muted-foreground max-w-[200px] truncate">{ev.notes || '—'}</TableCell>
                </TableRow>
              ))}
              {myEvals.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">Sem avaliações.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
