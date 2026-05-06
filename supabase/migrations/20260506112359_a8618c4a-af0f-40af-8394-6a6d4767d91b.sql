CREATE TYPE public.assessment_type AS ENUM ('test','quiz','assignment','exam','project');

CREATE TABLE public.subjects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  code TEXT,
  color TEXT NOT NULL DEFAULT 'navy',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own subjects" ON public.subjects FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users create own subjects" ON public.subjects FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own subjects" ON public.subjects FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users delete own subjects" ON public.subjects FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE TRIGGER subjects_touch BEFORE UPDATE ON public.subjects FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.assessments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'Untitled',
  assessment_type public.assessment_type NOT NULL DEFAULT 'test',
  score NUMERIC NOT NULL DEFAULT 0,
  max_score NUMERIC NOT NULL DEFAULT 100,
  weight NUMERIC NOT NULL DEFAULT 1,
  term TEXT NOT NULL DEFAULT 'Term 1',
  assessed_on DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.assessments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own assessments" ON public.assessments FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users create own assessments" ON public.assessments FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own assessments" ON public.assessments FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users delete own assessments" ON public.assessments FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE TRIGGER assessments_touch BEFORE UPDATE ON public.assessments FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE INDEX idx_assessments_user_subj ON public.assessments(user_id, subject_id);