ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS subject TEXT,
  ADD COLUMN IF NOT EXISTS teacher TEXT,
  ADD COLUMN IF NOT EXISTS source_type TEXT,
  ADD COLUMN IF NOT EXISTS source_id TEXT,
  ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS notification_minutes INTEGER NOT NULL DEFAULT 15,
  ADD COLUMN IF NOT EXISTS badge_seen_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_events_user_source ON public.events(user_id, source_type, source_id);

CREATE TABLE public.timetable_plans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'My weekly timetable',
  teachers JSONB NOT NULL DEFAULT '[]'::jsonb,
  subjects JSONB NOT NULL DEFAULT '[]'::jsonb,
  classes JSONB NOT NULL DEFAULT '[]'::jsonb,
  periods JSONB NOT NULL DEFAULT '[]'::jsonb,
  constraints JSONB NOT NULL DEFAULT '{}'::jsonb,
  schedule_scope_type TEXT NOT NULL DEFAULT 'teacher',
  schedule_scope_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT timetable_plans_schedule_scope_type_check CHECK (schedule_scope_type IN ('teacher', 'class', 'all')),
  CONSTRAINT timetable_plans_user_id_key UNIQUE (user_id)
);

ALTER TABLE public.timetable_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own timetable plans"
  ON public.timetable_plans FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users create own timetable plans"
  ON public.timetable_plans FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own timetable plans"
  ON public.timetable_plans FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users delete own timetable plans"
  ON public.timetable_plans FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE TRIGGER timetable_plans_touch_updated_at
  BEFORE UPDATE ON public.timetable_plans
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.timetable_lessons (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES public.timetable_plans(id) ON DELETE CASCADE,
  source_key TEXT NOT NULL,
  day_of_week SMALLINT NOT NULL CHECK (day_of_week BETWEEN 1 AND 7),
  period_number SMALLINT NOT NULL,
  period_id TEXT NOT NULL,
  period_label TEXT NOT NULL,
  starts_at TIME NOT NULL,
  ends_at TIME NOT NULL,
  teacher_id TEXT NOT NULL,
  teacher_name TEXT NOT NULL,
  class_id TEXT NOT NULL,
  class_name TEXT NOT NULL,
  subject_id TEXT NOT NULL,
  subject_name TEXT NOT NULL,
  subject_code TEXT,
  subject_color TEXT NOT NULL DEFAULT 'navy',
  location TEXT,
  conflict_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT timetable_lessons_unique_source UNIQUE (plan_id, source_key)
);

CREATE INDEX idx_timetable_lessons_user_day ON public.timetable_lessons(user_id, day_of_week, period_number);

ALTER TABLE public.timetable_lessons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own timetable lessons"
  ON public.timetable_lessons FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users create own timetable lessons"
  ON public.timetable_lessons FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own timetable lessons"
  ON public.timetable_lessons FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users delete own timetable lessons"
  ON public.timetable_lessons FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE TRIGGER timetable_lessons_touch_updated_at
  BEFORE UPDATE ON public.timetable_lessons
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TYPE public.whiteboard_session_status AS ENUM ('scheduled', 'live', 'ended');
CREATE TYPE public.whiteboard_element_kind AS ENUM ('stroke', 'shape', 'text');

CREATE TABLE public.whiteboard_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_id UUID REFERENCES public.events(id) ON DELETE SET NULL,
  lesson_source_id TEXT,
  title TEXT NOT NULL DEFAULT 'Live lesson',
  room_code TEXT NOT NULL DEFAULT upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8)),
  status public.whiteboard_session_status NOT NULL DEFAULT 'scheduled',
  participant_ids UUID[] NOT NULL DEFAULT '{}'::uuid[],
  board_snapshot JSONB NOT NULL DEFAULT '[]'::jsonb,
  recording_log JSONB NOT NULL DEFAULT '[]'::jsonb,
  active_quiz JSONB,
  starts_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT whiteboard_sessions_room_code_key UNIQUE (room_code)
);

CREATE INDEX idx_whiteboard_sessions_owner ON public.whiteboard_sessions(owner_id, status, starts_at);
CREATE INDEX idx_whiteboard_sessions_event ON public.whiteboard_sessions(event_id);

ALTER TABLE public.whiteboard_sessions ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.can_access_whiteboard_session(_session_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.whiteboard_sessions session_row
    WHERE session_row.id = _session_id
      AND (
        session_row.owner_id = auth.uid()
        OR auth.uid() = ANY (session_row.participant_ids)
      )
  );
$$;

REVOKE EXECUTE ON FUNCTION public.can_access_whiteboard_session(UUID) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.can_access_whiteboard_session(UUID) TO authenticated;

CREATE OR REPLACE FUNCTION public.join_whiteboard_session(_room_code TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  joined_session_id UUID;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT id
  INTO joined_session_id
  FROM public.whiteboard_sessions
  WHERE room_code = upper(trim(_room_code));

  IF joined_session_id IS NULL THEN
    RAISE EXCEPTION 'Session not found';
  END IF;

  UPDATE public.whiteboard_sessions
  SET participant_ids = (
    SELECT COALESCE(array_agg(DISTINCT participant_id), '{}'::uuid[])
    FROM unnest(array_append(participant_ids, auth.uid())) AS participant_id
  )
  WHERE id = joined_session_id;

  RETURN joined_session_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.join_whiteboard_session(TEXT) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.join_whiteboard_session(TEXT) TO authenticated;

CREATE POLICY "Owners and participants view whiteboard sessions"
  ON public.whiteboard_sessions FOR SELECT TO authenticated
  USING (
    owner_id = auth.uid()
    OR auth.uid() = ANY (participant_ids)
  );

CREATE POLICY "Owners create whiteboard sessions"
  ON public.whiteboard_sessions FOR INSERT TO authenticated
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Owners update whiteboard sessions"
  ON public.whiteboard_sessions FOR UPDATE TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Owners delete whiteboard sessions"
  ON public.whiteboard_sessions FOR DELETE TO authenticated
  USING (owner_id = auth.uid());

CREATE TRIGGER whiteboard_sessions_touch_updated_at
  BEFORE UPDATE ON public.whiteboard_sessions
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.whiteboard_elements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.whiteboard_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind public.whiteboard_element_kind NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  removed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_whiteboard_elements_session ON public.whiteboard_elements(session_id, created_at);

ALTER TABLE public.whiteboard_elements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants view whiteboard elements"
  ON public.whiteboard_elements FOR SELECT TO authenticated
  USING (public.can_access_whiteboard_session(session_id));

CREATE POLICY "Participants create whiteboard elements"
  ON public.whiteboard_elements FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND public.can_access_whiteboard_session(session_id));

CREATE POLICY "Participants update own whiteboard elements"
  ON public.whiteboard_elements FOR UPDATE TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1
      FROM public.whiteboard_sessions session_row
      WHERE session_row.id = session_id
        AND session_row.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1
      FROM public.whiteboard_sessions session_row
      WHERE session_row.id = session_id
        AND session_row.owner_id = auth.uid()
    )
  );

CREATE POLICY "Participants delete own whiteboard elements"
  ON public.whiteboard_elements FOR DELETE TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1
      FROM public.whiteboard_sessions session_row
      WHERE session_row.id = session_id
        AND session_row.owner_id = auth.uid()
    )
  );

CREATE TRIGGER whiteboard_elements_touch_updated_at
  BEFORE UPDATE ON public.whiteboard_elements
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.whiteboard_quiz_responses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.whiteboard_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  quiz_id TEXT NOT NULL,
  answer TEXT NOT NULL,
  is_correct BOOLEAN,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT whiteboard_quiz_responses_unique_answer UNIQUE (session_id, user_id, quiz_id)
);

CREATE INDEX idx_whiteboard_quiz_responses_session ON public.whiteboard_quiz_responses(session_id, quiz_id);

ALTER TABLE public.whiteboard_quiz_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants view quiz responses"
  ON public.whiteboard_quiz_responses FOR SELECT TO authenticated
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1
      FROM public.whiteboard_sessions session_row
      WHERE session_row.id = session_id
        AND session_row.owner_id = auth.uid()
    )
  );

CREATE POLICY "Participants create quiz responses"
  ON public.whiteboard_quiz_responses FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND public.can_access_whiteboard_session(session_id));

CREATE POLICY "Participants update own quiz responses"
  ON public.whiteboard_quiz_responses FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Participants delete own quiz responses"
  ON public.whiteboard_quiz_responses FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE TRIGGER whiteboard_quiz_responses_touch_updated_at
  BEFORE UPDATE ON public.whiteboard_quiz_responses
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
