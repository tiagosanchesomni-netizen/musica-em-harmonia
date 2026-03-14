import { useAuth } from '@/contexts/AuthContext';
import { useSchedules, useClassRecords, useProfiles } from '@/hooks/useSupabaseData';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, BookOpen, FileText, Loader2 } from 'lucide-react';

export default function TeacherDashboard() {
  const { user } = useAuth();
  const { data: schedules, loading: ls } = useSchedules();
  const { data: classRecords, loading: lc } = useClassRecords();
  const { data: profiles, loading: lp } = useProfiles();

  if (ls || lc || lp) {
    return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;
  }

  const mySchedules = schedules.filter(s => s.teacher_id === user?.id);
  const myStudentIds = [...new Set(mySchedules.map(s => s.student_id))];
  const myRecords = classRecords.filter(r => mySchedules.some(s => s.id === r.schedule_id));
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
              const student = profiles.find(u => u.id === sid);
              const studentSchedule = mySchedules.find(s => s.student_id === sid);
              return (
                <div key={sid} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <span className="text-sm font-medium">{student?.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {studentSchedule?.recurring ? 'Recorrente' : 'Avulsa'}
                  </span>
                </div>
              );
            })}
            {myStudentIds.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">Nenhum aluno atribuído.</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
