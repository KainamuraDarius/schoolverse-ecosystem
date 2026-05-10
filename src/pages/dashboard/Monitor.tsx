import { useEffect, useMemo, useState } from "react";
import { Activity, AlertTriangle, Clock3, Loader2, Presentation, Users } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { useAuth } from "@/hooks/useAuth";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { formatClassLabel, resolvePerspective, type AppPerspective } from "@/lib/ischool";

type AttendanceRow = Tables<"lesson_attendance">;
type ActivityRow = Tables<"learning_activity">;
type EventRow = Tables<"events">;
type SessionRow = Tables<"whiteboard_sessions">;
type ClassRow = Tables<"school_classes">;
type EnrollmentRow = Tables<"class_enrollments">;
type ProfileRow = Tables<"profiles">;
type UserRoleRow = Tables<"user_roles">;

function percent(value: number, total: number) {
  if (total <= 0) return 0;
  return Math.round((value / total) * 100);
}

export default function Monitor() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [perspective, setPerspective] = useState<AppPerspective>("student");
  const [profileRole, setProfileRole] = useState<string | null>(null);
  const [attendanceRows, setAttendanceRows] = useState<AttendanceRow[]>([]);
  const [activityRows, setActivityRows] = useState<ActivityRow[]>([]);
  const [lessonEvents, setLessonEvents] = useState<EventRow[]>([]);
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [enrollments, setEnrollments] = useState<EnrollmentRow[]>([]);
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [selectedClass, setSelectedClass] = useState<string>("all");
  const [selectedSubject, setSelectedSubject] = useState<string>("all");

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    (async () => {
      setLoading(true);
      const [
        { data: profileRows, error: profileError },
        { data: roleRows, error: roleError },
        { data: attendance, error: attendanceError },
        { data: activities, error: activityError },
        { data: events, error: eventError },
        { data: whiteboardRows, error: whiteboardError },
        { data: classRows, error: classError },
        { data: enrollmentRows, error: enrollmentError },
      ] = await Promise.all([
        supabase.from("profiles").select("*"),
        supabase.from("user_roles").select("*").eq("user_id", user.id),
        supabase.from("lesson_attendance").select("*").order("joined_at", { ascending: false }),
        supabase.from("learning_activity").select("*").order("activity_date", { ascending: false }),
        supabase.from("events").select("*").eq("event_type", "lesson").order("start_at", { ascending: false }),
        supabase.from("whiteboard_sessions").select("*").order("created_at", { ascending: false }),
        supabase.from("school_classes").select("*").order("term").order("name"),
        supabase.from("class_enrollments").select("*").order("created_at", { ascending: false }),
      ]);

      [profileError, roleError, attendanceError, activityError, eventError, whiteboardError, classError, enrollmentError]
        .filter(Boolean)
        .forEach((error) => toast.error(error?.message ?? "Could not load monitor data"));

      if (cancelled) return;

      const userRole =
        ((roleRows ?? []).find((row: UserRoleRow) => row.role === "admin")?.role ??
          (roleRows ?? []).find((row: UserRoleRow) => row.role === "teacher")?.role ??
          profileRows?.find((row: ProfileRow) => row.id === user.id)?.role ??
          "student") as string;

      setProfileRole(userRole);
      setPerspective(resolvePerspective(userRole));
      setProfiles((profileRows ?? []) as ProfileRow[]);
      setAttendanceRows((attendance ?? []) as AttendanceRow[]);
      setActivityRows((activities ?? []) as ActivityRow[]);
      setLessonEvents((events ?? []) as EventRow[]);
      setSessions((whiteboardRows ?? []) as SessionRow[]);
      setClasses((classRows ?? []) as ClassRow[]);
      setEnrollments((enrollmentRows ?? []) as EnrollmentRow[]);
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [user]);

  const profileNameMap = useMemo(
    () =>
      Object.fromEntries(
        profiles.map((profile) => [profile.id, profile.display_name || `User ${profile.id.slice(0, 6)}`]),
      ),
    [profiles],
  );

  const visibleAttendance = useMemo(() => {
    const base =
      perspective === "student"
        ? attendanceRows.filter((row) => row.student_id === user?.id)
        : attendanceRows.filter((row) => row.owner_id === user?.id);

    return base.filter((row) => {
      const classMatches = selectedClass === "all" || row.class_id === selectedClass;
      const subjectMatches = selectedSubject === "all" || row.subject_name === selectedSubject;
      return classMatches && subjectMatches;
    });
  }, [attendanceRows, perspective, selectedClass, selectedSubject, user?.id]);

  const visibleActivity = useMemo(() => {
    const base =
      perspective === "student"
        ? activityRows.filter((row) => row.student_id === user?.id)
        : activityRows.filter((row) => row.owner_id === user?.id);

    return base.filter((row) => selectedSubject === "all" || row.subject_name === selectedSubject);
  }, [activityRows, perspective, selectedSubject, user?.id]);

  const visibleEvents = useMemo(() => lessonEvents.filter((row) => selectedSubject === "all" || row.subject === selectedSubject), [lessonEvents, selectedSubject]);
  const visibleSessions = useMemo(() => sessions.filter((row) => row.owner_id === user?.id), [sessions, user?.id]);

  const attendanceSummary = useMemo(() => {
    const present = visibleAttendance.filter((row) => row.status === "present").length;
    const missed = visibleAttendance.filter((row) => row.status === "missed").length;
    const late = visibleAttendance.filter((row) => row.status === "late").length;
    const totalMinutes = visibleAttendance.reduce((sum, row) => sum + row.minutes_attended, 0);
    return { present, missed, late, totalMinutes };
  }, [visibleAttendance]);

  const teacherDelivery = useMemo(() => {
    const planned = visibleEvents.length;
    const taught = new Set(visibleSessions.map((session) => session.event_id).filter(Boolean)).size;
    return { planned, taught, completion: percent(taught, planned) };
  }, [visibleEvents.length, visibleSessions]);

  const subjectTime = useMemo(() => {
    const map = new Map<string, number>();
    visibleActivity.forEach((row) => {
      const key = row.subject_name || "Unassigned";
      map.set(key, (map.get(key) ?? 0) + row.minutes_spent);
    });
    return [...map.entries()].map(([subject, minutes]) => ({ subject, minutes }));
  }, [visibleActivity]);

  const dailyTrend = useMemo(() => {
    const map = new Map<string, { minutes: number; attendance: number }>();
    visibleActivity.forEach((row) => {
      const current = map.get(row.activity_date) ?? { minutes: 0, attendance: 0 };
      current.minutes += row.minutes_spent;
      map.set(row.activity_date, current);
    });
    visibleAttendance.forEach((row) => {
      const day = row.joined_at.slice(0, 10);
      const current = map.get(day) ?? { minutes: 0, attendance: 0 };
      current.attendance += 1;
      map.set(day, current);
    });
    return [...map.entries()]
      .sort(([left], [right]) => left.localeCompare(right))
      .slice(-10)
      .map(([date, values]) => ({ date: date.slice(5), ...values }));
  }, [visibleActivity, visibleAttendance]);

  const studentTable = useMemo(() => {
    const rows = new Map<string, { student: string; present: number; missed: number; minutes: number }>();
    visibleAttendance.forEach((row) => {
      const student = profileNameMap[row.student_id] ?? `Learner ${row.student_id.slice(0, 6)}`;
      const current = rows.get(row.student_id) ?? { student, present: 0, missed: 0, minutes: 0 };
      if (row.status === "missed") current.missed += 1;
      else current.present += 1;
      current.minutes += row.minutes_attended;
      rows.set(row.student_id, current);
    });
    return [...rows.values()].sort((left, right) => right.minutes - left.minutes);
  }, [profileNameMap, visibleAttendance]);

  const missedAlerts = useMemo(() => {
    if (perspective === "student") {
      const attendedEventIds = new Set(visibleAttendance.map((row) => row.event_id).filter(Boolean));
      return lessonEvents
        .filter((event) => new Date(event.start_at).getTime() < Date.now())
        .filter((event) => !attendedEventIds.has(event.id))
        .slice(0, 5)
        .map((event) => ({
          id: event.id,
          title: event.subject || event.title,
          subtitle: `Missed or not recorded · ${new Date(event.start_at).toLocaleString()}`,
        }));
    }

    return visibleAttendance
      .filter((row) => row.status === "missed")
      .slice(0, 6)
      .map((row) => ({
        id: row.id,
        title: `${profileNameMap[row.student_id] ?? "Learner"} missed ${row.lesson_title}`,
        subtitle: `${row.class_name ?? "Class not set"} · ${new Date(row.joined_at).toLocaleDateString()}`,
      }));
  }, [lessonEvents, perspective, profileNameMap, visibleAttendance]);

  const subjectOptions = useMemo(() => {
    return Array.from(
      new Set(
        [...lessonEvents.map((event) => event.subject).filter(Boolean), ...attendanceRows.map((row) => row.subject_name).filter(Boolean)],
      ),
    ) as string[];
  }, [attendanceRows, lessonEvents]);

  if (loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center text-muted-foreground">
        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
        Loading iSchool Monitor…
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl md:text-3xl text-foreground flex items-center gap-2">
            <Activity className="h-6 w-6 text-primary" />
            iSchool Monitor
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Attendance, missed-lesson alerts, time-on-task analytics, and delivery metrics connected to lessons and whiteboard activity.
          </p>
        </div>

        <div className="flex flex-wrap items-end gap-3">
          <div>
            <Label>Perspective</Label>
            <Select value={perspective} onValueChange={(value) => setPerspective(value as AppPerspective)}>
              <SelectTrigger className="w-[170px] mt-2">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="student">Student view</SelectItem>
                <SelectItem value="teacher">Teacher view</SelectItem>
                <SelectItem value="admin">Admin view</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Class</Label>
            <Select value={selectedClass} onValueChange={setSelectedClass}>
              <SelectTrigger className="w-[200px] mt-2">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All classes</SelectItem>
                {classes.map((classroom) => (
                  <SelectItem key={classroom.id} value={classroom.id}>
                    {formatClassLabel(classroom.name, classroom.stream)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Subject</Label>
            <Select value={selectedSubject} onValueChange={setSelectedSubject}>
              <SelectTrigger className="w-[180px] mt-2">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All subjects</SelectItem>
                {subjectOptions.map((subject) => (
                  <SelectItem key={subject} value={subject}>
                    {subject}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </header>

      <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <Card className="p-5">
          <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Attendance rate</div>
          <div className="font-display text-3xl text-primary mt-2">
            {percent(attendanceSummary.present, attendanceSummary.present + attendanceSummary.missed + attendanceSummary.late)}%
          </div>
          <div className="text-sm text-muted-foreground mt-2">{attendanceSummary.present} present · {attendanceSummary.missed} missed · {attendanceSummary.late} late</div>
        </Card>
        <Card className="p-5">
          <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Time on task</div>
          <div className="font-display text-3xl text-primary mt-2">{attendanceSummary.totalMinutes} min</div>
          <div className="text-sm text-muted-foreground mt-2">Recorded across attendance and study activity.</div>
        </Card>
        <Card className="p-5">
          <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Lessons taught vs planned</div>
          <div className="font-display text-3xl text-primary mt-2">{teacherDelivery.taught}/{teacherDelivery.planned}</div>
          <div className="text-sm text-muted-foreground mt-2">{teacherDelivery.completion}% delivery completion from calendar to whiteboard.</div>
        </Card>
        <Card className="p-5">
          <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Roster coverage</div>
          <div className="font-display text-3xl text-primary mt-2">{enrollments.length}</div>
          <div className="text-sm text-muted-foreground mt-2">Tracked learner enrolments in this workspace.</div>
        </Card>
      </section>

      <div className="grid grid-cols-1 xl:grid-cols-[1.1fr_0.9fr] gap-6">
        <Card className="p-5">
          <div className="flex items-center gap-2">
            <Clock3 className="h-4 w-4 text-primary" />
            <h2 className="font-display text-lg text-foreground">Daily learning trend</h2>
          </div>
          <div className="h-[280px] mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={dailyTrend}>
                <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.15} />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="minutes" stroke="hsl(var(--primary))" strokeWidth={3} name="Minutes" />
                <Line type="monotone" dataKey="attendance" stroke="hsl(var(--accent))" strokeWidth={2} name="Attendance logs" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center gap-2">
            <Presentation className="h-4 w-4 text-primary" />
            <h2 className="font-display text-lg text-foreground">Time on task by subject</h2>
          </div>
          <div className="h-[280px] mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={subjectTime}>
                <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.15} />
                <XAxis dataKey="subject" hide />
                <YAxis />
                <Tooltip />
                <Bar dataKey="minutes" fill="hsl(var(--primary))" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
            {subjectTime.map((entry) => (
              <div key={entry.subject} className="rounded-xl bg-secondary/60 px-3 py-2 text-sm">
                <span className="font-medium text-foreground">{entry.subject}</span>
                <span className="text-muted-foreground ml-2">{entry.minutes} min</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-6">
        <Card className="p-5">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" />
            <h2 className="font-display text-lg text-foreground">Learner coverage</h2>
          </div>
          <div className="space-y-3 mt-4">
            {studentTable.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border p-6 text-sm text-muted-foreground">
                No attendance records yet. Start a whiteboard lesson and join it to begin monitoring.
              </div>
            ) : (
              studentTable.map((row) => (
                <div key={row.student} className="rounded-xl border border-border/60 px-4 py-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="font-medium text-foreground">{row.student}</div>
                    <div className="flex gap-2">
                      <Badge variant="outline">{row.present} present</Badge>
                      <Badge variant="outline">{row.missed} missed</Badge>
                    </div>
                  </div>
                  <div className="text-sm text-muted-foreground mt-2">{row.minutes} minutes recorded</div>
                </div>
              ))
            )}
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center gap-2">
            <AlertTriangle className={cn("h-4 w-4", missedAlerts.length > 0 ? "text-destructive" : "text-primary")} />
            <h2 className="font-display text-lg text-foreground">Missed lesson alerts</h2>
          </div>
          <div className="space-y-3 mt-4">
            {missedAlerts.length === 0 ? (
              <div className="rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
                No missed-lesson alerts right now.
              </div>
            ) : (
              missedAlerts.map((alert) => (
                <div key={alert.id} className="rounded-xl border border-destructive/25 bg-destructive/5 px-4 py-3">
                  <div className="font-medium text-foreground">{alert.title}</div>
                  <div className="text-sm text-muted-foreground mt-1">{alert.subtitle}</div>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>

      <div className="text-xs text-muted-foreground">
        Current workspace role: <span className="font-medium text-foreground">{profileRole ?? "student"}</span>. Perspective switching is enabled here so you can preview teacher, admin, and student analytics flows inside the same prototype.
      </div>
    </div>
  );
}
