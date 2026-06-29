import { useState } from 'react';
import { useApp } from '@/contexts/AppContext';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatDataHora } from '@/lib/aulaHelpers';
import { FileText, CalendarDays, User, Users, DoorOpen, Clock, Filter } from 'lucide-react';

export default function Sumarios() {
  const { aulas, currentRole, currentUserId, getProfile, getSala } = useApp();
  const [filtroTempo, setFiltroTempo] = useState<string>('todos');

  // Filter based on role (admins see all, teachers only see their own)
  const roleFilteredAulas = aulas.filter(a => {
    if (currentRole === 'admin') return true;
    if (currentRole === 'professor') return a.professores.includes(currentUserId);
    return false;
  });

  // Only completed/realizadas classes typically have summaries or need them
  const realizadasAulas = roleFilteredAulas.filter(a => a.estado === 'realizada');

  // Time filter logic
  const filterByTime = (aulasList: typeof aulas) => {
    const agora = new Date();
    return aulasList.filter(a => {
      const dataAula = new Date(a.data_hora);
      const diffTime = agora.getTime() - dataAula.getTime();
      const diffDays = diffTime / (1000 * 60 * 60 * 24);

      if (filtroTempo === 'semana') {
        return diffDays >= 0 && diffDays <= 7;
      }
      if (filtroTempo === 'mes') {
        return diffDays >= 0 && diffDays <= 30;
      }
      if (filtroTempo === '2meses') {
        return diffDays >= 0 && diffDays <= 60;
      }
      if (filtroTempo === '5meses') {
        return diffDays >= 0 && diffDays <= 150;
      }
      return true;
    });
  };

  const filtered = filterByTime(realizadasAulas);

  // Ordered by date, from most recent to oldest
  const sorted = [...filtered].sort(
    (a, b) => new Date(b.data_hora).getTime() - new Date(a.data_hora).getTime()
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Sumários</h1>
          <p className="text-sm text-muted-foreground">
            Histórico de sumários de aulas concluídas.
          </p>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Select value={filtroTempo} onValueChange={setFiltroTempo}>
            <SelectTrigger className="w-full sm:w-[200px]">
              <span className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-muted-foreground" />
                <SelectValue placeholder="Filtrar por data" />
              </span>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              <SelectItem value="semana">Esta semana</SelectItem>
              <SelectItem value="mes">Este mês</SelectItem>
              <SelectItem value="2meses">Últimos 2 meses</SelectItem>
              <SelectItem value="5meses">Últimos 5 meses</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-4">
        {sorted.length === 0 && (
          <Card className="p-8 text-center text-muted-foreground">
            Nenhum sumário encontrado para o período selecionado.
          </Card>
        )}

        {sorted.map(a => {
          const profNames = a.professores.map(pId => getProfile(pId)?.nome).filter(Boolean).join(', ');
          const aluNames = a.alunos.map(aId => getProfile(aId)?.nome).filter(Boolean).join(', ');

          return (
            <Card key={a.id} className="p-5 space-y-4 hover:shadow-md transition">
              <div className="flex flex-wrap items-start justify-between gap-2 border-b pb-3">
                <div className="space-y-1">
                  <h3 className="font-bold text-lg text-primary">{a.nome || 'Aula'}</h3>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <CalendarDays className="w-3.5 h-3.5" />
                      {formatDataHora(a.data_hora)}
                    </span>
                    <span className="flex items-center gap-1">
                      <DoorOpen className="w-3.5 h-3.5" />
                      {getSala(a.sala_id)?.nome || 'Sem sala'}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {a.duracao} min
                    </span>
                  </div>
                </div>
                {a.tipo === 'reposicao' && (
                  <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20">
                    Reposição
                  </Badge>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-muted-foreground bg-muted/30 p-3 rounded">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-primary shrink-0" />
                  <div>
                    <span className="font-semibold block text-[10px] uppercase tracking-wider text-muted-foreground/80">Professores</span>
                    <span className="text-foreground font-medium">{profNames || '—'}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-primary shrink-0" />
                  <div>
                    <span className="font-semibold block text-[10px] uppercase tracking-wider text-muted-foreground/80">Alunos</span>
                    <span className="text-foreground font-medium">{aluNames || '—'}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <h4 className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                  <FileText className="w-3.5 h-3.5 text-primary" />
                  Sumário
                </h4>
                <div className="p-3.5 rounded-lg border bg-card text-sm text-foreground whitespace-pre-wrap min-h-[50px]">
                  {a.sumario?.trim() ? (
                    a.sumario
                  ) : (
                    <span className="text-muted-foreground italic">Sem sumário</span>
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
