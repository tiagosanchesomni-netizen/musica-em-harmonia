import React, { createContext, useContext, useState, useCallback } from 'react';

export type UserRole = 'admin' | 'teacher' | 'student';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  status: 'active' | 'archived';
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => boolean;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

// Mock users database
const MOCK_USERS: (User & { password: string })[] = [
  { id: '1', email: '1999tiagosanches@gmail.com', password: 'grt', name: 'Tiago Sanches', role: 'admin', status: 'active' },
  { id: '2', email: 'professor@escola.pt', password: '123', name: 'Maria Silva', role: 'teacher', status: 'active' },
  { id: '3', email: 'aluno@escola.pt', password: '123', name: 'João Costa', role: 'student', status: 'active' },
  { id: '4', email: 'prof.carlos@escola.pt', password: '123', name: 'Carlos Mendes', role: 'teacher', status: 'active' },
  { id: '5', email: 'ana@escola.pt', password: '123', name: 'Ana Rodrigues', role: 'student', status: 'active' },
  { id: '6', email: 'pedro@escola.pt', password: '123', name: 'Pedro Ferreira', role: 'student', status: 'active' },
];

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('music-school-user');
    return saved ? JSON.parse(saved) : null;
  });

  const login = useCallback((email: string, password: string) => {
    const found = MOCK_USERS.find(u => u.email === email && u.password === password && u.status === 'active');
    if (found) {
      const { password: _, ...userData } = found;
      setUser(userData);
      localStorage.setItem('music-school-user', JSON.stringify(userData));
      return true;
    }
    return false;
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem('music-school-user');
  }, []);

  return (
    <AuthContext.Provider value={{ user, login, logout, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
