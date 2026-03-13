import { useAuth } from '@/contexts/AuthContext';
import { useData } from '@/contexts/DataContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CalendarDays, BookOpen, AlertTriangle } from 'lucide-react';

const DAYS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

export default function StudentDashboard() {
  const { user } = useAuth();
  const { schedules, classRecords, users, rooms } = useData();

  const mySchedules = schedules.filter(s => s.studentId === user?.id);
  const myRecords = classRecords.filter(r => mySchedules.some(s => s.id === r.scheduleId));
  const presentCount = myRecords.filter(r => r.attendance === 'present').length;
  const absentCount = myRecords.filter(r => r.attendance === 'absent').length;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-display font-bold">Painel do Aluno</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Aulas Semanais</p>
                <p className="text-3xl font-display font-bold mt-1">{mySchedules.length}</p>
              </div>
              <CalendarDays className="w-8 h-8 text-status-scheduled opacity-60" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Presenças</p>
                <p className="text-3xl font-display font-bold mt-1">{presentCount}</p>
              </div>
              <BookOpen className="w-8 h-8 text-status-taught opacity-60" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Faltas</p>
                <p className="text-3xl font-display font-bold mt-1">{absentCount}</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-status-canceled opacity-60" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Horário Semanal</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {mySchedules.map(s => {
              const teacher = users.find(u => u.id === s.teacherId);
              const room = rooms.find(r => r.id === s.roomId);
              return (
                <div key={s.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div>
                    <p className="text-sm font-medium">{DAYS[s.dayOfWeek]} — {s.startTime} às {s.endTime}</p>
                    <p className="text-xs text-muted-foreground">Prof. {teacher?.name} • {room?.name}</p>
                  </div>
                  <span className="text-xs font-medium px-2 py-1 rounded-full bg-status-scheduled/10 text-status-scheduled">
                    {s.recurring ? 'Semanal' : 'Avulsa'}
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
