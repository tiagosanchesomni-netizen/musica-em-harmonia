import { Aula, EstadoAula } from '@/data/mockData';

export function formatDataHora(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString('pt-PT', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export function formatData(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function formatHora(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' });
}

export const estadoConfig: Record<EstadoAula, { label: string; className: string }> = {
  agendada: { label: 'Agendada', className: 'bg-status-scheduled text-status-scheduled-foreground' },
  realizada: { label: 'Realizada', className: 'bg-status-taught text-status-taught-foreground' },
  cancelada: { label: 'Cancelada', className: 'bg-status-canceled text-status-canceled-foreground' },
  pendente_reposicao: { label: 'Pendente reposição', className: 'bg-status-absent text-status-absent-foreground' },
};

export function diasEntre(iso: string): number {
  const target = new Date(iso); target.setHours(0, 0, 0, 0);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

// Professor: aulas dos últimos 2 dias até próximos 5 dias
export function filtroProfessor(aulas: Aula[], professorId: string): Aula[] {
  return aulas
    .filter(a => a.professores.includes(professorId))
    .filter(a => {
      const d = diasEntre(a.data_hora);
      return d >= -2 && d <= 5;
    })
    .sort((a, b) => new Date(a.data_hora).getTime() - new Date(b.data_hora).getTime());
}

// Aluno: próximas 2 semanas (a partir de hoje)
export function filtroAluno(aulas: Aula[], alunoId: string): Aula[] {
  return aulas
    .filter(a => a.alunos.includes(alunoId))
    .filter(a => {
      const d = diasEntre(a.data_hora);
      return d >= 0 && d <= 14;
    })
    .sort((a, b) => new Date(a.data_hora).getTime() - new Date(b.data_hora).getTime());
}
