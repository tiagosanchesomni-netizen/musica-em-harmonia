-- ==========================================
-- Escola de Música GRT - Supabase Setup Script
-- Combine all migrations into a single file.
-- Paste this script into the Supabase SQL Editor.
-- ==========================================

-- 1. Create app_role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'teacher', 'student');

-- 2. Profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  name TEXT NOT NULL,
  role app_role NOT NULL DEFAULT 'student',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
  must_change_password boolean NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 3. User roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 4. RLS helper function
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  )
$$;

-- 5. Rooms table
CREATE TABLE public.rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  capacity INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;

-- 6. Schedules table
CREATE TABLE public.schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  student_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  room_id UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  recurring BOOLEAN NOT NULL DEFAULT true,
  date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.schedules ENABLE ROW LEVEL SECURITY;

-- 7. Schedule junction tables (many-to-many relations)
CREATE TABLE public.schedule_teachers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id uuid NOT NULL REFERENCES public.schedules(id) ON DELETE CASCADE,
  teacher_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(schedule_id, teacher_id)
);
ALTER TABLE public.schedule_teachers ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.schedule_students (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id uuid NOT NULL REFERENCES public.schedules(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(schedule_id, student_id)
);
ALTER TABLE public.schedule_students ENABLE ROW LEVEL SECURITY;

-- 8. Class records (Sumários)
CREATE TABLE public.class_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id UUID NOT NULL REFERENCES public.schedules(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  summary TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('taught', 'canceled', 'scheduled')),
  attendance TEXT CHECK (attendance IN ('present', 'absent')),
  reschedule_pending BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.class_records ENABLE ROW LEVEL SECURITY;

-- 9. Attachments for class records
CREATE TABLE public.class_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_record_id UUID NOT NULL REFERENCES public.class_records(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_url TEXT NOT NULL,
  uploaded_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.class_attachments ENABLE ROW LEVEL SECURITY;

-- 10. Evaluations
CREATE TABLE public.evaluations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  technique INTEGER NOT NULL CHECK (technique BETWEEN 0 AND 10),
  theory INTEGER NOT NULL CHECK (theory BETWEEN 0 AND 10),
  commitment INTEGER NOT NULL CHECK (commitment BETWEEN 0 AND 10),
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.evaluations ENABLE ROW LEVEL SECURITY;

-- 11. Notifications
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'general' CHECK (type IN ('document', 'schedule', 'absence', 'general')),
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- 12. Rescheduled classes (Reposições)
CREATE TABLE public.rescheduled_classes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  original_class_record_id UUID NOT NULL REFERENCES public.class_records(id) ON DELETE CASCADE,
  new_date DATE NOT NULL,
  new_start_time TIME NOT NULL,
  new_end_time TIME NOT NULL,
  room_id UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'completed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.rescheduled_classes ENABLE ROW LEVEL SECURITY;

-- 13. Profile creation trigger on auth signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    COALESCE((NEW.raw_user_meta_data->>'role')::app_role, 'student')
  );
  INSERT INTO public.user_roles (user_id, role)
  VALUES (
    NEW.id,
    COALESCE((NEW.raw_user_meta_data->>'role')::app_role, 'student')
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 14. RLS Policies
CREATE POLICY "Anyone authenticated can read profiles" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid());
CREATE POLICY "Admins can manage profiles" ON public.profiles FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage user_roles" ON public.user_roles FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can read own roles" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Authenticated can read rooms" ON public.rooms FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage rooms" ON public.rooms FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated can read schedules" ON public.schedules FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage schedules" ON public.schedules FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated can read schedule_teachers" ON public.schedule_teachers FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage schedule_teachers" ON public.schedule_teachers FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authenticated can read schedule_students" ON public.schedule_students FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage schedule_students" ON public.schedule_students FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authenticated can read class_records" ON public.class_records FOR SELECT TO authenticated USING (true);
CREATE POLICY "Teachers can manage own class_records" ON public.class_records FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.schedules s WHERE s.id = schedule_id AND s.teacher_id = auth.uid()
  ) OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated can read attachments" ON public.class_attachments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Teachers can manage attachments" ON public.class_attachments FOR ALL TO authenticated
  USING (uploaded_by = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Teachers and admins can read evaluations" ON public.evaluations FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'teacher') OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Teachers can manage own evaluations" ON public.evaluations FOR ALL TO authenticated
  USING (teacher_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can read own notifications" ON public.notifications FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can update own notifications" ON public.notifications FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Admins and teachers can create notifications" ON public.notifications FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'teacher') OR user_id = auth.uid());

CREATE POLICY "Authenticated can read rescheduled" ON public.rescheduled_classes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage rescheduled" ON public.rescheduled_classes FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 15. Storage Buckets (Make sure pg_net / storage extensions are active)
-- If this fails, create the bucket named 'class-documents' manually via the Supabase dashboard interface
INSERT INTO storage.buckets (id, name, public) VALUES ('class-documents', 'class-documents', true)
ON CONFLICT DO NOTHING;

-- 16. Storage policies
CREATE POLICY "Authenticated can read class docs" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'class-documents');
CREATE POLICY "Teachers can upload class docs" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'class-documents' AND (public.has_role(auth.uid(), 'teacher') OR public.has_role(auth.uid(), 'admin')));
CREATE POLICY "Teachers can delete own class docs" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'class-documents' AND (public.has_role(auth.uid(), 'teacher') OR public.has_role(auth.uid(), 'admin')));

-- 17. Seed primary Admin User
-- Email: 1999tiagosanches@gmail.com
-- Password: grt
CREATE OR REPLACE FUNCTION public.seed_admin_user()
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  admin_uid UUID;
BEGIN
  SELECT id INTO admin_uid FROM auth.users WHERE email = '1999tiagosanches@gmail.com';
  IF admin_uid IS NULL THEN
    admin_uid := gen_random_uuid();
    INSERT INTO auth.users (
      id, instance_id, email, encrypted_password, email_confirmed_at,
      raw_user_meta_data, raw_app_meta_data, aud, role, created_at, updated_at,
      confirmation_token, recovery_token, email_change_token_new
    ) VALUES (
      admin_uid,
      '00000000-0000-0000-0000-000000000000',
      '1999tiagosanches@gmail.com',
      crypt('grt', gen_salt('bf')),
      now(),
      '{"name": "Tiago Sanches", "role": "admin"}'::jsonb,
      '{"provider": "email", "providers": ["email"]}'::jsonb,
      'authenticated',
      'authenticated',
      now(),
      now(),
      '',
      '',
      ''
    );
  END IF;
  
  -- Insert into profiles as must_change_password = false
  UPDATE public.profiles SET must_change_password = false WHERE email = '1999tiagosanches@gmail.com';
  
  -- Add user identity for email auth
  INSERT INTO auth.identities (
    id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at
  )
  VALUES (
    admin_uid, admin_uid, 
    jsonb_build_object('sub', admin_uid::text, 'email', '1999tiagosanches@gmail.com', 'email_verified', true),
    'email', admin_uid::text, now(), now(), now()
  )
  ON CONFLICT DO NOTHING;
END;
$$;

SELECT public.seed_admin_user();
DROP FUNCTION public.seed_admin_user();
