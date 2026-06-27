import { useState } from 'react';
import { useApp } from '@/contexts/AppContext';
import { Aula } from '@/data/mockData';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { formatDataHora, formatData, formatHora } from '@/lib/aulaHelpers';

export default function ProfessorReposicoes() {
  const { aulas, setAulas, currentUserId, getSala, salas, setNotificacoes, getProfile } = useApp();
  const pendentes = aulas.filter(a => a.estado === 'pendente_reposicao' && a.professores.includes(currentUserId));

  const [sel, setSel] = useState<Aula | null>(null);
  const [form, setForm] = useState({ sala_id: '', data: '', hora: '14:00' });

  const start = (a: Aula) => {
    const d = new Date(); d.setDate(d.getDate() + 7);
    setSel(a);
    setForm({ sala_id: a.sala_id, data: d.toISOString().slice(0, 10), hora: '14:00' });
  };

  const guardar = () => {
    if (!sel) return;
    const data_hora = new Date(`${form.data}T${form.hora}:00`).toISOString();
    setAulas(prev => prev.map(a => a.id === sel.id ? { ...a, estado: 'cancelada' } : a));
    const nova: Aula = {
      id: 'au' + Date.now(),
      sala_id: form.sala_id,
      data_hora,
      duracao: sel.duracao,
      tipo: 'reposicao',
      estado: 'agendada',
      professores: sel.professores,
      alunos: sel.alunos,
      aula_original_id: sel.id,
      data_original: sel.data_hora,
    };
    setAulas(prev => [...prev, nova]);
    
    // Notificação para administração
    const adminNotif = {
      id: 'n-rep-adm-' + Date.now(),
      mensagem: `Reposição marcada para ${formatDataHora(data_hora)}`,
      lida: false,
      tipo: 'reposicao_marcada' as const,
      criado_em: new Date().toISOString(),
      destinatario_role: 'admin' as Role,
    };

    // Notificações para cada aluno da reposição
    const alunoNotifs = sel.alunos.map((alunoId, idx) => ({
      id: `n-rep-al-${Date.now()}-${idx}`,
      mensagem: `Foi marcada uma nova aula de reposição para ${formatDataHora(data_hora)}.`,
      lida: false,
      tipo: 'reposicao_marcada' as const,
      criado_em: new Date().toISOString(),
      destinatario_role: 'aluno' as Role,
      aluno_id: alunoId,
    }));

    setNotificacoes(prev => [adminNotif, ...alunoNotifs, ...prev]);

    // Enviar emails reais via Resend/Brevo para cada aluno
    const dataAulaAntiga = `${formatData(sel.data_hora)} às ${formatHora(sel.data_hora)}`;
    const dataNovaAula = `${formatData(data_hora)} às ${formatHora(data_hora)}`;
    sel.alunos.forEach(async (alunoId) => {
      const p = getProfile(alunoId);
      if (p?.email) {
        try {
          await supabase.functions.invoke('send-email', {
            body: {
              to: p.email,
              subject: `✅ Aula reposta — ${dataNovaAula}`,
              html: `
                <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; background: #f9fafb; padding: 32px; border-radius: 12px;">
                  <div style="text-align: center; margin-bottom: 24px;">
                    <h1 style="color: #1e1b4b; font-size: 22px; margin: 0;">🎵 Escola de Música GRT</h1>
                    <p style="color: #6b7280; margin: 8px 0 0;">Confirmação de Reposição</p>
                  </div>
                  <div style="background: white; border-radius: 8px; padding: 24px; border: 1px solid #e5e7eb;">
                    <div style="background: #ecfdf5; border-left: 4px solid #10b981; padding: 12px 16px; border-radius: 4px; margin-bottom: 16px;">
                      <p style="color: #047857; font-weight: bold; margin: 0;">✅ Aula de Reposição Agendada</p>
                    </div>
                    <p style="color: #374151; margin: 0 0 8px;">Olá <strong>${p.nome}</strong>,</p>
                    <p style="color: #374151; margin: 0 0 16px;">
                      A sua aula de <strong>${dataAulaAntiga}</strong> que tinha sido cancelada foi reposta e agendada para:
                    </p>
                    <p style="color: #1e1b4b; font-size: 16px; font-weight: bold; margin: 0 0 16px; text-align: center; background: #f3f4f6; padding: 12px; border-radius: 6px;">
                      📅 ${dataNovaAula}
                    </p>
                    <p style="color: #6b7280; font-size: 13px; margin: 0;">Esperamos por si!</p>
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

    toast.success('Reposição marcada');
    setSel(null);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Reposições</h1>
        <p className="text-sm text-muted-foreground">Aulas canceladas a aguardar nova marcação.</p>
      </div>

      {pendentes.length === 0 && <Card className="p-8 text-center text-muted-foreground">Sem aulas por repor.</Card>}

      <div className="grid gap-3">
        {pendentes.map(a => (
          <Card key={a.id} className="p-4 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Badge className="bg-status-absent text-status-absent-foreground">Por repor</Badge>
                <span className="font-semibold">Data original: {formatDataHora(a.data_hora)}</span>
              </div>
              <p className="text-sm text-muted-foreground mt-1">{getSala(a.sala_id)?.nome} • {a.duracao} min</p>
            </div>
            <Button onClick={() => start(a)}><RotateCcw className="w-4 h-4 mr-2" />Marcar nova data</Button>
          </Card>
        ))}
      </div>

      <Dialog open={!!sel} onOpenChange={o => !o && setSel(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Marcar Reposição</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2"><Label>Sala</Label>
              <Select value={form.sala_id} onValueChange={v => setForm({ ...form, sala_id: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{salas.map(s => <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Data</Label><Input type="date" value={form.data} onChange={e => setForm({ ...form, data: e.target.value })} /></div>
            <div><Label>Hora</Label><Input type="time" value={form.hora} onChange={e => setForm({ ...form, hora: e.target.value })} /></div>
          </div>
          <DialogFooter><Button onClick={guardar}>Guardar</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
