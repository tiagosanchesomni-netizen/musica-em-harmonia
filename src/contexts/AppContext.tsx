import React, { createContext, useContext, useMemo, useState } from 'react';
import {
  Role, Profile, Sala, Aula, Assiduidade, Pasta, Documento, Notificacao,
  seedProfiles, seedSalas, seedAulas, seedAssiduidades, seedPastas, seedDocumentos, seedNotificacoes,
} from '@/data/mockData';

interface AppContextType {
  // role switcher
  currentRole: Role;
  setCurrentRole: (r: Role) => void;
  currentUserId: string;
  setCurrentUserId: (id: string) => void;
  currentUser: Profile | undefined;

  // data
  profiles: Profile[]; setProfiles: React.Dispatch<React.SetStateAction<Profile[]>>;
  salas: Sala[]; setSalas: React.Dispatch<React.SetStateAction<Sala[]>>;
  aulas: Aula[]; setAulas: React.Dispatch<React.SetStateAction<Aula[]>>;
  assiduidades: Assiduidade[]; setAssiduidades: React.Dispatch<React.SetStateAction<Assiduidade[]>>;
  pastas: Pasta[]; setPastas: React.Dispatch<React.SetStateAction<Pasta[]>>;
  documentos: Documento[]; setDocumentos: React.Dispatch<React.SetStateAction<Documento[]>>;
  notificacoes: Notificacao[]; setNotificacoes: React.Dispatch<React.SetStateAction<Notificacao[]>>;

  // helpers
  getProfile: (id: string) => Profile | undefined;
  getSala: (id: string) => Sala | undefined;
}

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [currentRole, setCurrentRole] = useState<Role>('admin');
  const [profiles, setProfiles] = useState<Profile[]>(seedProfiles);
  const [salas, setSalas] = useState<Sala[]>(seedSalas);
  const [aulas, setAulas] = useState<Aula[]>(seedAulas);
  const [assiduidades, setAssiduidades] = useState<Assiduidade[]>(seedAssiduidades);
  const [pastas, setPastas] = useState<Pasta[]>(seedPastas);
  const [documentos, setDocumentos] = useState<Documento[]>(seedDocumentos);
  const [notificacoes, setNotificacoes] = useState<Notificacao[]>(seedNotificacoes);

  // default user per role
  const defaultUserId: Record<Role, string> = { admin: 'a1', professor: 'p1', aluno: 's1' };
  const [currentUserId, setCurrentUserId] = useState<string>(defaultUserId.admin);

  // when role changes via the switcher, reset to first user of that role
  const handleSetRole = (r: Role) => {
    setCurrentRole(r);
    const first = profiles.find(p => p.role === r);
    if (first) setCurrentUserId(first.id);
  };

  const currentUser = profiles.find(p => p.id === currentUserId);

  const value = useMemo<AppContextType>(() => ({
    currentRole, setCurrentRole: handleSetRole,
    currentUserId, setCurrentUserId,
    currentUser,
    profiles, setProfiles,
    salas, setSalas,
    aulas, setAulas,
    assiduidades, setAssiduidades,
    pastas, setPastas,
    documentos, setDocumentos,
    notificacoes, setNotificacoes,
    getProfile: (id: string) => profiles.find(p => p.id === id),
    getSala: (id: string) => salas.find(s => s.id === id),
  }), [currentRole, currentUserId, currentUser, profiles, salas, aulas, assiduidades, pastas, documentos, notificacoes]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
