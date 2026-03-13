import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useData, type ClassRecord } from '@/contexts/DataContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Pencil } from 'lucide-react';

const statusLabels: Record<ClassRecord['status'], string> = {
  taught: 'Dada',
  canceled: 'Cancelada',
  scheduled: 'Agendada',
};

const statusColors: Record<ClassRecord['status'], string> = {
  taught: 'bg-status-taught text-status-taught-foreground',
  canceled: 'bg-status-canceled text-status-canceled-foreground',
  scheduled: 'bg-status-scheduled text-status-scheduled-foreground',
};

const attendanceLabels: Record<string, string> = {
  present: 'Presente',
  absent: 'Faltou',
};

export default function TeacherSummaries() {
  const { user } = useAuth();
  const { schedules, classRecords, setClassRecords, users } = useData();

  const mySchedules = schedules.filter(s => s.teacherId === user?.id);
  const myRecords = classRecords.filter(r => mySchedules.some(s => s.id === r.scheduleId));

  const [editRecord, setEditRecord] = useState<ClassRecord | null>(null);
  const [form, setForm] = useState({ summary: '', status: 'scheduled' as ClassRecord['status'], attendance: '' as string });

  const openEdit = (record: ClassRecord) => {
    setEditRecord(record);
    setForm({
      summary: record.summary,
      status: record.status,
      attendance: record.attendance || '',
    });
  };

  const handleSave = () => {
    if (!editRecord) return;
    setClassRecords(prev => prev.map(r =>
      r.id === editRecord.id
        ? {
            ...r,
            summary: form.summary,
            status: form.status,
            attendance: form.attendance as ClassRecord['attendance'],
            reschedulePending: form.status === 'canceled',
          }
        : r
    ));
    setEditRecord(null);
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-display font-bold">Sumários</h1>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Aluno</TableHead>
                <TableHead>Sumário</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Assiduidade</TableHead>
                <TableHead>Anexos</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {myRecords.map(record => {
                const schedule = mySchedules.find(s => s.id === record.scheduleId);
                const student = users.find(u => u.id === schedule?.studentId);
                return (
                  <TableRow key={record.id}>
                    <TableCell>{new Date(record.date).toLocaleDateString('pt-PT')}</TableCell>
                    <TableCell className="font-medium">{student?.name}</TableCell>
                    <TableCell className="max-w-[200px] truncate text-muted-foreground">
                      {record.summary || '—'}
                    </TableCell>
                    <TableCell>
                      <span className={`text-xs font-medium px-2 py-1 rounded-full ${statusColors[record.status]}`}>
                        {statusLabels[record.status]}
                      </span>
                    </TableCell>
                    <TableCell>
                      {record.attendance ? (
                        <Badge variant={record.attendance === 'present' ? 'default' : 'destructive'}>
                          {attendanceLabels[record.attendance]}
                        </Badge>
                      ) : '—'}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {record.attachments.length > 0 ? `${record.attachments.length} ficheiro(s)` : '—'}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button size="icon" variant="ghost" onClick={() => openEdit(record)}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={!!editRecord} onOpenChange={o => !o && setEditRecord(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Editar Sumário</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label>Sumário</Label>
              <Textarea rows={3} value={form.summary} onChange={e => setForm(f => ({ ...f, summary: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Estado da Aula</Label>
              <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v as ClassRecord['status'] }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="taught">Dada</SelectItem>
                  <SelectItem value="canceled">Cancelada</SelectItem>
                  <SelectItem value="scheduled">Agendada</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Assiduidade</Label>
              <Select value={form.attendance} onValueChange={v => setForm(f => ({ ...f, attendance: v }))}>
                <SelectTrigger><SelectValue placeholder="Selecionar..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="present">Presente</SelectItem>
                  <SelectItem value="absent">Faltou</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleSave} className="w-full">Guardar</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
