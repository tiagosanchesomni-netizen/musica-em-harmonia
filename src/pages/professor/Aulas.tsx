import { useState, useRef } from 'react';
import { useApp } from '@/contexts/AppContext';
import { supabase } from '@/integrations/supabase/client';
import { Aula, Documento } from '@/data/mockData';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { Upload, Check, X, FileText, Clock, CalendarDays, FolderPlus, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { estadoConfig, filtroProfessor, formatDataHora, formatData, formatHora, diasEntre } from '@/lib/aulaHelpers';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function ProfessorAulas() {
  const { 
    aulas, setAulas, currentUserId, getSala, getProfile, 
    assiduidades, setAssiduidades, documentos, setDocumentos, 
    setNotificacoes, pastas, setPastas, profiles, salas
  } = useApp();
  
  const lista = filtroProfessor(aulas, currentUserId);
  const [selected, setSelected] = useState<Aula | null>(null);
  const [sumarioText, setSumarioText] = useState('');

  const handleSelect = (aula: Aula | null) => {
    setSelected(aula);
    setSumarioText(aula?.sumario || '');
  };
  const [previewDoc, setPreviewDoc] = useState<any | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // States for folder selection and creation
  const [selectedFolderId, setSelectedFolderId] = useState<string>('none');
  const [folderCreateOpen, setFolderCreateOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');

  // Class creation states
  const [openCreate, setOpenCreate] = useState(false);
  const [form, setForm] = useState({
    nome: '',
    sala_id: '',
    data: new Date().toISOString().split('T')[0],
    hora: '10:00',
    duracao: 60,
    alunos: [] as string[]
  });
  const [saving, setSaving] = useState(false);

  const alunosAtivos = profiles.filter(p => p.role === 'aluno' && !p.suspenso).sort((a, b) => a.nome.localeCompare(b.nome, 'pt'));

  const toggleAluno = (alunoId: string) => {
    setForm(prev => {
      const exists = prev.alunos.includes(alunoId);
      const nextAlunos = exists 
        ? prev.alunos.filter(id => id !== alunoId)
        : [...prev.alunos, alunoId];
      return { ...prev, alunos: nextAlunos };
    });
  };

  const handleCreateClass = async () => {
    if (!form.sala_id) return toast.error('Selecione uma sala');
    if (!form.data) return toast.error('Selecione uma data');
    if (!form.hora) return toast.error('Selecione uma hora');
    if (form.alunos.length === 0) return toast.error('Selecione pelo menos um aluno');

    setSaving(true);
    try {
      const dataHoraStr = `${form.data}T${form.hora}:00`;
      const dateTarget = new Date(dataHoraStr);
      const now = new Date();
      
      const diffTime = dateTarget.getTime() - now.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      const newAulaId = 'au-prof-' + Date.now();
      const novaAula = {
        id: newAulaId,
        nome: form.nome.trim(),
        sala_id: form.sala_id,
        data_hora: dateTarget.toISOString(),
        duracao: form.duracao,
        tipo: 'normal' as const,
        estado: 'agendada' as const,
        professores: [currentUserId],
        alunos: form.alunos,
      };

      const { error: dbErr } = await supabase
        .from('app_aulas')
        .insert({
          id: newAulaId,
          nome: form.nome.trim(),
          sala_id: form.sala_id,
          data_hora: dateTarget.toISOString(),
          duracao: form.duracao,
          tipo: 'normal',
          estado: 'agendada',
          professores: [currentUserId],
          alunos: form.alunos,
        });

      if (dbErr) throw dbErr;

      setAulas(prev => [...prev, novaAula]);

      const newNotifs = form.alunos.map((aId, idx) => ({
        id: `n-al-new-${Date.now()}-${idx}`,
        mensagem: `Nova aula agendada para ${formatDataHora(dateTarget.toISOString())} com o(a) Prof. ${getProfile(currentUserId)?.nome || ''}.`,
        lida: false,
        tipo: 'reposicao_marcada' as const,
        criado_em: new Date().toISOString(),
        destinatario_role: 'aluno' as const,
        aluno_id: aId,
      }));

      for (const n of newNotifs) {
        await supabase.from('app_notificacoes').insert(n);
      }
      setNotificacoes(prev => [...newNotifs, ...prev]);

      const formatDataStr = `${formatData(dateTarget.toISOString())} às ${formatHora(dateTarget.toISOString())}`;
      const profName = getProfile(currentUserId)?.nome || '';
      
      form.alunos.forEach(async (alunoId) => {
        const p = getProfile(alunoId);
        if (p?.email && p.receber_emails !== false) {
          try {
            await supabase.functions.invoke('send-email', {
              body: {
                to: p.email,
                subject: `📅 Nova aula agendada — ${formatDataStr}`,
                html: `
                  <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; background: #f9fafb; padding: 32px; border-radius: 12px;">
                    <div style="text-align: center; margin-bottom: 24px;">
                      <h1 style="color: #1e1b4b; font-size: 22px; margin: 0;">🎵 Escola de Música GRT</h1>
                      <p style="color: #6b7280; margin: 8px 0 0;">Notificação de Agendamento</p>
                    </div>
                    <div style="background: white; border-radius: 8px; padding: 24px; border: 1px solid #e5e7eb;">
                      <div style="background: #e0e7ff; border-left: 4px solid #4f46e5; padding: 12px 16px; border-radius: 4px; margin-bottom: 16px;">
                        <p style="color: #4f46e5; font-weight: bold; margin: 0;">📅 Nova Aula Agendada</p>
                      </div>
                      <p style="color: #374151; margin: 0 0 8px;">Olá <strong>${p.nome}</strong>,</p>
                      <p style="color: #374151; margin: 0 0 16px;">
                        Foi agendada uma nova aula para si no dia <strong>${formatDataStr}</strong> com o(a) Prof. <strong>${profName}</strong> na <strong>${getSala(form.sala_id)?.nome || 'Sala'}</strong>.
                      </p>
                      <p style="color: #6b7280; font-size: 13px; margin: 0;">Por favor, compareça no horário agendado.</p>
                    </div>
                    <p style="color: #9ca3af; font-size: 12px; text-align: center; margin-top: 24px;">Escola de Música GRT — Sistema de Gestão</p>
                  </div>
                `,
              },
            });
          } catch {
            console.warn(`Falha ao enviar email para ${p.email}`);
          }
        }
      });

      if (diffDays > 7) {
        toast.success('Aula criada com sucesso. Aparecerá quando faltarem 7 dias.');
      } else {
        toast.success('Aula criada');
      }

      setOpenCreate(false);
      setForm({
        nome: '',
        sala_id: salas[0]?.id || '',
        data: new Date().toISOString().split('T')[0],
        hora: '10:00',
        duracao: 60,
        alunos: []
      });

    } catch (err: any) {
      toast.error(err.message || 'Erro ao criar aula');
    } finally {
      setSaving(false);
    }
  };

  const openCreateDialog = () => {
    setForm({
      nome: '',
      sala_id: salas[0]?.id || '',
      data: new Date().toISOString().split('T')[0],
      hora: '10:00',
      duracao: 60,
      alunos: []
    });
    setOpenCreate(true);
  };

  const toggle = (aulaId: string, alunoId: string) => {
    const ex = assiduidades.find(a => a.aula_id === aulaId && a.aluno_id === alunoId);
    if (ex) setAssiduidades(prev => prev.map(a => a.id === ex.id ? { ...a, presente: !a.presente } : a));
    else setAssiduidades(prev => [...prev, { id: 'as' + Date.now(), aula_id: aulaId, aluno_id: alunoId, presente: true }]);
  };

  const finalizar = () => {
    if (!selected) return;
    setAulas(prev => {
      const updated = prev.map(a => a.id === selected.id ? { ...a, estado: 'realizada', presencas_finalizadas: true, sumario: sumarioText.trim() } : a);
      
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

  const upload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (!f || !selected) return;
    const pastaId = selectedFolderId === 'none' ? undefined : selectedFolderId;
    
    toast.loading('A preparar envio...', { id: 'upload-toast' });
    try {
      // 1. Obter o URL assinado do Cloudflare R2 via Edge Function
      const { data: signData, error: signErr } = await supabase.functions.invoke('get-presigned-url', {
        body: { filename: f.name, contentType: f.type },
      });

      let finalUrl = '#';

      if (!signErr && signData && signData.uploadUrl && !signData.fallback) {
        // 2. Upload direto via PUT para o URL assinado
        toast.loading('A enviar ficheiro para o armazenamento...', { id: 'upload-toast' });
        const uploadRes = await fetch(signData.uploadUrl, {
          method: 'PUT',
          headers: { 'Content-Type': f.type },
          body: f,
        });

        if (!uploadRes.ok) {
          throw new Error('Falha ao carregar ficheiro para o Cloudflare R2');
        }

        finalUrl = signData.fileUrl;
      } else {
        // Fallback local se o R2 não estiver configurado
        console.warn('R2 não configurado ou erro no backend. Utilizando simulação local.');
        finalUrl = URL.createObjectURL(f);
      }

      const novo: Documento = {
        id: 'd' + Date.now(), 
        nome: f.name, 
        url: finalUrl,
        pasta_id: pastaId,
        aula_id: selected.id, 
        criado_por: currentUserId, 
        criado_em: new Date().toISOString(),
        acesso_alunos: [...selected.alunos],
      };
      setDocumentos(prev => [novo, ...prev]);
      toast.success('Documento carregado e associado à aula com sucesso!', { id: 'upload-toast' });
    } catch (err: any) {
      console.error(err);
      toast.error('Erro ao efetuar upload do ficheiro: ' + err.message, { id: 'upload-toast' });
    } finally {
      e.target.value = '';
    }
  };

  const handleDownload = async (url: string, filename: string) => {
    if (url === '#' || !url) return;
    toast.loading('A descarregar ficheiro...', { id: 'download-toast' });
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error('Falha ao descarregar ficheiro do armazenamento');
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
      toast.success('Download concluído!', { id: 'download-toast' });
    } catch (err: any) {
      console.error(err);
      toast.error('Erro ao efetuar download: ' + err.message, { id: 'download-toast' });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Aulas</h1>
          <p className="text-sm text-muted-foreground">Aulas dos próximos 7 dias e dos últimos 7 dias.</p>
        </div>
        <Button onClick={openCreateDialog}><Plus className="w-4 h-4 mr-2" />Nova Aula</Button>
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
              onClick={() => { handleSelect(a); setSelectedFolderId('none'); }}
              className={`p-4 cursor-pointer hover:shadow-md transition ${isRepo ? 'border-l-4 border-l-primary bg-primary/5' : ''}`}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    {a.nome && <span className="font-bold text-primary">{a.nome}</span>}
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

      <Dialog open={!!selected} onOpenChange={o => { if (!o) { handleSelect(null); setPreviewDoc(null); } }}>
        <DialogContent className={previewDoc ? "max-w-4xl w-[90vw]" : "max-w-lg"}>
          <DialogHeader>
            <DialogTitle>
              {previewDoc ? `Pré-visualização • ${previewDoc.nome}` : `${selected?.nome || 'Aula'} • ${selected && formatDataHora(selected.data_hora)}`}
            </DialogTitle>
          </DialogHeader>

          <div className="max-h-[75vh] overflow-y-auto pr-1">
            {previewDoc ? (
            <div className="space-y-4">
              <div className="mt-2">
                {(() => {
                  const name = previewDoc.nome.toLowerCase().trim();
                  const ext = name.split('.').pop() || '';
                  const isPdf = ext === 'pdf';
                  const isText = ext === 'txt';
                  const isVideo = ['mp4', 'webm', 'ogg', 'mov'].includes(ext);
                  const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext);

                  if (!previewDoc.url || previewDoc.url === '#') {
                    return (
                      <div className="text-center p-8 space-y-4 border border-dashed rounded bg-muted/10">
                        <FileText className="w-16 h-16 text-muted-foreground mx-auto animate-pulse" />
                        <p className="text-sm font-medium text-destructive">O ficheiro ainda não foi carregado corretamente no armazenamento.</p>
                      </div>
                    );
                  }

                  if (isPdf || isText) {
                    return (
                      <div className="text-center p-8 space-y-4 border border-dashed rounded bg-muted/10">
                        <FileText className="w-16 h-16 text-primary mx-auto" />
                        <div>
                          <p className="text-sm font-medium">Documento ({ext.toUpperCase()}) pronto para visualização</p>
                          <p className="text-xs text-muted-foreground mt-1">Para abrir e ler este documento de forma ideal, clique no botão abaixo.</p>
                        </div>
                        <Button asChild size="sm">
                          <a href={previewDoc.url} target="_blank" rel="noopener noreferrer">
                            Abrir Documento numa nova aba
                          </a>
                        </Button>
                      </div>
                    );
                  }
                  if (isVideo) {
                    return (
                      <video 
                        src={previewDoc.url} 
                        controls 
                        className="w-full max-h-[60vh] rounded border bg-black" 
                      />
                    );
                  }
                  if (isImage) {
                    return (
                      <div className="flex justify-center p-2 bg-muted/20 border rounded">
                        <img 
                          src={previewDoc.url} 
                          alt={previewDoc.nome} 
                          className="max-w-full max-h-[60vh] object-contain rounded" 
                        />
                      </div>
                    );
                  }
                  return (
                    <div className="text-center p-8 space-y-4 border border-dashed rounded bg-muted/10">
                      <FileText className="w-16 h-16 text-muted-foreground mx-auto" />
                      <div>
                        <p className="text-sm font-medium">Pré-visualização indisponível para este tipo de ficheiro.</p>
                        <p className="text-xs text-muted-foreground mt-1">Pode efetuar o download para abrir no seu dispositivo.</p>
                      </div>
                    </div>
                  );
                })()}
              </div>
              <DialogFooter className="flex items-center justify-between sm:justify-between gap-2 border-t pt-3">
                <Button size="sm" variant="outline" onClick={() => setPreviewDoc(null)}>← Voltar para a Aula</Button>
                <Button size="sm" onClick={() => handleDownload(previewDoc.url, previewDoc.nome)}>
                  Descarregar Ficheiro
                </Button>
              </DialogFooter>
            </div>
          ) : (
            selected && (
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
                    {documentos.filter(d => d.aula_id === selected.id && d.criado_por === currentUserId).map(d => {
                      const pasta = pastas.find(p => p.id === d.pasta_id);
                      return (
                        <div key={d.id} className="text-sm flex items-center justify-between bg-muted/40 p-2 rounded border">
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            <FileText className="w-4 h-4 text-primary shrink-0" />
                            <span 
                              className="truncate flex-1 hover:underline cursor-pointer text-primary font-medium" 
                              onClick={() => setPreviewDoc(d)}
                              title="Clique para pré-visualizar"
                            >
                              {d.nome}
                            </span>
                            {pasta && (
                              <Badge variant="secondary" className="text-[10px] py-0 px-1.5 shrink-0 bg-primary/10 text-primary border border-primary/20">
                                {pasta.nome}
                              </Badge>
                            )}
                          </div>
                        </div>
                      );
                    })}
                    {documentos.filter(d => d.aula_id === selected.id && d.criado_por === currentUserId).length === 0 && (
                      <p className="text-xs text-muted-foreground italic p-2 border border-dashed rounded text-center">Nenhum documento associado a esta aula.</p>
                    )}
                  </div>

                  <div className="space-y-3 mt-4 border-t pt-3">
                    <h4 className="text-xs font-semibold text-muted-foreground">Importar Ficheiro:</h4>
                    
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

                <div className="space-y-1 mt-2">
                  <Label htmlFor="sumario-textarea" className="text-xs font-semibold text-muted-foreground">Sumário da Aula</Label>
                  <textarea
                    id="sumario-textarea"
                    className="w-full min-h-[80px] p-2 text-sm border rounded bg-background"
                    placeholder="Escreva o sumário da aula aqui..."
                    value={sumarioText}
                    onChange={e => setSumarioText(e.target.value)}
                  />
                </div>

                <DialogFooter className="gap-2 pt-2 border-t mt-2">
                  <Button variant="destructive" onClick={cancelar}><X className="w-4 h-4 mr-2" />Cancelar Aula</Button>
                  <Button onClick={finalizar}><Check className="w-4 h-4 mr-2" />Guardar e Finalizar</Button>
                </DialogFooter>
              </div>
            )
          )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Class Dialog */}
      <Dialog open={openCreate} onOpenChange={setOpenCreate}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Nova Aula</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Nome da Aula</Label>
              <Input value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })} placeholder="Ex: Aula de Guitarra, Aula de Piano" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Sala</Label>
                <Select value={form.sala_id} onValueChange={v => setForm({ ...form, sala_id: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma sala" />
                  </SelectTrigger>
                  <SelectContent>
                    {salas.map(s => <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Duração (min)</Label>
                <Input type="number" value={form.duracao} onChange={e => setForm({ ...form, duracao: +e.target.value })} />
              </div>
              <div>
                <Label>Data</Label>
                <Input type="date" value={form.data} onChange={e => setForm({ ...form, data: e.target.value })} />
              </div>
              <div>
                <Label>Hora</Label>
                <Input type="time" value={form.hora} onChange={e => setForm({ ...form, hora: e.target.value })} />
              </div>
            </div>
          </div>

          <div className="mt-4">
            <Label className="mb-2 block">Alunos</Label>
            <div className="space-y-1 max-h-40 overflow-auto border rounded p-2">
              {alunosAtivos.map(a => (
                <label key={a.id} className="flex items-center gap-2 text-sm cursor-pointer">
                  <Checkbox checked={form.alunos.includes(a.id)} onCheckedChange={() => toggleAluno(a.id)} />
                  {a.nome}
                </label>
              ))}
              {alunosAtivos.length === 0 && (
                <p className="text-xs text-muted-foreground italic text-center p-2">Nenhum aluno ativo disponível.</p>
              )}
            </div>
          </div>

          <DialogFooter className="mt-4">
            <Button variant="ghost" onClick={() => setOpenCreate(false)} disabled={saving}>Cancelar</Button>
            <Button onClick={handleCreateClass} disabled={saving}>
              <CalendarDays className="w-4 h-4 mr-2" />
              {saving ? 'A criar...' : 'Criar Aula'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
