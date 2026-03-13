import { useAuth } from '@/contexts/AuthContext';
import { useData } from '@/contexts/DataContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, Download } from 'lucide-react';

export default function StudentDocuments() {
  const { user } = useAuth();
  const { schedules, classRecords } = useData();

  const mySchedules = schedules.filter(s => s.studentId === user?.id);
  const allAttachments = classRecords
    .filter(r => mySchedules.some(s => s.id === r.scheduleId))
    .flatMap(r => r.attachments.map(a => ({ ...a, date: r.date })));

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-display font-bold">Documentos</h1>

      {allAttachments.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
            <p className="text-muted-foreground">Nenhum documento disponível.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {allAttachments.map((att, i) => (
            <Card key={i}>
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-muted rounded-lg flex items-center justify-center">
                      <FileText className="w-5 h-5 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{att.name}</p>
                      <p className="text-xs text-muted-foreground">{new Date(att.date).toLocaleDateString('pt-PT')}</p>
                    </div>
                  </div>
                  <Button size="icon" variant="ghost">
                    <Download className="w-4 h-4" />
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
