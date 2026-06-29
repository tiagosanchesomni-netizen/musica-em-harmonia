import { useState, useRef } from 'react';
import { useApp } from '@/contexts/AppContext';
import { Aula } from '@/data/mockData';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Pencil, CalendarDays, Filter, Trash2, Eye, Upload, FileText, FolderPlus, Check, X, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { estadoConfig, formatDataHora, formatData, formatHora, diasEntre } from '@/lib/aulaHelpers';

export default function AdminAulas() {
  const { 
    aulas, setAulas, salas, profiles, getSala, getProfile, 
    assiduidades, setAssiduidades, setNotificacoes,
    documentos, setDocumentos, pastas, setPastas, currentUserId 
  } = useApp();
  const [open, setOpen] = useState(false);
  const [filtroTempo, setFiltroTempo] = useState<string>('todas');
  const [editing, setEditing] = useState<Aula | null>(null);
  
  const [selectedClasswork, setSelectedClasswork] = useState<Aula | null>(null);
  const [sumarioText, setSumarioText] = useState('');

  const handleSelectClasswork = (aula: Aula | null) => {
    setSelectedClasswork(aula);
    setSumarioText(aula?.sumario || '');
  };
  const [previewDoc, setPreviewDoc] = useState<any | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [selectedFolderId, setSelectedFolderId] = useState<string>('none');
  const [folderCreateOpen, setFolderCreateOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [form, setForm] = useState<{
    nome: string; sala_id: string; data: string; hora: string; duracao: number;
    professores: string[]; alunos: string[]; semanal: boolean;
  }>({ nome: '', sala_id: '', data: '', hora: '10:00', duracao: 60, professores: [], alunos: [], semanal: false });

  const professores = profiles.filter(p => p.role === 'professor' && (!p.suspenso || form.professores.includes(p.id))).sort((a, b) => a.nome.localeCompare(b.nome, 'pt'));
  const alunos = profiles.filter(p => p.role === 'aluno' && (!p.suspenso || form.alunos.includes(p.id))).sort((a, b) => a.nome.localeCompare(b.nome, 'pt'));

  const openCreate = () => {
    setEditing(null);
    setForm({ 
      nome: '',
      sala_id: salas[0]?.id || '', 
      data: new Date().toISOString().slice(0, 10), 
      hora: '10:00', 
      duracao: 60, 
      professores: [], 
      alunos: [],
      semanal: false 
    });
    setOpen(true);
  };

  const toggle = (key: 'professores' | 'alunos', id: string) => {
    setForm(f => ({ ...f, [key]: f[key].includes(id) ? f[key].filter(x => x !== id) : [...f[key], id] }));
  };

  const handleSave = () => {
    if (!form.sala_id || !form.data || !form.hora) return toast.error('Preenche os campos');
    if (form.professores.length === 0) return toast.error('Adiciona pelo menos um professor');
    if (form.alunos.length === 0) return toast.error('Adiciona pelo menos um aluno');
    const data_hora = new Date(`${form.data}T${form.hora}:00`).toISOString();
    
    if (editing) {
      const originalAlunos = editing.alunos;
      const newAlunos = form.alunos;
      const added = newAlunos.filter(x => !originalAlunos.includes(x));
      const removed = originalAlunos.filter(x => !newAlunos.includes(x));

      setAulas(prev => prev.map(a => {
        // Se for a aula que está a ser editada, atualiza todos os campos
        if (a.id === editing.id) {
          return { 
            ...a, 
            nome: form.nome.trim(),
            sala_id: form.sala_id, 
            data_hora, 
            duracao: form.duracao, 
            professores: form.professores, 
            alunos: form.alunos 
          };
        }
        // Se pertencer ao mesmo grupo de repetição semanal e for uma aula futura
        if (a.grupo_id && a.grupo_id === editing.grupo_id && new Date(a.data_hora).getTime() > new Date(editing.data_hora).getTime()) {
          const updatedAlunos = [
            ...a.alunos.filter(alId => !removed.includes(alId)),
            ...added.filter(alId => !a.alunos.includes(alId))
          ];
          return {
            ...a,
            nome: form.nome.trim(),
            professores: form.professores, // mantém professores em sincronia
            alunos: updatedAlunos
          };
        }
        return a;
      }));
      toast.success('Aula atualizada');
    } else {
      let criadas: Aula[] = [];
      if (form.semanal) {
        const grupoId = 'g-' + Date.now();
        const novasAulas: Aula[] = [];
        
        for (let i = 0; i < 4; i++) {
          const dataObj = new Date(`${form.data}T${form.hora}:00`);
          dataObj.setDate(dataObj.getDate() + (i * 7));
          
          novasAulas.push({
            id: 'au-' + Date.now() + '-' + i,
            nome: form.nome.trim(),
            sala_id: form.sala_id,
            data_hora: dataObj.toISOString(),
            duracao: form.duracao,
            tipo: 'normal',
            estado: 'agendada',
            professores: form.professores,
            alunos: form.alunos,
            grupo_id: grupoId
          });
        }
        
        setAulas(prev => [...prev, ...novasAulas]);
        criadas = novasAulas;
        toast.success('Série de 4 aulas semanais criada com sucesso');
      } else {
        const nova: Aula = {
          id: 'au' + Date.now(), 
          nome: form.nome.trim(),
          sala_id: form.sala_id, 
          data_hora, 
          duracao: form.duracao,
          tipo: 'normal', 
          estado: 'agendada', 
          professores: form.professores, 
          alunos: form.alunos,
        };
        setAulas(prev => [...prev, nova]);
        criadas = [nova];
        toast.success('Aula criada');
      }

      // Enviar notificações e e-mails para alunos e admins
      const novasNotifs: any[] = [];
      criadas.forEach(aula => {
        const profNames = aula.professores.map(pId => getProfile(pId)?.nome || '').join(', ');
        const dataAula = `${formatData(aula.data_hora)} às ${formatHora(aula.data_hora)}`;

        // 1. Notificação para Admin
        const adminNotif = {
          id: 'n-adm-new-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
          mensagem: `Nova aula agendada para ${dataAula} (Prof. ${profNames})`,
          lida: false,
          tipo: 'reposicao_marcada' as const,
          criado_em: new Date().toISOString(),
          destinatario_role: 'admin' as const,
        };
        novasNotifs.push(adminNotif);

        // 2. Notificações para Alunos
        aula.alunos.forEach((alunoId, idx) => {
          const alunoNotif = {
            id: `n-al-new-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 6)}`,
            mensagem: `Nova aula agendada para ${dataAula} com o(a) Prof. ${profNames}.`,
            lida: false,
            tipo: 'reposicao_marcada' as const,
            criado_em: new Date().toISOString(),
            destinatario_role: 'aluno' as const,
            aluno_id: alunoId,
          };
          novasNotifs.push(alunoNotif);
        });

        // 3. Enviar Emails
        // Cópia para todos os Admins
        const adminEmails = profiles.filter(pr => pr.role === 'admin' && pr.email && pr.receber_emails !== false).map(pr => pr.email);
        adminEmails.forEach(async (adminEmail) => {
          try {
            await supabase.functions.invoke('send-email', {
              body: {
                to: adminEmail,
                subject: `📅 [ADMIN] Nova aula agendada — ${dataAula}`,
                html: `
                  <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; background: #f9fafb; padding: 32px; border-radius: 12px;">
                    <div style="text-align: center; margin-bottom: 24px;">
                      <h1 style="color: #1e1b4b; font-size: 22px; margin: 0;">🎵 Escola de Música GRT</h1>
                      <p style="color: #6b7280; margin: 8px 0 0;">Cópia de Agendamento de Aula</p>
                    </div>
                    <div style="background: white; border-radius: 8px; padding: 24px; border: 1px solid #e5e7eb;">
                      <p style="color: #4f46e5; font-weight: bold; margin: 0 0 12px;">📅 Nova Aula Agendada</p>
                      <p style="color: #374151; margin: 0 0 8px;">Uma nova aula foi agendada no sistema:</p>
                      <ul style="color: #374151; margin: 0 0 16px; padding-left: 20px;">
                        <li><strong>Data/Hora:</strong> ${dataAula}</li>
                        <li><strong>Professor(a):</strong> ${profNames}</li>
                        <li><strong>Alunos:</strong> ${aula.alunos.map(aId => getProfile(aId)?.nome).join(', ')}</li>
                        <li><strong>Sala:</strong> ${getSala(aula.sala_id)?.nome || '—'}</li>
                      </ul>
                    </div>
                    <p style="color: #9ca3af; font-size: 12px; text-align: center; margin-top: 24px;">Escola de Música GRT — Sistema de Gestão</p>
                  </div>
                `,
              },
            });
          } catch (err) {
            console.error('Erro ao enviar cópia de agendamento para admin:', err);
          }
        });

        // Email para cada Aluno
        aula.alunos.forEach(async (alunoId) => {
          const p = getProfile(alunoId);
          if (p?.email && p.receber_emails !== false) {
            try {
              await supabase.functions.invoke('send-email', {
                body: {
                  to: p.email,
                  subject: `📅 Nova aula agendada — ${dataAula}`,
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
                          Foi agendada uma nova aula para si no dia <strong>${dataAula}</strong> com o(a) Prof. <strong>${profNames}</strong> na <strong>${getSala(aula.sala_id)?.nome || 'Sala'}</strong>.
                        </p>
                        <p style="color: #6b7280; font-size: 13px; margin: 0;">Por favor, compareça no horário agendado.</p>
                      </div>
                      <p style="color: #9ca3af; font-size: 12px; text-align: center; margin-top: 24px;">Escola de Música GRT — Sistema de Gestão</p>
                    </div>
                  `,
                },
              });
            } catch (err) {
              console.error('Erro ao enviar email de agendamento para aluno:', err);
            }
          }
        });
      });

      setNotificacoes(prev => [...novasNotifs, ...prev]);
    }
    setOpen(false);
  };

  const handleStopWeekly = () => {
    if (!editing || !editing.grupo_id) return;
    
    setAulas(prev => {
      // 1. Elimina todas as aulas futuras do mesmo grupo
      const cleanAulas = prev.filter(a => {
        if (a.grupo_id === editing.grupo_id && new Date(a.data_hora).getTime() > new Date(editing.data_hora).getTime()) {
          return false;
        }
        return true;
      });

      // 2. Remove o grupo_id da aula editada atual, tornando-a avulsa/não recorrente
      return cleanAulas.map(a => {
        if (a.id === editing.id) {
          const { grupo_id, ...rest } = a;
          return rest as Aula;
        }
        return a;
      });
    });

    toast.success('Aula semanal interrompida. Aulas futuras eliminadas.');
    setOpen(false);
  };

  const handleCancelClass = () => {
    if (!editing) return;
    
    setAulas(prev => prev.map(a => a.id === editing.id ? { ...a, estado: 'pendente_reposicao' } : a));
    
    const professorNames = editing.professores.map(pId => getProfile(pId)?.nome || '').join(', ');

    const adminNotif = {
      id: 'n-adm-canc-' + Date.now(),
      mensagem: `Aula de ${formatDataHora(editing.data_hora)} (Prof. ${professorNames}) foi cancelada e precisa de reposição`,
      lida: false,
      tipo: 'cancelamento' as const,
      criado_em: new Date().toISOString(),
      destinatario_role: 'admin' as const,
    };

    const alunoNotifs = editing.alunos.map((alunoId, idx) => ({
      id: `n-al-canc-${Date.now()}-${idx}`,
      mensagem: `A sua aula de ${formatDataHora(editing.data_hora)} com o(a) Prof. ${professorNames} foi cancelada.`,
      lida: false,
      tipo: 'cancelamento' as const,
      criado_em: new Date().toISOString(),
      destinatario_role: 'aluno' as const,
      aluno_id: alunoId,
    }));

    setNotificacoes(prev => [adminNotif, ...alunoNotifs, ...prev]);

    // Enviar emails reais via Resend para cada aluno
    const dataAula = `${formatData(editing.data_hora)} às ${formatHora(editing.data_hora)}`;
    
    // Enviar cópia de cancelamento para todos os administradores
    const adminEmails = profiles.filter(pr => pr.role === 'admin' && pr.email && pr.receber_emails !== false).map(pr => pr.email);
    adminEmails.forEach(async (adminEmail) => {
      try {
        await supabase.functions.invoke('send-email', {
          body: {
            to: adminEmail,
            subject: `❌ [ADMIN] Aula cancelada — ${dataAula}`,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; background: #f9fafb; padding: 32px; border-radius: 12px;">
                <div style="text-align: center; margin-bottom: 24px;">
                  <h1 style="color: #1e1b4b; font-size: 22px; margin: 0;">🎵 Escola de Música GRT</h1>
                  <p style="color: #6b7280; margin: 8px 0 0;">Cópia de Cancelamento de Aula</p>
                </div>
                <div style="background: white; border-radius: 8px; padding: 24px; border: 1px solid #e5e7eb;">
                  <p style="color: #dc2626; font-weight: bold; margin: 0 0 12px;">⚠️ Alerta de Aula Cancelada</p>
                  <p style="color: #374151; margin: 0 0 8px;">A seguinte aula foi cancelada:</p>
                  <ul style="color: #374151; margin: 0 0 16px; padding-left: 20px;">
                    <li><strong>Data/Hora:</strong> ${dataAula}</li>
                    <li><strong>Professor(a):</strong> ${professorNames}</li>
                    <li><strong>Alunos:</strong> ${editing.alunos.map(aId => getProfile(aId)?.nome).join(', ')}</li>
                  </ul>
                </div>
                <p style="color: #9ca3af; font-size: 12px; text-align: center; margin-top: 24px;">Escola de Música GRT — Sistema de Gestão</p>
              </div>
            `,
          },
        });
      } catch (err) {
        console.error('Erro ao enviar cópia de cancelamento para admin:', err);
      }
    });

    editing.alunos.forEach(async (alunoId) => {
      const p = getProfile(alunoId);
      if (p?.email && p.receber_emails !== false) {
        try {
          await supabase.functions.invoke('send-email', {
            body: {
              to: p.email,
              subject: `❌ Aula cancelada — ${dataAula}`,
              html: `
                <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; background: #f9fafb; padding: 32px; border-radius: 12px;">
                  <div style="text-align: center; margin-bottom: 24px;">
                    <h1 style="color: #1e1b4b; font-size: 22px; margin: 0;">🎵 Escola de Música GRT</h1>
                    <p style="color: #6b7280; margin: 8px 0 0;">Notificação de Cancelamento</p>
                  </div>
                  <div style="background: white; border-radius: 8px; padding: 24px; border: 1px solid #e5e7eb;">
                    <div style="background: #fef2f2; border-left: 4px solid #ef4444; padding: 12px 16px; border-radius: 4px; margin-bottom: 16px;">
                      <p style="color: #dc2626; font-weight: bold; margin: 0;">❌ Aula Cancelada</p>
                    </div>
                    <p style="color: #374151; margin: 0 0 8px;">Olá <strong>${p.nome}</strong>,</p>
                    <p style="color: #374151; margin: 0 0 16px;">
                      A sua aula de <strong>${dataAula}</strong> com o(a) Prof. <strong>${professorNames}</strong> foi cancelada e está a aguardar nova data de reposição.
                    </p>
                    <p style="color: #6b7280; font-size: 13px; margin: 0;">Será notificado(a) quando a reposição for marcada.</p>
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

    toast.success('Aula cancelada e enviada para reposições');
    setOpen(false);
  };

  const togglePresenca = (aulaId: string, alunoId: string) => {
    const existing = assiduidades.find(a => a.aula_id === aulaId && a.aluno_id === alunoId);
    if (existing) {
      setAssiduidades(prev => prev.map(a => a.id === existing.id ? { ...a, presente: !a.presente } : a));
    } else {
      setAssiduidades(prev => [...prev, { id: 'as' + Date.now(), aula_id: aulaId, aluno_id: alunoId, presente: true }]);
    }
  };

  const startEdit = (aula: Aula) => {
    setEditing(aula);
    const d = new Date(aula.data_hora);
    setForm({
      nome: aula.nome || '',
      sala_id: aula.sala_id,
      data: d.toISOString().slice(0, 10),
      hora: d.toTimeString().slice(0, 5),
      duracao: aula.duracao,
      professores: aula.professores,
      alunos: aula.alunos,
      semanal: !!aula.grupo_id,
    });
    setOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('Tem a certeza que deseja eliminar permanentemente esta aula? Esta ação não pode ser desfeita.')) {
      setAulas(prev => prev.filter(a => a.id !== id));
      toast.success('Aula eliminada com sucesso');
    }
  };

  const filterAulasByTime = (aulasList: Aula[]) => {
    if (filtroTempo === 'todas') return aulasList;
    
    const agora = new Date();
    agora.setHours(0, 0, 0, 0);
    
    return aulasList.filter(a => {
      const dataAula = new Date(a.data_hora);
      const diffTime = dataAula.getTime() - agora.getTime();
      const diffDays = diffTime / (1000 * 60 * 60 * 24);
      
      if (filtroTempo === 'semana') {
        return diffDays >= 0 && diffDays <= 7;
      }
      if (filtroTempo === 'duas_semanas') {
        return diffDays >= 0 && diffDays <= 14;
      }
      if (filtroTempo === 'mes') {
        return diffDays >= 0 && diffDays <= 30;
      }
      if (filtroTempo === 'ano') {
        return diffDays >= 0 && diffDays <= 365;
      }
      return true;
    });
  };

  const finalizarClasswork = () => {
    if (!selectedClasswork) return;
    setAulas(prev => {
      const updated = prev.map(a => a.id === selectedClasswork.id ? { ...a, estado: 'realizada', presencas_finalizadas: true, sumario: sumarioText.trim() } : a);
      
      if (selectedClasswork.grupo_id) {
        const grupoAulas = updated.filter(a => a.grupo_id === selectedClasswork.grupo_id);
        
        let maxDate = new Date(selectedClasswork.data_hora);
        grupoAulas.forEach(a => {
          const d = new Date(a.data_hora);
          if (d > maxDate) maxDate = d;
        });
        
        const nextDate = new Date(maxDate);
        nextDate.setDate(nextDate.getDate() + 7);
        
        const novaAula: Aula = {
          id: 'au-' + Date.now() + '-next',
          sala_id: selectedClasswork.sala_id,
          data_hora: nextDate.toISOString(),
          duracao: selectedClasswork.duracao,
          tipo: 'normal',
          estado: 'agendada',
          professores: selectedClasswork.professores,
          alunos: selectedClasswork.alunos,
          grupo_id: selectedClasswork.grupo_id
        };
        
        setTimeout(() => toast.success(`Aula semanal prolongada para dia ${nextDate.toLocaleDateString('pt-PT')}`), 100);
        return [...updated, novaAula];
      }
      
      return updated;
    });
    toast.success('Aula finalizada');
    setSelectedClasswork(null);
  };

  const cancelarClasswork = () => {
    if (!selectedClasswork) return;
    
    setAulas(prev => prev.map(a => a.id === selectedClasswork.id ? { ...a, estado: 'pendente_reposicao' } : a));
    
    const professorNames = selectedClasswork.professores.map(pId => getProfile(pId)?.nome || '').join(', ');

    const adminNotif = {
      id: 'n-adm-canc-' + Date.now(),
      mensagem: `Aula de ${formatDataHora(selectedClasswork.data_hora)} (Prof. ${professorNames}) foi cancelada e precisa de reposição`,
      lida: false,
      tipo: 'cancelamento' as const,
      criado_em: new Date().toISOString(),
      destinatario_role: 'admin' as const,
    };

    const alunoNotifs = selectedClasswork.alunos.map((alunoId, idx) => ({
      id: `n-al-canc-${Date.now()}-${idx}`,
      mensagem: `A sua aula de ${formatDataHora(selectedClasswork.data_hora)} com o(a) Prof. ${professorNames} foi cancelada.`,
      lida: false,
      tipo: 'cancelamento' as const,
      criado_em: new Date().toISOString(),
      destinatario_role: 'aluno' as const,
      aluno_id: alunoId,
    }));

    setNotificacoes(prev => [adminNotif, ...alunoNotifs, ...prev]);

    const dataAula = `${formatData(selectedClasswork.data_hora)} às ${formatHora(selectedClasswork.data_hora)}`;
    
    // Enviar cópia de cancelamento para todos os administradores
    const adminEmails = profiles.filter(pr => pr.role === 'admin' && pr.email && pr.receber_emails !== false).map(pr => pr.email);
    adminEmails.forEach(async (adminEmail) => {
      try {
        await supabase.functions.invoke('send-email', {
          body: {
            to: adminEmail,
            subject: `❌ [ADMIN] Aula cancelada — ${dataAula}`,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; background: #f9fafb; padding: 32px; border-radius: 12px;">
                <div style="text-align: center; margin-bottom: 24px;">
                  <h1 style="color: #1e1b4b; font-size: 22px; margin: 0;">🎵 Escola de Música GRT</h1>
                  <p style="color: #6b7280; margin: 8px 0 0;">Cópia de Cancelamento de Aula</p>
                </div>
                <div style="background: white; border-radius: 8px; padding: 24px; border: 1px solid #e5e7eb;">
                  <p style="color: #dc2626; font-weight: bold; margin: 0 0 12px;">⚠️ Alerta de Aula Cancelada</p>
                  <p style="color: #374151; margin: 0 0 8px;">A seguinte aula foi cancelada:</p>
                  <ul style="color: #374151; margin: 0 0 16px; padding-left: 20px;">
                    <li><strong>Data/Hora:</strong> ${dataAula}</li>
                    <li><strong>Professor(a):</strong> ${professorNames}</li>
                    <li><strong>Alunos:</strong> ${selectedClasswork.alunos.map(aId => getProfile(aId)?.nome).join(', ')}</li>
                  </ul>
                </div>
                <p style="color: #9ca3af; font-size: 12px; text-align: center; margin-top: 24px;">Escola de Música GRT — Sistema de Gestão</p>
              </div>
            `,
          },
        });
      } catch (err) {
        console.error('Erro ao enviar cópia de cancelamento para admin:', err);
      }
    });

    selectedClasswork.alunos.forEach(async (alunoId) => {
      const p = getProfile(alunoId);
      if (p?.email && p.receber_emails !== false) {
        try {
          await supabase.functions.invoke('send-email', {
            body: {
              to: p.email,
              subject: `❌ Aula cancelada — ${dataAula}`,
              html: `
                <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; background: #f9fafb; padding: 32px; border-radius: 12px;">
                  <div style="text-align: center; margin-bottom: 24px;">
                    <h1 style="color: #1e1b4b; font-size: 22px; margin: 0;">🎵 Escola de Música GRT</h1>
                    <p style="color: #6b7280; margin: 8px 0 0;">Notificação de Cancelamento</p>
                  </div>
                  <div style="background: white; border-radius: 8px; padding: 24px; border: 1px solid #e5e7eb;">
                    <div style="background: #fef2f2; border-left: 4px solid #ef4444; padding: 12px 16px; border-radius: 4px; margin-bottom: 16px;">
                      <p style="color: #dc2626; font-weight: bold; margin: 0;">❌ Aula Cancelada</p>
                    </div>
                    <p style="color: #374151; margin: 0 0 8px;">Olá <strong>${p.nome}</strong>,</p>
                    <p style="color: #374151; margin: 0 0 16px;">
                      A sua aula de <strong>${dataAula}</strong> com o(a) Prof. <strong>${professorNames}</strong> foi cancelada e está a aguardar nova data de reposição.
                    </p>
                    <p style="color: #6b7280; font-size: 13px; margin: 0;">Será notificado(a) quando a reposição for marcada.</p>
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

    toast.success('Aula cancelada e enviada para reposições');
    setSelectedClasswork(null);
  };

  const handleCreateFolderClasswork = () => {
    if (!newFolderName.trim()) {
      toast.error('Indique um nome para a pasta');
      return;
    }
    const newFolderId = 'f' + Date.now();
    const novaPasta = {
      id: newFolderId,
      nome: newFolderName.trim(),
      criado_por: currentUserId,
      acesso_alunos: selectedClasswork ? [...selectedClasswork.alunos] : 'all' as any,
    };
    
    setPastas(prev => [...prev, novaPasta]);
    setSelectedFolderId(newFolderId);
    toast.success('Pasta criada com sucesso');
    setNewFolderName('');
    setFolderCreateOpen(false);
  };

  const uploadClasswork = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (!f || !selectedClasswork) return;
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

      const novo = {
        id: 'd' + Date.now(), 
        nome: f.name, 
        url: finalUrl,
        pasta_id: pastaId,
        aula_id: selectedClasswork.id, 
        criado_por: currentUserId, 
        criado_em: new Date().toISOString(),
        acesso_alunos: [...selectedClasswork.alunos],
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

  const sorted = [...aulas].sort((a, b) => new Date(a.data_hora).getTime() - new Date(b.data_hora).getTime());
  const filtered = filterAulasByTime(sorted);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Aulas</h1>
          <p className="text-sm text-muted-foreground">Vista global de todas as aulas da escola.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <Select value={filtroTempo} onValueChange={setFiltroTempo}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <span className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-muted-foreground" />
                <SelectValue placeholder="Filtrar por tempo" />
              </span>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas as aulas</SelectItem>
              <SelectItem value="semana">Esta semana</SelectItem>
              <SelectItem value="duas_semanas">Duas semanas</SelectItem>
              <SelectItem value="mes">Este mês</SelectItem>
              <SelectItem value="ano">Este ano</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={openCreate} className="w-full sm:w-auto"><Plus className="w-4 h-4 mr-2" />Nova Aula</Button>
        </div>
      </div>

      {filtered.length === 0 && (
        <Card className="p-8 text-center text-muted-foreground">Não há aulas neste intervalo.</Card>
      )}

      <div className="grid gap-3">
        {filtered.map(a => {
          const cfg = estadoConfig[a.estado];
          const dias = diasEntre(a.data_hora);
          const isRepo = a.tipo === 'reposicao';
          const profNames = a.professores.map(p => getProfile(p)?.nome).filter(Boolean).join(', ');
          const aluNames = a.alunos.map(p => getProfile(p)?.nome).filter(Boolean).join(', ');

          return (
            <Card key={a.id}
              onClick={() => { handleSelectClasswork(a); setSelectedFolderId('none'); }}
              className={`p-4 cursor-pointer hover:shadow-md transition ${isRepo ? 'border-l-4 border-l-primary bg-primary/5' : ''}`}>
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    {a.nome && <span className="font-bold text-primary">{a.nome}</span>}
                    <CalendarDays className="w-4 h-4 text-muted-foreground" />
                    <span className="font-semibold">{formatDataHora(a.data_hora)}</span>
                    <Badge className={cfg.className}>{cfg.label}</Badge>
                    {isRepo && <Badge className="bg-primary text-primary-foreground">Aula de Reposição</Badge>}
                    {a.grupo_id && <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">Semanal</Badge>}
                    {dias === 0 && <Badge variant="outline"><Clock className="w-3 h-3 mr-1" />Hoje</Badge>}
                  </div>
                  
                  <div className="text-sm text-muted-foreground space-y-1">
                    <p>
                      <strong>Sala:</strong> {getSala(a.sala_id)?.nome || '—'} • <strong>Duração:</strong> {a.duracao} min
                    </p>
                    <p className="text-xs">
                      <strong>Professores:</strong> {profNames || 'Nenhum'}
                    </p>
                    <p className="text-xs">
                      <strong>Alunos:</strong> {aluNames || 'Nenhum'}
                    </p>
                  </div>
                  
                  {isRepo && a.data_original && (
                    <p className="text-xs text-muted-foreground mt-1">Reposição da aula de {formatDataHora(a.data_original)}</p>
                  )}
                </div>
                
                <div className="flex items-center gap-1 shrink-0 self-end sm:self-start" onClick={e => e.stopPropagation()}>
                  <Button size="sm" variant="ghost" onClick={() => { handleSelectClasswork(a); setSelectedFolderId('none'); }} title="Lançar/Visualizar Detalhes"><Eye className="w-4 h-4" /></Button>
                  <Button size="sm" variant="ghost" onClick={() => startEdit(a)} title="Editar Aula"><Pencil className="w-4 h-4" /></Button>
                  <Button size="sm" variant="ghost" className="text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={() => handleDelete(a.id)} title="Eliminar Aula"><Trash2 className="w-4 h-4" /></Button>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>{editing ? 'Editar Aula' : 'Nova Aula'}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Nome da Aula</Label>
              <Input value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })} placeholder="Ex: Aula de Guitarra, Aula de Piano" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Sala</Label>
                <Select value={form.sala_id} onValueChange={v => setForm({ ...form, sala_id: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{salas.map(s => <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Duração (min)</Label><Input type="number" value={form.duracao} onChange={e => setForm({ ...form, duracao: +e.target.value })} /></div>
              <div><Label>Data</Label><Input type="date" value={form.data} onChange={e => setForm({ ...form, data: e.target.value })} /></div>
              <div><Label>Hora</Label><Input type="time" value={form.hora} onChange={e => setForm({ ...form, hora: e.target.value })} /></div>
            </div>
          </div>

          {!editing && (
            <div className="flex items-center space-x-2 mt-2 bg-muted/40 p-2.5 rounded-md border">
              <Checkbox 
                id="semanal" 
                checked={form.semanal} 
                onCheckedChange={v => setForm({ ...form, semanal: !!v })} 
              />
              <Label htmlFor="semanal" className="cursor-pointer text-sm font-medium">
                Repetição semanal
              </Label>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 mt-2">
            <div>
              <Label className="mb-2 block">Professores</Label>
              <div className="space-y-1 max-h-40 overflow-auto border rounded p-2">
                {professores.map(p => (
                  <label key={p.id} className="flex items-center gap-2 text-sm cursor-pointer">
                    <Checkbox checked={form.professores.includes(p.id)} onCheckedChange={() => toggle('professores', p.id)} />
                    {p.nome}
                  </label>
                ))}
              </div>
            </div>
            <div>
              <Label className="mb-2 block">Alunos</Label>
              <div className="space-y-1 max-h-40 overflow-auto border rounded p-2">
                {alunos.map(a => (
                  <label key={a.id} className="flex items-center gap-2 text-sm cursor-pointer">
                    <Checkbox checked={form.alunos.includes(a.id)} onCheckedChange={() => toggle('alunos', a.id)} />
                    {a.nome}
                  </label>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter className="flex items-center justify-between gap-2">
            <div className="flex gap-2">
              {editing && editing.estado === 'agendada' && (
                <Button type="button" variant="destructive" onClick={handleCancelClass}>
                  Cancelar esta aula
                </Button>
              )}
              {editing?.grupo_id && (
                <Button type="button" variant="destructive" onClick={handleStopWeekly}>
                  Parar Aula Semanal
                </Button>
              )}
            </div>
            <Button onClick={handleSave} className="ml-auto">
              <CalendarDays className="w-4 h-4 mr-2" />Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!selectedClasswork} onOpenChange={o => { if (!o) { handleSelectClasswork(null); setPreviewDoc(null); } }}>
        <DialogContent className={previewDoc ? "max-w-4xl w-[90vw]" : "max-w-lg"}>
          <DialogHeader>
            <DialogTitle>
              {previewDoc ? `Pré-visualização • ${previewDoc.nome}` : `${selectedClasswork?.nome || 'Aula'} • ${selectedClasswork && formatDataHora(selectedClasswork.data_hora)}`}
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
            selectedClasswork && (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">{getSala(selectedClasswork.sala_id)?.nome} • {selectedClasswork.duracao} min</p>

                <div>
                  <h3 className="font-semibold text-sm mb-2">Presenças</h3>
                  <div className="space-y-2 border rounded p-3">
                    {selectedClasswork.alunos.map(alunoId => {
                      const al = getProfile(alunoId);
                      const ass = assiduidades.find(a => a.aula_id === selectedClasswork.id && a.aluno_id === alunoId);
                      return (
                        <label key={alunoId} className="flex items-center gap-2 cursor-pointer">
                          <Checkbox checked={!!ass?.presente} onCheckedChange={() => togglePresenca(selectedClasswork.id, alunoId)} />
                          <span>{al?.nome}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold text-sm mb-2">Documentos da aula</h3>
                  <div className="space-y-1 mb-3">
                    {documentos.filter(d => d.aula_id === selectedClasswork.id).map(d => {
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
                    {documentos.filter(d => d.aula_id === selectedClasswork.id).length === 0 && (
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
                            <Button size="sm" onClick={handleCreateFolderClasswork}>Criar</Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    </div>

                    <Button size="sm" className="w-full mt-2" variant="outline" onClick={() => inputRef.current?.click()}><Upload className="w-4 h-4 mr-2" />Escolher e Enviar Ficheiro</Button>
                    <input ref={inputRef} type="file" hidden onChange={uploadClasswork} />
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
                  <Button variant="destructive" onClick={cancelarClasswork}><X className="w-4 h-4 mr-2" />Cancelar Aula</Button>
                  <Button onClick={finalizarClasswork}><Check className="w-4 h-4 mr-2" />Guardar e Finalizar</Button>
                </DialogFooter>
              </div>
            )
          )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
