import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { KeyRound, Mail, User, ShieldCheck } from 'lucide-react';
import logoGrt from '@/assets/logo-grt.jpg';

export default function Login() {
  const navigate = useNavigate();
  const [isFirstAccess, setIsFirstAccess] = useState(false);

  // Normal login form states
  const [emailOrName, setEmailOrName] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  // First access states
  const [firstName, setFirstName] = useState('');
  const [provisionalKey, setProvisionalKey] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailOrName || !password) {
      toast.error('Preencha todos os campos');
      return;
    }

    setLoading(true);
    try {
      let emailToUse = emailOrName.trim();

      // If it doesn't look like an email, let's fetch profiles first to map name -> email
      if (!emailToUse.includes('@')) {
        const { data: matchedProfiles, error: profileErr } = await supabase
          .from('app_profiles')
          .select('email')
          .ilike('nome', emailToUse);

        if (profileErr) throw profileErr;

        if (matchedProfiles && matchedProfiles.length > 0 && matchedProfiles[0].email) {
          emailToUse = matchedProfiles[0].email;
        } else {
          toast.error('Utilizador não encontrado');
          setLoading(false);
          return;
        }
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email: emailToUse,
        password: password,
      });

      if (error) {
        toast.error(error.message === 'Invalid login credentials' ? 'Credenciais incorretas' : error.message);
      } else {
        toast.success('Sessão iniciada com sucesso!');
        // Find user profile to redirect to their role's home page
        const { data: prof } = await supabase
          .from('app_profiles')
          .select('role')
          .eq('auth_user_id', data.user.id)
          .single();

        if (prof) {
          const roleHome: Record<string, string> = {
            admin: '/admin/aulas',
            professor: '/professor/aulas',
            aluno: '/aluno/aulas',
          };
          navigate(roleHome[prof.role] || '/');
        } else {
          navigate('/');
        }
      }
    } catch (err: any) {
      toast.error(err.message || 'Erro ao iniciar sessão');
    } finally {
      setLoading(false);
    }
  };

  const handleFirstAccess = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName || !provisionalKey) {
      toast.error('Preencha todos os campos');
      return;
    }

    setLoading(true);
    try {
      // Call public RPC to retrieve the temp email
      const { data: tempEmail, error: rpcErr } = await supabase.rpc('obter_email_por_chave', {
        p_nome: firstName.trim(),
        p_chave: provisionalKey.trim().toUpperCase(),
      });

      if (rpcErr) throw rpcErr;

      if (!tempEmail) {
        toast.error('Nome ou Chave Provisória inválidos ou conta já ativada.');
        setLoading(false);
        return;
      }

      // Log in with temporary credentials
      const { data, error: loginErr } = await supabase.auth.signInWithPassword({
        email: tempEmail,
        password: provisionalKey.trim().toUpperCase(),
      });

      if (loginErr) {
        throw loginErr;
      }

      toast.success('Chave válida! Configure os seus dados de primeiro acesso.');
      navigate('/');
    } catch (err: any) {
      toast.error(err.message || 'Erro ao verificar primeiro acesso');
    } finally {
      setLoading(false);
    }
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
              Escola de Música GRT
            </CardTitle>
            <CardDescription className="text-slate-400 mt-1">
              {isFirstAccess ? 'Configuração de conta para novos utilizadores' : 'Insira as suas credenciais para aceder ao sistema'}
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {!isFirstAccess ? (
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

              <Button type="submit" className="w-full mt-2 font-semibold" disabled={loading}>
                {loading ? 'A carregar...' : 'Iniciar Sessão'}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleFirstAccess} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">Nome Completo</Label>
                <div className="relative">
                  <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="firstName"
                    placeholder="ex: Rui Almeida"
                    className="pl-10"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="provisionalKey">Chave Provisória</Label>
                <div className="relative">
                  <ShieldCheck className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="provisionalKey"
                    placeholder="Introduza a chave provisória"
                    className="pl-10 uppercase font-mono tracking-wider"
                    value={provisionalKey}
                    onChange={(e) => setProvisionalKey(e.target.value)}
                    required
                  />
                </div>
              </div>

              <Button type="submit" className="w-full mt-2 font-semibold bg-purple-600 hover:bg-purple-700 text-white" disabled={loading}>
                {loading ? 'A validar...' : 'Validar Chave Provisória'}
              </Button>
            </form>
          )}
        </CardContent>

        <CardFooter className="flex flex-col space-y-2 border-t border-slate-800/50 pt-4">
          <Button
            variant="link"
            className="text-xs text-muted-foreground hover:text-foreground"
            onClick={() => setIsFirstAccess(!isFirstAccess)}
          >
            {isFirstAccess ? 'Voltar para Iniciar Sessão' : 'É o seu primeiro acesso? Clique aqui'}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
