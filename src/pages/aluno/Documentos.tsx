import { useApp } from '@/contexts/AppContext';
import { Card } from '@/components/ui/card';
import { Folder, FileText, Eye } from 'lucide-react';
import { formatData, formatDataHora } from '@/lib/aulaHelpers';

export default function AlunoDocumentos() {
  const { documentos, pastas, aulas, currentUserId, getProfile } = useApp();

  // O aluno só vê documentos de aulas em que está inscrito (ou em pastas dessas aulas)
  const aulasIds = new Set(aulas.filter(a => a.alunos.includes(currentUserId)).map(a => a.id));
  const visiveis = documentos.filter(d => {
    if (d.aula_id) return aulasIds.has(d.aula_id);
    // documentos só em pasta (sem aula) ficam visíveis se a pasta tiver pelo menos um doc desta aulas
    if (d.pasta_id) {
      const hasMine = documentos.some(x => x.pasta_id === d.pasta_id && x.aula_id && aulasIds.has(x.aula_id));
      return hasMine;
    }
    return false;
  });

  const porPasta = pastas
    .map(p => ({ pasta: p, docs: visiveis.filter(d => d.pasta_id === p.id) }))
    .filter(x => x.docs.length > 0);
  const semPasta = visiveis.filter(d => !d.pasta_id);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Documentos</h1>
        <p className="text-sm text-muted-foreground">Ficheiros partilhados pelos professores nas tuas aulas (apenas leitura).</p>
      </div>

      {visiveis.length === 0 && (
        <Card className="p-8 text-center text-muted-foreground">Sem documentos disponíveis.</Card>
      )}

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {porPasta.map(({ pasta, docs }) => (
          <Card key={pasta.id} className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Folder className="w-5 h-5 text-primary" />
              <span className="font-semibold">{pasta.nome}</span>
              <span className="text-xs text-muted-foreground ml-auto">{docs.length}</span>
            </div>
            <div className="space-y-1">
              {docs.map(d => (
                <div key={d.id} className="flex items-center gap-2 text-sm">
                  <FileText className="w-4 h-4 text-muted-foreground" />
                  <span className="flex-1 truncate">{d.nome}</span>
                  <Eye className="w-3 h-3 text-muted-foreground" />
                </div>
              ))}
            </div>
          </Card>
        ))}
      </div>

      {semPasta.length > 0 && (
        <Card>
          <div className="p-4 border-b font-semibold">Outros ficheiros das tuas aulas</div>
          <div className="divide-y">
            {semPasta.map(d => (
              <div key={d.id} className="p-3 flex items-center gap-2 text-sm">
                <FileText className="w-4 h-4 text-primary" />
                <span className="flex-1">{d.nome}</span>
                <span className="text-xs text-muted-foreground">{getProfile(d.criado_por)?.nome}</span>
                <span className="text-xs text-muted-foreground">{formatData(d.criado_em)}</span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
