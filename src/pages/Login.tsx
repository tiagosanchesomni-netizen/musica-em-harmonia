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
  | 'fa_key'            // primeiro acesso – passo 1: nome + chave provisória
  | 'fa_setup'          // primeiro acesso – passo 2: novo email + nova password
  | 'fa_verify';        // primeiro acesso – passo 3: código de verificação

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

  // ── Password strength helpers ─────────────────
  const hasMinLength = faPassword.length >= 8;
  const hasUpper = /[A-Z]/.test(faPassword);
  const hasLower = /[a-z]/.test(faPassword);
  const hasNumber = /[0-9]/.test(faPassword);
  const hasSpecial = /[^A-Za-z0-9]/.test(faPassword);
  const isPasswordStrong = hasMinLength && hasUpper && hasLower && hasNumber && hasSpecial;
  const passwordsMatch = faPassword === faConfirm;
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
        const { data: matched } = await supabase
          .from('app_profiles')
          .select('email')
          .ilike('nome', emailToUse)
          .limit(1)
          .single();

        if (!matched?.email) {
          toast.error('Utilizador não encontrado');
          return;
        }
        emailToUse = matched.email;
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email: emailToUse,
        password: password,
      });

      if (error) {
        toast.error(error.message === 'Invalid login credentials' ? 'Credenciais incorretas' : error.message);
        return;
      }

      toast.success('Sessão iniciada!');
      const { data: prof } = await supabase
        .from('app_profiles')
        .select('role')
        .eq('auth_user_id', data.user.id)
        .single();

      const roleHome: Record<string, string> = {
        admin: '/admin/aulas',
        professor: '/professor/aulas',
        aluno: '/aluno/aulas',
      };
      navigate(roleHome[prof?.role ?? ''] || '/');
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

  // ── Rótulos por ecrã ─────────────────────────
  const screenTitle: Record<Screen, string> = {
    login: 'Escola de Música GRT',
    fa_key: 'Primeiro Acesso',
    fa_setup: 'Configurar Conta',
    fa_verify: 'Verificar Email',
  };

  const screenDesc: Record<Screen, string> = {
    login: 'Insira as suas credenciais para aceder ao sistema',
    fa_key: 'Introduza o seu nome e a chave provisória que recebeu',
    fa_setup: 'Defina o seu email e palavra-passe definitivos',
    fa_verify: 'Introduza o código enviado para o seu email',
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 p-4">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/10 via-transparent to-transparent pointer-events-none" />

      <Card className="w-full max-w-[420px] backdrop-blur-md bg-card/90 border-slate-800 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-purple-500 to-indigo-500" />

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

              <Button type="submit" className="w-full mt-2 font-semibold" disabled={isLoading}>
                {isLoading ? 'A carregar...' : 'Iniciar Sessão'}
              </Button>
            </form>
          )}

          {/* ── Ecrã: Primeiro acesso – passo 1 (chave) ── */}
          {screen === 'fa_key' && (
            <form onSubmit={handleFaKey} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="faName">Nome Completo</Label>
                <div className="relative">
                  <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="faName"
                    placeholder="ex: Rui Almeida"
                    className="pl-10"
                    value={faName}
                    onChange={(e) => setFaName(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="faKey">Chave Provisória</Label>
                <div className="relative">
                  <ShieldCheck className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="faKey"
                    placeholder="Introduza a chave provisória"
                    className="pl-10 uppercase font-mono tracking-wider"
                    value={faKey}
                    onChange={(e) => setFaKey(e.target.value)}
                    required
                  />
                </div>
              </div>

              <Button type="submit" className="w-full font-semibold bg-purple-600 hover:bg-purple-700 text-white" disabled={isLoading}>
                {isLoading ? 'A validar...' : 'Validar Chave'}
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

              <Button type="submit" className="w-full font-semibold bg-purple-600 hover:bg-purple-700 text-white">
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

              <Button type="submit" className="w-full font-semibold bg-purple-600 hover:bg-purple-700 text-white" disabled={isLoading}>
                {isLoading ? 'A ativar...' : 'Validar e Ativar Conta'}
              </Button>
            </form>
          )}

        </CardContent>

        <CardFooter className="flex flex-col space-y-2 border-t border-slate-800/50 pt-4">
          {screen === 'login' && (
            <Button
              variant="link"
              className="text-xs text-muted-foreground hover:text-foreground"
              onClick={() => setScreen('fa_key')}
            >
              É o seu primeiro acesso? Clique aqui
            </Button>
          )}
          {screen !== 'login' && (
            <Button
              variant="link"
              className="text-xs text-muted-foreground hover:text-foreground"
              onClick={async () => {
                // Se já fez login provisório, fazer logout antes de voltar
                await supabase.auth.signOut();
                setScreen('login');
                setFaName(''); setFaKey(''); setFaEmail('');
                setFaPassword(''); setFaConfirm(''); setFaCode('');
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
