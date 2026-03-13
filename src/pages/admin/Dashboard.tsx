import { useData } from '@/contexts/DataContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, DoorOpen, CalendarDays, AlertTriangle } from 'lucide-react';

export default function AdminDashboard() {
  const { users, rooms, schedules, classRecords } = useData();
  const activeUsers = users.filter(u => u.status === 'active');
  const pendingReschedules = classRecords.filter(r => r.reschedulePending);

  const stats = [
    { label: 'Professores Ativos', value: activeUsers.filter(u => u.role === 'teacher').length, icon: Users, color: 'text-status-scheduled' },
    { label: 'Alunos Ativos', value: activeUsers.filter(u => u.role === 'student').length, icon: Users, color: 'text-status-present' },
    { label: 'Salas', value: rooms.length, icon: DoorOpen, color: 'text-muted-foreground' },
    { label: 'Aulas Agendadas', value: schedules.length, icon: CalendarDays, color: 'text-status-scheduled' },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-display font-bold">Painel de Gestão</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(s => (
          <Card key={s.label}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{s.label}</p>
                  <p className="text-3xl font-display font-bold mt-1">{s.value}</p>
                </div>
                <s.icon className={`w-8 h-8 ${s.color} opacity-60`} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {pendingReschedules.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <AlertTriangle className="w-5 h-5 text-status-absent" />
              Reposições Pendentes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {pendingReschedules.map(r => {
                const schedule = schedules.find(s => s.id === r.scheduleId);
                const student = users.find(u => u.id === schedule?.studentId);
                const teacher = users.find(u => u.id === schedule?.teacherId);
                return (
                  <div key={r.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <div>
                      <p className="text-sm font-medium">{student?.name} — Prof. {teacher?.name}</p>
                      <p className="text-xs text-muted-foreground">Aula cancelada em {new Date(r.date).toLocaleDateString('pt-PT')}</p>
                    </div>
                    <span className="text-xs font-medium px-2 py-1 rounded-full bg-status-absent/10 text-status-absent">
                      Pendente
                    </span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
