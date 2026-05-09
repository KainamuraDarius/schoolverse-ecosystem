-- Admin and teacher visibility across school data
-- Admins can view all data; teachers can view all (read-only) school data for their classes view

-- profiles: admins can view all
CREATE POLICY "Admins view all profiles" ON public.profiles
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Teachers view all profiles" ON public.profiles
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'teacher'));

-- assessments
CREATE POLICY "Admins view all assessments" ON public.assessments
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Teachers view all assessments" ON public.assessments
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'teacher'));

-- lesson_sessions
CREATE POLICY "Admins view all sessions" ON public.lesson_sessions
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Teachers view all sessions" ON public.lesson_sessions
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'teacher'));

-- timetable_entries
CREATE POLICY "Admins view all timetables" ON public.timetable_entries
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Teachers view all timetables" ON public.timetable_entries
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'teacher'));

-- subjects
CREATE POLICY "Admins view all subjects" ON public.subjects
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Teachers view all subjects" ON public.subjects
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'teacher'));

-- events
CREATE POLICY "Admins view all events" ON public.events
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Helper view function: list users with roles (admin only)
CREATE OR REPLACE FUNCTION public.list_users_with_roles()
RETURNS TABLE(user_id uuid, display_name text, created_at timestamptz, roles text[])
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p.id,
    p.display_name,
    p.created_at,
    COALESCE(ARRAY_AGG(ur.role::text) FILTER (WHERE ur.role IS NOT NULL), ARRAY[]::text[])
  FROM public.profiles p
  LEFT JOIN public.user_roles ur ON ur.user_id = p.id
  WHERE public.has_role(auth.uid(), 'admin')
  GROUP BY p.id, p.display_name, p.created_at
  ORDER BY p.created_at DESC;
$$;

REVOKE ALL ON FUNCTION public.list_users_with_roles() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_users_with_roles() TO authenticated;