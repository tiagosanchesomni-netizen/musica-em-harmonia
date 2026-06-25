import { useState } from 'react';
import { useApp } from '@/contexts/AppContext';
import { Sala } from '@/data/mockData';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

export default function Salas() {
  const { salas, setSalas } = useApp();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ nome: '', capacidade: 4 });

  const handleCreate = () => {
    if (!form.nome) return toast.error('Indica o nome da sala');
    const nova: Sala = { id: 'r' + Date.now(), nome: form.nome, capacidade: form.capacidade };
    setSalas(s => [...s, nova]);
    toast.success('Sala criada');
    setOpen(false); setForm({ nome: '', capacidade: 4 });
  };

  const remove = (id: string) => { setSalas(prev => prev.filter(s => s.id !== id)); toast.success('Sala eliminada'); };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Salas</h1>
          <p className="text-sm text-muted-foreground">Espaços onde decorrem as aulas.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="w-4 h-4 mr-2" />Nova Sala</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Criar Sala</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Nome</Label><Input value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })} /></div>
              <div><Label>Capacidade</Label><Input type="number" value={form.capacidade} onChange={e => setForm({ ...form, capacidade: +e.target.value })} /></div>
            </div>
            <DialogFooter><Button onClick={handleCreate}>Guardar</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow><TableHead>Sala</TableHead><TableHead>Capacidade</TableHead><TableHead className="text-right">Ações</TableHead></TableRow>
          </TableHeader>
          <TableBody>
            {salas.map(s => (
              <TableRow key={s.id}>
                <TableCell className="font-medium">{s.nome}</TableCell>
                <TableCell>{s.capacidade} alunos</TableCell>
                <TableCell className="text-right">
                  <Button size="sm" variant="ghost" onClick={() => remove(s.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
