import { useAuth } from '@/contexts/AuthContext';
import { useSchedules, useClassRecords, useProfiles, useScheduleStudents, useScheduleTeachers, getScheduleTeacherIds } from '@/hooks/useSupabaseData';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Loader2 } from 'lucide-react';

export default function StudentSummaries() {
  const { user } = useAuth();
  const { data: schedules } = useSchedules();
  const { data: classRecords, loading } = useClassRecords();
  const { data: profiles } = useProfiles();
  const { data: scheduleStudents } = useScheduleStudents();
  const { data: scheduleTeachers } = useScheduleTeachers();

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;
  }

  const myScheduleIds = scheduleStudents.filter(ss => ss.student_id === user?.id).map(ss => ss.schedule_id);
  const mySchedules = schedules.filter(s => myScheduleIds.includes(s.id));
  const myRecords = classRecords.filter(r => myScheduleIds.includes(r.schedule_id) && r.status === 'taught');

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-display font-bold">Sumários</h1>
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Professor(es)</TableHead>
                <TableHead>Sumário</TableHead>
                <TableHead>Assiduidade</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {myRecords.map(record => {
                const schedule = mySchedules.find(s => s.id === record.schedule_id);
                const teacherIds = schedule ? getScheduleTeacherIds(schedule.id, scheduleTeachers) : [];
                const teacherNames = teacherIds.map(id => profiles.find(u => u.id === id)?.name).filter(Boolean).join(', ');
                return (
                  <TableRow key={record.id}>
                    <TableCell>{new Date(record.date).toLocaleDateString('pt-PT')}</TableCell>
                    <TableCell className="font-medium">{teacherNames || '—'}</TableCell>
                    <TableCell className="text-muted-foreground">{record.summary || '—'}</TableCell>
                    <TableCell>
                      <Badge variant={record.attendance === 'present' ? 'default' : 'destructive'}>
                        {record.attendance === 'present' ? 'Presente' : 'Faltou'}
                      </Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
              {myRecords.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground py-8">Sem sumários disponíveis.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
