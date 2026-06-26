import { useApp } from '@/contexts/AppContext';
import { AcessoAlunos } from '@/data/mockData';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Folder, FileText, Eye, Users } from 'lucide-react';
import { formatData } from '@/lib/aulaHelpers';

function AcessoBadge({ acesso }: { acesso: AcessoAlunos }) {
  if (acesso === 'all') return <Badge variant="secondary" className="text-xs"><Users className="w-3 h-3 mr-1" />Todos os alunos</Badge>;
  return <Badge variant="secondary" className="text-xs">{acesso.length} aluno(s)</Badge>;
}

export default function AlunoDocumentos() {
  const { documentos, pastas, currentUserId, getProfile } = useApp();

  const temAcesso = (acesso: AcessoAlunos) =>
    acesso === 'all' || acesso.includes(currentUserId);

  const pastasVisiveis = pastas.filter(p => temAcesso(p.acesso_alunos));
  const docsVisiveis = documentos.filter(d => temAcesso(d.acesso_alunos));

  const porPasta = pastasVisiveis.map(p => ({
    pasta: p,
    docs: docsVisiveis.filter(d => d.pasta_id === p.id),
  }));
  const semPasta = docsVisiveis.filter(d => !d.pasta_id);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Documentos</h1>
        <p className="text-sm text-muted-foreground">Pastas e ficheiros partilhados consigo (apenas leitura).</p>
      </div>

      {pastasVisiveis.length === 0 && semPasta.length === 0 && (
        <Card className="p-8 text-center text-muted-foreground">Sem documentos disponíveis.</Card>
      )}

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {porPasta.map(({ pasta, docs }) => (
          <Card key={pasta.id} className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Folder className="w-5 h-5 text-primary" />
              <span className="font-semibold flex-1 truncate">{pasta.nome}</span>
              <span className="text-xs text-muted-foreground">{docs.length}</span>
            </div>
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <AcessoBadge acesso={pasta.acesso_alunos} />
              <span className="text-xs text-muted-foreground">Criado por: {getProfile(pasta.criado_por)?.nome || '—'}</span>
            </div>
            <div className="space-y-1">
              {docs.map(d => (
                <div key={d.id} className="flex items-center gap-2 text-sm">
                  <FileText className="w-4 h-4 text-muted-foreground" />
                  <span className="flex-1 truncate">{d.nome}</span>
                  <Eye className="w-3 h-3 text-muted-foreground" />
                </div>
              ))}
              {docs.length === 0 && <p className="text-xs text-muted-foreground">Sem ficheiros</p>}
            </div>
          </Card>
        ))}
      </div>

      {semPasta.length > 0 && (
        <Card>
          <div className="p-4 border-b font-semibold">Outros ficheiros</div>
          <div className="divide-y">
            {semPasta.map(d => (
              <div key={d.id} className="p-3 flex items-center gap-2 text-sm flex-wrap">
                <FileText className="w-4 h-4 text-primary" />
                <span className="flex-1 min-w-[180px]">{d.nome}</span>
                <AcessoBadge acesso={d.acesso_alunos} />
                <span className="text-xs text-muted-foreground">Criado por: {getProfile(d.criado_por)?.nome || '—'}</span>
                <span className="text-xs text-muted-foreground">{formatData(d.criado_em)}</span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
