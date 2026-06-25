import { useState, useRef } from 'react';
import { useApp } from '@/contexts/AppContext';
import { Aula, Documento } from '@/data/mockData';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Upload, Check, X, FileText, Clock, CalendarDays } from 'lucide-react';
import { toast } from 'sonner';
import { estadoConfig, filtroProfessor, formatDataHora, diasEntre } from '@/lib/aulaHelpers';

export default function ProfessorAulas() {
  const { aulas, setAulas, currentUserId, getSala, getProfile, assiduidades, setAssiduidades, documentos, setDocumentos, setNotificacoes } = useApp();
  const lista = filtroProfessor(aulas, currentUserId);
  const [selected, setSelected] = useState<Aula | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const toggle = (aulaId: string, alunoId: string) => {
    const ex = assiduidades.find(a => a.aula_id === aulaId && a.aluno_id === alunoId);
    if (ex) setAssiduidades(prev => prev.map(a => a.id === ex.id ? { ...a, presente: !a.presente } : a));
    else setAssiduidades(prev => [...prev, { id: 'as' + Date.now(), aula_id: aulaId, aluno_id: alunoId, presente: true }]);
  };

  const finalizar = () => {
    if (!selected) return;
    setAulas(prev => prev.map(a => a.id === selected.id ? { ...a, estado: 'realizada', presencas_finalizadas: true } : a));
    toast.success('Aula finalizada');
    setSelected(null);
  };

  const cancelar = () => {
    if (!selected) return;
    setAulas(prev => prev.map(a => a.id === selected.id ? { ...a, estado: 'pendente_reposicao' } : a));
    setNotificacoes(prev => [{
      id: 'n' + Date.now(),
      mensagem: `Aula de ${formatDataHora(selected.data_hora)} foi cancelada e precisa de reposição`,
      lida: false, tipo: 'cancelamento', criado_em: new Date().toISOString(), destinatario_role: 'admin',
    }, ...prev]);
    toast.success('Aula cancelada e enviada para reposições');
    setSelected(null);
  };

  const upload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (!f || !selected) return;
    const novo: Documento = {
      id: 'd' + Date.now(), nome: f.name, url: '#',
      aula_id: selected.id, criado_por: currentUserId, criado_em: new Date().toISOString(),
    };
    setDocumentos(prev => [novo, ...prev]);
    toast.success('Documento associado à aula');
    e.target.value = '';
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Aulas</h1>
        <p className="text-sm text-muted-foreground">Aulas dos próximos 5 dias e dos últimos 2 dias.</p>
      </div>

      {lista.length === 0 && (
        <Card className="p-8 text-center text-muted-foreground">Não há aulas neste intervalo.</Card>
      )}

      <div className="grid gap-3">
        {lista.map(a => {
          const cfg = estadoConfig[a.estado];
          const dias = diasEntre(a.data_hora);
          const isRepo = a.tipo === 'reposicao';
          return (
            <Card key={a.id}
              onClick={() => setSelected(a)}
              className={`p-4 cursor-pointer hover:shadow-md transition ${isRepo ? 'border-l-4 border-l-primary bg-primary/5' : ''}`}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <CalendarDays className="w-4 h-4 text-muted-foreground" />
                    <span className="font-semibold">{formatDataHora(a.data_hora)}</span>
                    <Badge className={cfg.className}>{cfg.label}</Badge>
                    {isRepo && <Badge className="bg-primary text-primary-foreground">Aula de Reposição</Badge>}
                    {dias === 0 && <Badge variant="outline"><Clock className="w-3 h-3 mr-1" />Hoje</Badge>}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {getSala(a.sala_id)?.nome} • {a.duracao} min • {a.alunos.length} aluno(s)
                  </p>
                  {isRepo && a.data_original && (
                    <p className="text-xs text-muted-foreground mt-1">Reposição da aula de {formatDataHora(a.data_original)}</p>
                  )}
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      <Dialog open={!!selected} onOpenChange={o => !o && setSelected(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Aula • {selected && formatDataHora(selected.data_hora)}</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">{getSala(selected.sala_id)?.nome} • {selected.duracao} min</p>

              <div>
                <h3 className="font-semibold text-sm mb-2">Presenças</h3>
                <div className="space-y-2 border rounded p-3">
                  {selected.alunos.map(alunoId => {
                    const al = getProfile(alunoId);
                    const ass = assiduidades.find(a => a.aula_id === selected.id && a.aluno_id === alunoId);
                    return (
                      <label key={alunoId} className="flex items-center gap-2 cursor-pointer">
                        <Checkbox checked={!!ass?.presente} onCheckedChange={() => toggle(selected.id, alunoId)} />
                        <span>{al?.nome}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-sm mb-2">Documentos da aula</h3>
                <div className="space-y-1 mb-2">
                  {documentos.filter(d => d.aula_id === selected.id).map(d => (
                    <div key={d.id} className="text-sm flex items-center gap-2"><FileText className="w-4 h-4 text-primary" />{d.nome}</div>
                  ))}
                </div>
                <Button size="sm" variant="outline" onClick={() => inputRef.current?.click()}><Upload className="w-4 h-4 mr-2" />Adicionar ficheiro</Button>
                <input ref={inputRef} type="file" hidden onChange={upload} />
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="destructive" onClick={cancelar}><X className="w-4 h-4 mr-2" />Cancelar Aula</Button>
            <Button onClick={finalizar}><Check className="w-4 h-4 mr-2" />Guardar e Finalizar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
