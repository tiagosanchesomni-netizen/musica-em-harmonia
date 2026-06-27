import React, { createContext, useContext, useMemo, useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  Role, Profile, Sala, Aula, Assiduidade, Pasta, Documento, Notificacao
} from '@/data/mockData';
import { toast } from 'sonner';

interface AppContextType {
  currentRole: Role;
  setCurrentRole: (r: Role) => void;
  currentUserId: string;
  setCurrentUserId: (id: string) => void;
  currentUser: Profile | undefined;
  loading: boolean;
  logout: () => Promise<void>;
  reloadProfiles: () => Promise<void>;

  profiles: Profile[]; setProfiles: React.Dispatch<React.SetStateAction<Profile[]>>;
  salas: Sala[]; setSalas: React.Dispatch<React.SetStateAction<Sala[]>>;
  aulas: Aula[]; setAulas: React.Dispatch<React.SetStateAction<Aula[]>>;
  assiduidades: Assiduidade[]; setAssiduidades: React.Dispatch<React.SetStateAction<Assiduidade[]>>;
  pastas: Pasta[]; setPastas: React.Dispatch<React.SetStateAction<Pasta[]>>;
  documentos: Documento[]; setDocumentos: React.Dispatch<React.SetStateAction<Documento[]>>;
  notificacoes: Notificacao[]; setNotificacoes: React.Dispatch<React.SetStateAction<Notificacao[]>>;

  getProfile: (id: string) => Profile | undefined;
  getSala: (id: string) => Sala | undefined;
  suspenderUtilizador: (userId: string) => Promise<void>;
  reativarUtilizador: (userId: string) => Promise<void>;
}

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [currentRole, setCurrentRole] = useState<Role>('admin');
  const [currentUser, setCurrentUser] = useState<Profile | undefined>(undefined);
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [loading, setLoading] = useState(true);

  const [profiles, setProfilesState] = useState<Profile[]>([]);
  const [salas, setSalasState] = useState<Sala[]>([]);
  const [aulas, setAulasState] = useState<Aula[]>([]);
  const [assiduidades, setAssiduidadesState] = useState<Assiduidade[]>([]);
  const [pastas, setPastasState] = useState<Pasta[]>([]);
  const [documentos, setDocumentosState] = useState<Documento[]>([]);
  const [notificacoes, setNotificacoesState] = useState<Notificacao[]>([]);

  const cleanRow = (tableName: string, row: any) => {
    const { ...cleaned } = row;
    if (tableName === 'app_salas') {
      delete cleaned.capacidade;
    }
    return cleaned;
  };

  const createWrapper = <T extends { id: string }>(
    tableName: string,
    state: T[],
    setState: React.Dispatch<React.SetStateAction<T[]>>
  ) => {
    return async (val: React.SetStateAction<T[]>) => {
      const next = typeof val === 'function' ? (val as any)(state) : val;
      setState(next);

      try {
        const oldMap = new Map(state.map(x => [x.id, x]));
        const newMap = new Map(next.map(x => [x.id, x]));

        const toDelete = state.filter(x => !newMap.has(x.id));
        if (toDelete.length > 0) {
          await supabase.from(tableName).delete().in('id', toDelete.map(x => x.id));
        }

        for (const row of next) {
          const oldRow = oldMap.get(row.id);
          const dbRow = cleanRow(tableName, row);
          if (!oldRow) {
            await supabase.from(tableName).insert(dbRow);
          } else if (JSON.stringify(oldRow) !== JSON.stringify(row)) {
            await supabase.from(tableName).update(dbRow).eq('id', row.id);
          }
        }
      } catch (err) {
        console.error(`Error syncing ${tableName}:`, err);
      }
    };
  };

  const setProfiles = createWrapper('app_profiles', profiles, setProfilesState);
  const setSalas = createWrapper('app_salas', salas, setSalasState);
  const setAulas = createWrapper('app_aulas', aulas, setAulasState);
  const setAssiduidades = createWrapper('app_assiduidades', assiduidades, setAssiduidadesState);
  const setPastas = createWrapper('app_pastas', pastas, setPastasState);
  const setDocumentos = createWrapper('app_documentos', documentos, setDocumentosState);
  const setNotificacoes = createWrapper('app_notificacoes', notificacoes, setNotificacoesState);

  const loadAllData = async (authUser: any) => {
    try {
      const { data: profilesData } = await supabase.from('app_profiles').select('*');
      if (profilesData) {
        setProfilesState(profilesData);
        const myProfile = profilesData.find(p => p.auth_user_id === authUser.id || p.email === authUser.email);
        if (myProfile) {
          setCurrentUser(myProfile);
          setCurrentUserId(myProfile.id);
          setCurrentRole(myProfile.role);
        }
      }

      const { data: salasData } = await supabase.from('app_salas').select('*');
      if (salasData) setSalasState(salasData);

      const { data: aulasData } = await supabase.from('app_aulas').select('*');
      if (aulasData) setAulasState(aulasData);

      const { data: assiduidadesData } = await supabase.from('app_assiduidades').select('*');
      if (assiduidadesData) setAssiduidadesState(assiduidadesData);

      const { data: pastasData } = await supabase.from('app_pastas').select('*');
      if (pastasData) setPastasState(pastasData);

      const { data: documentosData } = await supabase.from('app_documentos').select('*');
      if (documentosData) setDocumentosState(documentosData);

      const { data: notificacoesData } = await supabase.from('app_notificacoes').select('*');
      if (notificacoesData) setNotificacoesState(notificacoesData);
    } catch (err) {
      console.error('Error loading Supabase data:', err);
    }
  };

  useEffect(() => {
    if (currentUserId && profiles.length > 0) {
      const updatedUser = profiles.find(p => p.id === currentUserId);
      if (updatedUser) {
        setCurrentUser(updatedUser);
      }
    }
  }, [profiles, currentUserId]);

  useEffect(() => {
    const REFRESH_TIMEOUT = 2 * 60 * 1000; // 2 minutos
    const LOGOUT_TIMEOUT = 10 * 60 * 1000; // 10 minutos

    let refreshTimer: number;
    let logoutTimer: number;

    const resetTimers = () => {
      window.clearTimeout(refreshTimer);
      window.clearTimeout(logoutTimer);

      refreshTimer = window.setTimeout(() => {
        window.location.reload();
      }, REFRESH_TIMEOUT);

      if (currentUserId) {
        logoutTimer = window.setTimeout(() => {
          logout();
          toast.warning('Sessão encerrada por inatividade.');
        }, LOGOUT_TIMEOUT);
      }
    };

    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    events.forEach(event => {
      window.addEventListener(event, resetTimers);
    });

    resetTimers();

    return () => {
      window.clearTimeout(refreshTimer);
      window.clearTimeout(logoutTimer);
      events.forEach(event => {
        window.removeEventListener(event, resetTimers);
      });
    };
  }, [currentUserId]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        loadAllData(session.user).finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session) {
        setLoading(true);
        await loadAllData(session.user);
        setLoading(false);
      } else {
        setCurrentUser(undefined);
        setCurrentUserId('');
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!currentUserId) return;

    const channel = supabase
      .channel('realtime-notificacoes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'app_notificacoes' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setNotificacoesState(prev => {
              if (prev.some(n => n.id === payload.new.id)) return prev;
              return [payload.new as Notificacao, ...prev];
            });
          } else if (payload.eventType === 'UPDATE') {
            setNotificacoesState(prev =>
              prev.map(n => n.id === payload.new.id ? (payload.new as Notificacao) : n)
            );
          } else if (payload.eventType === 'DELETE') {
            setNotificacoesState(prev =>
              prev.filter(n => n.id !== payload.old.id)
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUserId]);

  const suspenderUtilizador = async (userId: string) => {
    const target = profiles.find(p => p.id === userId);
    if (!target || target.role === 'admin') return;

    const agoraStr = new Date().toISOString();
    const aulasFuturas = aulas.filter(aula => {
      const isFutura = new Date(aula.data_hora).getTime() >= new Date(agoraStr).getTime();
      const belongs = aula.alunos.includes(userId) || aula.professores.includes(userId);
      const isAtiva = aula.estado === 'agendada' || aula.estado === 'pendente_reposicao';
      return isFutura && belongs && isAtiva;
    });

    const aulaIds = aulasFuturas.map(a => a.id);

    try {
      const { error: profileErr } = await supabase
        .from('app_profiles')
        .update({
          suspenso: true,
          aulas_suspensas: aulaIds
        })
        .eq('id', userId);

      if (profileErr) throw profileErr;

      for (const aula of aulasFuturas) {
        const novosAlunos = aula.alunos.filter(id => id !== userId);
        const novosProfessores = aula.professores.filter(id => id !== userId);
        
        const { error: aulaErr } = await supabase
          .from('app_aulas')
          .update({
            alunos: novosAlunos,
            professores: novosProfessores
          })
          .eq('id', aula.id);

        if (aulaErr) console.error("Erro ao atualizar aula:", aulaErr);
      }

      setProfilesState(prev => prev.map(p => p.id === userId ? { ...p, suspenso: true, aulas_suspensas: aulaIds } : p));
      setAulasState(prev => prev.map(aula => {
        if (aulaIds.includes(aula.id)) {
          return {
            ...aula,
            alunos: aula.alunos.filter(id => id !== userId),
            professores: aula.professores.filter(id => id !== userId)
          };
        }
        return aula;
      }));

    } catch (err) {
      console.error("Erro ao suspender utilizador:", err);
      throw err;
    }
  };

  const reativarUtilizador = async (userId: string) => {
    const target = profiles.find(p => p.id === userId);
    if (!target) return;

    const aulaIds = target.aulas_suspensas || [];

    try {
      const { error: profileErr } = await supabase
        .from('app_profiles')
        .update({
          suspenso: false,
          aulas_suspensas: []
        })
        .eq('id', userId);

      if (profileErr) throw profileErr;

      const agoraStr = new Date().toISOString();
      for (const id of aulaIds) {
        const aulaObj = aulas.find(a => a.id === id);
        if (!aulaObj) continue;
        
        const isFutura = new Date(aulaObj.data_hora).getTime() >= new Date(agoraStr).getTime();
        const isAtiva = aulaObj.estado === 'agendada' || aulaObj.estado === 'pendente_reposicao';
        if (isFutura && isAtiva) {
          const novosAlunos = target.role === 'aluno' && !aulaObj.alunos.includes(userId)
            ? [...aulaObj.alunos, userId]
            : aulaObj.alunos;
          const novosProfessores = target.role === 'professor' && !aulaObj.professores.includes(userId)
            ? [...aulaObj.professores, userId]
            : aulaObj.professores;

          const { error: aulaErr } = await supabase
            .from('app_aulas')
            .update({
              alunos: novosAlunos,
              professores: novosProfessores
            })
            .eq('id', id);

          if (aulaErr) console.error("Erro ao re-adicionar a aula:", aulaErr);
        }
      }

      setProfilesState(prev => prev.map(p => p.id === userId ? { ...p, suspenso: false, aulas_suspensas: [] } : p));
      setAulasState(prev => prev.map(aula => {
        if (aulaIds.includes(aula.id)) {
          const isFutura = new Date(aula.data_hora).getTime() >= new Date(agoraStr).getTime();
          const isAtiva = aula.estado === 'agendada' || aula.estado === 'pendente_reposicao';
          if (isFutura && isAtiva) {
            return {
              ...aula,
              alunos: target.role === 'aluno' && !aula.alunos.includes(userId) ? [...aula.alunos, userId] : aula.alunos,
              professores: target.role === 'professor' && !aula.professores.includes(userId) ? [...aula.professores, userId] : aula.professores
            };
          }
        }
        return aula;
      }));

    } catch (err) {
      console.error("Erro ao reativar utilizador:", err);
      throw err;
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setCurrentUser(undefined);
    setCurrentUserId('');
  };

  const reloadProfiles = async () => {
    const { data } = await supabase.from('app_profiles').select('*');
    if (data) setProfilesState(data);
  };

  const value = useMemo<AppContextType>(() => ({
    currentRole, setCurrentRole,
    currentUserId, setCurrentUserId,
    currentUser,
    loading,
    logout,
    reloadProfiles,
    profiles, setProfiles,
    salas, setSalas,
    aulas, setAulas,
    assiduidades, setAssiduidades,
    pastas, setPastas,
    documentos, setDocumentos,
    notificacoes, setNotificacoes,
    getProfile: (id: string) => profiles.find(p => p.id === id),
    getSala: (id: string) => salas.find(s => s.id === id),
    suspenderUtilizador,
    reativarUtilizador,
  }), [currentRole, currentUserId, currentUser, loading, profiles, salas, aulas, assiduidades, pastas, documentos, notificacoes]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
