import { useAuth } from '@/contexts/AuthContext';
import { useData } from '@/contexts/DataContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const DAYS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

export default function StudentCalendar() {
  const { user } = useAuth();
  const { schedules, classRecords, users, rooms } = useData();

  const mySchedules = schedules.filter(s => s.studentId === user?.id);
  const myRecords = classRecords.filter(r => mySchedules.some(s => s.id === r.scheduleId));

  const statusLabels: Record<string, string> = { taught: 'Dada', canceled: 'Cancelada', scheduled: 'Agendada' };
  const statusColors: Record<string, string> = {
    taught: 'bg-status-taught text-status-taught-foreground',
    canceled: 'bg-status-canceled text-status-canceled-foreground',
    scheduled: 'bg-status-scheduled text-status-scheduled-foreground',
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-display font-bold">Calendário</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {mySchedules.map(s => {
          const teacher = users.find(u => u.id === s.teacherId);
          const room = rooms.find(r => r.id === s.roomId);
          const records = myRecords.filter(r => r.scheduleId === s.id);
          return (
            <Card key={s.id}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">
                  {DAYS[s.dayOfWeek]} — {s.startTime} às {s.endTime}
                </CardTitle>
                <p className="text-xs text-muted-foreground">Prof. {teacher?.name} • {room?.name}</p>
              </CardHeader>
              <CardContent>
                {records.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Sem registos.</p>
                ) : (
                  <div className="space-y-1.5">
                    {records.map(r => (
                      <div key={r.id} className="flex items-center justify-between text-sm">
                        <span>{new Date(r.date).toLocaleDateString('pt-PT')}</span>
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusColors[r.status]}`}>
                          {statusLabels[r.status]}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
