import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useSchedules, useProfiles, createNotification } from '@/hooks/useSupabaseData';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertTriangle, CheckCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const DAYS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

export default function StudentAbsence() {
  const { user } = useAuth();
  const { data: schedules } = useSchedules();
  const { data: profiles } = useProfiles();
  const [selectedSchedule, setSelectedSchedule] = useState('');
  const [date, setDate] = useState('');
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);

  const mySchedules = schedules.filter(s => s.student_id === user?.id);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSchedule || !date || !user) return;
    setSending(true);

    try {
      const schedule = mySchedules.find(s => s.id === selectedSchedule);
      if (schedule) {
        const dateStr = new Date(date).toLocaleDateString('pt-PT');
        // Notify teacher
        await createNotification(schedule.teacher_id, `${user.name} avisou que faltará à aula de ${dateStr}.`, 'absence');
        // Notify admins
        const admins = profiles.filter(p => p.role === 'admin');
        for (const admin of admins) {
          await createNotification(admin.id, `${user.name} avisou que faltará à aula de ${dateStr}.`, 'absence');
        }
      }
      setSent(true);
      toast.success('Aviso enviado com sucesso!');
      setTimeout(() => setSent(false), 3000);
      setSelectedSchedule('');
      setDate('');
    } catch (err: any) {
      toast.error(err.message);
    }
    setSending(false);
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
                      const teacher = profiles.find(u => u.id === s.teacher_id);
                      return (
                        <SelectItem key={s.id} value={s.id}>
                          {DAYS[s.day_of_week]} {s.start_time} — Prof. {teacher?.name}
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
              <Button type="submit" className="w-full" disabled={sending}>
                {sending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Enviar Aviso
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
