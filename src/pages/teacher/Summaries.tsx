import { useState, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useSchedules, useClassRecords, useProfiles, useClassAttachments, uploadClassDocument } from '@/hooks/useSupabaseData';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Pencil, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const statusLabels: Record<string, string> = { taught: 'Dada', canceled: 'Cancelada', scheduled: 'Agendada' };
const statusColors: Record<string, string> = {
  taught: 'bg-status-taught text-status-taught-foreground',
  canceled: 'bg-status-canceled text-status-canceled-foreground',
  scheduled: 'bg-status-scheduled text-status-scheduled-foreground',
};
const attendanceLabels: Record<string, string> = { present: 'Presente', absent: 'Faltou' };

export default function TeacherSummaries() {
  const { user } = useAuth();
  const { data: schedules } = useSchedules();
  const { data: classRecords, loading, refetch } = useClassRecords();
  const { data: profiles } = useProfiles();
  const { data: attachments, refetch: refetchAtt } = useClassAttachments();

  const mySchedules = schedules.filter(s => s.teacher_id === user?.id);
  const myRecords = classRecords.filter(r => mySchedules.some(s => s.id === r.schedule_id));

  const [editRecord, setEditRecord] = useState<any>(null);
  const [form, setForm] = useState({ summary: '', status: 'scheduled', attendance: '' });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const openEdit = (record: any) => {
    setEditRecord(record);
    setForm({ summary: record.summary || '', status: record.status, attendance: record.attendance || '' });
  };

  const handleSave = async () => {
    if (!editRecord) return;
    setSaving(true);
    try {
      await (supabase.from('class_records') as any).update({
        summary: form.summary,
        status: form.status,
        attendance: form.attendance || null,
        reschedule_pending: form.status === 'canceled',
        updated_at: new Date().toISOString(),
      }).eq('id', editRecord.id);
      toast.success('Sumário guardado.');
      refetch();
      setEditRecord(null);
    } catch (err: any) {
      toast.error(err.message);
    }
    setSaving(false);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !editRecord || !user) return;
    setUploading(true);
    try {
      for (const file of Array.from(e.target.files)) {
        await uploadClassDocument(file, editRecord.id, user.id);
      }
      toast.success('Ficheiro(s) carregado(s).');
      refetchAtt();
    } catch (err: any) {
      toast.error(err.message);
    }
    setUploading(false);
    if (fileRef.current) fileRef.current.value = '';
  };

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;
  }

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
                const schedule = mySchedules.find(s => s.id === record.schedule_id);
                const student = profiles.find(u => u.id === schedule?.student_id);
                const recordAttachments = attachments.filter(a => a.class_record_id === record.id);
                return (
                  <TableRow key={record.id}>
                    <TableCell>{new Date(record.date).toLocaleDateString('pt-PT')}</TableCell>
                    <TableCell className="font-medium">{student?.name}</TableCell>
                    <TableCell className="max-w-[200px] truncate text-muted-foreground">
                      {record.summary || '—'}
                    </TableCell>
                    <TableCell>
                      <span className={`text-xs font-medium px-2 py-1 rounded-full ${statusColors[record.status] || ''}`}>
                        {statusLabels[record.status] || record.status}
                      </span>
                    </TableCell>
                    <TableCell>
                      {record.attendance ? (
                        <Badge variant={record.attendance === 'present' ? 'default' : 'destructive'}>
                          {attendanceLabels[record.attendance] || record.attendance}
                        </Badge>
                      ) : '—'}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {recordAttachments.length > 0 ? `${recordAttachments.length} ficheiro(s)` : '—'}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button size="icon" variant="ghost" onClick={() => openEdit(record)}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
              {myRecords.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    Sem registos de aulas.
                  </TableCell>
                </TableRow>
              )}
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
              <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
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
            <div className="space-y-2">
              <Label>Anexar Ficheiros</Label>
              <div className="flex items-center gap-2">
                <input ref={fileRef} type="file" multiple accept=".pdf,.jpg,.jpeg,.png,.gif" onChange={handleFileUpload} className="text-sm" />
                {uploading && <Loader2 className="w-4 h-4 animate-spin" />}
              </div>
            </div>
            <Button onClick={handleSave} className="w-full" disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Guardar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
