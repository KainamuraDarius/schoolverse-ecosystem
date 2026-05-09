CREATE TABLE public.book_topics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject_name TEXT NOT NULL,
  subject_slug TEXT NOT NULL,
  title TEXT NOT NULL,
  slug TEXT NOT NULL,
  lesson_label TEXT,
  summary TEXT NOT NULL DEFAULT '',
  content_html TEXT NOT NULL DEFAULT '',
  cross_subject_links JSONB NOT NULL DEFAULT '[]'::jsonb,
  model_embed_url TEXT,
  simulation_url TEXT,
  cover_color TEXT NOT NULL DEFAULT 'navy',
  estimated_minutes INTEGER NOT NULL DEFAULT 35,
  topic_order INTEGER NOT NULL DEFAULT 0,
  published BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT book_topics_owner_slug_key UNIQUE (owner_id, slug)
);

CREATE INDEX idx_book_topics_owner_subject ON public.book_topics(owner_id, subject_slug, topic_order);

ALTER TABLE public.book_topics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own book topics"
  ON public.book_topics FOR SELECT TO authenticated
  USING (auth.uid() = owner_id);

CREATE POLICY "Users create own book topics"
  ON public.book_topics FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users update own book topics"
  ON public.book_topics FOR UPDATE TO authenticated
  USING (auth.uid() = owner_id);

CREATE POLICY "Users delete own book topics"
  ON public.book_topics FOR DELETE TO authenticated
  USING (auth.uid() = owner_id);

CREATE TRIGGER book_topics_touch_updated_at
  BEFORE UPDATE ON public.book_topics
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

ALTER TABLE public.notes
  ADD COLUMN IF NOT EXISTS topic_id UUID REFERENCES public.book_topics(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS lesson_title TEXT,
  ADD COLUMN IF NOT EXISTS note_date DATE NOT NULL DEFAULT CURRENT_DATE,
  ADD COLUMN IF NOT EXISTS annotation_marks JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS answer_spaces JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS auto_tags JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS linked_event_id UUID REFERENCES public.events(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS exercise_score NUMERIC NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_notes_topic_date ON public.notes(user_id, topic_id, note_date DESC);

CREATE TABLE public.school_classes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  stream TEXT NOT NULL DEFAULT '',
  term TEXT NOT NULL DEFAULT 'Term 1',
  timetable_class_key TEXT,
  teacher_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  teacher_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT school_classes_owner_name_stream_term_key UNIQUE (owner_id, name, stream, term)
);

CREATE INDEX idx_school_classes_owner_teacher ON public.school_classes(owner_id, teacher_id, term);

ALTER TABLE public.school_classes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own school classes"
  ON public.school_classes FOR SELECT TO authenticated
  USING (auth.uid() = owner_id OR auth.uid() = teacher_id);

CREATE POLICY "Users create own school classes"
  ON public.school_classes FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users update own school classes"
  ON public.school_classes FOR UPDATE TO authenticated
  USING (auth.uid() = owner_id);

CREATE POLICY "Users delete own school classes"
  ON public.school_classes FOR DELETE TO authenticated
  USING (auth.uid() = owner_id);

CREATE TRIGGER school_classes_touch_updated_at
  BEFORE UPDATE ON public.school_classes
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.class_enrollments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES public.school_classes(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  student_name TEXT NOT NULL,
  admission_no TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT class_enrollments_class_student_key UNIQUE (class_id, student_id)
);

CREATE INDEX idx_class_enrollments_owner_student ON public.class_enrollments(owner_id, student_id);

ALTER TABLE public.class_enrollments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view class enrollments they own or belong to"
  ON public.class_enrollments FOR SELECT TO authenticated
  USING (auth.uid() = owner_id OR auth.uid() = student_id);

CREATE POLICY "Users create own class enrollments"
  ON public.class_enrollments FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users update own class enrollments"
  ON public.class_enrollments FOR UPDATE TO authenticated
  USING (auth.uid() = owner_id);

CREATE POLICY "Users delete own class enrollments"
  ON public.class_enrollments FOR DELETE TO authenticated
  USING (auth.uid() = owner_id);

CREATE TRIGGER class_enrollments_touch_updated_at
  BEFORE UPDATE ON public.class_enrollments
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.learning_activity (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject_name TEXT,
  topic_id UUID REFERENCES public.book_topics(id) ON DELETE SET NULL,
  note_id UUID REFERENCES public.notes(id) ON DELETE SET NULL,
  source TEXT NOT NULL,
  activity_date DATE NOT NULL DEFAULT CURRENT_DATE,
  minutes_spent INTEGER NOT NULL DEFAULT 0,
  progress_percent INTEGER NOT NULL DEFAULT 0,
  content_percent INTEGER NOT NULL DEFAULT 0,
  lesson_title TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT learning_activity_source_check CHECK (source IN ('book', 'notes', 'whiteboard')),
  CONSTRAINT learning_activity_minutes_check CHECK (minutes_spent >= 0),
  CONSTRAINT learning_activity_progress_check CHECK (progress_percent BETWEEN 0 AND 100),
  CONSTRAINT learning_activity_content_check CHECK (content_percent BETWEEN 0 AND 100)
);

CREATE INDEX idx_learning_activity_owner_student_date
  ON public.learning_activity(owner_id, student_id, activity_date DESC);

ALTER TABLE public.learning_activity ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view learning activity they own or that belongs to them"
  ON public.learning_activity FOR SELECT TO authenticated
  USING (auth.uid() = owner_id OR auth.uid() = student_id);

CREATE POLICY "Users create learning activity they own or that belongs to them"
  ON public.learning_activity FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = owner_id OR auth.uid() = student_id);

CREATE POLICY "Users update learning activity they own or that belongs to them"
  ON public.learning_activity FOR UPDATE TO authenticated
  USING (auth.uid() = owner_id OR auth.uid() = student_id);

CREATE POLICY "Users delete own learning activity"
  ON public.learning_activity FOR DELETE TO authenticated
  USING (auth.uid() = owner_id);

CREATE TRIGGER learning_activity_touch_updated_at
  BEFORE UPDATE ON public.learning_activity
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.lesson_attendance (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_id UUID REFERENCES public.events(id) ON DELETE SET NULL,
  whiteboard_session_id UUID REFERENCES public.whiteboard_sessions(id) ON DELETE SET NULL,
  class_id UUID REFERENCES public.school_classes(id) ON DELETE SET NULL,
  class_name TEXT,
  subject_name TEXT,
  teacher_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lesson_title TEXT NOT NULL DEFAULT 'Lesson',
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  left_at TIMESTAMPTZ,
  minutes_attended INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'present',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT lesson_attendance_minutes_check CHECK (minutes_attended >= 0),
  CONSTRAINT lesson_attendance_status_check CHECK (status IN ('present', 'late', 'missed')),
  CONSTRAINT lesson_attendance_session_student_key UNIQUE (whiteboard_session_id, student_id)
);

CREATE INDEX idx_lesson_attendance_owner_student ON public.lesson_attendance(owner_id, student_id, joined_at DESC);
CREATE INDEX idx_lesson_attendance_teacher ON public.lesson_attendance(teacher_id, joined_at DESC);

ALTER TABLE public.lesson_attendance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view attendance they own teach or attend"
  ON public.lesson_attendance FOR SELECT TO authenticated
  USING (auth.uid() = owner_id OR auth.uid() = teacher_id OR auth.uid() = student_id);

CREATE POLICY "Users create attendance they own teach or attend"
  ON public.lesson_attendance FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = owner_id OR auth.uid() = teacher_id OR auth.uid() = student_id);

CREATE POLICY "Users update attendance they own teach or attend"
  ON public.lesson_attendance FOR UPDATE TO authenticated
  USING (auth.uid() = owner_id OR auth.uid() = teacher_id OR auth.uid() = student_id);

CREATE POLICY "Users delete own attendance"
  ON public.lesson_attendance FOR DELETE TO authenticated
  USING (auth.uid() = owner_id);

CREATE TRIGGER lesson_attendance_touch_updated_at
  BEFORE UPDATE ON public.lesson_attendance
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

ALTER TABLE public.assessments
  ADD COLUMN IF NOT EXISTS class_id UUID REFERENCES public.school_classes(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS student_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS student_name TEXT,
  ADD COLUMN IF NOT EXISTS subject_name TEXT,
  ADD COLUMN IF NOT EXISTS recorded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS recorded_by_name TEXT,
  ADD COLUMN IF NOT EXISTS score_comment TEXT;

UPDATE public.assessments
SET student_id = user_id
WHERE student_id IS NULL;

UPDATE public.assessments
SET recorded_by = user_id
WHERE recorded_by IS NULL;

UPDATE public.assessments a
SET subject_name = s.name
FROM public.subjects s
WHERE a.subject_id = s.id
  AND a.subject_name IS NULL;

UPDATE public.assessments a
SET student_name = COALESCE(p.display_name, split_part(u.email, '@', 1))
FROM public.profiles p
JOIN auth.users u ON u.id = p.id
WHERE a.student_id = p.id
  AND a.student_name IS NULL;

UPDATE public.assessments a
SET recorded_by_name = COALESCE(p.display_name, split_part(u.email, '@', 1))
FROM public.profiles p
JOIN auth.users u ON u.id = p.id
WHERE a.recorded_by = p.id
  AND a.recorded_by_name IS NULL;

CREATE INDEX IF NOT EXISTS idx_assessments_student_term
  ON public.assessments(user_id, student_id, term, assessed_on DESC);

DROP POLICY IF EXISTS "Users view own assessments" ON public.assessments;
DROP POLICY IF EXISTS "Users create own assessments" ON public.assessments;
DROP POLICY IF EXISTS "Users update own assessments" ON public.assessments;
DROP POLICY IF EXISTS "Users delete own assessments" ON public.assessments;

CREATE POLICY "Users view owned or assigned assessments"
  ON public.assessments FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR auth.uid() = student_id OR auth.uid() = recorded_by);

CREATE POLICY "Users create owned assessments"
  ON public.assessments FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id OR auth.uid() = recorded_by);

CREATE POLICY "Users update owned assessments"
  ON public.assessments FOR UPDATE TO authenticated
  USING (auth.uid() = user_id OR auth.uid() = recorded_by);

CREATE POLICY "Users delete owned assessments"
  ON public.assessments FOR DELETE TO authenticated
  USING (auth.uid() = user_id OR auth.uid() = recorded_by);

DROP POLICY IF EXISTS "Profiles are viewable by owner" ON public.profiles;

CREATE POLICY "Profiles are viewable by authenticated users"
  ON public.profiles FOR SELECT TO authenticated
  USING (true);
