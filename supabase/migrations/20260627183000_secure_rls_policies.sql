-- Drop old policies
DROP POLICY IF EXISTS "Allow authenticated read profiles" ON public.app_profiles;
DROP POLICY IF EXISTS "Allow authenticated write profiles" ON public.app_profiles;
DROP POLICY IF EXISTS "Allow authenticated read salas" ON public.app_salas;
DROP POLICY IF EXISTS "Allow authenticated write salas" ON public.app_salas;
DROP POLICY IF EXISTS "Allow authenticated read aulas" ON public.app_aulas;
DROP POLICY IF EXISTS "Allow authenticated write aulas" ON public.app_aulas;
DROP POLICY IF EXISTS "Allow authenticated read assiduidades" ON public.app_assiduidades;
DROP POLICY IF EXISTS "Allow authenticated write assiduidades" ON public.app_assiduidades;
DROP POLICY IF EXISTS "Allow authenticated read pastas" ON public.app_pastas;
DROP POLICY IF EXISTS "Allow authenticated write pastas" ON public.app_pastas;
DROP POLICY IF EXISTS "Allow authenticated read documentos" ON public.app_documentos;
DROP POLICY IF EXISTS "Allow authenticated write documentos" ON public.app_documentos;
DROP POLICY IF EXISTS "Allow authenticated read notificacoes" ON public.app_notificacoes;
DROP POLICY IF EXISTS "Allow authenticated write notificacoes" ON public.app_notificacoes;

-- Create secure policies
CREATE POLICY "Allow authenticated read profiles" ON public.app_profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated write profiles" ON public.app_profiles FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM public.app_profiles WHERE auth_user_id = auth.uid() AND role = 'admin') OR auth_user_id = auth.uid()
) WITH CHECK (
  EXISTS (SELECT 1 FROM public.app_profiles WHERE auth_user_id = auth.uid() AND role = 'admin') OR auth_user_id = auth.uid()
);

CREATE POLICY "Allow authenticated read salas" ON public.app_salas FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated write salas" ON public.app_salas FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.app_profiles WHERE auth_user_id = auth.uid() AND role = 'admin'));

CREATE POLICY "Allow authenticated read aulas" ON public.app_aulas FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.app_profiles WHERE auth_user_id = auth.uid() AND role = 'admin') OR
  professores @> ARRAY[(SELECT id FROM public.app_profiles WHERE auth_user_id = auth.uid())] OR
  alunos @> ARRAY[(SELECT id FROM public.app_profiles WHERE auth_user_id = auth.uid())]
);
CREATE POLICY "Allow authenticated write aulas" ON public.app_aulas FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM public.app_profiles WHERE auth_user_id = auth.uid() AND role = 'admin') OR
  professores @> ARRAY[(SELECT id FROM public.app_profiles WHERE auth_user_id = auth.uid())]
) WITH CHECK (
  EXISTS (SELECT 1 FROM public.app_profiles WHERE auth_user_id = auth.uid() AND role = 'admin') OR
  professores @> ARRAY[(SELECT id FROM public.app_profiles WHERE auth_user_id = auth.uid())]
);

CREATE POLICY "Allow authenticated read assiduidades" ON public.app_assiduidades FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.app_profiles WHERE auth_user_id = auth.uid() AND role = 'admin') OR
  EXISTS (SELECT 1 FROM public.app_aulas WHERE app_aulas.id = app_assiduidades.aula_id AND app_aulas.professores @> ARRAY[(SELECT id FROM public.app_profiles WHERE auth_user_id = auth.uid())]) OR
  aluno_id = (SELECT id FROM public.app_profiles WHERE auth_user_id = auth.uid())
);
CREATE POLICY "Allow authenticated write assiduidades" ON public.app_assiduidades FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM public.app_profiles WHERE auth_user_id = auth.uid() AND role = 'admin') OR
  EXISTS (SELECT 1 FROM public.app_aulas WHERE app_aulas.id = app_assiduidades.aula_id AND app_aulas.professores @> ARRAY[(SELECT id FROM public.app_profiles WHERE auth_user_id = auth.uid())])
) WITH CHECK (
  EXISTS (SELECT 1 FROM public.app_profiles WHERE auth_user_id = auth.uid() AND role = 'admin') OR
  EXISTS (SELECT 1 FROM public.app_aulas WHERE app_aulas.id = app_assiduidades.aula_id AND app_aulas.professores @> ARRAY[(SELECT id FROM public.app_profiles WHERE auth_user_id = auth.uid())])
);

CREATE POLICY "Allow authenticated read pastas" ON public.app_pastas FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.app_profiles WHERE auth_user_id = auth.uid() AND role = 'admin') OR
  criado_por = (SELECT id FROM public.app_profiles WHERE auth_user_id = auth.uid()) OR
  (acesso_alunos = '"all"'::jsonb OR acesso_alunos @> jsonb_build_array((SELECT id FROM public.app_profiles WHERE auth_user_id = auth.uid())))
);
CREATE POLICY "Allow authenticated write pastas" ON public.app_pastas FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM public.app_profiles WHERE auth_user_id = auth.uid() AND role = 'admin') OR
  (EXISTS (SELECT 1 FROM public.app_profiles WHERE auth_user_id = auth.uid() AND role = 'professor') AND criado_por = (SELECT id FROM public.app_profiles WHERE auth_user_id = auth.uid()))
) WITH CHECK (
  EXISTS (SELECT 1 FROM public.app_profiles WHERE auth_user_id = auth.uid() AND role = 'admin') OR
  (EXISTS (SELECT 1 FROM public.app_profiles WHERE auth_user_id = auth.uid() AND role = 'professor') AND criado_por = (SELECT id FROM public.app_profiles WHERE auth_user_id = auth.uid()))
);

CREATE POLICY "Allow authenticated read documentos" ON public.app_documentos FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.app_profiles WHERE auth_user_id = auth.uid() AND role = 'admin') OR
  criado_por = (SELECT id FROM public.app_profiles WHERE auth_user_id = auth.uid()) OR
  (acesso_alunos = '"all"'::jsonb OR acesso_alunos @> jsonb_build_array((SELECT id FROM public.app_profiles WHERE auth_user_id = auth.uid())))
);
CREATE POLICY "Allow authenticated write documentos" ON public.app_documentos FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM public.app_profiles WHERE auth_user_id = auth.uid() AND role = 'admin') OR
  (EXISTS (SELECT 1 FROM public.app_profiles WHERE auth_user_id = auth.uid() AND role = 'professor') AND criado_por = (SELECT id FROM public.app_profiles WHERE auth_user_id = auth.uid()))
) WITH CHECK (
  EXISTS (SELECT 1 FROM public.app_profiles WHERE auth_user_id = auth.uid() AND role = 'admin') OR
  (EXISTS (SELECT 1 FROM public.app_profiles WHERE auth_user_id = auth.uid() AND role = 'professor') AND criado_por = (SELECT id FROM public.app_profiles WHERE auth_user_id = auth.uid()))
);

CREATE POLICY "Allow authenticated read notificacoes" ON public.app_notificacoes FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.app_profiles WHERE auth_user_id = auth.uid() AND role = 'admin') OR
  (destinatario_role = (SELECT role FROM public.app_profiles WHERE auth_user_id = auth.uid()) AND (aluno_id IS NULL OR aluno_id = (SELECT id FROM public.app_profiles WHERE auth_user_id = auth.uid())))
);
CREATE POLICY "Allow authenticated write notificacoes" ON public.app_notificacoes FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM public.app_profiles WHERE auth_user_id = auth.uid() AND role = 'admin') OR
  (destinatario_role = (SELECT role FROM public.app_profiles WHERE auth_user_id = auth.uid()) AND (aluno_id IS NULL OR aluno_id = (SELECT id FROM public.app_profiles WHERE auth_user_id = auth.uid())))
) WITH CHECK (
  EXISTS (SELECT 1 FROM public.app_profiles WHERE auth_user_id = auth.uid() AND role = 'admin') OR
  (destinatario_role = (SELECT role FROM public.app_profiles WHERE auth_user_id = auth.uid()) AND (aluno_id IS NULL OR aluno_id = (SELECT id FROM public.app_profiles WHERE auth_user_id = auth.uid())))
);
