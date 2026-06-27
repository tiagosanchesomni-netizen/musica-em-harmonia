import React, { createContext, useContext, useMemo, useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  Role, Profile, Sala, Aula, Assiduidade, Pasta, Documento, Notificacao
} from '@/data/mockData';

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
  }), [currentRole, currentUserId, currentUser, loading, profiles, salas, aulas, assiduidades, pastas, documentos, notificacoes]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
