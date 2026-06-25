import { useRef } from 'react';
import { useApp } from '@/contexts/AppContext';
import { Documento } from '@/data/mockData';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Upload, Trash2, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { formatData } from '@/lib/aulaHelpers';

export default function AdminDocumentos() {
  const { documentos, setDocumentos, getProfile, pastas, currentUserId } = useApp();
  const inputRef = useRef<HTMLInputElement>(null);

  const upload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (!f) return;
    const novo: Documento = {
      id: 'd' + Date.now(), nome: f.name, url: '#',
      criado_por: currentUserId, criado_em: new Date().toISOString(),
    };
    setDocumentos(prev => [novo, ...prev]);
    toast.success('Ficheiro carregado');
    e.target.value = '';
  };

  const remove = (id: string) => { setDocumentos(prev => prev.filter(d => d.id !== id)); toast.success('Ficheiro eliminado'); };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Documentos</h1>
          <p className="text-sm text-muted-foreground">Todos os ficheiros da escola (acesso total).</p>
        </div>
        <Button onClick={() => inputRef.current?.click()}><Upload className="w-4 h-4 mr-2" />Carregar ficheiro</Button>
        <input ref={inputRef} type="file" hidden onChange={upload} />
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow><TableHead>Ficheiro</TableHead><TableHead>Pasta</TableHead><TableHead>Criado por</TableHead><TableHead>Data</TableHead><TableHead className="text-right">Ações</TableHead></TableRow>
          </TableHeader>
          <TableBody>
            {documentos.map(d => (
              <TableRow key={d.id}>
                <TableCell className="flex items-center gap-2 font-medium"><FileText className="w-4 h-4 text-primary" />{d.nome}</TableCell>
                <TableCell>{pastas.find(p => p.id === d.pasta_id)?.nome || '—'}</TableCell>
                <TableCell>{getProfile(d.criado_por)?.nome || '—'}</TableCell>
                <TableCell>{formatData(d.criado_em)}</TableCell>
                <TableCell className="text-right">
                  <Button size="sm" variant="ghost" onClick={() => remove(d.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
