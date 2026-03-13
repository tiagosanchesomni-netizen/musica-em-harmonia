import { useState } from 'react';
import { useData, type ScheduleEntry } from '@/contexts/DataContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Plus, Trash2, AlertCircle } from 'lucide-react';

const DAYS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

export default function AdminSchedules() {
  const { users, rooms, schedules, setSchedules } = useData();
  const teachers = users.filter(u => u.role === 'teacher' && u.status === 'active');
  const students = users.filter(u => u.role === 'student' && u.status === 'active');

  const [dialogOpen, setDialogOpen] = useState(false);
  const [conflict, setConflict] = useState('');
  const [form, setForm] = useState({
    teacherId: '', studentId: '', roomId: '', dayOfWeek: 1,
    startTime: '10:00', endTime: '11:00', recurring: true,
  });

  const checkConflict = (entry: Omit<ScheduleEntry, 'id'>): string | null => {
    for (const s of schedules) {
      if (s.dayOfWeek !== entry.dayOfWeek) continue;
      const overlap = s.startTime < entry.endTime && s.endTime > entry.startTime;
      if (!overlap) continue;
      if (s.roomId === entry.roomId) {
        const room = rooms.find(r => r.id === s.roomId);
        return `Conflito: ${room?.name} já está ocupada nesse horário.`;
      }
      if (s.teacherId === entry.teacherId) {
        const teacher = users.find(u => u.id === s.teacherId);
        return `Conflito: ${teacher?.name} já tem aula nesse horário.`;
      }
    }
    return null;
  };

  const handleSave = () => {
    const conflictMsg = checkConflict(form);
    if (conflictMsg) {
      setConflict(conflictMsg);
      return;
    }
    setSchedules(prev => [...prev, { id: `s${Date.now()}`, ...form }]);
    setDialogOpen(false);
    setConflict('');
  };

  const handleDelete = (id: string) => {
    setSchedules(prev => prev.filter(s => s.id !== id));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-display font-bold">Horários</h1>
        <Dialog open={dialogOpen} onOpenChange={o => { setDialogOpen(o); setConflict(''); }}>
          <DialogTrigger asChild>
            <Button><Plus className="w-4 h-4 mr-2" />Novo Horário</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Novo Horário</DialogTitle></DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label>Professor</Label>
                <Select value={form.teacherId} onValueChange={v => setForm(f => ({ ...f, teacherId: v }))}>
                  <SelectTrigger><SelectValue placeholder="Selecionar..." /></SelectTrigger>
                  <SelectContent>{teachers.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Aluno</Label>
                <Select value={form.studentId} onValueChange={v => setForm(f => ({ ...f, studentId: v }))}>
                  <SelectTrigger><SelectValue placeholder="Selecionar..." /></SelectTrigger>
                  <SelectContent>{students.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Sala</Label>
                <Select value={form.roomId} onValueChange={v => setForm(f => ({ ...f, roomId: v }))}>
                  <SelectTrigger><SelectValue placeholder="Selecionar..." /></SelectTrigger>
                  <SelectContent>{rooms.map(r => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Dia da Semana</Label>
                <Select value={String(form.dayOfWeek)} onValueChange={v => setForm(f => ({ ...f, dayOfWeek: parseInt(v) }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{DAYS.map((d, i) => <SelectItem key={i} value={String(i)}>{d}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Início</Label>
                  <Input type="time" value={form.startTime} onChange={e => setForm(f => ({ ...f, startTime: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Fim</Label>
                  <Input type="time" value={form.endTime} onChange={e => setForm(f => ({ ...f, endTime: e.target.value }))} />
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
                <TableHead>Dia</TableHead>
                <TableHead>Horário</TableHead>
                <TableHead>Professor</TableHead>
                <TableHead>Aluno</TableHead>
                <TableHead>Sala</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {schedules.map(s => (
                <TableRow key={s.id}>
                  <TableCell>{DAYS[s.dayOfWeek]}</TableCell>
                  <TableCell>{s.startTime} - {s.endTime}</TableCell>
                  <TableCell>{users.find(u => u.id === s.teacherId)?.name}</TableCell>
                  <TableCell>{users.find(u => u.id === s.studentId)?.name}</TableCell>
                  <TableCell>{rooms.find(r => r.id === s.roomId)?.name}</TableCell>
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
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
