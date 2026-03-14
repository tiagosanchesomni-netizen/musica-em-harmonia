import { useAuth } from '@/contexts/AuthContext';
import { useSchedules, useClassRecords, useProfiles, useRooms } from '@/hooks/useSupabaseData';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CalendarDays, BookOpen, AlertTriangle, Loader2 } from 'lucide-react';

const DAYS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

export default function StudentDashboard() {
  const { user } = useAuth();
  const { data: schedules, loading: ls } = useSchedules();
  const { data: classRecords, loading: lc } = useClassRecords();
  const { data: profiles } = useProfiles();
  const { data: rooms } = useRooms();

  if (ls || lc) {
    return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;
  }

  const mySchedules = schedules.filter(s => s.student_id === user?.id);
  const myRecords = classRecords.filter(r => mySchedules.some(s => s.id === r.schedule_id));
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
              const teacher = profiles.find(u => u.id === s.teacher_id);
              const room = rooms.find(r => r.id === s.room_id);
              return (
                <div key={s.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div>
                    <p className="text-sm font-medium">{DAYS[s.day_of_week]} — {s.start_time} às {s.end_time}</p>
                    <p className="text-xs text-muted-foreground">Prof. {teacher?.name} • {room?.name}</p>
                  </div>
                  <span className="text-xs font-medium px-2 py-1 rounded-full bg-status-scheduled/10 text-status-scheduled">
                    {s.recurring ? 'Semanal' : 'Avulsa'}
                  </span>
                </div>
              );
            })}
            {mySchedules.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">Sem horário atribuído.</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
