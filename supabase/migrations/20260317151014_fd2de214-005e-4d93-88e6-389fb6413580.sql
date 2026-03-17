
-- 1. Add must_change_password to profiles
ALTER TABLE public.profiles ADD COLUMN must_change_password boolean NOT NULL DEFAULT true;

-- 2. Set existing admin to false (they already have their password)
UPDATE public.profiles SET must_change_password = false WHERE email = '1999tiagosanches@gmail.com';

-- 3. Create junction table: schedule_teachers (many-to-many)
CREATE TABLE public.schedule_teachers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id uuid NOT NULL REFERENCES public.schedules(id) ON DELETE CASCADE,
  teacher_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(schedule_id, teacher_id)
);

ALTER TABLE public.schedule_teachers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read schedule_teachers"
ON public.schedule_teachers FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Admins can manage schedule_teachers"
ON public.schedule_teachers FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- 4. Create junction table: schedule_students (many-to-many)
CREATE TABLE public.schedule_students (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id uuid NOT NULL REFERENCES public.schedules(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(schedule_id, student_id)
);

ALTER TABLE public.schedule_students ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read schedule_students"
ON public.schedule_students FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Admins can manage schedule_students"
ON public.schedule_students FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- 5. Migrate existing data from schedules to junction tables
INSERT INTO public.schedule_teachers (schedule_id, teacher_id)
SELECT id, teacher_id FROM public.schedules;

INSERT INTO public.schedule_students (schedule_id, student_id)
SELECT id, student_id FROM public.schedules;

-- 6. Drop old columns (teacher_id, student_id) from schedules — keep for backward compat for now
-- We'll keep them but they become optional
ALTER TABLE public.schedules ALTER COLUMN teacher_id DROP NOT NULL;
ALTER TABLE public.schedules ALTER COLUMN student_id DROP NOT NULL;
