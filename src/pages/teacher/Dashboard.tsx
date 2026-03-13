import { useAuth } from '@/contexts/AuthContext';
import { useData } from '@/contexts/DataContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, BookOpen, FileText } from 'lucide-react';

export default function TeacherDashboard() {
  const { user } = useAuth();
  const { schedules, classRecords, users } = useData();

  const mySchedules = schedules.filter(s => s.teacherId === user?.id);
  const myStudentIds = [...new Set(mySchedules.map(s => s.studentId))];
  const myRecords = classRecords.filter(r => mySchedules.some(s => s.id === r.scheduleId));
  const taughtCount = myRecords.filter(r => r.status === 'taught').length;
  const scheduledCount = myRecords.filter(r => r.status === 'scheduled').length;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-display font-bold">Painel do Professor</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Alunos</p>
                <p className="text-3xl font-display font-bold mt-1">{myStudentIds.length}</p>
              </div>
              <Users className="w-8 h-8 text-status-scheduled opacity-60" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Aulas Dadas</p>
                <p className="text-3xl font-display font-bold mt-1">{taughtCount}</p>
              </div>
              <BookOpen className="w-8 h-8 text-status-taught opacity-60" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Próximas Aulas</p>
                <p className="text-3xl font-display font-bold mt-1">{scheduledCount}</p>
              </div>
              <FileText className="w-8 h-8 text-status-scheduled opacity-60" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Os Meus Alunos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {myStudentIds.map(sid => {
              const student = users.find(u => u.id === sid);
              const studentSchedule = mySchedules.find(s => s.studentId === sid);
              return (
                <div key={sid} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <span className="text-sm font-medium">{student?.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {studentSchedule?.recurring ? 'Recorrente' : 'Avulsa'}
                  </span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
