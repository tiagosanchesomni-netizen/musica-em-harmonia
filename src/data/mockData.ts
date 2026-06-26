// Mock data store for the Escola de Música GRT system
// All dates are relative to "today" so filters always have realistic data.

export type Role = 'admin' | 'professor' | 'aluno';

export interface Profile {
  id: string;
  nome: string;
  email: string;
  role: Role;
  primeiro_acesso: boolean;
}

export interface Sala {
  id: string;
  nome: string;
  capacidade: number;
}

export type EstadoAula = 'agendada' | 'realizada' | 'cancelada' | 'pendente_reposicao';
export type TipoAula = 'normal' | 'reposicao';

export interface Aula {
  id: string;
  sala_id: string;
  data_hora: string; // ISO
  duracao: number; // minutos
  tipo: TipoAula;
  estado: EstadoAula;
  professores: string[]; // profile ids
  alunos: string[]; // profile ids
  aula_original_id?: string; // se for reposição
  data_original?: string;
  presencas_finalizadas?: boolean;
}

export interface Assiduidade {
  id: string;
  aula_id: string;
  aluno_id: string;
  presente: boolean;
}

export type AcessoAlunos = 'all' | string[];

export interface Pasta {
  id: string;
  nome: string;
  criado_por: string;
  acesso_alunos: AcessoAlunos;
}

export interface Documento {
  id: string;
  nome: string;
  url: string;
  pasta_id?: string;
  criado_por: string;
  criado_em: string;
  acesso_alunos: AcessoAlunos;
}

export type TipoNotificacao = 'cancelamento' | 'atraso_presenca' | 'reposicao_marcada';

export interface Notificacao {
  id: string;
  mensagem: string;
  lida: boolean;
  tipo: TipoNotificacao;
  criado_em: string;
  destinatario_role: Role;
}

// ─── helpers ──────────────────────────────────────────────────────────────
const today = new Date();
today.setHours(0, 0, 0, 0);

function offsetDate(days: number, hour = 10, minute = 0): string {
  const d = new Date(today);
  d.setDate(d.getDate() + days);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}

// ─── seeds ────────────────────────────────────────────────────────────────
export const seedProfiles: Profile[] = [
  { id: 'a1', nome: 'Tiago Sanches', email: '1999tiagosanches@gmail.com', role: 'admin', primeiro_acesso: false },
  { id: 'p1', nome: 'Prof. Maria Costa', email: 'maria@grt.pt', role: 'professor', primeiro_acesso: false },
  { id: 'p2', nome: 'Prof. João Pereira', email: 'joao@grt.pt', role: 'professor', primeiro_acesso: false },
  { id: 'p3', nome: 'Prof. Ana Ribeiro', email: 'ana@grt.pt', role: 'professor', primeiro_acesso: true },
  { id: 's1', nome: 'Beatriz Lopes', email: 'beatriz@aluno.pt', role: 'aluno', primeiro_acesso: false },
  { id: 's2', nome: 'Diogo Martins', email: 'diogo@aluno.pt', role: 'aluno', primeiro_acesso: false },
  { id: 's3', nome: 'Inês Faria', email: 'ines@aluno.pt', role: 'aluno', primeiro_acesso: false },
  { id: 's4', nome: 'Rui Almeida', email: 'rui@aluno.pt', role: 'aluno', primeiro_acesso: true },
  { id: 's5', nome: 'Sofia Mendes', email: 'sofia@aluno.pt', role: 'aluno', primeiro_acesso: false },
];

export const seedSalas: Sala[] = [
  { id: 'r1', nome: 'Sala A - Piano', capacidade: 4 },
  { id: 'r2', nome: 'Sala B - Cordas', capacidade: 6 },
  { id: 'r3', nome: 'Sala C - Sopros', capacidade: 8 },
  { id: 'r4', nome: 'Auditório', capacidade: 30 },
];

export const seedAulas: Aula[] = [
  // passado (últimos 2 dias) - algumas realizadas, uma sem presenças
  {
    id: 'au1', sala_id: 'r1', data_hora: offsetDate(-2, 10), duracao: 60,
    tipo: 'normal', estado: 'realizada', professores: ['p1'], alunos: ['s1'], presencas_finalizadas: true,
  },
  {
    id: 'au2', sala_id: 'r2', data_hora: offsetDate(-1, 14), duracao: 90,
    tipo: 'normal', estado: 'realizada', professores: ['p2'], alunos: ['s2', 's3'], presencas_finalizadas: false,
  },
  // hoje
  {
    id: 'au3', sala_id: 'r1', data_hora: offsetDate(0, 16), duracao: 60,
    tipo: 'normal', estado: 'agendada', professores: ['p1'], alunos: ['s1', 's5'],
  },
  // próximos dias
  {
    id: 'au4', sala_id: 'r3', data_hora: offsetDate(1, 11), duracao: 60,
    tipo: 'normal', estado: 'agendada', professores: ['p2', 'p3'], alunos: ['s2', 's3', 's4'],
  },
  {
    id: 'au5', sala_id: 'r2', data_hora: offsetDate(3, 15), duracao: 45,
    tipo: 'normal', estado: 'agendada', professores: ['p1'], alunos: ['s5'],
  },
  {
    id: 'au6', sala_id: 'r4', data_hora: offsetDate(5, 18), duracao: 120,
    tipo: 'normal', estado: 'agendada', professores: ['p1', 'p2'], alunos: ['s1', 's2', 's3', 's4', 's5'],
  },
  // próxima semana (visível para aluno até 14 dias)
  {
    id: 'au7', sala_id: 'r1', data_hora: offsetDate(8, 10), duracao: 60,
    tipo: 'normal', estado: 'agendada', professores: ['p1'], alunos: ['s1'],
  },
  {
    id: 'au8', sala_id: 'r3', data_hora: offsetDate(12, 17), duracao: 60,
    tipo: 'normal', estado: 'agendada', professores: ['p3'], alunos: ['s2', 's4'],
  },
  // cancelada / pendente reposição
  {
    id: 'au9', sala_id: 'r2', data_hora: offsetDate(-3, 14), duracao: 60,
    tipo: 'normal', estado: 'pendente_reposicao', professores: ['p2'], alunos: ['s3'],
  },
  {
    id: 'au10', sala_id: 'r1', data_hora: offsetDate(-5, 11), duracao: 60,
    tipo: 'normal', estado: 'pendente_reposicao', professores: ['p1'], alunos: ['s1', 's5'],
  },
  // reposição já marcada
  {
    id: 'au11', sala_id: 'r2', data_hora: offsetDate(2, 17), duracao: 60,
    tipo: 'reposicao', estado: 'agendada', professores: ['p2'], alunos: ['s3'],
    aula_original_id: 'au-old', data_original: offsetDate(-7, 14),
  },
];

export const seedAssiduidades: Assiduidade[] = [
  { id: 'as1', aula_id: 'au1', aluno_id: 's1', presente: true },
];

export const seedPastas: Pasta[] = [
  { id: 'f1', nome: 'Partituras Piano', criado_por: 'p1' },
  { id: 'f2', nome: 'Exercícios Teoria', criado_por: 'p2' },
];

export const seedDocumentos: Documento[] = [
  { id: 'd1', nome: 'Sonata em Dó.pdf', url: '#', pasta_id: 'f1', aula_id: 'au3', criado_por: 'p1', criado_em: offsetDate(-1) },
  { id: 'd2', nome: 'Escalas Maiores.pdf', url: '#', pasta_id: 'f2', criado_por: 'p2', criado_em: offsetDate(-3) },
  { id: 'd3', nome: 'Resumo aula 12.docx', url: '#', aula_id: 'au1', criado_por: 'p1', criado_em: offsetDate(-2) },
];

export const seedNotificacoes: Notificacao[] = [
  { id: 'n1', mensagem: 'Prof. João Pereira cancelou a aula de 15:00', lida: false, tipo: 'cancelamento', criado_em: offsetDate(-1), destinatario_role: 'admin' },
  { id: 'n2', mensagem: 'Aula de 14:00 (Prof. João) sem presenças finalizadas há 2 dias', lida: false, tipo: 'atraso_presenca', criado_em: offsetDate(0), destinatario_role: 'admin' },
];
