import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useData } from '@/contexts/DataContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertTriangle, CheckCircle } from 'lucide-react';

const DAYS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

export default function StudentAbsence() {
  const { user } = useAuth();
  const { schedules, users, addNotification } = useData();
  const [selectedSchedule, setSelectedSchedule] = useState('');
  const [date, setDate] = useState('');
  const [sent, setSent] = useState(false);

  const mySchedules = schedules.filter(s => s.studentId === user?.id);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSchedule || !date) return;

    const schedule = mySchedules.find(s => s.id === selectedSchedule);
    if (schedule) {
      // Notify teacher
      addNotification(
        schedule.teacherId,
        `${user?.name} avisou que faltará à aula de ${new Date(date).toLocaleDateString('pt-PT')}.`,
        'absence'
      );
      // Notify admin (id '1')
      addNotification(
        '1',
        `${user?.name} avisou que faltará à aula de ${new Date(date).toLocaleDateString('pt-PT')}.`,
        'absence'
      );
    }
    setSent(true);
    setTimeout(() => setSent(false), 3000);
    setSelectedSchedule('');
    setDate('');
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-display font-bold">Avisar Falta</h1>

      <Card className="max-w-md">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-status-absent" />
            Notificar Ausência
          </CardTitle>
        </CardHeader>
        <CardContent>
          {sent ? (
            <div className="flex items-center gap-3 text-status-taught">
              <CheckCircle className="w-5 h-5" />
              <span className="text-sm font-medium">Aviso enviado com sucesso!</span>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Aula</Label>
                <Select value={selectedSchedule} onValueChange={setSelectedSchedule}>
                  <SelectTrigger><SelectValue placeholder="Selecionar aula..." /></SelectTrigger>
                  <SelectContent>
                    {mySchedules.map(s => {
                      const teacher = users.find(u => u.id === s.teacherId);
                      return (
                        <SelectItem key={s.id} value={s.id}>
                          {DAYS[s.dayOfWeek]} {s.startTime} — Prof. {teacher?.name}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Data da Falta</Label>
                <Input type="date" value={date} onChange={e => setDate(e.target.value)} />
              </div>
              <Button type="submit" className="w-full">Enviar Aviso</Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
