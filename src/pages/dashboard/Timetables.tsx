import { useEffect, useMemo, useState } from "react";
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
    </div>
  );
}
