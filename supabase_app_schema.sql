-- ======================================================
-- Escola de Música GRT - Application Schema
-- Run this script in the Supabase SQL Editor.
-- ======================================================

-- 1. Profiles table (Application specific)
CREATE TABLE IF NOT EXISTS public.app_profiles (
  id TEXT PRIMARY KEY, -- matches mock ID format (e.g., 'u123' or auth UUID)
  auth_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  email TEXT,
  role TEXT NOT NULL CHECK (role IN ('admin', 'professor', 'aluno')),
  primeiro_acesso BOOLEAN NOT NULL DEFAULT false,
  chave_provisoria TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.app_profiles ENABLE ROW LEVEL SECURITY;

-- 2. Salas table
CREATE TABLE IF NOT EXISTS public.app_salas (
  id TEXT PRIMARY KEY,
  nome TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.app_salas ENABLE ROW LEVEL SECURITY;

-- 3. Aulas table
CREATE TABLE IF NOT EXISTS public.app_aulas (
  id TEXT PRIMARY KEY,
  sala_id TEXT NOT NULL REFERENCES public.app_salas(id) ON DELETE CASCADE,
  data_hora TEXT NOT NULL, -- ISO date string
  duracao INTEGER NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('normal', 'reposicao')),
  estado TEXT NOT NULL CHECK (estado IN ('agendada', 'realizada', 'cancelada', 'pendente_reposicao')),
  professores TEXT[] NOT NULL, -- array of profile IDs
  alunos TEXT[] NOT NULL, -- array of profile IDs
  aula_original_id TEXT,
  data_original TEXT,
  presencas_finalizadas BOOLEAN DEFAULT false,
  grupo_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.app_aulas ENABLE ROW LEVEL SECURITY;

-- 4. Assiduidades table
CREATE TABLE IF NOT EXISTS public.app_assiduidades (
  id TEXT PRIMARY KEY,
  aula_id TEXT NOT NULL REFERENCES public.app_aulas(id) ON DELETE CASCADE,
  aluno_id TEXT NOT NULL,
  presente BOOLEAN NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.app_assiduidades ENABLE ROW LEVEL SECURITY;

-- 5. Pastas table
CREATE TABLE IF NOT EXISTS public.app_pastas (
  id TEXT PRIMARY KEY,
  nome TEXT NOT NULL,
  criado_por TEXT NOT NULL,
  acesso_alunos JSONB NOT NULL DEFAULT '"all"'::jsonb, -- can be 'all' or array of student IDs
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.app_pastas ENABLE ROW LEVEL SECURITY;

-- 6. Documentos table
CREATE TABLE IF NOT EXISTS public.app_documentos (
  id TEXT PRIMARY KEY,
  nome TEXT NOT NULL,
  url TEXT NOT NULL,
  pasta_id TEXT,
  aula_id TEXT,
  criado_por TEXT NOT NULL,
  criado_em TEXT NOT NULL,
  acesso_alunos JSONB NOT NULL DEFAULT '"all"'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.app_documentos ENABLE ROW LEVEL SECURITY;

-- 7. Notificacoes table
CREATE TABLE IF NOT EXISTS public.app_notificacoes (
  id TEXT PRIMARY KEY,
  mensagem TEXT NOT NULL,
  lida BOOLEAN NOT NULL DEFAULT false,
  tipo TEXT NOT NULL CHECK (tipo IN ('cancelamento', 'atraso_presenca', 'reposicao_marcada')),
  criado_em TEXT NOT NULL,
  destinatario_role TEXT NOT NULL CHECK (destinatario_role IN ('admin', 'professor', 'aluno')),
  aluno_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.app_notificacoes ENABLE ROW LEVEL SECURITY;

-- ======================================================
-- Row Level Security (RLS) Policies
-- Allow all authenticated users to read and write for app testing.
-- ======================================================

CREATE POLICY "Allow authenticated read profiles" ON public.app_profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated write profiles" ON public.app_profiles FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow authenticated read salas" ON public.app_salas FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated write salas" ON public.app_salas FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow authenticated read aulas" ON public.app_aulas FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated write aulas" ON public.app_aulas FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow authenticated read assiduidades" ON public.app_assiduidades FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated write assiduidades" ON public.app_assiduidades FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow authenticated read pastas" ON public.app_pastas FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated write pastas" ON public.app_pastas FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow authenticated read documentos" ON public.app_documentos FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated write documentos" ON public.app_documentos FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow authenticated read notificacoes" ON public.app_notificacoes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated write notificacoes" ON public.app_notificacoes FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ======================================================
-- RPC function to fetch temporary email for first access
-- Runs with SECURITY DEFINER to bypass RLS policies for anonymous users
-- ======================================================

CREATE OR REPLACE FUNCTION public.obter_email_por_chave(p_nome text, p_chave text)
RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_email text;
BEGIN
  SELECT email INTO v_email
  FROM public.app_profiles
  WHERE LOWER(nome) = LOWER(p_nome) AND chave_provisoria = p_chave AND primeiro_acesso = true
  LIMIT 1;
  
  RETURN v_email;
END;
$$;

-- ======================================================
-- Seed initial data into application tables (if empty)
-- ======================================================

-- 1. Seed profiles matching default users (pre-associated with auth)
-- Let's update the existing admin user to match
DO $$
DECLARE
  v_admin_auth_id UUID;
BEGIN
  SELECT id INTO v_admin_auth_id FROM auth.users WHERE email = '1999tiagosanches@gmail.com';
  
  IF v_admin_auth_id IS NOT NULL THEN
    INSERT INTO public.app_profiles (id, auth_user_id, nome, email, role, primeiro_acesso)
    VALUES ('a1', v_admin_auth_id, 'Tiago Sanches', '1999tiagosanches@gmail.com', 'admin', false)
    ON CONFLICT (id) DO UPDATE SET auth_user_id = v_admin_auth_id, email = '1999tiagosanches@gmail.com';
  END IF;
END $$;

-- Seed default Salas
INSERT INTO public.app_salas (id, nome) VALUES
  ('r1', 'Sala A - Piano'),
  ('r2', 'Sala B - Cordas'),
  ('r3', 'Sala C - Sopros'),
  ('r4', 'Auditório')
ON CONFLICT (id) DO NOTHING;

-- Seed default profiles (without auth_user_id yet, will be linked upon first login or admin user mapping)
INSERT INTO public.app_profiles (id, nome, email, role, primeiro_acesso) VALUES
  ('p1', 'Prof. Maria Costa', 'maria@grt.pt', 'professor', false),
  ('p2', 'Prof. João Pereira', 'joao@grt.pt', 'professor', false),
  ('s1', 'Beatriz Lopes', 'beatriz@aluno.pt', 'aluno', false),
  ('s2', 'Diogo Martins', 'diogo@aluno.pt', 'aluno', false),
  ('s3', 'Inês Faria', 'ines@aluno.pt', 'aluno', false),
  ('s5', 'Sofia Mendes', 'sofia@aluno.pt', 'aluno', false)
ON CONFLICT (id) DO NOTHING;

-- Seed default profiles with primeiro_acesso = true
INSERT INTO public.app_profiles (id, nome, email, role, primeiro_acesso, chave_provisoria) VALUES
  ('p3', 'Prof. Ana Ribeiro', 'temp_p3@grt.pt', 'professor', true, 'ANA123'),
  ('s4', 'Rui Almeida', 'temp_s4@grt.pt', 'aluno', true, 'RUI123')
ON CONFLICT (id) DO NOTHING;
