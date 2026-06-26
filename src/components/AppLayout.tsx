import { useState, useEffect } from 'react';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/AppSidebar';
import { Outlet, useNavigate, Navigate } from 'react-router-dom';
import { useApp } from '@/contexts/AppContext';
import { supabase } from '@/integrations/supabase/client';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Role } from '@/data/mockData';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Check, X } from 'lucide-react';
import { toast } from 'sonner';

const roleLabels: Record<Role, string> = {
  admin: 'Administrador',
  professor: 'Professor',
  aluno: 'Aluno',
};

const roleHome: Record<Role, string> = {
  admin: '/admin/aulas',
  professor: '/professor/aulas',
  aluno: '/aluno/aulas',
};

export function AppLayout() {
  const { currentRole, setCurrentRole, currentUser, profiles, currentUserId, setCurrentUserId, setProfiles, loading } = useApp();
  const navigate = useNavigate();

  const usersOfRole = profiles.filter(p => p.role === currentRole);

  // First Access state
  const [firstAccessOpen, setFirstAccessOpen] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }
  const [step, setStep] = useState(1); // 1: Setup, 2: Verification
  const [provisionalKeyInput, setProvisionalKeyInput] = useState('');
  const [emailInput, setEmailInput] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [generatedCode, setGeneratedCode] = useState('');

  // Keep dialog open if user needs first access
  useEffect(() => {
    if (currentUser?.primeiro_acesso) {
      setFirstAccessOpen(true);
      setStep(1);
      setProvisionalKeyInput('');
      setEmailInput('');
      setPassword('');
      setConfirmPassword('');
      setVerificationCode('');
    } else {
      setFirstAccessOpen(false);
    }
  }, [currentUser]);

  const isEmailValid = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const hasMinLength = password.length >= 8;
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[^A-Za-z0-9]/.test(password);
  const isPasswordStrong = hasMinLength && hasUpper && hasLower && hasNumber && hasSpecial;
  const passwordsMatch = password === confirmPassword;

  const handleContinue = () => {
    if (!provisionalKeyInput) {
      toast.error('Por favor, introduza a chave provisória.');
      return;
    }
    if (provisionalKeyInput.trim().toUpperCase() !== (currentUser?.chave_provisoria || '').toUpperCase()) {
      toast.error('A chave provisória está incorreta.');
      return;
    }
    if (!emailInput) {
      toast.error('Por favor, introduza o seu email.');
      return;
    }
    if (!isEmailValid(emailInput)) {
      toast.error('Por favor, introduza um email válido.');
      return;
    }
    if (!isPasswordStrong) {
      toast.error('A palavra-passe não cumpre todos os requisitos de segurança.');
      return;
    }
    if (!passwordsMatch) {
      toast.error('As palavras-passe não coincidem.');
      return;
    }

    // Generate random 6 digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    setGeneratedCode(code);
    
    // Simulate sending email
    toast.success(`Código de validação enviado para ${emailInput}`);
    setStep(2);
  };

  const handleValidate = async () => {
    if (verificationCode !== generatedCode) {
      toast.error('Código de validação incorreto. Tente novamente.');
      return;
    }

    try {
      // 1. Update the Supabase Auth credentials (email & password)
      const { error: authErr } = await supabase.auth.updateUser({
        email: emailInput,
        password: password,
      });

      if (authErr) throw authErr;

      // 2. Update the profile in the database via context setter
      setProfiles(prev => prev.map(p => {
        if (p.id === currentUserId) {
          return {
            ...p,
            email: emailInput,
            primeiro_acesso: false,
            chave_provisoria: ''
          };
        }
        return p;
      }));

      toast.success('Conta validada e ativada com sucesso!');
      setFirstAccessOpen(false);
    } catch (err: any) {
      toast.error(err.message || 'Erro ao validar conta');
    }
  };

  const handleBack = () => {
    setStep(1);
    setVerificationCode('');
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-14 flex items-center justify-between border-b bg-card px-4 shrink-0 gap-4">
            <div className="flex items-center gap-3">
              <SidebarTrigger />
            </div>
            <div className="flex items-center gap-3 text-sm">
              <span className="font-medium text-slate-200">{currentUser?.nome}</span>
              <Badge variant="secondary" className="capitalize">{roleLabels[currentRole]}</Badge>
            </div>
          </header>
          <main className="flex-1 overflow-auto p-6 bg-background">
            <Outlet />
          </main>
        </div>
      </div>

      <Dialog open={firstAccessOpen} onOpenChange={() => {}}>
        <DialogContent className="[&>button]:hidden sm:max-w-[450px]" onPointerDownOutside={(e) => e.preventDefault()} onEscapeKeyDown={(e) => e.preventDefault()}>
          {step === 1 ? (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-xl font-bold">
                  <span className="p-1.5 bg-primary/10 text-primary rounded-md">🔑</span>
                  Configurar Primeiro Acesso
                </DialogTitle>
                <DialogDescription>
                  Olá <strong>{currentUser?.nome}</strong>, este é o seu primeiro acesso. Por favor, defina o seu email e palavra-passe.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-2">
                <div className="space-y-1">
                  <Label htmlFor="provisionalKey">Chave Provisória</Label>
                  <Input
                    id="provisionalKey"
                    type="text"
                    placeholder="Introduza a chave provisória"
                    className="uppercase font-mono"
                    value={provisionalKeyInput}
                    onChange={(e) => setProvisionalKeyInput(e.target.value)}
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="exemplo@email.com"
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="password">Nova Palavra-passe</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="confirmPassword">Confirmar Palavra-passe</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                </div>

                {/* Password strength criteria */}
                <div className="p-3 bg-muted/40 rounded-lg space-y-2 text-xs">
                  <p className="font-semibold text-muted-foreground">Requisitos da palavra-passe:</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    <div className="flex items-center gap-1.5">
                      {hasMinLength ? (
                        <Check className="w-3.5 h-3.5 text-green-500 shrink-0" />
                      ) : (
                        <X className="w-3.5 h-3.5 text-destructive shrink-0" />
                      )}
                      <span className={hasMinLength ? "text-green-600 font-medium" : "text-muted-foreground"}>Mínimo 8 caracteres</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {hasUpper ? (
                        <Check className="w-3.5 h-3.5 text-green-500 shrink-0" />
                      ) : (
                        <X className="w-3.5 h-3.5 text-destructive shrink-0" />
                      )}
                      <span className={hasUpper ? "text-green-600 font-medium" : "text-muted-foreground"}>Uma maiúscula</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {hasLower ? (
                        <Check className="w-3.5 h-3.5 text-green-500 shrink-0" />
                      ) : (
                        <X className="w-3.5 h-3.5 text-destructive shrink-0" />
                      )}
                      <span className={hasLower ? "text-green-600 font-medium" : "text-muted-foreground"}>Uma minúscula</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {hasNumber ? (
                        <Check className="w-3.5 h-3.5 text-green-500 shrink-0" />
                      ) : (
                        <X className="w-3.5 h-3.5 text-destructive shrink-0" />
                      )}
                      <span className={hasNumber ? "text-green-600 font-medium" : "text-muted-foreground"}>Um número</span>
                    </div>

                    <div className="flex items-center gap-1.5 sm:col-span-2">
                      {hasSpecial ? (
                        <Check className="w-3.5 h-3.5 text-green-500 shrink-0" />
                      ) : (
                        <X className="w-3.5 h-3.5 text-destructive shrink-0" />
                      )}
                      <span className={hasSpecial ? "text-green-600 font-medium" : "text-muted-foreground"}>Um caractere especial (ex: @, #, $, !)</span>
                    </div>
                  </div>

                  {password && confirmPassword && (
                    <div className="pt-1.5 border-t flex items-center gap-1.5">
                      {passwordsMatch ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-green-500" />
                          <span className="text-green-600 font-medium">As palavras-passe coincidem</span>
                        </>
                      ) : (
                        <>
                          <X className="w-3.5 h-3.5 text-destructive" />
                          <span className="text-destructive font-medium">As palavras-passe não coincidem</span>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <DialogFooter className="pt-2">
                <Button onClick={handleContinue} className="w-full">
                  Continuar para validação
                </Button>
              </DialogFooter>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-xl font-bold">
                  <span className="p-1.5 bg-primary/10 text-primary rounded-md">✉️</span>
                  Validar Conta
                </DialogTitle>
                <DialogDescription>
                  Enviámos um código para <strong>{emailInput}</strong>. Introduza-o abaixo para concluir a ativação.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-2">
                <div className="space-y-1">
                  <Label htmlFor="code">Código de Validação</Label>
                  <Input
                    id="code"
                    type="text"
                    maxLength={6}
                    placeholder="000000"
                    className="text-center text-lg tracking-widest font-mono font-bold"
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value)}
                  />
                </div>

                <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg space-y-1 text-xs">
                  <p className="font-semibold text-primary">Simulação de Envio de Email</p>
                  <p className="text-muted-foreground">
                    Como este é um ambiente de demonstração, utilize o seguinte código provisório:
                  </p>
                  <code className="block p-1.5 bg-background border rounded font-mono text-center text-sm text-foreground font-bold mt-1">
                    {generatedCode}
                  </code>
                </div>
              </div>

              <DialogFooter className="flex flex-col sm:flex-row gap-2 pt-2">
                <Button variant="ghost" onClick={handleBack} className="w-full sm:w-auto">
                  Voltar
                </Button>
                <Button onClick={handleValidate} className="w-full sm:flex-1">
                  Validar e Ativar Conta
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </SidebarProvider>
  );
}
