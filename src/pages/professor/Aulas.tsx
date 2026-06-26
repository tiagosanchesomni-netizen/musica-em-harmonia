import { useState, useRef } from 'react';
import { useApp } from '@/contexts/AppContext';
import { Aula, Documento } from '@/data/mockData';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { Upload, Check, X, FileText, Clock, CalendarDays, FolderPlus } from 'lucide-react';
import { toast } from 'sonner';
import { estadoConfig, filtroProfessor, formatDataHora, formatData, formatHora, diasEntre } from '@/lib/aulaHelpers';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function ProfessorAulas() {
  const { 
    aulas, setAulas, currentUserId, getSala, getProfile, 
    assiduidades, setAssiduidades, documentos, setDocumentos, 
    setNotificacoes, pastas, setPastas 
  } = useApp();
  
  const lista = filtroProfessor(aulas, currentUserId);
  const [selected, setSelected] = useState<Aula | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // States for folder selection and creation
  const [selectedFolderId, setSelectedFolderId] = useState<string>('none');
  const [folderCreateOpen, setFolderCreateOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');

  const toggle = (aulaId: string, alunoId: string) => {
    const ex = assiduidades.find(a => a.aula_id === aulaId && a.aluno_id === alunoId);
    if (ex) setAssiduidades(prev => prev.map(a => a.id === ex.id ? { ...a, presente: !a.presente } : a));
    else setAssiduidades(prev => [...prev, { id: 'as' + Date.now(), aula_id: aulaId, aluno_id: alunoId, presente: true }]);
  };

  const finalizar = () => {
    if (!selected) return;
    setAulas(prev => {
      const updated = prev.map(a => a.id === selected.id ? { ...a, estado: 'realizada', presencas_finalizadas: true } : a);
      
      // Se a aula finalizada for semanal, cria mais uma aula para a semana seguinte
      if (selected.grupo_id) {
        const grupoAulas = updated.filter(a => a.grupo_id === selected.grupo_id);
        
        let maxDate = new Date(selected.data_hora);
        grupoAulas.forEach(a => {
          const d = new Date(a.data_hora);
          if (d > maxDate) maxDate = d;
        });
        
        const nextDate = new Date(maxDate);
        nextDate.setDate(nextDate.getDate() + 7);
        
        const novaAula: Aula = {
          id: 'au-' + Date.now() + '-next',
          sala_id: selected.sala_id,
          data_hora: nextDate.toISOString(),
          duracao: selected.duracao,
          tipo: 'normal',
          estado: 'agendada',
          professores: selected.professores,
          alunos: selected.alunos,
          grupo_id: selected.grupo_id
        };
        
        setTimeout(() => toast.success(`Aula semanal prolongada para dia ${nextDate.toLocaleDateString('pt-PT')}`), 100);
        return [...updated, novaAula];
      }
      
      return updated;
    });
    toast.success('Aula finalizada');
    setSelected(null);
  };

  const cancelar = () => {
    if (!selected) return;
    setAulas(prev => prev.map(a => a.id === selected.id ? { ...a, estado: 'pendente_reposicao' } : a));
    
    const adminNotif = {
      id: 'n-adm-' + Date.now(),
      mensagem: `Aula de ${formatDataHora(selected.data_hora)} (Prof. ${getProfile(currentUserId)?.nome || ''}) foi cancelada e precisa de reposição`,
      lida: false,
      tipo: 'cancelamento' as const,
      criado_em: new Date().toISOString(),
      destinatario_role: 'admin' as Role,
    };

    const alunoNotifs = selected.alunos.map((alunoId, idx) => ({
      id: `n-al-canc-${Date.now()}-${idx}`,
      mensagem: `A sua aula de ${formatDataHora(selected.data_hora)} com o(a) Prof. ${getProfile(currentUserId)?.nome || ''} foi cancelada.`,
      lida: false,
      tipo: 'cancelamento' as const,
      criado_em: new Date().toISOString(),
      destinatario_role: 'aluno' as Role,
      aluno_id: alunoId,
    }));

    setNotificacoes(prev => [adminNotif, ...alunoNotifs, ...prev]);

    // Simulate sending email to each student
    selected.alunos.forEach(alunoId => {
      const p = getProfile(alunoId);
      if (p && p.email) {
        toast.info(`E-mail enviado para ${p.email}: A aula no dia ${formatData(selected.data_hora)} na hora ${formatHora(selected.data_hora)} foi cancelada pelo professor.`, { duration: 6000 });
      }
    });

    toast.success('Aula cancelada e enviada para reposições');
    setSelected(null);
  };

  const handleCreateFolder = () => {
    if (!newFolderName.trim()) {
      toast.error('Indique um nome para a pasta');
      return;
    }
    const newFolderId = 'f' + Date.now();
    const novaPasta = {
      id: newFolderId,
      nome: newFolderName.trim(),
      criado_por: currentUserId,
      acesso_alunos: selected ? [...selected.alunos] : 'all' as any,
    };
    
    setPastas(prev => [...prev, novaPasta]);
    setSelectedFolderId(newFolderId);
    toast.success('Pasta criada com sucesso');
    setNewFolderName('');
    setFolderCreateOpen(false);
  };

  const upload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (!f || !selected) return;
    const pastaId = selectedFolderId === 'none' ? undefined : selectedFolderId;
    const novo: Documento = {
      id: 'd' + Date.now(), 
      nome: f.name, 
      url: '#',
      pasta_id: pastaId,
      aula_id: selected.id, 
      criado_por: currentUserId, 
      criado_em: new Date().toISOString(),
      acesso_alunos: [...selected.alunos],
    };
    setDocumentos(prev => [novo, ...prev]);
    toast.success('Documento carregado e associado à aula');
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
              onClick={() => { setSelected(a); setSelectedFolderId('none'); }}
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
                <div className="space-y-1 mb-3">
                  {documentos.filter(d => d.aula_id === selected.id).map(d => {
                    const pasta = pastas.find(p => p.id === d.pasta_id);
                    return (
                      <div key={d.id} className="text-sm flex items-center justify-between bg-muted/40 p-2 rounded border">
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <FileText className="w-4 h-4 text-primary shrink-0" />
                          <span className="truncate flex-1">{d.nome}</span>
                          {pasta && (
                            <Badge variant="secondary" className="text-[10px] py-0 px-1.5 shrink-0 bg-primary/10 text-primary border border-primary/20">
                              {pasta.nome}
                            </Badge>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  {documentos.filter(d => d.aula_id === selected.id).length === 0 && (
                    <p className="text-xs text-muted-foreground italic p-2 border border-dashed rounded text-center">Nenhum documento associado a esta aula.</p>
                  )}
                </div>

                <div className="space-y-3 mt-4 border-t pt-3">
                  <h4 className="text-xs font-semibold text-muted-foreground">Importar Ficheiro:</h4>
                  
                  {/* Folder Selection and Creation Row */}
                  <div className="flex gap-2 items-end">
                    <div className="flex-1 space-y-1">
                      <Label htmlFor="upload-folder" className="text-[11px] text-muted-foreground">Pasta de Destino (Opcional)</Label>
                      <Select value={selectedFolderId} onValueChange={setSelectedFolderId}>
                        <SelectTrigger id="upload-folder" className="h-9 text-xs">
                          <SelectValue placeholder="Sem pasta (Ficheiro avulso)" />
                        </SelectTrigger>
                        <SelectContent className="text-xs">
                          <SelectItem value="none">Sem pasta (Ficheiro avulso)</SelectItem>
                          {pastas.filter(p => p.criado_por === currentUserId).map(p => (
                            <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <Dialog open={folderCreateOpen} onOpenChange={setFolderCreateOpen}>
                      <DialogTrigger asChild>
                        <Button size="sm" variant="outline" className="h-9 px-3" title="Criar Nova Pasta">
                          <FolderPlus className="w-4 h-4 mr-1" /> Nova Pasta
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-[400px]">
                        <DialogHeader>
                          <DialogTitle>Criar Nova Pasta</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-3 py-2">
                          <div className="space-y-1">
                            <Label htmlFor="folder-name">Nome da Pasta</Label>
                            <Input 
                              id="folder-name" 
                              placeholder="Ex: Partituras, Teoria..."
                              value={newFolderName}
                              onChange={e => setNewFolderName(e.target.value)}
                            />
                          </div>
                        </div>
                        <DialogFooter>
                          <Button size="sm" variant="outline" onClick={() => setFolderCreateOpen(false)}>Cancelar</Button>
                          <Button size="sm" onClick={handleCreateFolder}>Criar</Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </div>

                  <Button size="sm" className="w-full mt-2" variant="outline" onClick={() => inputRef.current?.click()}><Upload className="w-4 h-4 mr-2" />Escolher e Enviar Ficheiro</Button>
                  <input ref={inputRef} type="file" hidden onChange={upload} />
                </div>
              </div>
            </div>
          )}
          <DialogFooter className="gap-2 pt-2 border-t mt-2">
            <Button variant="destructive" onClick={cancelar}><X className="w-4 h-4 mr-2" />Cancelar Aula</Button>
            <Button onClick={finalizar}><Check className="w-4 h-4 mr-2" />Guardar e Finalizar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
