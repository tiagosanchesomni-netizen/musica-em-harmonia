import { useApp } from '@/contexts/AppContext';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Bell, AlertTriangle, X, Check, Trash2 } from 'lucide-react';
import { formatDataHora } from '@/lib/aulaHelpers';

export default function AdminNotificacoes() {
  const { notificacoes, setNotificacoes } = useApp();
  const lista = notificacoes.filter(n => n.destinatario_role === 'admin');

  const markRead = (id: string) => setNotificacoes(prev => prev.map(n => n.id === id ? { ...n, lida: true } : n));
  const markAll = () => setNotificacoes(prev => prev.map(n => n.destinatario_role === 'admin' ? { ...n, lida: true } : n));
  const deleteOne = (id: string) => setNotificacoes(prev => prev.filter(n => n.id !== id));
  const deleteAll = () => setNotificacoes(prev => prev.filter(n => n.destinatario_role !== 'admin'));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Notificações</h1>
          <p className="text-sm text-muted-foreground">Alertas de cancelamentos, presenças em atraso e reposições.</p>
        </div>
        <div className="flex gap-2">
          {lista.length > 0 && (
            <>
              <Button variant="outline" onClick={markAll}><Check className="w-4 h-4 mr-2" />Marcar todas como lidas</Button>
              <Button variant="destructive" onClick={deleteAll}><Trash2 className="w-4 h-4 mr-2" />Apagar todas</Button>
            </>
          )}
        </div>
      </div>

      <div className="space-y-3">
        {lista.length === 0 && (
          <Card className="p-8 text-center text-muted-foreground">Sem notificações.</Card>
        )}
        {lista.map(n => (
          <Card key={n.id} className={`p-4 flex items-start gap-3 ${n.lida ? 'opacity-60' : ''}`}>
            <div className={`p-2 rounded-md ${
              n.tipo === 'cancelamento'
                ? 'bg-status-canceled/10 text-status-canceled'
                : n.tipo === 'reposicao_marcada'
                ? 'bg-green-500/10 text-green-600'
                : 'bg-status-absent/10 text-status-absent'
            }`}>
              {n.tipo === 'cancelamento' ? (
                <X className="w-4 h-4" />
              ) : n.tipo === 'reposicao_marcada' ? (
                <Check className="w-4 h-4" />
              ) : (
                <AlertTriangle className="w-4 h-4" />
              )}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <Badge variant="outline">{n.tipo === 'cancelamento' ? 'Cancelamento' : n.tipo === 'atraso_presenca' ? 'Presenças em atraso' : 'Reposição'}</Badge>
                {!n.lida && <Badge className="bg-primary text-primary-foreground">Nova</Badge>}
              </div>
              <p className="mt-1 text-sm">{n.mensagem}</p>
              <p className="text-xs text-muted-foreground mt-1">{formatDataHora(n.criado_em)}</p>
            </div>
            <div className="flex items-center gap-1">
              {!n.lida && (
                <Button size="sm" variant="ghost" title="Marcar como lida" onClick={() => markRead(n.id)}><Check className="w-4 h-4" /></Button>
              )}
              <Button size="sm" variant="ghost" title="Apagar" onClick={() => deleteOne(n.id)} className="text-destructive hover:text-destructive hover:bg-destructive/10"><X className="w-4 h-4" /></Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
