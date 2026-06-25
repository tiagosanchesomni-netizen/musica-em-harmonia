import { useApp } from '@/contexts/AppContext';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Bell, AlertTriangle, X, Check } from 'lucide-react';
import { formatDataHora } from '@/lib/aulaHelpers';

export default function AdminNotificacoes() {
  const { notificacoes, setNotificacoes } = useApp();
  const lista = notificacoes.filter(n => n.destinatario_role === 'admin');

  const markRead = (id: string) => setNotificacoes(prev => prev.map(n => n.id === id ? { ...n, lida: true } : n));
  const markAll = () => setNotificacoes(prev => prev.map(n => n.destinatario_role === 'admin' ? { ...n, lida: true } : n));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Notificações</h1>
          <p className="text-sm text-muted-foreground">Alertas de cancelamentos e presenças em atraso.</p>
        </div>
        <Button variant="outline" onClick={markAll}><Check className="w-4 h-4 mr-2" />Marcar todas como lidas</Button>
      </div>

      <div className="space-y-3">
        {lista.length === 0 && (
          <Card className="p-8 text-center text-muted-foreground">Sem notificações.</Card>
        )}
        {lista.map(n => (
          <Card key={n.id} className={`p-4 flex items-start gap-3 ${n.lida ? 'opacity-60' : ''}`}>
            <div className={`p-2 rounded-md ${n.tipo === 'cancelamento' ? 'bg-status-canceled/10 text-status-canceled' : 'bg-status-absent/10 text-status-absent'}`}>
              {n.tipo === 'cancelamento' ? <X className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <Badge variant="outline">{n.tipo === 'cancelamento' ? 'Cancelamento' : n.tipo === 'atraso_presenca' ? 'Presenças em atraso' : 'Reposição'}</Badge>
                {!n.lida && <Badge className="bg-primary text-primary-foreground">Nova</Badge>}
              </div>
              <p className="mt-1 text-sm">{n.mensagem}</p>
              <p className="text-xs text-muted-foreground mt-1">{formatDataHora(n.criado_em)}</p>
            </div>
            {!n.lida && (
              <Button size="sm" variant="ghost" onClick={() => markRead(n.id)}><Check className="w-4 h-4" /></Button>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}
