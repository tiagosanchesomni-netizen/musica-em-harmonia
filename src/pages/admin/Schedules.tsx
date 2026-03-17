import { useState } from 'react';
import { useProfiles, useRooms, useSchedules, useScheduleTeachers, useScheduleStudents, getScheduleTeacherIds, getScheduleStudentIds } from '@/hooks/useSupabaseData';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Plus, Trash2, AlertCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { MultiSelect } from '@/components/MultiSelect';

const DAYS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

export default function AdminSchedules() {
  const { data: profiles } = useProfiles();
  const { data: rooms } = useRooms();
  const { data: schedules, loading, refetch } = useSchedules();
  const { data: scheduleTeachers, refetch: refetchST } = useScheduleTeachers();
  const { data: scheduleStudents, refetch: refetchSS } = useScheduleStudents();
  const teachers = profiles.filter(u => u.role === 'teacher' && u.status === 'active');
  const students = profiles.filter(u => u.role === 'student' && u.status === 'active');

  const [dialogOpen, setDialogOpen] = useState(false);
  const [conflict, setConflict] = useState('');
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    teacher_ids: [] as string[], student_ids: [] as string[], room_id: '', day_of_week: 1,
    start_time: '10:00', end_time: '11:00', recurring: true,
  });

  const checkConflict = (): string | null => {
    for (const s of schedules) {
      if (s.day_of_week !== form.day_of_week) continue;
      const overlap = s.start_time < form.end_time && s.end_time > form.start_time;
      if (!overlap) continue;
      if (s.room_id === form.room_id) {
        const room = rooms.find(r => r.id === s.room_id);
        return `Conflito: ${room?.name} já está ocupada nesse horário.`;
      }
      const existingTeachers = getScheduleTeacherIds(s.id, scheduleTeachers);
      for (const tid of form.teacher_ids) {
        if (existingTeachers.includes(tid)) {
          const teacher = profiles.find(u => u.id === tid);
          return `Conflito: ${teacher?.name} já tem aula nesse horário.`;
        }
      }
    }
    return null;
  };

  const handleSave = async () => {
    if (form.teacher_ids.length === 0 || form.student_ids.length === 0 || !form.room_id) {
      setConflict('Preencha todos os campos obrigatórios.');
      return;
    }
    const conflictMsg = checkConflict();
    if (conflictMsg) { setConflict(conflictMsg); return; }
    setSaving(true);
    try {
      const { data: newSchedule, error: schedErr } = await (supabase.from('schedules') as any)
        .insert({
          room_id: form.room_id,
          day_of_week: form.day_of_week,
          start_time: form.start_time,
          end_time: form.end_time,
          recurring: form.recurring,
        })
        .select()
        .single();
      if (schedErr) throw schedErr;

      // Insert junction records
      const teacherRows = form.teacher_ids.map(tid => ({ schedule_id: newSchedule.id, teacher_id: tid }));
      const studentRows = form.student_ids.map(sid => ({ schedule_id: newSchedule.id, student_id: sid }));
      
      const { error: tErr } = await (supabase.from('schedule_teachers') as any).insert(teacherRows);
      if (tErr) throw tErr;
      const { error: sErr } = await (supabase.from('schedule_students') as any).insert(studentRows);
      if (sErr) throw sErr;

      toast.success('Horário criado.');
      refetch(); refetchST(); refetchSS();
      setDialogOpen(false);
      setConflict('');
    } catch (err: any) {
      toast.error(err.message);
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    await (supabase.from('schedules') as any).delete().eq('id', id);
    refetch(); refetchST(); refetchSS();
    toast.success('Horário eliminado.');
  };

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-display font-bold">Horários</h1>
        <Dialog open={dialogOpen} onOpenChange={o => { setDialogOpen(o); setConflict(''); }}>
          <DialogTrigger asChild>
            <Button onClick={() => setForm({ teacher_ids: [], student_ids: [], room_id: '', day_of_week: 1, start_time: '10:00', end_time: '11:00', recurring: true })}>
              <Plus className="w-4 h-4 mr-2" />Novo Horário
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Novo Horário</DialogTitle></DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label>Selecionar Professor(es)</Label>
                <MultiSelect
                  options={teachers.map(t => ({ value: t.id, label: t.name }))}
                  selected={form.teacher_ids}
                  onChange={v => setForm(f => ({ ...f, teacher_ids: v }))}
                  placeholder="Selecionar professor(es)..."
                />
              </div>
              <div className="space-y-2">
                <Label>Selecionar Aluno(s)</Label>
                <MultiSelect
                  options={students.map(s => ({ value: s.id, label: s.name }))}
                  selected={form.student_ids}
                  onChange={v => setForm(f => ({ ...f, student_ids: v }))}
                  placeholder="Selecionar aluno(s)..."
                />
              </div>
              <div className="space-y-2">
                <Label>Sala</Label>
                <Select value={form.room_id} onValueChange={v => setForm(f => ({ ...f, room_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Selecionar..." /></SelectTrigger>
                  <SelectContent>{rooms.map(r => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Dia da Semana</Label>
                <Select value={String(form.day_of_week)} onValueChange={v => setForm(f => ({ ...f, day_of_week: parseInt(v) }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{DAYS.map((d, i) => <SelectItem key={i} value={String(i)}>{d}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Início</Label>
                  <Input type="time" value={form.start_time} onChange={e => setForm(f => ({ ...f, start_time: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Fim</Label>
                  <Input type="time" value={form.end_time} onChange={e => setForm(f => ({ ...f, end_time: e.target.value }))} />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={form.recurring} onCheckedChange={v => setForm(f => ({ ...f, recurring: v }))} />
                <Label>Aula Recorrente (semanal)</Label>
              </div>
              {conflict && (
                <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 p-2 rounded-md">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {conflict}
                </div>
              )}
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
                <TableHead>Dia</TableHead>
                <TableHead>Horário</TableHead>
                <TableHead>Professor(es)</TableHead>
                <TableHead>Aluno(s)</TableHead>
                <TableHead>Sala</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {schedules.map(s => {
                const tIds = getScheduleTeacherIds(s.id, scheduleTeachers);
                const sIds = getScheduleStudentIds(s.id, scheduleStudents);
                return (
                  <TableRow key={s.id}>
                    <TableCell>{DAYS[s.day_of_week]}</TableCell>
                    <TableCell>{s.start_time} - {s.end_time}</TableCell>
                    <TableCell>{tIds.map(id => profiles.find(u => u.id === id)?.name).filter(Boolean).join(', ') || '—'}</TableCell>
                    <TableCell>{sIds.map(id => profiles.find(u => u.id === id)?.name).filter(Boolean).join(', ') || '—'}</TableCell>
                    <TableCell>{rooms.find(r => r.id === s.room_id)?.name}</TableCell>
                    <TableCell>
                      <Badge variant={s.recurring ? 'default' : 'outline'}>
                        {s.recurring ? 'Recorrente' : 'Avulsa'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button size="icon" variant="ghost" onClick={() => handleDelete(s.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
