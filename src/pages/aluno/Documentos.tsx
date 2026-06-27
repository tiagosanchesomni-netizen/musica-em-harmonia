import { useState } from 'react';
import { useApp } from '@/contexts/AppContext';
import { AcessoAlunos } from '@/data/mockData';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Folder, FileText, Eye, Users } from 'lucide-react';
import { formatData } from '@/lib/aulaHelpers';

function AcessoBadge({ acesso }: { acesso: AcessoAlunos }) {
  if (acesso === 'all') return <Badge variant="secondary" className="text-xs"><Users className="w-3 h-3 mr-1" />Todos os alunos</Badge>;
  return <Badge variant="secondary" className="text-xs">{acesso.length} aluno(s)</Badge>;
}

export default function AlunoDocumentos() {
  const { documentos, pastas, currentUserId, getProfile } = useApp();
  const [previewDoc, setPreviewDoc] = useState<any | null>(null);

  const temAcesso = (acesso: AcessoAlunos) =>
    acesso === 'all' || acesso.includes(currentUserId);

  const pastasVisiveis = pastas.filter(p => temAcesso(p.acesso_alunos));
  const docsVisiveis = documentos.filter(d => temAcesso(d.acesso_alunos));

  const porPasta = pastasVisiveis.map(p => ({
    pasta: p,
    docs: docsVisiveis.filter(d => d.pasta_id === p.id),
  }));
  const semPasta = docsVisiveis.filter(d => !d.pasta_id);

  const handleDownload = async (url: string, filename: string) => {
    if (url === '#' || !url) return;
    toast.loading('A descarregar ficheiro...', { id: 'download-toast' });
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error('Falha ao descarregar ficheiro do armazenamento');
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
      toast.success('Download concluído!', { id: 'download-toast' });
    } catch (err: any) {
      console.error(err);
      toast.error('Erro ao efetuar download: ' + err.message, { id: 'download-toast' });
    }
  };

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
                  <span 
                    className="flex-1 truncate cursor-pointer hover:underline text-primary font-medium"
                    onClick={() => setPreviewDoc(d)}
                    title="Clique para pré-visualizar"
                  >
                    {d.nome}
                  </span>
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
                <span 
                  className="font-medium flex-1 min-w-[180px] cursor-pointer hover:underline text-primary"
                  onClick={() => setPreviewDoc(d)}
                  title="Clique para pré-visualizar"
                >
                  {d.nome}
                </span>
                <AcessoBadge acesso={d.acesso_alunos} />
                <span className="text-xs text-muted-foreground">Criado por: {getProfile(d.criado_por)?.nome || '—'}</span>
                <span className="text-xs text-muted-foreground">{formatData(d.criado_em)}</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Dialog open={!!previewDoc} onOpenChange={o => !o && setPreviewDoc(null)}>
        <DialogContent className="max-w-4xl w-[90vw]">
          <DialogHeader>
            <DialogTitle className="truncate">{previewDoc?.nome}</DialogTitle>
          </DialogHeader>
          {previewDoc && (
            <div className="mt-2">
              {(() => {
                  const name = previewDoc.nome.toLowerCase().trim();
                  const ext = name.split('.').pop() || '';
                  const isPdf = ext === 'pdf';
                  const isText = ext === 'txt';
                  const isVideo = ['mp4', 'webm', 'ogg', 'mov'].includes(ext);
                  const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext);

                  if (!previewDoc.url || previewDoc.url === '#') {
                    return (
                      <div className="text-center p-8 space-y-4 border border-dashed rounded bg-muted/10">
                        <FileText className="w-16 h-16 text-muted-foreground mx-auto animate-pulse" />
                        <p className="text-sm font-medium text-destructive">O ficheiro ainda não foi carregado corretamente no armazenamento.</p>
                      </div>
                    );
                  }

                  if (isPdf || isText) {
                    return (
                      <div className="text-center p-8 space-y-4 border border-dashed rounded bg-muted/10">
                        <FileText className="w-16 h-16 text-primary mx-auto" />
                        <div>
                          <p className="text-sm font-medium">Documento ({ext.toUpperCase()}) pronto para visualização</p>
                          <p className="text-xs text-muted-foreground mt-1">Para abrir e ler este documento de forma ideal, clique no botão abaixo.</p>
                        </div>
                        <Button asChild size="sm">
                          <a href={previewDoc.url} target="_blank" rel="noopener noreferrer">
                            Abrir Documento numa nova aba
                          </a>
                        </Button>
                      </div>
                    );
                  }
                  if (isVideo) {
                    return (
                      <video 
                        src={previewDoc.url} 
                        controls 
                        className="w-full max-h-[65vh] rounded border bg-black" 
                      />
                    );
                  }
                  if (isImage) {
                    return (
                      <div className="flex justify-center p-2 bg-muted/20 border rounded">
                        <img 
                          src={previewDoc.url} 
                          alt={previewDoc.nome} 
                          className="max-w-full max-h-[65vh] object-contain rounded" 
                        />
                      </div>
                    );
                  }
                  return (
                    <div className="text-center p-8 space-y-4 border border-dashed rounded bg-muted/10">
                      <FileText className="w-16 h-16 text-muted-foreground mx-auto" />
                      <div>
                        <p className="text-sm font-medium">Pré-visualização indisponível para este tipo de ficheiro.</p>
                        <p className="text-xs text-muted-foreground mt-1">Pode efetuar o download para abrir no seu dispositivo.</p>
                      </div>
                    </div>
                  );
              })()}
            </div>
          )}
          <DialogFooter className="flex items-center justify-between sm:justify-between gap-2 border-t pt-3">
            <Button size="sm" variant="outline" onClick={() => setPreviewDoc(null)}>Fechar</Button>
            {previewDoc && (
              <Button size="sm" onClick={() => handleDownload(previewDoc.url, previewDoc.nome)}>
                Descarregar Ficheiro
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
