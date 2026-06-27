import { useApp } from '@/contexts/AppContext';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CalendarDays, Clock } from 'lucide-react';
import { estadoConfig, filtroAluno, formatDataHora, diasEntre } from '@/lib/aulaHelpers';

export default function AlunoAulas() {
  const { aulas, currentUserId, getSala, getProfile } = useApp();
  const lista = filtroAluno(aulas, currentUserId);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">As minhas Aulas</h1>
        <p className="text-sm text-muted-foreground">Aulas previstas para os próximos 7 dias.</p>
      </div>

      {lista.length === 0 && (
        <Card className="p-8 text-center text-muted-foreground">Sem aulas previstas.</Card>
      )}

      <div className="grid gap-3">
        {lista.map(a => {
          const cfg = estadoConfig[a.estado];
          const isRepo = a.tipo === 'reposicao';
          const dias = diasEntre(a.data_hora);
          return (
            <Card key={a.id} className={`p-4 ${isRepo ? 'border-l-4 border-l-primary bg-primary/5' : ''}`}>
              <div className="flex items-start gap-3">
                <div className={`p-2 rounded-md ${isRepo ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground'}`}>
                  <CalendarDays className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold">{formatDataHora(a.data_hora)}</span>
                    <Badge className={cfg.className}>{cfg.label}</Badge>
                    {isRepo && <Badge className="bg-primary text-primary-foreground">Aula de Reposição</Badge>}
                    {dias === 0 && <Badge variant="outline"><Clock className="w-3 h-3 mr-1" />Hoje</Badge>}
                    {dias > 0 && dias <= 3 && <Badge variant="outline">Em {dias} dia(s)</Badge>}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {getSala(a.sala_id)?.nome} • {a.duracao} min
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Professor(es): {a.professores.map(p => getProfile(p)?.nome).join(', ')}
                  </p>
                  {isRepo && a.data_original && (
                    <p className="text-xs text-primary mt-1">Reposição da aula de {formatDataHora(a.data_original)}</p>
                  )}
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
