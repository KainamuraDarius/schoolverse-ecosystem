import { useEffect, useMemo, useState } from "react";
<<<<<<< HEAD
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Trash2, CalendarRange, AlertTriangle, CalendarPlus } from "lucide-react";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
// day_of_week stored Sun=0..Sat=6; UI columns Mon..Sun map to dow values
const UI_TO_DOW = [1, 2, 3, 4, 5, 6, 0];
const HOURS = Array.from({ length: 12 }, (_, i) => 7 + i);

type Entry = {
  id: string;
  user_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  subject_id: string | null;
  title: string;
  teacher: string | null;
  class_name: string | null;
  room: string | null;
  color: string;
};

type Subject = { id: string; name: string; color: string };

const toMin = (t: string) => {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
};

export default function TimetablesPage() {
  const { user } = useAuth();
  const [entries, setEntries] = useState<Entry[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [open, setOpen] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [form, setForm] = useState({
    day_of_week: 1,
    start_time: "08:00",
    end_time: "09:00",
    title: "Lesson",
    subject_id: "",
    teacher: "",
    class_name: "",
    room: "",
  });

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [{ data: e }, { data: s }] = await Promise.all([
        supabase.from("timetable_entries").select("*").order("start_time"),
        supabase.from("subjects").select("id,name,color"),
      ]);
      setEntries((e ?? []) as Entry[]);
      setSubjects((s ?? []) as Subject[]);
    })();
  }, [user]);

  // Conflict detection: per day, find entries whose time ranges overlap
  const conflictIds = useMemo(() => {
    const ids = new Set<string>();
    const byDay: Record<number, Entry[]> = {};
    entries.forEach((e) => {
      (byDay[e.day_of_week] ??= []).push(e);
    });
    Object.values(byDay).forEach((list) => {
      for (let i = 0; i < list.length; i++) {
        for (let j = i + 1; j < list.length; j++) {
          const a = list[i], b = list[j];
          if (toMin(a.start_time) < toMin(b.end_time) && toMin(b.start_time) < toMin(a.end_time)) {
            ids.add(a.id); ids.add(b.id);
          }
        }
      }
    });
    return ids;
  }, [entries]);

  const byDay = useMemo(() => {
    const map: Record<number, Entry[]> = {};
    DAYS.forEach((_, i) => (map[UI_TO_DOW[i]] = []));
    entries.forEach((e) => map[e.day_of_week]?.push(e));
    return map;
  }, [entries]);

  const create = async () => {
    if (!user) return;
    const payload = {
      user_id: user.id,
      day_of_week: form.day_of_week,
      start_time: form.start_time,
      end_time: form.end_time,
      title: form.title || "Lesson",
      subject_id: form.subject_id || null,
      teacher: form.teacher || null,
      class_name: form.class_name || null,
      room: form.room || null,
    };
    const { data, error } = await supabase.from("timetable_entries").insert(payload).select().single();
    if (error) return toast.error(error.message);
    setEntries((p) => [...p, data as Entry]);
    setOpen(false);
    toast.success("Slot added");
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("timetable_entries").delete().eq("id", id);
    if (error) return toast.error(error.message);
    setEntries((p) => p.filter((e) => e.id !== id));
  };

  const syncToCalendar = async () => {
    if (!user || entries.length === 0) {
      toast.error("Add some lessons first");
      return;
    }
    setSyncing(true);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const horizon = new Date(today);
    horizon.setDate(horizon.getDate() + 28); // next 4 weeks

    const events: any[] = [];
    for (let d = new Date(today); d <= horizon; d.setDate(d.getDate() + 1)) {
      const dow = d.getDay();
      const slots = entries.filter((e) => e.day_of_week === dow);
      for (const s of slots) {
        const [sh, sm] = s.start_time.split(":").map(Number);
        const [eh, em] = s.end_time.split(":").map(Number);
        const start = new Date(d); start.setHours(sh, sm, 0, 0);
        const end = new Date(d); end.setHours(eh, em, 0, 0);
        events.push({
          user_id: user.id,
          title: s.title,
          description: [s.teacher && `Teacher: ${s.teacher}`, s.class_name && `Class: ${s.class_name}`].filter(Boolean).join("\n") || "",
          location: s.room ?? null,
          start_at: start.toISOString(),
          end_at: end.toISOString(),
          event_type: "lesson" as const,
          color: "navy",
        });
      }
    }

    if (!events.length) {
      setSyncing(false);
      toast.error("No occurrences in next 4 weeks");
      return;
    }
    const { error } = await supabase.from("events").insert(events);
    setSyncing(false);
    if (error) return toast.error(error.message);
    toast.success(`Synced ${events.length} lessons to Calendar`);
  };

  const conflictCount = conflictIds.size;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold text-primary flex items-center gap-2">
            <CalendarRange className="h-7 w-7" /> iSchool Timetables
          </h1>
          <p className="text-muted-foreground">Plan your week. Conflicts highlighted automatically.</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {conflictCount > 0 && (
            <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/30 gap-1">
              <AlertTriangle className="h-3 w-3" /> {conflictCount / 2} conflict{conflictCount / 2 > 1 ? "s" : ""}
            </Badge>
          )}
          <Button variant="outline" onClick={syncToCalendar} disabled={syncing}>
            <CalendarPlus className="h-4 w-4 mr-2" /> {syncing ? "Syncing…" : "Sync to Calendar"}
          </Button>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-2" /> New slot</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Schedule a lesson</DialogTitle></DialogHeader>
              <div className="grid gap-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Day</Label>
                    <Select value={String(form.day_of_week)} onValueChange={(v) => setForm({ ...form, day_of_week: Number(v) })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {DAYS.map((d, i) => <SelectItem key={i} value={String(UI_TO_DOW[i])}>{d}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Subject</Label>
                    <Select value={form.subject_id} onValueChange={(v) => setForm({ ...form, subject_id: v })}>
                      <SelectTrigger><SelectValue placeholder="Optional" /></SelectTrigger>
                      <SelectContent>
                        {subjects.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Start</Label><Input type="time" value={form.start_time} onChange={(e) => setForm({ ...form, start_time: e.target.value })} /></div>
                  <div><Label>End</Label><Input type="time" value={form.end_time} onChange={(e) => setForm({ ...form, end_time: e.target.value })} /></div>
                </div>
                <div><Label>Title</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
                <div className="grid grid-cols-3 gap-3">
                  <div><Label>Teacher</Label><Input value={form.teacher} onChange={(e) => setForm({ ...form, teacher: e.target.value })} /></div>
                  <div><Label>Class</Label><Input value={form.class_name} onChange={(e) => setForm({ ...form, class_name: e.target.value })} /></div>
                  <div><Label>Room</Label><Input value={form.room} onChange={(e) => setForm({ ...form, room: e.target.value })} /></div>
                </div>
              </div>
              <DialogFooter><Button onClick={create}>Save</Button></DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card className="p-4 overflow-auto">
        <div className="grid grid-cols-8 gap-2 min-w-[800px]">
          <div className="text-xs text-muted-foreground font-semibold">Time</div>
          {DAYS.map((d) => <div key={d} className="text-xs font-semibold text-primary text-center">{d}</div>)}
          {HOURS.map((h) => (
            <>
              <div key={`h-${h}`} className="text-xs text-muted-foreground py-3">{`${String(h).padStart(2, "0")}:00`}</div>
              {DAYS.map((_, di) => {
                const dow = UI_TO_DOW[di];
                const slot = byDay[dow]?.find((e) => Number(e.start_time.slice(0, 2)) === h);
                const isConflict = slot && conflictIds.has(slot.id);
                return (
                  <div key={`${di}-${h}`} className="min-h-[52px] border border-border/60 rounded-md p-1">
                    {slot && (
                      <div className={`rounded px-2 py-1 text-xs h-full flex flex-col group border ${
                        isConflict
                          ? "bg-destructive/10 border-destructive/40"
                          : "bg-primary/10 border-primary/30"
                      }`}>
                        <div className="flex items-center justify-between gap-1">
                          <span className={`font-semibold truncate ${isConflict ? "text-destructive" : "text-primary"}`}>
                            {isConflict && <AlertTriangle className="h-3 w-3 inline mr-1" />}
                            {slot.title}
                          </span>
                          <button onClick={() => remove(slot.id)} className="opacity-0 group-hover:opacity-100 transition">
                            <Trash2 className="h-3 w-3 text-destructive" />
                          </button>
                        </div>
                        <span className="text-muted-foreground truncate">{slot.start_time.slice(0, 5)}–{slot.end_time.slice(0, 5)}</span>
                        {slot.room && <span className="text-muted-foreground truncate">{slot.room}</span>}
                      </div>
                    )}
                  </div>
                );
              })}
            </>
          ))}
        </div>
      </Card>
=======
import { AlertTriangle, CalendarRange, Loader2, Plus, RefreshCcw, Save, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import {
  WEEK_DAYS,
  type GeneratedLesson,
  type ScheduleScopeType,
  type TimetableConflict,
  type TimetablePlanDraft,
  type WeekDay,
  createBlankBlockedSlot,
  createBlankClass,
  createBlankPeriod,
  createBlankSubject,
  createBlankTeacher,
  createDefaultTimetablePlan,
  createTimetableEvents,
  createTimetableLessonRows,
  filterLessonsForScope,
  generateTimetable,
  getWeekdayLabel,
  normalizeTimetablePlan,
  scopeOptions,
  serializeTimetablePlan,
} from "@/lib/timetable";

type LessonRow = {
  source_key: string;
  day_of_week: number;
  period_number: number;
  period_id: string;
  period_label: string;
  starts_at: string;
  ends_at: string;
  teacher_id: string;
  teacher_name: string;
  class_id: string;
  class_name: string;
  subject_id: string;
  subject_name: string;
  subject_code: string | null;
  subject_color: string;
  location: string | null;
};

function parseSlotList(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function formatSlotList(value: string[]) {
  return value.join(", ");
}

function mapLessonRow(row: LessonRow): GeneratedLesson {
  return {
    sourceKey: row.source_key,
    dayOfWeek: row.day_of_week as WeekDay,
    periodNumber: row.period_number,
    periodId: row.period_id,
    periodLabel: row.period_label,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    teacherId: row.teacher_id,
    teacherName: row.teacher_name,
    classId: row.class_id,
    className: row.class_name,
    subjectId: row.subject_id,
    subjectName: row.subject_name,
    subjectCode: row.subject_code ?? "",
    subjectColor: row.subject_color,
    location: row.location ?? "",
  };
}

export default function Timetables() {
  const { user } = useAuth();
  const [plan, setPlan] = useState<TimetablePlanDraft>(createDefaultTimetablePlan());
  const [lessons, setLessons] = useState<GeneratedLesson[]>([]);
  const [conflicts, setConflicts] = useState<TimetableConflict[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [gridScopeType, setGridScopeType] = useState<ScheduleScopeType>("teacher");
  const [gridScopeId, setGridScopeId] = useState<string | null>(null);
  const [weeklyTeacherLoads, setWeeklyTeacherLoads] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    (async () => {
      setLoading(true);

      const { data: planRow, error: planError } = await supabase
        .from("timetable_plans")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (planError) {
        toast.error(planError.message);
        setLoading(false);
        return;
      }

      const nextPlan = normalizeTimetablePlan(planRow);
      if (!cancelled) {
        setPlan(nextPlan);
        setGridScopeType(nextPlan.scheduleScopeType);
        setGridScopeId(nextPlan.scheduleScopeId ?? null);
      }

      if (planRow?.id) {
        const [{ data: lessonRows, error: lessonError }, generated] = await Promise.all([
          supabase
            .from("timetable_lessons")
            .select("*")
            .eq("plan_id", planRow.id)
            .order("day_of_week", { ascending: true })
            .order("period_number", { ascending: true }),
          Promise.resolve(generateTimetable(nextPlan)),
        ]);

        if (lessonError) {
          toast.error(lessonError.message);
        } else if (!cancelled) {
          setLessons((lessonRows ?? []).map((row) => mapLessonRow(row as LessonRow)));
          setConflicts(generated.conflicts);
          setWeeklyTeacherLoads(generated.loadSummary.teacherWeeklyLoads);
        }
      } else {
        const generated = generateTimetable(nextPlan);
        if (!cancelled) {
          setLessons(generated.lessons);
          setConflicts(generated.conflicts);
          setWeeklyTeacherLoads(generated.loadSummary.teacherWeeklyLoads);
        }
      }

      if (!cancelled) setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [user]);

  useEffect(() => {
    if (gridScopeType === "all") {
      setGridScopeId("all");
      return;
    }

    const options = scopeOptions(plan, gridScopeType);
    if (!options.some((option) => option.value === gridScopeId)) {
      setGridScopeId(options[0]?.value ?? null);
    }
  }, [gridScopeId, gridScopeType, plan]);

  const teachingPeriods = useMemo(
    () => [...plan.periods].sort((a, b) => a.startsAt.localeCompare(b.startsAt)),
    [plan.periods],
  );

  const visibleLessons = useMemo(() => {
    const scoped = gridScopeType === "all" ? lessons : filterLessonsForScope(lessons, gridScopeType, gridScopeId);
    return scoped.reduce<Record<string, GeneratedLesson[]>>((accumulator, lesson) => {
      const key = `${lesson.dayOfWeek}:${lesson.periodId}`;
      accumulator[key] = [...(accumulator[key] ?? []), lesson];
      return accumulator;
    }, {});
  }, [gridScopeId, gridScopeType, lessons]);

  const teacherLoadCards = useMemo(
    () =>
      plan.teachers.map((teacher) => ({
        id: teacher.id,
        name: teacher.name || teacher.code || "Teacher",
        load: weeklyTeacherLoads[teacher.id] ?? 0,
      })),
    [plan.teachers, weeklyTeacherLoads],
  );

  const scheduleScopeOptions = scopeOptions(plan, plan.scheduleScopeType);
  const gridScopeOptions = scopeOptions(plan, gridScopeType);

  const updatePlan = (updater: (current: TimetablePlanDraft) => TimetablePlanDraft) => {
    setPlan((current) => updater(current));
  };

  const persistSetup = async (nextPlan: TimetablePlanDraft) => {
    if (!user) return null;
    const { data, error } = await supabase
      .from("timetable_plans")
      .upsert(serializeTimetablePlan(nextPlan, user.id), { onConflict: "user_id" })
      .select("*")
      .single();

    if (error) {
      toast.error(error.message);
      return null;
    }

    return data;
  };

  const saveSetup = async () => {
    if (!user) return;
    setSaving(true);
    const saved = await persistSetup(plan);
    if (saved) {
      setPlan((current) => ({ ...current, id: saved.id }));
      toast.success("Timetable setup saved");
    }
    setSaving(false);
  };

  const generateAndSync = async () => {
    if (!user) return;
    setSaving(true);

    const generated = generateTimetable(plan);
    const savedPlan = await persistSetup(plan);

    if (!savedPlan) {
      setSaving(false);
      return;
    }

    const syncedPlan = { ...plan, id: savedPlan.id };
    setPlan(syncedPlan);

    const { error: clearLessonsError } = await supabase.from("timetable_lessons").delete().eq("plan_id", savedPlan.id);
    if (clearLessonsError) {
      toast.error(clearLessonsError.message);
      setSaving(false);
      return;
    }

    const lessonRows = createTimetableLessonRows(generated.lessons, savedPlan.id, user.id);
    if (lessonRows.length > 0) {
      const { error: insertLessonsError } = await supabase.from("timetable_lessons").insert(lessonRows);
      if (insertLessonsError) {
        toast.error(insertLessonsError.message);
        setSaving(false);
        return;
      }
    }

    const { error: clearEventsError } = await supabase
      .from("events")
      .delete()
      .eq("user_id", user.id)
      .eq("source_type", "timetable_lesson")
      .like("source_id", `${savedPlan.id}:%`);

    if (clearEventsError) {
      toast.error(clearEventsError.message);
      setSaving(false);
      return;
    }

    const eventRows = createTimetableEvents(generated.lessons, syncedPlan, savedPlan.id, user.id);
    if (eventRows.length > 0) {
      const { error: insertEventsError } = await supabase.from("events").insert(eventRows);
      if (insertEventsError) {
        toast.error(insertEventsError.message);
        setSaving(false);
        return;
      }
    }

    setLessons(generated.lessons);
    setConflicts(generated.conflicts);
    setWeeklyTeacherLoads(generated.loadSummary.teacherWeeklyLoads);
    setSaving(false);
    toast.success(`Generated ${generated.lessons.length} lessons and synced them to Calendar`);

    if (generated.conflicts.length > 0) {
      toast.warning(`${generated.conflicts.length} constraint issue(s) still need attention`);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center text-muted-foreground">
        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
        Loading timetable workspace…
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl md:text-3xl text-foreground flex items-center gap-2">
            <CalendarRange className="h-6 w-6 text-primary" />
            iSchool Timetables
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Build the weekly teaching grid, balance workloads, and publish personal lesson schedules into Calendar.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" onClick={() => {
            const generated = generateTimetable(plan);
            setLessons(generated.lessons);
            setConflicts(generated.conflicts);
            setWeeklyTeacherLoads(generated.loadSummary.teacherWeeklyLoads);
            toast.success("Preview refreshed");
          }}>
            <RefreshCcw className="h-4 w-4 mr-2" />
            Preview
          </Button>
          <Button variant="outline" onClick={saveSetup} disabled={saving}>
            <Save className="h-4 w-4 mr-2" />
            Save setup
          </Button>
          <Button onClick={generateAndSync} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
            Generate & sync
          </Button>
        </div>
      </header>

      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-5 border-border/60 bg-gradient-to-br from-primary/95 to-primary-glow text-primary-foreground">
          <p className="text-xs uppercase tracking-[0.25em] text-primary-foreground/70">Published scope</p>
          <div className="mt-3 text-2xl font-display">
            {plan.scheduleScopeType === "teacher"
              ? scheduleScopeOptions.find((option) => option.value === plan.scheduleScopeId)?.label ?? "Teacher schedule"
              : plan.scheduleScopeType === "class"
                ? scheduleScopeOptions.find((option) => option.value === plan.scheduleScopeId)?.label ?? "Class schedule"
                : "Whole timetable"}
          </div>
          <p className="text-sm text-primary-foreground/80 mt-2">This is the view that will flow into the user’s Calendar feed.</p>
        </Card>

        <Card className="p-5">
          <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">Conflicts</p>
          <div className="mt-3 flex items-end gap-3">
            <span className={cn("text-3xl font-display", conflicts.length > 0 ? "text-destructive" : "text-primary")}>
              {conflicts.length}
            </span>
            <span className="text-sm text-muted-foreground pb-1">open scheduling issues</span>
          </div>
          <p className="text-sm text-muted-foreground mt-2">The detector flags overlapping periods and any subject load that could not be placed safely.</p>
        </Card>

        <Card className="p-5">
          <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">Sync horizon</p>
          <div className="mt-3 text-3xl font-display text-primary">{plan.constraints.publishWeeks} weeks</div>
          <p className="text-sm text-muted-foreground mt-2">
            Lessons are expanded into real calendar events starting from {plan.constraints.termStartsOn}.
          </p>
        </Card>
      </section>

      <Tabs defaultValue="setup" className="w-full space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="setup">Setup</TabsTrigger>
          <TabsTrigger value="grid">Weekly grid</TabsTrigger>
          <TabsTrigger value="conflicts">Conflicts</TabsTrigger>
        </TabsList>

        <TabsContent value="setup" className="space-y-6">
          <Card className="p-5">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="plan-title">Plan title</Label>
                <Input
                  id="plan-title"
                  value={plan.title}
                  onChange={(event) => updatePlan((current) => ({ ...current, title: event.target.value }))}
                  placeholder="My weekly timetable"
                />
              </div>

              <div className="space-y-2">
                <Label>Calendar sync target</Label>
                <Select
                  value={plan.scheduleScopeType}
                  onValueChange={(value) =>
                    updatePlan((current) => ({
                      ...current,
                      scheduleScopeType: value as ScheduleScopeType,
                      scheduleScopeId: value === "all" ? "all" : scopeOptions(current, value as ScheduleScopeType)[0]?.value ?? null,
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="teacher">Teacher schedule</SelectItem>
                    <SelectItem value="class">Class schedule</SelectItem>
                    <SelectItem value="all">Whole timetable</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Who should receive the synced lessons?</Label>
                <Select
                  value={plan.scheduleScopeType === "all" ? "all" : plan.scheduleScopeId ?? scopeOptions(plan, plan.scheduleScopeType)[0]?.value ?? ""}
                  onValueChange={(value) =>
                    updatePlan((current) => ({
                      ...current,
                      scheduleScopeId: current.scheduleScopeType === "all" ? "all" : value,
                    }))
                  }
                  disabled={plan.scheduleScopeType === "all"}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a person or class" />
                  </SelectTrigger>
                  <SelectContent>
                    {scheduleScopeOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </Card>

          <Card className="p-5 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="font-display text-lg text-foreground">Teachers</h2>
                <p className="text-sm text-muted-foreground">Add teacher capacity and any blocked slot tokens like `1:period-1`.</p>
              </div>
              <Button
                variant="outline"
                onClick={() => updatePlan((current) => ({ ...current, teachers: [...current.teachers, createBlankTeacher()] }))}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add teacher
              </Button>
            </div>

            <div className="space-y-3">
              {plan.teachers.map((teacher) => (
                <div key={teacher.id} className="grid grid-cols-1 lg:grid-cols-[1.2fr_0.8fr_0.6fr_1.4fr_auto] gap-3 items-end rounded-xl border border-border/60 p-3">
                  <div className="space-y-1.5">
                    <Label>Name</Label>
                    <Input
                      value={teacher.name}
                      onChange={(event) =>
                        updatePlan((current) => ({
                          ...current,
                          teachers: current.teachers.map((entry) => entry.id === teacher.id ? { ...entry, name: event.target.value } : entry),
                        }))
                      }
                      placeholder="Mrs. Njoroge"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Code</Label>
                    <Input
                      value={teacher.code}
                      onChange={(event) =>
                        updatePlan((current) => ({
                          ...current,
                          teachers: current.teachers.map((entry) => entry.id === teacher.id ? { ...entry, code: event.target.value } : entry),
                        }))
                      }
                      placeholder="MAT"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Max/day</Label>
                    <Input
                      type="number"
                      min={1}
                      max={10}
                      value={teacher.maxLessonsPerDay}
                      onChange={(event) =>
                        updatePlan((current) => ({
                          ...current,
                          teachers: current.teachers.map((entry) =>
                            entry.id === teacher.id ? { ...entry, maxLessonsPerDay: Number(event.target.value) || 1 } : entry,
                          ),
                        }))
                      }
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Unavailable slots</Label>
                    <Input
                      value={formatSlotList(teacher.unavailable)}
                      onChange={(event) =>
                        updatePlan((current) => ({
                          ...current,
                          teachers: current.teachers.map((entry) =>
                            entry.id === teacher.id ? { ...entry, unavailable: parseSlotList(event.target.value) } : entry,
                          ),
                        }))
                      }
                      placeholder="1:period-1, 3:period-4"
                    />
                  </div>
                  <Button
                    variant="ghost"
                    className="text-destructive hover:text-destructive"
                    onClick={() =>
                      updatePlan((current) => ({
                        ...current,
                        teachers: current.teachers.filter((entry) => entry.id !== teacher.id),
                        subjects: current.subjects.filter((subject) => subject.teacherId !== teacher.id),
                      }))
                    }
                  >
                    Remove
                  </Button>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-5 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="font-display text-lg text-foreground">Classes & streams</h2>
                <p className="text-sm text-muted-foreground">Define the class groups that need a balanced schedule.</p>
              </div>
              <Button
                variant="outline"
                onClick={() => updatePlan((current) => ({ ...current, classes: [...current.classes, createBlankClass()] }))}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add class
              </Button>
            </div>

            <div className="space-y-3">
              {plan.classes.map((classroom) => (
                <div key={classroom.id} className="grid grid-cols-1 lg:grid-cols-[1fr_0.8fr_0.9fr_0.6fr_1.2fr_auto] gap-3 items-end rounded-xl border border-border/60 p-3">
                  <div className="space-y-1.5">
                    <Label>Class</Label>
                    <Input
                      value={classroom.name}
                      onChange={(event) =>
                        updatePlan((current) => ({
                          ...current,
                          classes: current.classes.map((entry) => entry.id === classroom.id ? { ...entry, name: event.target.value } : entry),
                        }))
                      }
                      placeholder="Junior 1"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Stream</Label>
                    <Input
                      value={classroom.stream}
                      onChange={(event) =>
                        updatePlan((current) => ({
                          ...current,
                          classes: current.classes.map((entry) => entry.id === classroom.id ? { ...entry, stream: event.target.value } : entry),
                        }))
                      }
                      placeholder="North"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Home room</Label>
                    <Input
                      value={classroom.homeRoom}
                      onChange={(event) =>
                        updatePlan((current) => ({
                          ...current,
                          classes: current.classes.map((entry) => entry.id === classroom.id ? { ...entry, homeRoom: event.target.value } : entry),
                        }))
                      }
                      placeholder="Room 12"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Max/day</Label>
                    <Input
                      type="number"
                      min={1}
                      max={10}
                      value={classroom.maxLessonsPerDay}
                      onChange={(event) =>
                        updatePlan((current) => ({
                          ...current,
                          classes: current.classes.map((entry) =>
                            entry.id === classroom.id ? { ...entry, maxLessonsPerDay: Number(event.target.value) || 1 } : entry,
                          ),
                        }))
                      }
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Unavailable slots</Label>
                    <Input
                      value={formatSlotList(classroom.unavailable)}
                      onChange={(event) =>
                        updatePlan((current) => ({
                          ...current,
                          classes: current.classes.map((entry) =>
                            entry.id === classroom.id ? { ...entry, unavailable: parseSlotList(event.target.value) } : entry,
                          ),
                        }))
                      }
                      placeholder="2:period-3"
                    />
                  </div>
                  <Button
                    variant="ghost"
                    className="text-destructive hover:text-destructive"
                    onClick={() =>
                      updatePlan((current) => ({
                        ...current,
                        classes: current.classes.filter((entry) => entry.id !== classroom.id),
                        subjects: current.subjects.filter((subject) => subject.classId !== classroom.id),
                      }))
                    }
                  >
                    Remove
                  </Button>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-5 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="font-display text-lg text-foreground">Subjects</h2>
                <p className="text-sm text-muted-foreground">Map each subject to a teacher, a class, and the number of weekly sessions.</p>
              </div>
              <Button
                variant="outline"
                onClick={() =>
                  updatePlan((current) => ({
                    ...current,
                    subjects: [...current.subjects, createBlankSubject(current.teachers[0]?.id ?? "", current.classes[0]?.id ?? "")],
                  }))
                }
                disabled={plan.teachers.length === 0 || plan.classes.length === 0}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add subject
              </Button>
            </div>

            <div className="space-y-3">
              {plan.subjects.map((subject) => (
                <div key={subject.id} className="rounded-xl border border-border/60 p-4 space-y-4">
                  <div className="grid grid-cols-1 lg:grid-cols-[1fr_0.7fr_0.9fr_0.9fr_0.5fr_0.8fr_auto] gap-3 items-end">
                    <div className="space-y-1.5">
                      <Label>Subject</Label>
                      <Input
                        value={subject.name}
                        onChange={(event) =>
                          updatePlan((current) => ({
                            ...current,
                            subjects: current.subjects.map((entry) => entry.id === subject.id ? { ...entry, name: event.target.value } : entry),
                          }))
                        }
                        placeholder="Mathematics"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Code</Label>
                      <Input
                        value={subject.code}
                        onChange={(event) =>
                          updatePlan((current) => ({
                            ...current,
                            subjects: current.subjects.map((entry) => entry.id === subject.id ? { ...entry, code: event.target.value } : entry),
                          }))
                        }
                        placeholder="MAT"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Teacher</Label>
                      <Select
                        value={subject.teacherId}
                        onValueChange={(value) =>
                          updatePlan((current) => ({
                            ...current,
                            subjects: current.subjects.map((entry) => entry.id === subject.id ? { ...entry, teacherId: value } : entry),
                          }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {plan.teachers.map((teacher) => (
                            <SelectItem key={teacher.id} value={teacher.id}>
                              {teacher.name || teacher.code || "Teacher"}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label>Class</Label>
                      <Select
                        value={subject.classId}
                        onValueChange={(value) =>
                          updatePlan((current) => ({
                            ...current,
                            subjects: current.subjects.map((entry) => entry.id === subject.id ? { ...entry, classId: value } : entry),
                          }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {plan.classes.map((classroom) => (
                            <SelectItem key={classroom.id} value={classroom.id}>
                              {`${classroom.name} ${classroom.stream}`.trim()}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label>Sessions</Label>
                      <Input
                        type="number"
                        min={1}
                        max={10}
                        value={subject.sessionsPerWeek}
                        onChange={(event) =>
                          updatePlan((current) => ({
                            ...current,
                            subjects: current.subjects.map((entry) =>
                              entry.id === subject.id ? { ...entry, sessionsPerWeek: Number(event.target.value) || 1 } : entry,
                            ),
                          }))
                        }
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Location</Label>
                      <Input
                        value={subject.location}
                        onChange={(event) =>
                          updatePlan((current) => ({
                            ...current,
                            subjects: current.subjects.map((entry) => entry.id === subject.id ? { ...entry, location: event.target.value } : entry),
                          }))
                        }
                        placeholder="Lab 1"
                      />
                    </div>
                    <Button
                      variant="ghost"
                      className="text-destructive hover:text-destructive"
                      onClick={() =>
                        updatePlan((current) => ({
                          ...current,
                          subjects: current.subjects.filter((entry) => entry.id !== subject.id),
                        }))
                      }
                    >
                      Remove
                    </Button>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm text-muted-foreground mr-2">Preferred days</span>
                    {WEEK_DAYS.filter((day) => plan.constraints.workingDays.includes(day.value)).map((day) => {
                      const active = subject.preferredDays.includes(day.value);
                      return (
                        <Button
                          key={day.value}
                          type="button"
                          size="sm"
                          variant={active ? "default" : "outline"}
                          onClick={() =>
                            updatePlan((current) => ({
                              ...current,
                              subjects: current.subjects.map((entry) =>
                                entry.id !== subject.id
                                  ? entry
                                  : {
                                      ...entry,
                                      preferredDays: active
                                        ? entry.preferredDays.filter((item) => item !== day.value)
                                        : [...entry.preferredDays, day.value].sort(),
                                    },
                              ),
                            }))
                          }
                        >
                          {day.label}
                        </Button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <div className="grid grid-cols-1 xl:grid-cols-[1.1fr_0.9fr] gap-6">
            <Card className="p-5 space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="font-display text-lg text-foreground">Periods</h2>
                  <p className="text-sm text-muted-foreground">Define the repeated daily periods used across the week.</p>
                </div>
                <Button
                  variant="outline"
                  onClick={() => updatePlan((current) => ({ ...current, periods: [...current.periods, createBlankPeriod(current.periods.length)] }))}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add period
                </Button>
              </div>

              <div className="space-y-3">
                {plan.periods.map((period, index) => (
                  <div key={period.id} className="grid grid-cols-1 md:grid-cols-[1fr_0.8fr_0.8fr_auto_auto] gap-3 items-end rounded-xl border border-border/60 p-3">
                    <div className="space-y-1.5">
                      <Label>Label</Label>
                      <Input
                        value={period.label}
                        onChange={(event) =>
                          updatePlan((current) => ({
                            ...current,
                            periods: current.periods.map((entry) => entry.id === period.id ? { ...entry, label: event.target.value } : entry),
                          }))
                        }
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Starts</Label>
                      <Input
                        type="time"
                        value={period.startsAt}
                        onChange={(event) =>
                          updatePlan((current) => ({
                            ...current,
                            periods: current.periods.map((entry) => entry.id === period.id ? { ...entry, startsAt: event.target.value } : entry),
                          }))
                        }
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Ends</Label>
                      <Input
                        type="time"
                        value={period.endsAt}
                        onChange={(event) =>
                          updatePlan((current) => ({
                            ...current,
                            periods: current.periods.map((entry) => entry.id === period.id ? { ...entry, endsAt: event.target.value } : entry),
                          }))
                        }
                      />
                    </div>
                    <div className="flex items-center gap-2 pb-2">
                      <Switch
                        checked={period.isBreak}
                        onCheckedChange={(checked) =>
                          updatePlan((current) => ({
                            ...current,
                            periods: current.periods.map((entry) => entry.id === period.id ? { ...entry, isBreak: checked } : entry),
                          }))
                        }
                      />
                      <span className="text-sm text-muted-foreground">Break</span>
                    </div>
                    <Button
                      variant="ghost"
                      className="text-destructive hover:text-destructive"
                      onClick={() =>
                        updatePlan((current) => ({
                          ...current,
                          periods: current.periods.filter((entry) => entry.id !== period.id),
                          constraints: {
                            ...current.constraints,
                            blockedSlots: current.constraints.blockedSlots.filter((slot) => slot.periodId !== period.id),
                          },
                        }))
                      }
                    >
                      Remove
                    </Button>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="p-5 space-y-4">
              <div>
                <h2 className="font-display text-lg text-foreground">Constraints</h2>
                <p className="text-sm text-muted-foreground">Tune the balancing rules and block out special slots.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Term starts on</Label>
                  <Input
                    type="date"
                    value={plan.constraints.termStartsOn}
                    onChange={(event) =>
                      updatePlan((current) => ({
                        ...current,
                        constraints: { ...current.constraints, termStartsOn: event.target.value },
                      }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Weeks to publish</Label>
                  <Input
                    type="number"
                    min={1}
                    max={12}
                    value={plan.constraints.publishWeeks}
                    onChange={(event) =>
                      updatePlan((current) => ({
                        ...current,
                        constraints: { ...current.constraints, publishWeeks: Number(event.target.value) || 1 },
                      }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Teacher max/day</Label>
                  <Input
                    type="number"
                    min={1}
                    max={10}
                    value={plan.constraints.maxTeacherLessonsPerDay}
                    onChange={(event) =>
                      updatePlan((current) => ({
                        ...current,
                        constraints: { ...current.constraints, maxTeacherLessonsPerDay: Number(event.target.value) || 1 },
                      }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Class max/day</Label>
                  <Input
                    type="number"
                    min={1}
                    max={10}
                    value={plan.constraints.maxClassLessonsPerDay}
                    onChange={(event) =>
                      updatePlan((current) => ({
                        ...current,
                        constraints: { ...current.constraints, maxClassLessonsPerDay: Number(event.target.value) || 1 },
                      }))
                    }
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Working days</Label>
                <div className="flex flex-wrap gap-2">
                  {WEEK_DAYS.map((day) => {
                    const active = plan.constraints.workingDays.includes(day.value);
                    return (
                      <Button
                        key={day.value}
                        type="button"
                        size="sm"
                        variant={active ? "default" : "outline"}
                        onClick={() =>
                          updatePlan((current) => ({
                            ...current,
                            constraints: {
                              ...current.constraints,
                              workingDays: active
                                ? current.constraints.workingDays.filter((value) => value !== day.value)
                                : [...current.constraints.workingDays, day.value].sort(),
                            },
                          }))
                        }
                      >
                        {day.label}
                      </Button>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-between rounded-xl border border-border/60 px-4 py-3">
                <div>
                  <div className="font-medium text-foreground">Avoid back-to-back repeats</div>
                  <p className="text-sm text-muted-foreground">Spread the same subject across the week instead of clustering it.</p>
                </div>
                <Switch
                  checked={plan.constraints.avoidConsecutiveSameSubject}
                  onCheckedChange={(checked) =>
                    updatePlan((current) => ({
                      ...current,
                      constraints: { ...current.constraints, avoidConsecutiveSameSubject: checked },
                    }))
                  }
                />
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Blocked slots</Label>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      updatePlan((current) => ({
                        ...current,
                        constraints: {
                          ...current.constraints,
                          blockedSlots: [...current.constraints.blockedSlots, createBlankBlockedSlot(current.periods[0]?.id ?? "")],
                        },
                      }))
                    }
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add blocked slot
                  </Button>
                </div>

                {plan.constraints.blockedSlots.length === 0 && (
                  <div className="text-sm text-muted-foreground rounded-xl border border-dashed border-border p-4">
                    No blocked slots yet. Add assemblies, clubs, labs, or fixed events here.
                  </div>
                )}

                {plan.constraints.blockedSlots.map((blocked) => (
                  <div key={blocked.id} className="grid grid-cols-1 md:grid-cols-[0.8fr_1fr_1.4fr_auto] gap-3 items-end rounded-xl border border-border/60 p-3">
                    <div className="space-y-1.5">
                      <Label>Day</Label>
                      <Select
                        value={String(blocked.day)}
                        onValueChange={(value) =>
                          updatePlan((current) => ({
                            ...current,
                            constraints: {
                              ...current.constraints,
                              blockedSlots: current.constraints.blockedSlots.map((entry) =>
                                entry.id === blocked.id ? { ...entry, day: Number(value) as WeekDay } : entry,
                              ),
                            },
                          }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {WEEK_DAYS.map((day) => (
                            <SelectItem key={day.value} value={String(day.value)}>
                              {day.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1.5">
                      <Label>Period</Label>
                      <Select
                        value={blocked.periodId}
                        onValueChange={(value) =>
                          updatePlan((current) => ({
                            ...current,
                            constraints: {
                              ...current.constraints,
                              blockedSlots: current.constraints.blockedSlots.map((entry) =>
                                entry.id === blocked.id ? { ...entry, periodId: value } : entry,
                              ),
                            },
                          }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {plan.periods.map((period) => (
                            <SelectItem key={period.id} value={period.id}>
                              {period.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1.5">
                      <Label>Reason</Label>
                      <Input
                        value={blocked.reason}
                        onChange={(event) =>
                          updatePlan((current) => ({
                            ...current,
                            constraints: {
                              ...current.constraints,
                              blockedSlots: current.constraints.blockedSlots.map((entry) =>
                                entry.id === blocked.id ? { ...entry, reason: event.target.value } : entry,
                              ),
                            },
                          }))
                        }
                        placeholder="Assembly"
                      />
                    </div>

                    <Button
                      variant="ghost"
                      className="text-destructive hover:text-destructive"
                      onClick={() =>
                        updatePlan((current) => ({
                          ...current,
                          constraints: {
                            ...current.constraints,
                            blockedSlots: current.constraints.blockedSlots.filter((entry) => entry.id !== blocked.id),
                          },
                        }))
                      }
                    >
                      Remove
                    </Button>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="grid" className="space-y-6">
          <Card className="p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-display text-lg text-foreground">Weekly timetable grid</h2>
                <p className="text-sm text-muted-foreground">Review the generated week by day and period.</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Select value={gridScopeType} onValueChange={(value) => setGridScopeType(value as ScheduleScopeType)}>
                  <SelectTrigger className="w-[170px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="teacher">Teacher view</SelectItem>
                    <SelectItem value="class">Class view</SelectItem>
                    <SelectItem value="all">Whole school</SelectItem>
                  </SelectContent>
                </Select>

                <Select
                  value={gridScopeType === "all" ? "all" : gridScopeId ?? gridScopeOptions[0]?.value ?? ""}
                  onValueChange={(value) => setGridScopeId(value)}
                  disabled={gridScopeType === "all"}
                >
                  <SelectTrigger className="w-[220px]">
                    <SelectValue placeholder="Choose a schedule" />
                  </SelectTrigger>
                  <SelectContent>
                    {gridScopeOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <ScrollArea className="mt-5 w-full rounded-xl border border-border/60">
              <div className="min-w-[860px]">
                <div className="grid grid-cols-[160px_repeat(7,minmax(120px,1fr))]">
                  <div className="border-b border-r border-border bg-secondary/60 p-4 text-sm font-medium text-muted-foreground">Period</div>
                  {WEEK_DAYS.map((day) => (
                    <div key={day.value} className="border-b border-r border-border bg-secondary/60 p-4 text-sm font-medium text-foreground">
                      {day.label}
                    </div>
                  ))}

                  {teachingPeriods.map((period) => (
                    <div key={period.id} className="contents">
                      <div key={`${period.id}-meta`} className="border-b border-r border-border bg-card p-4">
                        <div className="font-medium text-foreground">{period.label}</div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {period.startsAt} - {period.endsAt}
                        </div>
                        {period.isBreak && <Badge variant="outline" className="mt-2">Break</Badge>}
                      </div>

                      {WEEK_DAYS.map((day) => {
                        const cellLessons = visibleLessons[`${day.value}:${period.id}`] ?? [];
                        const blocked = plan.constraints.blockedSlots.find((slot) => slot.day === day.value && slot.periodId === period.id);
                        const isWorkingDay = plan.constraints.workingDays.includes(day.value);
                        return (
                          <div
                            key={`${period.id}-${day.value}`}
                            className={cn(
                              "border-b border-r border-border min-h-[112px] p-3 space-y-2",
                              !isWorkingDay && "bg-muted/30",
                              blocked && "bg-destructive/5",
                              period.isBreak && "bg-secondary/40",
                            )}
                          >
                            {blocked && (
                              <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-2 py-1 text-xs text-destructive">
                                {blocked.reason}
                              </div>
                            )}

                            {!blocked && cellLessons.length === 0 && !period.isBreak && isWorkingDay && (
                              <div className="text-xs text-muted-foreground">Open slot</div>
                            )}

                            {period.isBreak && !blocked && (
                              <div className="text-xs text-muted-foreground">Break time</div>
                            )}

                            {cellLessons.map((lesson) => (
                              <div
                                key={lesson.sourceKey}
                                className={cn(
                                  "rounded-xl border px-3 py-2 shadow-sm",
                                  lesson.subjectColor === "gold" && "bg-accent/20 border-accent/40",
                                  lesson.subjectColor === "sage" && "bg-emerald-100/70 border-emerald-300",
                                  lesson.subjectColor === "rose" && "bg-destructive/10 border-destructive/20",
                                  lesson.subjectColor === "navy" && "bg-primary/10 border-primary/20",
                                  !["gold", "sage", "rose", "navy"].includes(lesson.subjectColor) && "bg-card",
                                )}
                              >
                                <div className="font-medium text-sm text-foreground">{lesson.subjectName}</div>
                                <div className="text-xs text-muted-foreground mt-1">{lesson.teacherName}</div>
                                <div className="text-xs text-muted-foreground">{lesson.className}</div>
                                {lesson.location && <div className="text-xs text-muted-foreground mt-1">{lesson.location}</div>}
                              </div>
                            ))}
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
            </ScrollArea>
          </Card>

          <Card className="p-5">
            <h2 className="font-display text-lg text-foreground">Teacher workload balance</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 mt-4">
              {teacherLoadCards.map((entry) => (
                <div key={entry.id} className="rounded-xl border border-border/60 bg-card px-4 py-3">
                  <div className="font-medium text-foreground">{entry.name}</div>
                  <div className="text-2xl font-display text-primary mt-2">{entry.load}</div>
                  <div className="text-xs text-muted-foreground">scheduled lessons this week</div>
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="conflicts" className="space-y-4">
          <Card className="p-5">
            <div className="flex items-center gap-2">
              <AlertTriangle className={cn("h-5 w-5", conflicts.length > 0 ? "text-destructive" : "text-primary")} />
              <h2 className="font-display text-lg text-foreground">Conflict detector</h2>
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              These issues are blocking a fully conflict-free schedule. Resolve them, then regenerate to publish a clean calendar.
            </p>

            <div className="mt-4 space-y-3">
              {conflicts.length === 0 ? (
                <div className="rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
                  No conflicts detected in the current timetable preview.
                </div>
              ) : (
                conflicts.map((conflict) => (
                  <div key={conflict.id} className="rounded-xl border border-destructive/25 bg-destructive/5 px-4 py-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="destructive">Attention</Badge>
                      {conflict.dayOfWeek && <Badge variant="outline">{getWeekdayLabel(conflict.dayOfWeek)}</Badge>}
                    </div>
                    <p className="text-sm text-foreground mt-2">{conflict.reason}</p>
                  </div>
                ))
              )}
            </div>
          </Card>
        </TabsContent>
      </Tabs>
>>>>>>> df6fcd8 (feat: add timetable and whiteboard modules with associated policies and triggers)
    </div>
  );
}
