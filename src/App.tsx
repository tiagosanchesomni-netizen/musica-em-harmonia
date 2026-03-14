import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/AppLayout";
import Login from "@/pages/Login";
import AdminDashboard from "@/pages/admin/Dashboard";
import AdminUsers from "@/pages/admin/Users";
import AdminRooms from "@/pages/admin/Rooms";
import AdminSchedules from "@/pages/admin/Schedules";
import AdminRescheduling from "@/pages/admin/Rescheduling";
import TeacherDashboard from "@/pages/teacher/Dashboard";
import TeacherSummaries from "@/pages/teacher/Summaries";
import TeacherEvaluations from "@/pages/teacher/Evaluations";
import TeacherDocuments from "@/pages/teacher/Documents";
import StudentDashboard from "@/pages/student/Dashboard";
import StudentCalendar from "@/pages/student/Calendar";
import StudentSummaries from "@/pages/student/Summaries";
import StudentDocuments from "@/pages/student/Documents";
import StudentAbsence from "@/pages/student/Absence";
import NotFound from "./pages/NotFound";
import { Loader2 } from "lucide-react";

const queryClient = new QueryClient();

function AppRoutes() {
  const { user, isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <Routes>
        <Route path="*" element={<Login />} />
      </Routes>
    );
  }

  const homeRoute = user?.role === 'admin' ? '/admin' : user?.role === 'teacher' ? '/professor' : '/aluno';

  return (
    <Routes>
      <Route path="/" element={<Navigate to={homeRoute} replace />} />
      <Route element={<AppLayout />}>
        {user?.role === 'admin' && (
          <>
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/admin/utilizadores" element={<AdminUsers />} />
            <Route path="/admin/salas" element={<AdminRooms />} />
            <Route path="/admin/horarios" element={<AdminSchedules />} />
            <Route path="/admin/reposicoes" element={<AdminRescheduling />} />
          </>
        )}
        {user?.role === 'teacher' && (
          <>
            <Route path="/professor" element={<TeacherDashboard />} />
            <Route path="/professor/sumarios" element={<TeacherSummaries />} />
            <Route path="/professor/avaliacoes" element={<TeacherEvaluations />} />
            <Route path="/professor/documentos" element={<TeacherDocuments />} />
          </>
        )}
        {user?.role === 'student' && (
          <>
            <Route path="/aluno" element={<StudentDashboard />} />
            <Route path="/aluno/calendario" element={<StudentCalendar />} />
            <Route path="/aluno/sumarios" element={<StudentSummaries />} />
            <Route path="/aluno/documentos" element={<StudentDocuments />} />
            <Route path="/aluno/falta" element={<StudentAbsence />} />
          </>
        )}
      </Route>
      <Route path="*" element={<Navigate to={homeRoute} replace />} />
    </Routes>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
