import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { KeyRound, Mail, User, ShieldCheck, Check, X } from 'lucide-react';
import logoGrt from '@/assets/logo-grt.jpg';

// ──────────────────────────────────────────────────
// Tipos de ecrã possíveis no fluxo de login
// ──────────────────────────────────────────────────
type Screen =
  | 'login'             // ecrã inicial: email/nome + password
  | 'fa_setup'          // primeiro acesso – passo 2: novo email + nova password
  | 'fa_verify'         // primeiro acesso – passo 3: código de verificação
  | 'forgot_email'      // recuperar palavra-passe – passo 1: introduzir email
  | 'forgot_verify'     // recuperar palavra-passe – passo 2: introduzir código
  | 'forgot_reset';     // recuperar palavra-passe – passo 3: nova palavra-passe

export default function Login() {
  const navigate = useNavigate();
  const [screen, setScreen] = useState<Screen>('login');
  const [isLoading, setIsLoading] = useState(false);

  // ── Login normal ──────────────────────────────
  const [emailOrName, setEmailOrName] = useState('');
  const [password, setPassword] = useState('');

  // ── Primeiro acesso – passo 1 ─────────────────
  const [faName, setFaName] = useState('');
  const [faKey, setFaKey] = useState('');

  // ── Primeiro acesso – passo 2 ─────────────────
  const [faEmail, setFaEmail] = useState('');
  const [faPassword, setFaPassword] = useState('');
  const [faConfirm, setFaConfirm] = useState('');

  // ── Primeiro acesso – passo 3 ─────────────────
  const [faCode, setFaCode] = useState('');
  const [faGeneratedCode, setFaGeneratedCode] = useState('');
  const [faEmailSent, setFaEmailSent] = useState(false);

  // ── Esqueci-me da palavra-passe ───────────────
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotCode, setForgotCode] = useState('');
  const [forgotGeneratedCode, setForgotGeneratedCode] = useState('');
  const [forgotEmailSent, setForgotEmailSent] = useState(false);
  const [forgotPassword, setForgotPassword] = useState('');
  const [forgotConfirm, setForgotConfirm] = useState('');

  // ── Password strength helpers ─────────────────
  const hasMinLength = faPassword.length >= 8;
  const hasUpper = /[A-Z]/.test(faPassword);
  const hasLower = /[a-z]/.test(faPassword);
  const hasNumber = /[0-9]/.test(faPassword);
  const hasSpecial = /[^A-Za-z0-9]/.test(faPassword);
  const isPasswordStrong = hasMinLength && hasUpper && hasLower && hasNumber && hasSpecial;
  const passwordsMatch = faPassword === faConfirm;

  const forgotMinLength = forgotPassword.length >= 8;
  const forgotUpper = /[A-Z]/.test(forgotPassword);
  const forgotLower = /[a-z]/.test(forgotPassword);
  const forgotNumber = /[0-9]/.test(forgotPassword);
  const forgotSpecial = /[^A-Za-z0-9]/.test(forgotPassword);
  const isForgotPassStrong = forgotMinLength && forgotUpper && forgotLower && forgotNumber && forgotSpecial;
  const forgotPasswordsMatch = forgotPassword === forgotConfirm;
  const isEmailValid = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

  // ── Handlers ─────────────────────────────────

  // 1. Login normal
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailOrName || !password) return toast.error('Preencha todos os campos');

    setIsLoading(true);
    try {
      let emailToUse = emailOrName.trim();

      if (!emailToUse.includes('@')) {
        const { data: matchedEmail, error: rpcErr } = await supabase.rpc('resolver_nome_para_email', {
          p_nome: emailToUse
        });

        if (rpcErr || !matchedEmail) {
          toast.error('Utilizador não encontrado. Introduza o seu e-mail ou o nome completo registado.');
          return;
        }
        emailToUse = matchedEmail;
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email: emailToUse,
        password: password,
      });

      if (error) {
        toast.error(error.message === 'Invalid login credentials' ? 'Credenciais incorretas' : error.message);
        return;
      }

      const { data: prof } = await supabase
        .from('app_profiles')
        .select('role, primeiro_acesso, nome, email')
        .eq('auth_user_id', data.user.id)
        .single();

      if (prof?.primeiro_acesso) {
        setFaName(prof.nome || '');
        setFaEmail(prof.email || '');
        setFaKey(password);
        setScreen('fa_setup');
        toast.info('Primeiro acesso detetado. Por favor, configure a sua conta.');
      } else {
        toast.success('Sessão iniciada!');
        const roleHome: Record<string, string> = {
          admin: '/admin/aulas',
          professor: '/professor/aulas',
          aluno: '/aluno/aulas',
        };
        navigate(roleHome[prof?.role ?? ''] || '/');
      }
    } catch (err: any) {
      toast.error(err.message || 'Erro ao iniciar sessão');
    } finally {
      setIsLoading(false);
    }
  };

  // 2. Validar chave provisória e autenticar temporariamente
  const handleFaKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!faName || !faKey) return toast.error('Preencha todos os campos');

    setIsLoading(true);
    try {
      // Obter email temporário pela chave
      const { data: tempEmail, error: rpcErr } = await supabase.rpc('obter_email_por_chave', {
        p_nome: faName.trim(),
        p_chave: faKey.trim().toUpperCase(),
      });

      if (rpcErr) throw rpcErr;
      if (!tempEmail) {
        toast.error('Nome ou Chave Provisória inválidos, ou conta já ativada.');
        return;
      }

      // Autenticar com credenciais provisórias
      const { error: loginErr } = await supabase.auth.signInWithPassword({
        email: tempEmail,
        password: faKey.trim().toUpperCase(),
      });

      if (loginErr) throw loginErr;

      // Avançar para passo 2 (ainda na página de login)
      setScreen('fa_setup');
    } catch (err: any) {
      toast.error(err.message || 'Erro ao validar chave');
    } finally {
      setIsLoading(false);
    }
  };

  // 3. Validar novo email + password e gerar código
  const handleFaSetup = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!faEmail || !isEmailValid(faEmail)) {
      toast.error('Introduza um email válido');
      return;
    }
    if (!isPasswordStrong) {
      toast.error('A palavra-passe não cumpre todos os requisitos de segurança');
      return;
    }
    if (!passwordsMatch) {
      toast.error('As palavras-passe não coincidem');
      return;
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    setFaGeneratedCode(code);
    setIsLoading(true);

    // Enviar email real via Resend
    let emailSent = false;
    try {
      const { error: invokeErr } = await supabase.functions.invoke('send-email', {
        body: {
          to: faEmail,
          subject: '🎵 Escola de Música GRT — Código de Ativação de Conta',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; background: #f9fafb; padding: 32px; border-radius: 12px;">
              <div style="text-align: center; margin-bottom: 24px;">
                <h1 style="color: #1e1b4b; font-size: 22px; margin: 0;">🎵 Escola de Música GRT</h1>
                <p style="color: #6b7280; margin: 8px 0 0;">Ativação de Conta</p>
              </div>
              <div style="background: white; border-radius: 8px; padding: 24px; border: 1px solid #e5e7eb;">
                <p style="color: #374151; margin: 0 0 16px;">Olá! Este é o seu código de ativação de conta:</p>
                <div style="text-align: center; background: #f3f4f6; border-radius: 8px; padding: 20px; margin: 16px 0;">
                  <span style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #4f46e5; font-family: monospace;">${code}</span>
                </div>
                <p style="color: #6b7280; font-size: 13px; margin: 16px 0 0;">Este código é válido apenas para esta sessão. Não partilhe com ninguém.</p>
              </div>
              <p style="color: #9ca3af; font-size: 12px; text-align: center; margin-top: 24px;">Escola de Música GRT — Sistema de Gestão</p>
            </div>
          `,
        },
      });
      if (!invokeErr) {
        emailSent = true;
        toast.success(`Código enviado para ${faEmail} — verifique a sua caixa de entrada`);
      }
    } catch {
      // network error
    }

    if (!emailSent) {
      toast.warning('Não foi possível enviar o email. Use o código mostrado abaixo.');
    }

    setFaEmailSent(emailSent);
    setIsLoading(false);
    setScreen('fa_verify');
  };

  // 4. Verificar código e concluir ativação
  const handleFaVerify = async (e: React.FormEvent) => {
    e.preventDefault();

    if (faCode !== faGeneratedCode) {
      toast.error('Código de validação incorreto. Tente novamente.');
      return;
    }

    setIsLoading(true);
    try {
      // Chamar edge function que usa service role para atualizar sem confirmação de email
      const { data, error } = await supabase.functions.invoke('complete-first-access', {
        body: { new_email: faEmail, new_password: faPassword },
      });

      if (error || data?.error) {
        throw new Error(error?.message || data?.error || 'Erro ao ativar conta');
      }

      toast.success('Conta ativada com sucesso! Bem-vindo!');

      // Re-login com as novas credenciais para obter sessão atualizada
      await supabase.auth.signOut();
      const { data: loginData, error: loginErr } = await supabase.auth.signInWithPassword({
        email: faEmail,
        password: faPassword,
      });

      if (loginErr) throw loginErr;

      const { data: prof } = await supabase
        .from('app_profiles')
        .select('role')
        .eq('auth_user_id', loginData.user.id)
        .single();

      const roleHome: Record<string, string> = {
        admin: '/admin/aulas',
        professor: '/professor/aulas',
        aluno: '/aluno/aulas',
      };
      navigate(roleHome[prof?.role ?? ''] || '/');
    } catch (err: any) {
      toast.error(err.message || 'Erro ao ativar conta');
    } finally {
      setIsLoading(false);
    }
  };

  // 5. Esqueci-me da password - enviar email com código
  const handleForgotEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail || !isEmailValid(forgotEmail)) {
      toast.error('Introduza um email válido');
      return;
    }

    setIsLoading(true);
    try {
      // Verificar se o email existe na base de dados chamando a Edge Function (desvia o bloqueio de RLS para anon)
      const { data: checkData, error: checkErr } = await supabase.functions.invoke('check-email', {
        body: { email: forgotEmail.trim() },
      });

      if (checkErr || !checkData || !checkData.exists) {
        if (checkErr) console.error('Erro ao verificar email:', checkErr);
        toast.error('Email não encontrado no sistema');
        setIsLoading(false);
        return;
      }

      // Utilizar a capitalização exata registada na base de dados
      if (checkData.email) {
        setForgotEmail(checkData.email);
      }

      // Gerar código de 6 dígitos
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      setForgotGeneratedCode(code);

      let emailSent = false;
      try {
        const { error: invokeErr } = await supabase.functions.invoke('send-email', {
          body: {
            to: forgotEmail.trim(),
            subject: '🔑 Recuperar Palavra-passe — Código de Verificação',
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; background: #f9fafb; padding: 32px; border-radius: 12px;">
                <div style="text-align: center; margin-bottom: 24px;">
                  <h1 style="color: #1e1b4b; font-size: 22px; margin: 0;">🎵 Escola de Música GRT</h1>
                  <p style="color: #6b7280; margin: 8px 0 0;">Recuperação de Palavra-passe</p>
                </div>
                <div style="background: white; border-radius: 8px; padding: 24px; border: 1px solid #e5e7eb;">
                  <p style="color: #374151; margin: 0 0 16px;">Recebemos um pedido para recuperar a palavra-passe da sua conta. Utilize o seguinte código para prosseguir:</p>
                  <div style="background: #f3f4f6; border-radius: 8px; padding: 16px; text-align: center; margin-bottom: 16px;">
                    <code style="font-size: 24px; font-weight: bold; letter-spacing: 4px; color: #111827;">${code}</code>
                  </div>
                  <p style="color: #6b7280; font-size: 13px; margin: 0;">Se não efetuou este pedido, pode ignorar este email de forma segura.</p>
                </div>
                <p style="color: #9ca3af; font-size: 12px; text-align: center; margin-top: 24px;">Escola de Música GRT — Sistema de Gestão</p>
              </div>
            `,
          },
        });
        if (!invokeErr) {
          emailSent = true;
          toast.success(`Código enviado para ${forgotEmail} — verifique a sua caixa de entrada`);
        }
      } catch {
        // network error
      }

      if (!emailSent) {
        toast.warning('Não foi possível enviar o email. Use o código mostrado abaixo.');
      }

      setForgotEmailSent(emailSent);
      setScreen('forgot_verify');
    } catch (err: any) {
      toast.error(err.message || 'Erro ao processar pedido');
    } finally {
      setIsLoading(false);
    }
  };

  // 6. Esqueci-me da password - verificar código
  const handleForgotVerify = (e: React.FormEvent) => {
    e.preventDefault();
    if (forgotCode !== forgotGeneratedCode) {
      toast.error('Código de validação incorreto. Tente novamente.');
      return;
    }
    setScreen('forgot_reset');
  };

  // 7. Esqueci-me da password - definir nova password
  const handleForgotReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isForgotPassStrong) {
      toast.error('A palavra-passe não cumpre todos os requisitos de segurança');
      return;
    }
    if (!forgotPasswordsMatch) {
      toast.error('As palavras-passe não coincidem');
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('reset-password-with-code', {
        body: { email: forgotEmail, new_password: forgotPassword },
      });

      if (error || data?.error) {
        throw new Error(error?.message || data?.error || 'Erro ao redefinir palavra-passe');
      }

      toast.success('Palavra-passe redefinida com sucesso! Inicie sessão.');
      
      // Limpar estados
      setForgotEmail(''); setForgotCode(''); setForgotGeneratedCode('');
      setForgotPassword(''); setForgotConfirm('');
      setScreen('login');
    } catch (err: any) {
      toast.error(err.message || 'Erro ao redefinir palavra-passe');
    } finally {
      setIsLoading(false);
    }
  };

  // ── Rótulos por ecrã ─────────────────────────
  const screenTitle: Record<Screen, string> = {
    login: 'Escola de Música GRT',
    fa_key: 'Primeiro Acesso',
    fa_setup: 'Configurar Conta',
    fa_verify: 'Verificar Email',
    forgot_email: 'Recuperar Palavra-passe',
    forgot_verify: 'Introduzir Código',
    forgot_reset: 'Nova Palavra-passe',
  };

  const screenDesc: Record<Screen, string> = {
    login: 'Insira as suas credenciais para aceder ao sistema',
    fa_key: 'Introduza o seu nome e a chave provisória que recebeu',
    fa_setup: 'Defina o seu email e palavra-passe definitivos',
    fa_verify: 'Introduza o código enviado para o seu email',
    forgot_email: 'Insira o email associado à sua conta',
    forgot_verify: 'Introduza o código enviado por email',
    forgot_reset: 'Escolha e confirme a sua nova palavra-passe',
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[hsl(148,50%,12%)] via-[hsl(148,45%,8%)] to-[hsl(148,60%,5%)] p-4">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-[hsl(145,60%,42%)]/10 via-transparent to-transparent pointer-events-none" />

      <Card className="w-full max-w-[420px] backdrop-blur-md bg-card/90 border-slate-800 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[hsl(145,60%,42%)] via-emerald-500 to-green-600" />

        <CardHeader className="space-y-3 flex flex-col items-center text-center">
          <div className="w-16 h-16 rounded-2xl overflow-hidden bg-white shadow-lg p-0.5 border border-slate-700/50">
            <img src={logoGrt} alt="Logo GRT" className="w-full h-full object-cover" />
          </div>
          <div>
            <CardTitle className="text-2xl font-bold tracking-tight text-foreground">
              {screenTitle[screen]}
            </CardTitle>
            <CardDescription className="text-slate-400 mt-1">
              {screenDesc[screen]}
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">

          {/* ── Ecrã: Login normal ── */}
          {screen === 'login' && (
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="emailOrName">Email ou Nome</Label>
                <div className="relative">
                  <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="emailOrName"
                    placeholder="nome ou email@exemplo.com"
                    className="pl-10"
                    value={emailOrName}
                    onChange={(e) => setEmailOrName(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Palavra-passe</Label>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    className="pl-10"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
              </div>

              <Button type="submit" className="w-full mt-2 font-semibold bg-[hsl(145,60%,42%)] hover:bg-[hsl(145,60%,36%)] text-white" disabled={isLoading}>
                {isLoading ? 'A carregar...' : 'Iniciar Sessão'}
              </Button>
            </form>
          )}

          {/* ── Ecrã: Primeiro acesso – passo 2 (setup) ── */}
          {screen === 'fa_setup' && (
            <form onSubmit={handleFaSetup} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="faEmail">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="faEmail"
                    type="email"
                    placeholder="exemplo@email.com"
                    className="pl-10"
                    value={faEmail}
                    onChange={(e) => setFaEmail(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="faPassword">Nova Palavra-passe</Label>
                <Input
                  id="faPassword"
                  type="password"
                  placeholder="••••••••"
                  value={faPassword}
                  onChange={(e) => setFaPassword(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="faConfirm">Confirmar Palavra-passe</Label>
                <Input
                  id="faConfirm"
                  type="password"
                  placeholder="••••••••"
                  value={faConfirm}
                  onChange={(e) => setFaConfirm(e.target.value)}
                />
              </div>

              {/* Requisitos */}
              <div className="p-3 bg-muted/40 rounded-lg space-y-1.5 text-xs">
                <p className="font-semibold text-muted-foreground">Requisitos da palavra-passe:</p>
                {[
                  [hasMinLength, 'Mínimo 8 caracteres'],
                  [hasUpper, 'Uma maiúscula'],
                  [hasLower, 'Uma minúscula'],
                  [hasNumber, 'Um número'],
                  [hasSpecial, 'Um caractere especial (@, #, $, !)'],
                ].map(([ok, label]) => (
                  <div key={label as string} className="flex items-center gap-1.5">
                    {ok ? <Check className="w-3.5 h-3.5 text-green-500 shrink-0" /> : <X className="w-3.5 h-3.5 text-destructive shrink-0" />}
                    <span className={(ok as boolean) ? 'text-green-600 font-medium' : 'text-muted-foreground'}>{label as string}</span>
                  </div>
                ))}
                {faPassword && faConfirm && (
                  <div className="flex items-center gap-1.5 pt-1 border-t">
                    {passwordsMatch ? <Check className="w-3.5 h-3.5 text-green-500" /> : <X className="w-3.5 h-3.5 text-destructive" />}
                    <span className={passwordsMatch ? 'text-green-600 font-medium' : 'text-destructive font-medium'}>
                      {passwordsMatch ? 'As palavras-passe coincidem' : 'As palavras-passe não coincidem'}
                    </span>
                  </div>
                )}
              </div>

              <Button type="submit" className="w-full font-semibold bg-[hsl(145,60%,42%)] hover:bg-[hsl(145,60%,36%)] text-white">
                Continuar para verificação
              </Button>
            </form>
          )}

          {/* ── Ecrã: Primeiro acesso – passo 3 (verificação) ── */}
          {screen === 'fa_verify' && (
            <form onSubmit={handleFaVerify} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="faCode">Código de Verificação</Label>
                <Input
                  id="faCode"
                  type="text"
                  maxLength={6}
                  placeholder="000000"
                  className="text-center text-xl tracking-widest font-mono font-bold"
                  value={faCode}
                  onChange={(e) => setFaCode(e.target.value)}
                  required
                />
              </div>

              <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg text-xs">
                {faEmailSent ? (
                  <>
                    <p className="font-semibold text-primary">📧 Código enviado por email</p>
                    <p className="text-muted-foreground mt-1">
                      Verifique a caixa de entrada de <strong className="text-foreground">{faEmail}</strong> e introduza o código de 6 dígitos que recebeu.
                    </p>
                  </>
                ) : (
                  <>
                    <p className="font-semibold text-amber-500">⚠️ Email não enviado — use o código abaixo</p>
                    <p className="text-muted-foreground mt-1">O envio de email falhou (verifique o domínio no Resend). Use este código temporário:</p>
                    <code className="block p-2 bg-background border rounded font-mono text-center text-lg text-foreground font-bold mt-2 tracking-widest">
                      {faGeneratedCode}
                    </code>
                  </>
                )}
              </div>

              <Button type="submit" className="w-full font-semibold bg-[hsl(145,60%,42%)] hover:bg-[hsl(145,60%,36%)] text-white" disabled={isLoading}>
                {isLoading ? 'A ativar...' : 'Validar e Ativar Conta'}
              </Button>
            </form>
          )}

          {/* ── Ecrã: Esqueci-me da palavra-passe – passo 1 (email) ── */}
          {screen === 'forgot_email' && (
            <form onSubmit={handleForgotEmail} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="forgotEmail">Email da Conta</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="forgotEmail"
                    type="email"
                    placeholder="exemplo@email.com"
                    className="pl-10"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    required
                  />
                </div>
              </div>

              <Button type="submit" className="w-full font-semibold bg-[hsl(145,60%,42%)] hover:bg-[hsl(145,60%,36%)] text-white" disabled={isLoading}>
                {isLoading ? 'A processar...' : 'Enviar Código'}
              </Button>
            </form>
          )}

          {/* ── Ecrã: Esqueci-me da palavra-passe – passo 2 (verificação) ── */}
          {screen === 'forgot_verify' && (
            <form onSubmit={handleForgotVerify} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="forgotCode">Código de Verificação</Label>
                <Input
                  id="forgotCode"
                  type="text"
                  maxLength={6}
                  placeholder="000000"
                  className="text-center text-xl tracking-widest font-mono font-bold"
                  value={forgotCode}
                  onChange={(e) => setForgotCode(e.target.value)}
                  required
                />
              </div>

              <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg text-xs">
                {forgotEmailSent ? (
                  <>
                    <p className="font-semibold text-primary">📧 Código enviado por email</p>
                    <p className="text-muted-foreground mt-1">
                      Verifique a caixa de entrada de <strong className="text-foreground">{forgotEmail}</strong> e introduza o código de 6 dígitos recebido.
                    </p>
                  </>
                ) : (
                  <>
                    <p className="font-semibold text-amber-500">⚠️ Email não enviado — use o código abaixo</p>
                    <p className="text-muted-foreground mt-1">O envio de email falhou. Utilize este código temporário de simulação:</p>
                    <code className="block p-2 bg-background border rounded font-mono text-center text-lg text-foreground font-bold mt-2 tracking-widest">
                      {forgotGeneratedCode}
                    </code>
                  </>
                )}
              </div>

              <Button type="submit" className="w-full font-semibold bg-[hsl(145,60%,42%)] hover:bg-[hsl(145,60%,36%)] text-white">
                Validar Código
              </Button>
            </form>
          )}

          {/* ── Ecrã: Esqueci-me da palavra-passe – passo 3 (nova password) ── */}
          {screen === 'forgot_reset' && (
            <form onSubmit={handleForgotReset} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="forgotPassword">Nova Palavra-passe</Label>
                <Input
                  id="forgotPassword"
                  type="password"
                  placeholder="••••••••"
                  value={forgotPassword}
                  onChange={(e) => setForgotPassword(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="forgotConfirm">Confirmar Nova Palavra-passe</Label>
                <Input
                  id="forgotConfirm"
                  type="password"
                  placeholder="••••••••"
                  value={forgotConfirm}
                  onChange={(e) => setForgotConfirm(e.target.value)}
                  required
                />
              </div>

              {/* Requisitos */}
              <div className="p-3 bg-muted/40 rounded-lg space-y-1.5 text-xs">
                <p className="font-semibold text-muted-foreground">Requisitos da palavra-passe:</p>
                {[
                  [forgotMinLength, 'Mínimo 8 caracteres'],
                  [forgotUpper, 'Uma maiúscula'],
                  [forgotLower, 'Uma minúscula'],
                  [forgotNumber, 'Um número'],
                  [forgotSpecial, 'Um caractere especial (@, #, $, !)'],
                ].map(([ok, label]) => (
                  <div key={label as string} className="flex items-center gap-1.5">
                    {ok ? <Check className="w-3.5 h-3.5 text-green-500 shrink-0" /> : <X className="w-3.5 h-3.5 text-destructive shrink-0" />}
                    <span className={(ok as boolean) ? 'text-green-600 font-medium' : 'text-muted-foreground'}>{label as string}</span>
                  </div>
                ))}
                {forgotPassword && forgotConfirm && (
                  <div className="flex items-center gap-1.5 pt-1 border-t">
                    {forgotPasswordsMatch ? <Check className="w-3.5 h-3.5 text-green-500" /> : <X className="w-3.5 h-3.5 text-destructive" />}
                    <span className={forgotPasswordsMatch ? 'text-green-600 font-medium' : 'text-destructive font-medium'}>
                      {forgotPasswordsMatch ? 'As palavras-passe coincidem' : 'As palavras-passe não coincidem'}
                    </span>
                  </div>
                )}
              </div>

              <Button type="submit" className="w-full font-semibold bg-[hsl(145,60%,42%)] hover:bg-[hsl(145,60%,36%)] text-white" disabled={isLoading}>
                {isLoading ? 'A redefinir...' : 'Redefinir Palavra-passe'}
              </Button>
            </form>
          )}

        </CardContent>

        <CardFooter className="flex flex-col space-y-2 border-t border-slate-800/50 pt-4">
          {screen === 'login' && (
            <Button
              variant="link"
              className="text-xs text-muted-foreground hover:text-foreground"
              onClick={() => setScreen('forgot_email')}
            >
              Esqueci-me da minha palavra-passe
            </Button>
          )}
          {screen !== 'login' && (
            <Button
              variant="link"
              className="text-xs text-muted-foreground hover:text-foreground"
              onClick={async () => {
                await supabase.auth.signOut();
                setScreen('login');
                setFaName(''); setFaKey(''); setFaEmail('');
                setFaPassword(''); setFaConfirm(''); setFaCode('');
                setForgotEmail(''); setForgotCode(''); setForgotGeneratedCode('');
                setForgotPassword(''); setForgotConfirm('');
              }}
            >
              ← Voltar para Iniciar Sessão
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}
