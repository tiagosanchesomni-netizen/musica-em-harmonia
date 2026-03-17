import { useState } from 'react';
import { useClassRecords, useSchedules, useProfiles, useRooms, useRescheduledClasses, useScheduleTeachers, useScheduleStudents, getScheduleTeacherIds, getScheduleStudentIds } from '@/hooks/useSupabaseData';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { CalendarPlus, Loader2, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function AdminRescheduling() {
  const { data: classRecords, refetch: refetchCr } = useClassRecords();
  const { data: schedules } = useSchedules();
  const { data: profiles } = useProfiles();
  const { data: rooms, loading } = useRooms();
  const { data: rescheduled, refetch: refetchRs } = useRescheduledClasses();
  const { data: scheduleTeachers } = useScheduleTeachers();
  const { data: scheduleStudents } = useScheduleStudents();

  const pending = classRecords.filter(r => r.reschedule_pending);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    new_date: '', new_start_time: '10:00', new_end_time: '11:00', room_id: '',
  });

  const openSchedule = (record: any) => {
    setSelectedRecord(record);
    setForm({ new_date: '', new_start_time: '10:00', new_end_time: '11:00', room_id: '' });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!selectedRecord || !form.new_date || !form.room_id) return;
    setSaving(true);
    try {
      await (supabase.from('rescheduled_classes') as any).insert({
        original_class_record_id: selectedRecord.id,
        ...form,
      });
      await (supabase.from('class_records') as any).update({ reschedule_pending: false }).eq('id', selectedRecord.id);
      toast.success('Reposição agendada com sucesso.');
      refetchCr();
      refetchRs();
      setDialogOpen(false);
    } catch (err: any) {
      toast.error(err.message);
    }
    setSaving(false);
  };

  const markCompleted = async (id: string) => {
    await (supabase.from('rescheduled_classes') as any).update({ status: 'completed' }).eq('id', id);
    refetchRs();
    toast.success('Reposição marcada como concluída.');
  };

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;
  }

  const statusLabels: Record<string, string> = { pending: 'Pendente', confirmed: 'Confirmada', completed: 'Concluída' };
  const statusVariant = (s: string) => s === 'completed' ? 'default' as const : s === 'confirmed' ? 'secondary' as const : 'outline' as const;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-display font-bold">Reposições</h1>

      {pending.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Aulas Canceladas — Pendentes de Reposição</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data Original</TableHead>
                  <TableHead>Professor(es)</TableHead>
                  <TableHead>Aluno(s)</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pending.map(r => {
                  const schedule = schedules.find(s => s.id === r.schedule_id);
                  const teacherIds = schedule ? getScheduleTeacherIds(schedule.id, scheduleTeachers) : [];
                  const studentIds = schedule ? getScheduleStudentIds(schedule.id, scheduleStudents) : [];
                  const teacherNames = teacherIds.map(id => profiles.find(u => u.id === id)?.name).filter(Boolean).join(', ');
                  const studentNames = studentIds.map(id => profiles.find(u => u.id === id)?.name).filter(Boolean).join(', ');
                  return (
                    <TableRow key={r.id}>
                      <TableCell>{new Date(r.date).toLocaleDateString('pt-PT')}</TableCell>
                      <TableCell>{teacherNames || '—'}</TableCell>
                      <TableCell>{studentNames || '—'}</TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" onClick={() => openSchedule(r)}>
                          <CalendarPlus className="w-4 h-4 mr-2" />Agendar
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Reposições Agendadas</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data da Reposição</TableHead>
                <TableHead>Horário</TableHead>
                <TableHead>Sala</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rescheduled.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    Nenhuma reposição agendada.
                  </TableCell>
                </TableRow>
              ) : (
                rescheduled.map(rs => (
                  <TableRow key={rs.id}>
                    <TableCell>{new Date(rs.new_date).toLocaleDateString('pt-PT')}</TableCell>
                    <TableCell>{rs.new_start_time} - {rs.new_end_time}</TableCell>
                    <TableCell>{rooms.find(r => r.id === rs.room_id)?.name}</TableCell>
                    <TableCell>
                      <Badge variant={statusVariant(rs.status)}>{statusLabels[rs.status] || rs.status}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {rs.status !== 'completed' && (
                        <Button size="sm" variant="ghost" onClick={() => markCompleted(rs.id)}>
                          <CheckCircle className="w-4 h-4 mr-1" />Concluída
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Agendar Reposição</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label>Data</Label>
              <Input type="date" value={form.new_date} onChange={e => setForm(f => ({ ...f, new_date: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Início</Label>
                <Input type="time" value={form.new_start_time} onChange={e => setForm(f => ({ ...f, new_start_time: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Fim</Label>
                <Input type="time" value={form.new_end_time} onChange={e => setForm(f => ({ ...f, new_end_time: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Sala</Label>
              <Select value={form.room_id} onValueChange={v => setForm(f => ({ ...f, room_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Selecionar..." /></SelectTrigger>
                <SelectContent>{rooms.map(r => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <Button onClick={handleSave} className="w-full" disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Guardar Reposição
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
