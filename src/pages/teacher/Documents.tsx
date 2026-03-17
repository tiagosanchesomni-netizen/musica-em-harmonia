import { useAuth } from '@/contexts/AuthContext';
import { useSchedules, useClassRecords, useClassAttachments, useScheduleTeachers } from '@/hooks/useSupabaseData';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, Download, Loader2 } from 'lucide-react';

export default function TeacherDocuments() {
  const { user } = useAuth();
  const { data: schedules } = useSchedules();
  const { data: classRecords } = useClassRecords();
  const { data: attachments, loading } = useClassAttachments();
  const { data: scheduleTeachers } = useScheduleTeachers();

  const myScheduleIds = scheduleTeachers.filter(st => st.teacher_id === user?.id).map(st => st.schedule_id);
  const myRecordIds = classRecords
    .filter(r => myScheduleIds.includes(r.schedule_id))
    .map(r => r.id);
  const myAttachments = attachments.filter(a => myRecordIds.includes(a.class_record_id));

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-display font-bold">Documentos</h1>
      {myAttachments.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
            <p className="text-muted-foreground">Nenhum documento carregado ainda.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {myAttachments.map(att => (
            <Card key={att.id}>
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-muted rounded-lg flex items-center justify-center">
                      <FileText className="w-5 h-5 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{att.file_name}</p>
                      <p className="text-xs text-muted-foreground">{new Date(att.created_at).toLocaleDateString('pt-PT')}</p>
                    </div>
                  </div>
                  <Button size="icon" variant="ghost" asChild>
                    <a href={att.file_url} target="_blank" rel="noopener noreferrer">
                      <Download className="w-4 h-4" />
                    </a>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
