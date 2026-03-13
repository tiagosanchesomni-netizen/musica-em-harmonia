import { useAuth } from '@/contexts/AuthContext';
import { useData } from '@/contexts/DataContext';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

export default function StudentSummaries() {
  const { user } = useAuth();
  const { schedules, classRecords, users } = useData();

  const mySchedules = schedules.filter(s => s.studentId === user?.id);
  const myRecords = classRecords.filter(r => mySchedules.some(s => s.id === r.scheduleId) && r.status === 'taught');

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-display font-bold">Sumários</h1>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Professor</TableHead>
                <TableHead>Sumário</TableHead>
                <TableHead>Assiduidade</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {myRecords.map(record => {
                const schedule = mySchedules.find(s => s.id === record.scheduleId);
                const teacher = users.find(u => u.id === schedule?.teacherId);
                return (
                  <TableRow key={record.id}>
                    <TableCell>{new Date(record.date).toLocaleDateString('pt-PT')}</TableCell>
                    <TableCell className="font-medium">{teacher?.name}</TableCell>
                    <TableCell className="text-muted-foreground">{record.summary || '—'}</TableCell>
                    <TableCell>
                      <Badge variant={record.attendance === 'present' ? 'default' : 'destructive'}>
                        {record.attendance === 'present' ? 'Presente' : 'Faltou'}
                      </Badge>
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
