import { useApp } from '@/contexts/AppContext';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatDataHora } from '@/lib/aulaHelpers';

export default function AlunoReposicoes() {
  const { aulas, currentUserId, getSala } = useApp();
  const pendentes = aulas.filter(a => a.alunos.includes(currentUserId) && a.estado === 'pendente_reposicao');
  const repostas = aulas.filter(a => a.alunos.includes(currentUserId) && a.tipo === 'reposicao');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Reposições</h1>
        <p className="text-sm text-muted-foreground">Aulas canceladas a aguardar nova data e reposições já marcadas.</p>
      </div>

      <Card>
        <div className="p-4 border-b font-semibold flex items-center gap-2">
          <Badge className="bg-status-absent text-status-absent-foreground">Aguardam marcação</Badge>
          <span className="text-sm text-muted-foreground">{pendentes.length}</span>
        </div>
        <div className="divide-y">
          {pendentes.length === 0 && <p className="p-4 text-sm text-muted-foreground text-center">Nenhuma aula por repor.</p>}
          {pendentes.map(a => (
            <div key={a.id} className="p-4">
              <p className="font-medium">{formatDataHora(a.data_hora)}</p>
              <p className="text-xs text-muted-foreground">{getSala(a.sala_id)?.nome}</p>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <div className="p-4 border-b font-semibold flex items-center gap-2">
          <Badge className="bg-status-scheduled text-status-scheduled-foreground">Já repostas</Badge>
          <span className="text-sm text-muted-foreground">{repostas.length}</span>
        </div>
        <div className="divide-y">
          {repostas.length === 0 && <p className="p-4 text-sm text-muted-foreground text-center">Ainda sem reposições.</p>}
          {repostas.map(a => (
            <div key={a.id} className="p-4">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-medium">{formatDataHora(a.data_hora)}</span>
                <Badge className="bg-primary text-primary-foreground">Reposição</Badge>
              </div>
              {a.data_original && (
                <p className="text-xs text-muted-foreground line-through mt-1">Era: {formatDataHora(a.data_original)}</p>
              )}
              <p className="text-xs text-muted-foreground">{getSala(a.sala_id)?.nome}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
