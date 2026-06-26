import { useApp } from '@/contexts/AppContext';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Bell, X, Check, Calendar } from 'lucide-react';
import { formatDataHora } from '@/lib/aulaHelpers';

export default function AlunoNotificacoes() {
  const { notificacoes, setNotificacoes, currentUserId } = useApp();
  
  // Filtrar notificações do aluno atual e que sejam de cancelamento ou reposição marcada
  const lista = notificacoes.filter(n => 
    n.destinatario_role === 'aluno' && 
    n.aluno_id === currentUserId && 
    (n.tipo === 'cancelamento' || n.tipo === 'reposicao_marcada')
  );

  const markRead = (id: string) => setNotificacoes(prev => prev.map(n => n.id === id ? { ...n, lida: true } : n));
  const markAll = () => setNotificacoes(prev => prev.map(n => 
    n.destinatario_role === 'aluno' && n.aluno_id === currentUserId ? { ...n, lida: true } : n
  ));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Notificações</h1>
          <p className="text-sm text-muted-foreground">Alertas de cancelamento de aulas e marcação de reposições.</p>
        </div>
        {lista.some(n => !n.lida) && (
          <Button variant="outline" size="sm" onClick={markAll}>
            <Check className="w-4 h-4 mr-2" /> Marcar todas como lidas
          </Button>
        )}
      </div>

      <div className="space-y-3">
        {lista.length === 0 && (
          <Card className="p-8 text-center text-muted-foreground">Sem notificações no momento.</Card>
        )}
        {lista.map(n => (
          <Card key={n.id} className={`p-4 flex items-start gap-3 ${n.lida ? 'opacity-65' : 'border-l-4 border-l-primary'}`}>
            <div className={`p-2 rounded-md ${n.tipo === 'cancelamento' ? 'bg-status-canceled/10 text-status-canceled' : 'bg-status-scheduled/10 text-status-scheduled'}`}>
              {n.tipo === 'cancelamento' ? <X className="w-4 h-4" /> : <Calendar className="w-4 h-4" />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <Badge variant="outline">
                  {n.tipo === 'cancelamento' ? 'Cancelamento' : 'Reposição Marcada'}
                </Badge>
                {!n.lida && <Badge className="bg-primary text-primary-foreground">Nova</Badge>}
              </div>
              <p className="mt-1 text-sm text-foreground">{n.mensagem}</p>
              <p className="text-xs text-muted-foreground mt-1">{formatDataHora(n.criado_em)}</p>
            </div>
            {!n.lida && (
              <Button size="sm" variant="ghost" onClick={() => markRead(n.id)} className="shrink-0">
                <Check className="w-4 h-4" />
              </Button>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}
