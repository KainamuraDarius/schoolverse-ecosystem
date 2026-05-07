import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Activity, Plus, Play, Square, CheckCircle2, XCircle, Trash2 } from "lucide-react";

type Status = "scheduled" | "attended" | "missed" | "late";
type Session = {
  id: string;
  user_id: string;
  subject_id: string | null;
  title: string;
  status: Status;
  scheduled_at: string;
  started_at: string | null;
  ended_at: string | null;
  duration_minutes: number | null;
  notes: string | null;
};
type Subject = { id: string; name: string };

const STATUS_VARIANTS: Record<Status, string> = {
  scheduled: "bg-muted text-muted-foreground",
  attended: "bg-primary/15 text-primary",
  missed: "bg-destructive/15 text-destructive",
  late: "bg-accent/30 text-foreground",
};

export default function MonitorPage() {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: "Lesson", subject_id: "", scheduled_at: new Date().toISOString().slice(0, 16) });

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [{ data: s }, { data: sub }] = await Promise.all([
        supabase.from("lesson_sessions").select("*").order("scheduled_at", { ascending: false }),
        supabase.from("subjects").select("id,name"),
      ]);
      setSessions((s ?? []) as Session[]);
      setSubjects((sub ?? []) as Subject[]);
    })();
  }, [user]);

  const stats = useMemo(() => {
    const total = sessions.length;
    const attended = sessions.filter((s) => s.status === "attended").length;
    const missed = sessions.filter((s) => s.status === "missed").length;
    const totalMin = sessions.reduce((sum, s) => sum + (s.duration_minutes ?? 0), 0);
    return { total, attended, missed, totalMin, rate: total ? Math.round((attended / total) * 100) : 0 };
  }, [sessions]);

  const create = async () => {
    if (!user) return;
    const { data, error } = await supabase.from("lesson_sessions").insert({
      user_id: user.id,
      title: form.title || "Lesson",
      subject_id: form.subject_id || null,
      scheduled_at: new Date(form.scheduled_at).toISOString(),
    }).select().single();
    if (error) return toast.error(error.message);
    setSessions((p) => [data as Session, ...p]);
    setOpen(false);
  };

  const update = async (id: string, partial: Partial<Session>) => {
    setSessions((p) => p.map((s) => (s.id === id ? { ...s, ...partial } : s)));
    const { error } = await supabase.from("lesson_sessions").update(partial as any).eq("id", id);
    if (error) toast.error(error.message);
  };

  const start = (s: Session) => update(s.id, { started_at: new Date().toISOString(), status: "attended" });
  const stop = (s: Session) => {
    const end = new Date();
    const startTime = s.started_at ? new Date(s.started_at) : end;
    const min = Math.max(1, Math.round((end.getTime() - startTime.getTime()) / 60000));
    update(s.id, { ended_at: end.toISOString(), duration_minutes: min });
  };
  const mark = (s: Session, status: Status) => update(s.id, { status });

  const remove = async (id: string) => {
    const { error } = await supabase.from("lesson_sessions").delete().eq("id", id);
    if (error) return toast.error(error.message);
    setSessions((p) => p.filter((s) => s.id !== id));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold text-primary flex items-center gap-2">
            <Activity className="h-7 w-7" /> iSchool Monitor
          </h1>
          <p className="text-muted-foreground">Track lesson attendance, time on task, and effectiveness.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" /> Log session</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>New lesson session</DialogTitle></DialogHeader>
            <div className="grid gap-3">
              <div><Label>Title</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
              <div>
                <Label>Subject</Label>
                <Select value={form.subject_id} onValueChange={(v) => setForm({ ...form, subject_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Optional" /></SelectTrigger>
                  <SelectContent>{subjects.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Scheduled</Label><Input type="datetime-local" value={form.scheduled_at} onChange={(e) => setForm({ ...form, scheduled_at: e.target.value })} /></div>
            </div>
            <DialogFooter><Button onClick={create}>Save</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4"><div className="text-xs text-muted-foreground">Total sessions</div><div className="text-3xl font-bold text-primary">{stats.total}</div></Card>
        <Card className="p-4"><div className="text-xs text-muted-foreground">Attended</div><div className="text-3xl font-bold text-primary">{stats.attended}</div></Card>
        <Card className="p-4"><div className="text-xs text-muted-foreground">Missed</div><div className="text-3xl font-bold text-destructive">{stats.missed}</div></Card>
        <Card className="p-4"><div className="text-xs text-muted-foreground">Attendance rate</div><div className="text-3xl font-bold text-primary">{stats.rate}%</div><div className="text-xs text-muted-foreground mt-1">{stats.totalMin} min total</div></Card>
      </div>

      <Card className="divide-y">
        {sessions.length === 0 && <div className="p-8 text-center text-muted-foreground">No sessions yet. Log one to get started.</div>}
        {sessions.map((s) => (
          <div key={s.id} className="p-4 flex items-center gap-3 flex-wrap">
            <div className="flex-1 min-w-[200px]">
              <div className="font-semibold text-primary">{s.title}</div>
              <div className="text-xs text-muted-foreground">{new Date(s.scheduled_at).toLocaleString()}{s.duration_minutes ? ` · ${s.duration_minutes} min` : ""}</div>
            </div>
            <Badge className={STATUS_VARIANTS[s.status]}>{s.status}</Badge>
            {!s.started_at && <Button size="sm" variant="outline" onClick={() => start(s)}><Play className="h-3 w-3 mr-1" /> Start</Button>}
            {s.started_at && !s.ended_at && <Button size="sm" variant="outline" onClick={() => stop(s)}><Square className="h-3 w-3 mr-1" /> Stop</Button>}
            <Button size="sm" variant="ghost" onClick={() => mark(s, "attended")}><CheckCircle2 className="h-4 w-4" /></Button>
            <Button size="sm" variant="ghost" onClick={() => mark(s, "missed")}><XCircle className="h-4 w-4 text-destructive" /></Button>
            <Button size="sm" variant="ghost" onClick={() => remove(s.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
          </div>
        ))}
      </Card>
    </div>
  );
}
