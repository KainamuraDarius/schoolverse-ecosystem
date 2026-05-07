
-- Enums
CREATE TYPE public.session_status AS ENUM ('scheduled','attended','missed','late');
CREATE TYPE public.resource_type AS ENUM ('video','simulation','3d_model','article','link','document');

-- Timetable entries
CREATE TABLE public.timetable_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  day_of_week smallint NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time time NOT NULL,
  end_time time NOT NULL,
  subject_id uuid REFERENCES public.subjects(id) ON DELETE SET NULL,
  title text NOT NULL DEFAULT 'Lesson',
  teacher text,
  class_name text,
  room text,
  color text NOT NULL DEFAULT 'navy',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.timetable_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tt view own" ON public.timetable_entries FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "tt insert own" ON public.timetable_entries FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "tt update own" ON public.timetable_entries FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "tt delete own" ON public.timetable_entries FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE TRIGGER trg_tt_updated BEFORE UPDATE ON public.timetable_entries FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Lesson sessions (Monitor)
CREATE TABLE public.lesson_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  subject_id uuid REFERENCES public.subjects(id) ON DELETE SET NULL,
  title text NOT NULL DEFAULT 'Lesson',
  status public.session_status NOT NULL DEFAULT 'scheduled',
  scheduled_at timestamptz NOT NULL DEFAULT now(),
  started_at timestamptz,
  ended_at timestamptz,
  duration_minutes integer,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.lesson_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ls view own" ON public.lesson_sessions FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "ls insert own" ON public.lesson_sessions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "ls update own" ON public.lesson_sessions FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "ls delete own" ON public.lesson_sessions FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE TRIGGER trg_ls_updated BEFORE UPDATE ON public.lesson_sessions FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Book resources
CREATE TABLE public.book_resources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  subject_id uuid REFERENCES public.subjects(id) ON DELETE SET NULL,
  title text NOT NULL DEFAULT 'Untitled resource',
  description text NOT NULL DEFAULT '',
  resource_type public.resource_type NOT NULL DEFAULT 'link',
  url text NOT NULL,
  thumbnail_url text,
  tags text[] NOT NULL DEFAULT '{}',
  pinned boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.book_resources ENABLE ROW LEVEL SECURITY;
CREATE POLICY "br view own" ON public.book_resources FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "br insert own" ON public.book_resources FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "br update own" ON public.book_resources FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "br delete own" ON public.book_resources FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE TRIGGER trg_br_updated BEFORE UPDATE ON public.book_resources FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Whiteboards
CREATE TABLE public.whiteboards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL DEFAULT 'Untitled board',
  data jsonb NOT NULL DEFAULT '{"strokes":[]}'::jsonb,
  thumbnail text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.whiteboards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "wb view own" ON public.whiteboards FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "wb insert own" ON public.whiteboards FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "wb update own" ON public.whiteboards FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "wb delete own" ON public.whiteboards FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE TRIGGER trg_wb_updated BEFORE UPDATE ON public.whiteboards FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
