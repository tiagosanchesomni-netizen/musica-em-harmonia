import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppProvider } from "@/contexts/AppContext";
import { AppLayout } from "@/components/AppLayout";

import AdminUtilizadores from "@/pages/admin/Utilizadores";
import AdminSalas from "@/pages/admin/Salas";
import AdminAulas from "@/pages/admin/Aulas";
import AdminReposicoes from "@/pages/admin/Reposicoes";
import AdminDocumentos from "@/pages/admin/Documentos";
import AdminNotificacoes from "@/pages/admin/Notificacoes";

import ProfessorAulas from "@/pages/professor/Aulas";
import ProfessorReposicoes from "@/pages/professor/Reposicoes";
import ProfessorDocumentos from "@/pages/professor/Documentos";

import AlunoAulas from "@/pages/aluno/Aulas";
import AlunoReposicoes from "@/pages/aluno/Reposicoes";
import AlunoDocumentos from "@/pages/aluno/Documentos";

import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AppProvider>
        <BrowserRouter>
          <Routes>
            <Route element={<AppLayout />}>
              <Route path="/" element={<Navigate to="/admin/aulas" replace />} />

              <Route path="/admin/utilizadores" element={<AdminUtilizadores />} />
              <Route path="/admin/salas" element={<AdminSalas />} />
              <Route path="/admin/aulas" element={<AdminAulas />} />
              <Route path="/admin/reposicoes" element={<AdminReposicoes />} />
              <Route path="/admin/documentos" element={<AdminDocumentos />} />
              <Route path="/admin/notificacoes" element={<AdminNotificacoes />} />

              <Route path="/professor/aulas" element={<ProfessorAulas />} />
              <Route path="/professor/reposicoes" element={<ProfessorReposicoes />} />
              <Route path="/professor/documentos" element={<ProfessorDocumentos />} />

              <Route path="/aluno/aulas" element={<AlunoAulas />} />
              <Route path="/aluno/reposicoes" element={<AlunoReposicoes />} />
              <Route path="/aluno/documentos" element={<AlunoDocumentos />} />

              <Route path="*" element={<NotFound />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </AppProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
