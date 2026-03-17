import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Loader2, Lock } from 'lucide-react';
import { toast } from 'sonner';
import logoGrt from '@/assets/logo-grt.jpg';

export default function ChangePassword() {
  const { user, refreshProfile } = useAuth();
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (newPass.length < 6) { setError('A palavra-passe deve ter pelo menos 6 caracteres.'); return; }
    if (newPass !== confirmPass) { setError('As palavras-passe não coincidem.'); return; }
    setSaving(true);
    try {
      const { error: authErr } = await supabase.auth.updateUser({ password: newPass });
      if (authErr) throw authErr;
      await (supabase.from('profiles') as any).update({ must_change_password: false }).eq('id', user!.id);
      toast.success('Palavra-passe alterada com sucesso!');
      await refreshProfile();
    } catch (err: any) {
      setError(err.message || 'Erro ao alterar palavra-passe.');
    }
    setSaving(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-primary p-4">
      <Card className="w-full max-w-md shadow-2xl border-0">
        <CardHeader className="text-center pb-2 pt-8">
          <div className="mx-auto w-16 h-16 rounded-2xl overflow-hidden mb-4">
            <img src={logoGrt} alt="Logo GRT" className="w-full h-full object-cover" />
          </div>
          <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-2">
            <Lock className="w-6 h-6 text-primary" />
          </div>
          <h1 className="text-xl font-display font-bold text-foreground">Alterar Palavra-passe</h1>
          <p className="text-muted-foreground text-sm mt-1">Deve definir uma nova palavra-passe antes de continuar.</p>
        </CardHeader>
        <CardContent className="pt-4 pb-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Nova Palavra-passe</Label>
              <Input type="password" value={newPass} onChange={e => setNewPass(e.target.value)} placeholder="Mínimo 6 caracteres" required />
            </div>
            <div className="space-y-2">
              <Label>Confirmar Palavra-passe</Label>
              <Input type="password" value={confirmPass} onChange={e => setConfirmPass(e.target.value)} placeholder="Repetir palavra-passe" required />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full" disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Guardar
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
