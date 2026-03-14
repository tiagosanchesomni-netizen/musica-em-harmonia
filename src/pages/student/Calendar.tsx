import { useAuth } from '@/contexts/AuthContext';
import { useSchedules, useClassRecords, useProfiles, useRooms } from '@/hooks/useSupabaseData';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

const DAYS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

export default function StudentCalendar() {
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
          const teacher = profiles.find(u => u.id === s.teacher_id);
          const room = rooms.find(r => r.id === s.room_id);
          const records = myRecords.filter(r => r.schedule_id === s.id);
          return (
            <Card key={s.id}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">
                  {DAYS[s.day_of_week]} — {s.start_time} às {s.end_time}
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
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusColors[r.status] || ''}`}>
                          {statusLabels[r.status] || r.status}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
        {mySchedules.length === 0 && (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">Sem horário atribuído.</CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
