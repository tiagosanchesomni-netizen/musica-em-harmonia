import { useState, useMemo } from 'react';
import { useApp } from '@/contexts/AppContext';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  BarChart3, Search, Calendar, Check, X, ArrowLeft, 
  GraduationCap, Award, Percent, Clock, School, UserCheck, UserX 
} from 'lucide-react';
import { formatDataHora } from '@/lib/aulaHelpers';

export default function Estatisticas() {
  const { currentRole, currentUserId, aulas, profiles, assiduidades, salas } = useApp();
  
  // State for search and filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [detailFilter, setDetailFilter] = useState<'todas' | 'presente' | 'faltou'>('todas');
  
  // Helpers
  const getSalaName = (salaId: string) => {
    return salas.find(s => s.id === salaId)?.nome || 'Sala Desconhecida';
  };

  const getProfileName = (id: string) => {
    return profiles.find(p => p.id === id)?.nome || 'Desconhecido';
  };

  // Helper to compute stats for a single student
  const getStudentStats = useMemo(() => {
    return (studentId: string) => {
      // Classes where the student is enrolled and that are already taught/realized
      const studentAulas = aulas.filter(a => a.alunos.includes(studentId) && a.estado === 'realizada');
      const total = studentAulas.length;
      
      const attended = studentAulas.filter(a => {
        const ass = assiduidades.find(ass => ass.aula_id === a.id && ass.aluno_id === studentId);
        return ass?.presente === true;
      });
      
      const missed = total - attended.length;
      const percentage = total > 0 ? Math.round((attended.length / total) * 100) : 100;
      
      return {
        total,
        attended: attended.length,
        missed,
        percentage,
        aulas: studentAulas.map(a => {
          const ass = assiduidades.find(ass => ass.aula_id === a.id && ass.aluno_id === studentId);
          return {
            ...a,
            presente: ass?.presente === true
          };
        }).sort((a, b) => new Date(b.data_hora).getTime() - new Date(a.data_hora).getTime()) // Most recent first
      };
    };
  }, [aulas, assiduidades]);

  // Determine students to show based on role
  const studentsList = useMemo(() => {
    if (currentRole === 'admin') {
      return profiles.filter(p => p.role === 'aluno');
    } else if (currentRole === 'professor') {
      // Find classes taught by this professor
      const profAulas = aulas.filter(a => a.professores.includes(currentUserId));
      // Get unique students from those classes
      const studentIds = Array.from(new Set(profAulas.flatMap(a => a.alunos)));
      return profiles.filter(p => p.role === 'aluno' && studentIds.includes(p.id));
    }
    return [];
  }, [currentRole, currentUserId, profiles, aulas]);

  // Filtered students by search term
  const filteredStudents = useMemo(() => {
    return studentsList.filter(student => 
      student.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (student.email && student.email.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [studentsList, searchTerm]);

  // Selected student details
  const selectedStudentStats = useMemo(() => {
    if (!selectedStudentId) return null;
    const student = profiles.find(p => p.id === selectedStudentId);
    if (!student) return null;
    
    const stats = getStudentStats(selectedStudentId);
    const filteredAulas = stats.aulas.filter(a => {
      if (detailFilter === 'presente') return a.presente;
      if (detailFilter === 'faltou') return !a.presente;
      return true;
    });

    return {
      student,
      stats,
      filteredAulas
    };
  }, [selectedStudentId, profiles, getStudentStats, detailFilter]);

  // Render Student View
  if (currentRole === 'aluno') {
    const stats = getStudentStats(currentUserId);
    
    const filteredAulas = stats.aulas.filter(a => {
      if (detailFilter === 'presente') return a.presente;
      if (detailFilter === 'faltou') return !a.presente;
      return true;
    });

    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">As Minhas Estatísticas</h1>
          <p className="text-sm text-muted-foreground">Acompanha a tua assiduidade e histórico de presenças.</p>
        </div>

        {/* Overview cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="relative overflow-hidden border-l-4 border-l-primary">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Assiduidade Geral</CardTitle>
              <Percent className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.percentage}%</div>
              <div className="mt-2 w-full bg-secondary h-2 rounded-full overflow-hidden">
                <div 
                  className={`h-full rounded-full transition-all duration-500 ${
                    stats.percentage >= 90 ? 'bg-green-500' : stats.percentage >= 75 ? 'bg-amber-500' : 'bg-red-500'
                  }`}
                  style={{ width: `${stats.percentage}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Meta recomendada: 90%
              </p>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden border-l-4 border-l-green-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Aulas Assistidas</CardTitle>
              <UserCheck className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-500">{stats.attended}</div>
              <p className="text-xs text-muted-foreground mt-1">
                De um total de {stats.total} aulas realizadas
              </p>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden border-l-4 border-l-red-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Faltas</CardTitle>
              <UserX className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-red-500">{stats.missed}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Aulas onde não foi registada presença
              </p>
            </CardContent>
          </Card>
        </div>

        {/* History / Details */}
        <Card>
          <CardHeader>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <CardTitle>Histórico de Aulas</CardTitle>
                <CardDescription>Lista detalhada das tuas aulas e presenças registadas.</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Select value={detailFilter} onValueChange={(v: any) => setDetailFilter(v)}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Filtrar por presenças" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todas">Todas as Aulas</SelectItem>
                    <SelectItem value="presente">Presente</SelectItem>
                    <SelectItem value="faltou">Faltas</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {filteredAulas.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground border border-dashed rounded-md">
                Sem aulas encontradas com este filtro.
              </div>
            ) : (
              <div className="border rounded-md overflow-hidden divide-y">
                {filteredAulas.map(a => (
                  <div key={a.id} className="p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 hover:bg-muted/30 transition-colors">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge variant={a.tipo === 'reposicao' ? 'secondary' : 'outline'}>
                          {a.tipo === 'reposicao' ? 'Reposição' : 'Aula Normal'}
                        </Badge>
                        <span className="text-sm font-medium">{getSalaName(a.sala_id)}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>{formatDataHora(a.data_hora)}</span>
                        <span>•</span>
                        <Clock className="w-3.5 h-3.5" />
                        <span>{a.duracao} min</span>
                      </div>
                    </div>
                    <div>
                      {a.presente ? (
                        <Badge className="bg-green-500/10 text-green-500 border-green-500/20 hover:bg-green-500/10 gap-1">
                          <Check className="w-3.5 h-3.5" /> Presente
                        </Badge>
                      ) : (
                        <Badge className="bg-red-500/10 text-red-500 border-red-500/20 hover:bg-red-500/10 gap-1">
                          <X className="w-3.5 h-3.5" /> Ausente
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // Render Professor / Admin Dashboard View
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Estatísticas de Assiduidade</h1>
          <p className="text-sm text-muted-foreground">
            {currentRole === 'admin' 
              ? 'Lista geral de assiduidade de todos os alunos da escola.' 
              : 'Lista de assiduidade dos teus alunos associados.'}
          </p>
        </div>
        <div className="relative w-full sm:w-[280px]">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Pesquisar aluno..." 
            value={searchTerm} 
            onChange={(e) => setSearchTerm(e.target.value)} 
            className="pl-8"
          />
        </div>
      </div>

      {filteredStudents.length === 0 ? (
        <Card className="p-8 text-center text-muted-foreground">
          Sem alunos encontrados.
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredStudents.map(student => {
            const stats = getStudentStats(student.id);
            return (
              <Card key={student.id} className="hover:border-primary/50 transition-all hover:shadow-md flex flex-col justify-between">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1 min-w-0">
                      <CardTitle className="text-base truncate font-semibold">{student.nome}</CardTitle>
                      <CardDescription className="text-xs truncate">{student.email}</CardDescription>
                    </div>
                    <Badge className={`shrink-0 ${
                      stats.percentage >= 90 
                        ? 'bg-green-500/10 text-green-500 hover:bg-green-500/10 border-green-500/20' 
                        : stats.percentage >= 75 
                        ? 'bg-amber-500/10 text-amber-500 hover:bg-amber-500/10 border-amber-500/20' 
                        : 'bg-red-500/10 text-red-500 hover:bg-red-500/10 border-red-500/20'
                    }`}>
                      {stats.percentage}%
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="pt-2 space-y-4">
                  <div className="space-y-1">
                    <div className="w-full bg-secondary h-2 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-300 ${
                          stats.percentage >= 90 ? 'bg-green-500' : stats.percentage >= 75 ? 'bg-amber-500' : 'bg-red-500'
                        }`}
                        style={{ width: `${stats.percentage}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>{stats.attended} presenças</span>
                      <span>{stats.missed} faltas</span>
                    </div>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full text-xs" 
                    onClick={() => {
                      setSelectedStudentId(student.id);
                      setDetailFilter('todas');
                    }}
                  >
                    Ver detalhes
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Details Dialog */}
      <Dialog open={selectedStudentId !== null} onOpenChange={(open) => { if (!open) setSelectedStudentId(null); }}>
        <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col p-6 overflow-hidden">
          {selectedStudentStats && (
            <>
              <DialogHeader className="shrink-0">
                <div className="flex items-center gap-3">
                  <GraduationCap className="h-6 w-6 text-primary shrink-0" />
                  <div className="min-w-0">
                    <DialogTitle className="text-xl truncate">{selectedStudentStats.student.nome}</DialogTitle>
                    <DialogDescription className="text-xs truncate">{selectedStudentStats.student.email}</DialogDescription>
                  </div>
                </div>
              </DialogHeader>

              {/* Stats overview in dialog */}
              <div className="grid grid-cols-3 gap-3 shrink-0 py-3 border-y my-3">
                <div className="text-center p-2 rounded bg-muted/40">
                  <div className="text-xs text-muted-foreground">Assiduidade</div>
                  <div className="text-lg font-bold text-primary">{selectedStudentStats.stats.percentage}%</div>
                </div>
                <div className="text-center p-2 rounded bg-muted/40">
                  <div className="text-xs text-muted-foreground">Presente</div>
                  <div className="text-lg font-bold text-green-500">{selectedStudentStats.stats.attended}</div>
                </div>
                <div className="text-center p-2 rounded bg-muted/40">
                  <div className="text-xs text-muted-foreground">Faltas</div>
                  <div className="text-lg font-bold text-red-500">{selectedStudentStats.stats.missed}</div>
                </div>
              </div>

              {/* Detail view filter and list */}
              <div className="flex-1 flex flex-col min-h-0">
                <div className="flex items-center justify-between gap-4 mb-3 shrink-0">
                  <h3 className="font-semibold text-sm">Histórico de Aulas</h3>
                  <Select value={detailFilter} onValueChange={(v: any) => setDetailFilter(v)}>
                    <SelectTrigger className="w-[160px] h-8 text-xs">
                      <SelectValue placeholder="Filtrar por presenças" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todas">Todas as Aulas</SelectItem>
                      <SelectItem value="presente">Presenças</SelectItem>
                      <SelectItem value="faltou">Faltas</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex-1 overflow-y-auto pr-1 space-y-2">
                  {selectedStudentStats.filteredAulas.length === 0 ? (
                    <div className="p-8 text-center text-xs text-muted-foreground border border-dashed rounded-md">
                      Sem aulas encontradas para este filtro.
                    </div>
                  ) : (
                    <div className="border rounded-md overflow-hidden divide-y">
                      {selectedStudentStats.filteredAulas.map(a => (
                        <div key={a.id} className="p-3 flex items-center justify-between gap-3 text-sm hover:bg-muted/20">
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-2">
                              <Badge className="text-[10px] px-1 py-0 h-4" variant={a.tipo === 'reposicao' ? 'secondary' : 'outline'}>
                                {a.tipo === 'reposicao' ? 'Reposição' : 'Normal'}
                              </Badge>
                              <span className="font-medium text-xs">{getSalaName(a.sala_id)}</span>
                            </div>
                            <div className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                              <Calendar className="w-3 h-3" />
                              <span>{formatDataHora(a.data_hora)}</span>
                            </div>
                          </div>
                          <div className="shrink-0">
                            {a.presente ? (
                              <Badge className="bg-green-500/10 text-green-500 border-green-500/20 hover:bg-green-500/10 gap-1 text-[11px] h-5">
                                <Check className="w-3 h-3" /> Presente
                              </Badge>
                            ) : (
                              <Badge className="bg-red-500/10 text-red-500 border-red-500/20 hover:bg-red-500/10 gap-1 text-[11px] h-5">
                                <X className="w-3 h-3" /> Ausente
                              </Badge>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
