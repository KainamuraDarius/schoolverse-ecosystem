CREATE TYPE public.event_type AS ENUM ('lesson','assignment','exam','meeting','other');

CREATE TABLE public.events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL DEFAULT 'Untitled event',
  description TEXT NOT NULL DEFAULT '',
  event_type public.event_type NOT NULL DEFAULT 'other',
  start_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  end_at TIMESTAMPTZ NOT NULL DEFAULT now() + interval '1 hour',
  all_day BOOLEAN NOT NULL DEFAULT false,
  location TEXT,
  color TEXT NOT NULL DEFAULT 'navy',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own events" ON public.events FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users create own events" ON public.events FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own events" ON public.events FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users delete own events" ON public.events FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER events_touch_updated_at BEFORE UPDATE ON public.events FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE INDEX idx_events_user_start ON public.events(user_id, start_at);