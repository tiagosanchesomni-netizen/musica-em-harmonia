import React, { createContext, useContext, useState } from 'react';

export interface Room {
  id: string;
  name: string;
  capacity: number;
}

export interface ScheduleEntry {
  id: string;
  teacherId: string;
  studentId: string;
  roomId: string;
  dayOfWeek: number; // 0-6
  startTime: string; // HH:mm
  endTime: string;
  recurring: boolean;
  date?: string; // for single classes
}

export interface ClassRecord {
  id: string;
  scheduleId: string;
  date: string;
  summary: string;
  status: 'taught' | 'canceled' | 'scheduled';
  attendance: 'present' | 'absent' | null;
  attachments: { name: string; url: string }[];
  reschedulePending: boolean;
}

export interface Evaluation {
  id: string;
  teacherId: string;
  studentId: string;
  date: string;
  technique: number;
  theory: number;
  commitment: number;
  notes: string;
}

export interface Notification {
  id: string;
  userId: string;
  message: string;
  type: 'document' | 'schedule' | 'absence' | 'general';
  read: boolean;
  createdAt: string;
}

export interface AppUser {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'teacher' | 'student';
  status: 'active' | 'archived';
}

interface DataContextType {
  users: AppUser[];
  setUsers: React.Dispatch<React.SetStateAction<AppUser[]>>;
  rooms: Room[];
  setRooms: React.Dispatch<React.SetStateAction<Room[]>>;
  schedules: ScheduleEntry[];
  setSchedules: React.Dispatch<React.SetStateAction<ScheduleEntry[]>>;
  classRecords: ClassRecord[];
  setClassRecords: React.Dispatch<React.SetStateAction<ClassRecord[]>>;
  evaluations: Evaluation[];
  setEvaluations: React.Dispatch<React.SetStateAction<Evaluation[]>>;
  notifications: Notification[];
  setNotifications: React.Dispatch<React.SetStateAction<Notification[]>>;
  addNotification: (userId: string, message: string, type: Notification['type']) => void;
}

const DataContext = createContext<DataContextType | null>(null);

const INITIAL_USERS: AppUser[] = [
  { id: '1', email: '1999tiagosanches@gmail.com', name: 'Tiago Sanches', role: 'admin', status: 'active' },
  { id: '2', email: 'professor@escola.pt', name: 'Maria Silva', role: 'teacher', status: 'active' },
  { id: '3', email: 'aluno@escola.pt', name: 'João Costa', role: 'student', status: 'active' },
  { id: '4', email: 'prof.carlos@escola.pt', name: 'Carlos Mendes', role: 'teacher', status: 'active' },
  { id: '5', email: 'ana@escola.pt', name: 'Ana Rodrigues', role: 'student', status: 'active' },
  { id: '6', email: 'pedro@escola.pt', name: 'Pedro Ferreira', role: 'student', status: 'active' },
];

const INITIAL_ROOMS: Room[] = [
  { id: 'r1', name: 'Sala 1 - Piano', capacity: 3 },
  { id: 'r2', name: 'Sala 2 - Guitarra', capacity: 4 },
  { id: 'r3', name: 'Sala 3 - Ensemble', capacity: 10 },
];

const INITIAL_SCHEDULES: ScheduleEntry[] = [
  { id: 's1', teacherId: '2', studentId: '3', roomId: 'r1', dayOfWeek: 1, startTime: '14:00', endTime: '15:00', recurring: true },
  { id: 's2', teacherId: '2', studentId: '5', roomId: 'r1', dayOfWeek: 2, startTime: '10:00', endTime: '11:00', recurring: true },
  { id: 's3', teacherId: '4', studentId: '6', roomId: 'r2', dayOfWeek: 3, startTime: '16:00', endTime: '17:00', recurring: true },
  { id: 's4', teacherId: '4', studentId: '3', roomId: 'r2', dayOfWeek: 4, startTime: '11:00', endTime: '12:00', recurring: true },
];

const INITIAL_CLASS_RECORDS: ClassRecord[] = [
  { id: 'cr1', scheduleId: 's1', date: '2026-03-09', summary: 'Escalas maiores - Dó e Sol. Exercícios de técnica com metrónomo.', status: 'taught', attendance: 'present', attachments: [{ name: 'exercicio_escalas.pdf', url: '#' }], reschedulePending: false },
  { id: 'cr2', scheduleId: 's2', date: '2026-03-10', summary: '', status: 'canceled', attendance: null, attachments: [], reschedulePending: true },
  { id: 'cr3', scheduleId: 's3', date: '2026-03-11', summary: 'Acordes de 7ª dominante. Progressões II-V-I.', status: 'taught', attendance: 'present', attachments: [], reschedulePending: false },
  { id: 'cr4', scheduleId: 's1', date: '2026-03-16', summary: '', status: 'scheduled', attendance: null, attachments: [], reschedulePending: false },
];

const INITIAL_EVALUATIONS: Evaluation[] = [
  { id: 'e1', teacherId: '2', studentId: '3', date: '2026-03-09', technique: 7, theory: 6, commitment: 8, notes: 'Boa evolução na técnica.' },
  { id: 'e2', teacherId: '4', studentId: '6', date: '2026-03-11', technique: 8, theory: 7, commitment: 9, notes: 'Muito dedicado.' },
];

const INITIAL_NOTIFICATIONS: Notification[] = [
  { id: 'n1', userId: '2', message: 'João Costa avisou que faltará à aula de 16/03.', type: 'absence', read: false, createdAt: '2026-03-12T10:00:00' },
  { id: 'n2', userId: '3', message: 'Novo documento disponível: exercicio_escalas.pdf', type: 'document', read: false, createdAt: '2026-03-09T15:00:00' },
];

export function DataProvider({ children }: { children: React.ReactNode }) {
  const [users, setUsers] = useState<AppUser[]>(INITIAL_USERS);
  const [rooms, setRooms] = useState<Room[]>(INITIAL_ROOMS);
  const [schedules, setSchedules] = useState<ScheduleEntry[]>(INITIAL_SCHEDULES);
  const [classRecords, setClassRecords] = useState<ClassRecord[]>(INITIAL_CLASS_RECORDS);
  const [evaluations, setEvaluations] = useState<Evaluation[]>(INITIAL_EVALUATIONS);
  const [notifications, setNotifications] = useState<Notification[]>(INITIAL_NOTIFICATIONS);

  const addNotification = (userId: string, message: string, type: Notification['type']) => {
    const newNotif: Notification = {
      id: `n${Date.now()}`,
      userId,
      message,
      type,
      read: false,
      createdAt: new Date().toISOString(),
    };
    setNotifications(prev => [newNotif, ...prev]);
  };

  return (
    <DataContext.Provider value={{
      users, setUsers,
      rooms, setRooms,
      schedules, setSchedules,
      classRecords, setClassRecords,
      evaluations, setEvaluations,
      notifications, setNotifications,
      addNotification,
    }}>
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used within DataProvider');
  return ctx;
}
