import { useRef, useState } from 'react';
import { useApp } from '@/contexts/AppContext';
import { Documento, Pasta } from '@/data/mockData';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FolderPlus, Upload, FileText, Folder, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { formatDataHora } from '@/lib/aulaHelpers';

export default function ProfessorDocumentos() {
  const { pastas, setPastas, documentos, setDocumentos, currentUserId, aulas } = useApp();
  const minhasAulas = aulas.filter(a => a.professores.includes(currentUserId));
  const minhasPastas = pastas.filter(p => p.criado_por === currentUserId);

  const [openPasta, setOpenPasta] = useState(false);
  const [pastaNome, setPastaNome] = useState('');
  const [openDoc, setOpenDoc] = useState(false);
  const [docForm, setDocForm] = useState<{ pasta_id?: string; aula_id?: string }>({});
  const inputRef = useRef<HTMLInputElement>(null);

  const criarPasta = () => {
    if (!pastaNome) return;
    const nova: Pasta = { id: 'f' + Date.now(), nome: pastaNome, criado_por: currentUserId };
    setPastas(prev => [...prev, nova]);
    toast.success('Pasta criada');
    setPastaNome(''); setOpenPasta(false);
  };

  const onPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (!f) return;
    const novo: Documento = {
      id: 'd' + Date.now(), nome: f.name, url: '#',
      pasta_id: docForm.pasta_id, aula_id: docForm.aula_id,
      criado_por: currentUserId, criado_em: new Date().toISOString(),
    };
    setDocumentos(prev => [novo, ...prev]);
    toast.success('Documento carregado');
    e.target.value = ''; setOpenDoc(false); setDocForm({});
  };

  const remove = (id: string) => { setDocumentos(prev => prev.filter(d => d.id !== id)); toast.success('Eliminado'); };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Documentos</h1>
          <p className="text-sm text-muted-foreground">Organiza ficheiros por pastas e associa-os a aulas específicas.</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={openPasta} onOpenChange={setOpenPasta}>
            <DialogTrigger asChild><Button variant="outline"><FolderPlus className="w-4 h-4 mr-2" />Nova Pasta</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Nova Pasta</DialogTitle></DialogHeader>
              <Label>Nome</Label>
              <Input value={pastaNome} onChange={e => setPastaNome(e.target.value)} />
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
                <div><Label>Aula associada (opcional)</Label>
                  <Select value={docForm.aula_id} onValueChange={v => setDocForm(f => ({ ...f, aula_id: v }))}>
                    <SelectTrigger><SelectValue placeholder="Sem aula" /></SelectTrigger>
                    <SelectContent>{minhasAulas.map(a => <SelectItem key={a.id} value={a.id}>{formatDataHora(a.data_hora)}</SelectItem>)}</SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">Só os alunos dessa aula conseguem ver.</p>
                </div>
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
              <div className="flex items-center gap-2 mb-3">
                <Folder className="w-5 h-5 text-primary" />
                <span className="font-semibold">{p.nome}</span>
                <span className="text-xs text-muted-foreground ml-auto">{docs.length}</span>
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
        <div className="p-4 border-b font-semibold">Ficheiros associados a aulas</div>
        <div className="p-4 space-y-2">
          {documentos.filter(d => d.criado_por === currentUserId && d.aula_id).map(d => {
            const aula = aulas.find(a => a.id === d.aula_id);
            return (
              <div key={d.id} className="flex items-center gap-2 text-sm">
                <FileText className="w-4 h-4 text-primary" />
                <span className="flex-1">{d.nome}</span>
                <span className="text-xs text-muted-foreground">{aula ? formatDataHora(aula.data_hora) : '—'}</span>
                <Button size="sm" variant="ghost" onClick={() => remove(d.id)}><Trash2 className="w-3 h-3 text-destructive" /></Button>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
