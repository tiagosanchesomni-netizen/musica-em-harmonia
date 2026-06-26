import { useRef, useState } from 'react';
import { useApp } from '@/contexts/AppContext';
import { Documento, Pasta, AcessoAlunos } from '@/data/mockData';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MultiSelect } from '@/components/MultiSelect';
import { FolderPlus, Upload, FileText, Folder, Trash2, Users } from 'lucide-react';
import { toast } from 'sonner';

function AcessoBadge({ acesso }: { acesso: AcessoAlunos }) {
  if (acesso === 'all') return <Badge variant="secondary" className="text-xs"><Users className="w-3 h-3 mr-1" />Todos os alunos</Badge>;
  if (acesso.length === 0) return <Badge variant="outline" className="text-xs">Sem acesso</Badge>;
  return <Badge variant="secondary" className="text-xs">{acesso.length} aluno(s)</Badge>;
}

export default function ProfessorDocumentos() {
  const { pastas, setPastas, documentos, setDocumentos, currentUserId, profiles, getProfile } = useApp();
  const minhasPastas = pastas.filter(p => p.criado_por === currentUserId);
  const alunos = profiles.filter(p => p.role === 'aluno');
  const alunoOptions = alunos.map(a => ({ value: a.id, label: a.nome }));

  const [openPasta, setOpenPasta] = useState(false);
  const [pastaForm, setPastaForm] = useState<{ nome: string; todos: boolean; ids: string[] }>({ nome: '', todos: true, ids: [] });

  const [openDoc, setOpenDoc] = useState(false);
  const [docForm, setDocForm] = useState<{ pasta_id?: string; todos: boolean; ids: string[] }>({ todos: true, ids: [] });
  const inputRef = useRef<HTMLInputElement>(null);

  const criarPasta = () => {
    if (!pastaForm.nome.trim()) { toast.error('Indica um nome'); return; }
    const nova: Pasta = {
      id: 'f' + Date.now(), nome: pastaForm.nome, criado_por: currentUserId,
      acesso_alunos: pastaForm.todos ? 'all' : pastaForm.ids,
    };
    setPastas(prev => [...prev, nova]);
    toast.success('Pasta criada');
    setPastaForm({ nome: '', todos: true, ids: [] });
    setOpenPasta(false);
  };

  const onPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (!f) return;
    const novo: Documento = {
      id: 'd' + Date.now(), nome: f.name, url: '#',
      pasta_id: docForm.pasta_id,
      criado_por: currentUserId, criado_em: new Date().toISOString(),
      acesso_alunos: docForm.todos ? 'all' : docForm.ids,
    };
    setDocumentos(prev => [novo, ...prev]);
    toast.success('Documento carregado');
    e.target.value = ''; setOpenDoc(false); setDocForm({ todos: true, ids: [] });
  };

  const remove = (id: string) => { setDocumentos(prev => prev.filter(d => d.id !== id)); toast.success('Eliminado'); };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold">Documentos</h1>
          <p className="text-sm text-muted-foreground">Organiza ficheiros por pastas e define que alunos têm acesso.</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={openPasta} onOpenChange={setOpenPasta}>
            <DialogTrigger asChild><Button variant="outline"><FolderPlus className="w-4 h-4 mr-2" />Nova Pasta</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Nova Pasta</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div><Label>Nome</Label>
                  <Input value={pastaForm.nome} onChange={e => setPastaForm(f => ({ ...f, nome: e.target.value }))} />
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox checked={pastaForm.todos} onCheckedChange={v => setPastaForm(f => ({ ...f, todos: !!v }))} id="p-todos" />
                  <label htmlFor="p-todos" className="text-sm cursor-pointer">Acesso para todos os alunos</label>
                </div>
                {!pastaForm.todos && (
                  <div><Label>Alunos com acesso</Label>
                    <MultiSelect options={alunoOptions} selected={pastaForm.ids} onChange={ids => setPastaForm(f => ({ ...f, ids }))} placeholder="Selecionar alunos..." />
                  </div>
                )}
              </div>
              <DialogFooter><Button onClick={criarPasta}>Criar</Button></DialogFooter>
            </DialogContent>
          </Dialog>
          <Dialog open={openDoc} onOpenChange={setOpenDoc}>
            <DialogTrigger asChild><Button><Upload className="w-4 h-4 mr-2" />Carregar</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Carregar Documento</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div><Label>Pasta (opcional)</Label>
                  <Select value={docForm.pasta_id} onValueChange={v => setDocForm(f => ({ ...f, pasta_id: v }))}>
                    <SelectTrigger><SelectValue placeholder="Sem pasta" /></SelectTrigger>
                    <SelectContent>{minhasPastas.map(p => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox checked={docForm.todos} onCheckedChange={v => setDocForm(f => ({ ...f, todos: !!v }))} id="d-todos" />
                  <label htmlFor="d-todos" className="text-sm cursor-pointer">Acesso para todos os alunos</label>
                </div>
                {!docForm.todos && (
                  <div><Label>Alunos com acesso</Label>
                    <MultiSelect options={alunoOptions} selected={docForm.ids} onChange={ids => setDocForm(f => ({ ...f, ids }))} placeholder="Selecionar alunos..." />
                  </div>
                )}
                <Button onClick={() => inputRef.current?.click()} className="w-full"><Upload className="w-4 h-4 mr-2" />Escolher ficheiro</Button>
                <input ref={inputRef} type="file" hidden onChange={onPick} />
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {minhasPastas.map(p => {
          const docs = documentos.filter(d => d.pasta_id === p.id);
          return (
            <Card key={p.id} className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <Folder className="w-5 h-5 text-primary" />
                <span className="font-semibold flex-1 truncate">{p.nome}</span>
              </div>
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <AcessoBadge acesso={p.acesso_alunos} />
                <span className="text-xs text-muted-foreground">Criado por: {getProfile(p.criado_por)?.nome || '—'}</span>
              </div>
              <div className="space-y-1">
                {docs.map(d => (
                  <div key={d.id} className="flex items-center gap-2 text-sm">
                    <FileText className="w-4 h-4 text-muted-foreground" />
                    <span className="flex-1 truncate">{d.nome}</span>
                    <Button size="sm" variant="ghost" onClick={() => remove(d.id)}><Trash2 className="w-3 h-3 text-destructive" /></Button>
                  </div>
                ))}
                {docs.length === 0 && <p className="text-xs text-muted-foreground">Sem ficheiros</p>}
              </div>
            </Card>
          );
        })}
      </div>

      <Card>
        <div className="p-4 border-b font-semibold">Ficheiros criados por mim</div>
        <div className="divide-y">
          {documentos.filter(d => d.criado_por === currentUserId).map(d => (
            <div key={d.id} className="p-3 flex items-center gap-2 text-sm flex-wrap">
              <FileText className="w-4 h-4 text-primary" />
              <span className="font-medium flex-1 min-w-[180px]">{d.nome}</span>
              <AcessoBadge acesso={d.acesso_alunos} />
              <span className="text-xs text-muted-foreground">Criado por: {getProfile(d.criado_por)?.nome || '—'}</span>
              <Button size="sm" variant="ghost" onClick={() => remove(d.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
