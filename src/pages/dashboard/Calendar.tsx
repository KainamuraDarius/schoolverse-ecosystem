import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { ChevronLeft, ChevronRight, Plus, Trash2, MapPin, Calendar as CalIcon } from "lucide-react";
import { toast } from "sonner";

type EventType = "lesson" | "assignment" | "exam" | "meeting" | "other";
type EventRow = {
  id: string;
  user_id: string;
  title: string;
  description: string;
  event_type: EventType;
  start_at: string;
  end_at: string;
  all_day: boolean;
  location: string | null;
  color: string;
};

const TYPE_STYLES: Record<EventType, string> = {
  lesson: "bg-primary/15 text-primary border-primary/30",
  assignment: "bg-accent/20 text-accent-foreground border-accent/40",
  exam: "bg-destructive/15 text-destructive border-destructive/30",
  meeting: "bg-secondary text-secondary-foreground border-border",
  other: "bg-muted text-muted-foreground border-border",
};

function startOfMonth(d: Date) { return new Date(d.getFullYear(), d.getMonth(), 1); }
function addMonths(d: Date, n: number) { return new Date(d.getFullYear(), d.getMonth() + n, 1); }
function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}
function toLocalInput(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function CalendarModule() {
  const { user } = useAuth();
  const [cursor, setCursor] = useState(() => startOfMonth(new Date()));
  const [events, setEvents] = useState<EventRow[]>([]);
  const [selected, setSelected] = useState<Date>(new Date());
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<EventRow | null>(null);

  const monthStart = cursor;
  const monthEnd = addMonths(cursor, 1);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("events")
      .select("*")
      .gte("start_at", new Date(monthStart.getFullYear(), monthStart.getMonth() - 1, 1).toISOString())
      .lt("start_at", new Date(monthEnd.getFullYear(), monthEnd.getMonth() + 1, 1).toISOString())
      .order("start_at", { ascending: true })
      .then(({ data, error }) => {
        if (error) toast.error(error.message);
        else setEvents((data ?? []) as EventRow[]);
      });
  }, [user, cursor]);

  const grid = useMemo(() => {
    const first = startOfMonth(cursor);
    const startWeekday = first.getDay();
    const daysInMonth = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate();
    const cells: { date: Date; inMonth: boolean }[] = [];
    for (let i = 0; i < startWeekday; i++) {
      const d = new Date(first); d.setDate(d.getDate() - (startWeekday - i));
      cells.push({ date: d, inMonth: false });
    }
    for (let i = 1; i <= daysInMonth; i++) {
      cells.push({ date: new Date(cursor.getFullYear(), cursor.getMonth(), i), inMonth: true });
    }
    while (cells.length % 7 !== 0) {
      const last = cells[cells.length - 1].date;
      const d = new Date(last); d.setDate(d.getDate() + 1);
      cells.push({ date: d, inMonth: false });
    }
    return cells;
  }, [cursor]);

  const eventsForDay = (d: Date) => events.filter(e => sameDay(new Date(e.start_at), d));
  const selectedEvents = eventsForDay(selected).sort((a, b) => a.start_at.localeCompare(b.start_at));

  const openNew = (date?: Date) => {
    const base = date ?? selected;
    const start = new Date(base); start.setHours(9, 0, 0, 0);
    const end = new Date(base); end.setHours(10, 0, 0, 0);
    setEditing({
      id: "", user_id: user?.id ?? "", title: "", description: "",
      event_type: "lesson", start_at: start.toISOString(), end_at: end.toISOString(),
      all_day: false, location: "", color: "navy",
    });
    setOpen(true);
  };

  const openEdit = (e: EventRow) => { setEditing(e); setOpen(true); };

  const save = async () => {
    if (!editing || !user) return;
    if (new Date(editing.end_at) < new Date(editing.start_at)) {
      toast.error("End time must be after start time"); return;
    }
    if (editing.id) {
      const { error } = await supabase.from("events").update({
        title: editing.title || "Untitled event",
        description: editing.description,
        event_type: editing.event_type,
        start_at: editing.start_at,
        end_at: editing.end_at,
        all_day: editing.all_day,
        location: editing.location,
      }).eq("id", editing.id);
      if (error) return toast.error(error.message);
      setEvents(evs => evs.map(e => e.id === editing.id ? { ...e, ...editing } : e));
    } else {
      const { data, error } = await supabase.from("events").insert({
        user_id: user.id,
        title: editing.title || "Untitled event",
        description: editing.description,
        event_type: editing.event_type,
        start_at: editing.start_at,
        end_at: editing.end_at,
        all_day: editing.all_day,
        location: editing.location,
      }).select().single();
      if (error) return toast.error(error.message);
      setEvents(evs => [...evs, data as EventRow]);
    }
    setOpen(false); setEditing(null);
    toast.success("Saved");
  };

  const remove = async () => {
    if (!editing?.id) return;
    const { error } = await supabase.from("events").delete().eq("id", editing.id);
    if (error) return toast.error(error.message);
    setEvents(evs => evs.filter(e => e.id !== editing.id));
    setOpen(false); setEditing(null);
    toast.success("Deleted");
  };

  const monthLabel = cursor.toLocaleString(undefined, { month: "long", year: "numeric" });

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl md:text-3xl text-foreground">iSchool Calendar</h1>
          <p className="text-sm text-muted-foreground">Lessons, assignments, exams & meetings — all in one view.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => setCursor(addMonths(cursor, -1))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="font-display min-w-[10rem] text-center">{monthLabel}</div>
          <Button variant="outline" size="icon" onClick={() => setCursor(addMonths(cursor, 1))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button variant="outline" onClick={() => { const t = new Date(); setCursor(startOfMonth(t)); setSelected(t); }}>
            Today
          </Button>
          <Button onClick={() => openNew()}>
            <Plus className="h-4 w-4 mr-1" /> New event
          </Button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
        <Card className="p-3">
          <div className="grid grid-cols-7 text-xs font-medium text-muted-foreground mb-2">
            {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map(d => (
              <div key={d} className="px-2 py-1">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {grid.map(({ date, inMonth }, i) => {
              const dayEvents = eventsForDay(date);
              const isSelected = sameDay(date, selected);
              const isToday = sameDay(date, new Date());
              return (
                <button
                  key={i}
                  onClick={() => setSelected(date)}
                  onDoubleClick={() => openNew(date)}
                  className={[
                    "min-h-[88px] text-left rounded-md border p-1.5 transition-colors",
                    inMonth ? "bg-card" : "bg-muted/30",
                    isSelected ? "border-primary ring-2 ring-primary/30" : "border-border",
                  ].join(" ")}
                >
                  <div className={[
                    "text-xs font-medium mb-1 inline-flex items-center justify-center h-5 min-w-5 px-1 rounded",
                    isToday ? "bg-accent text-accent-foreground" : inMonth ? "text-foreground" : "text-muted-foreground",
                  ].join(" ")}>
                    {date.getDate()}
                  </div>
                  <div className="space-y-1">
                    {dayEvents.slice(0, 3).map(e => (
                      <div
                        key={e.id}
                        className={`truncate text-[11px] px-1.5 py-0.5 rounded border ${TYPE_STYLES[e.event_type]}`}
                      >
                        {e.title}
                      </div>
                    ))}
                    {dayEvents.length > 3 && (
                      <div className="text-[10px] text-muted-foreground">+{dayEvents.length - 3} more</div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </Card>

        <Card className="p-4 h-fit">
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="text-xs uppercase tracking-wider text-muted-foreground">Selected</div>
              <div className="font-display text-lg">
                {selected.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}
              </div>
            </div>
            <Button size="sm" variant="outline" onClick={() => openNew(selected)}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          {selectedEvents.length === 0 ? (
            <div className="text-sm text-muted-foreground py-8 text-center flex flex-col items-center gap-2">
              <CalIcon className="h-6 w-6 opacity-50" />
              No events. Double-click a day or click +.
            </div>
          ) : (
            <ul className="space-y-2">
              {selectedEvents.map(e => (
                <li key={e.id}>
                  <button
                    onClick={() => openEdit(e)}
                    className="w-full text-left p-3 rounded-md border border-border hover:bg-muted/40 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="font-medium text-sm">{e.title}</div>
                      <Badge variant="outline" className={TYPE_STYLES[e.event_type]}>
                        {e.event_type}
                      </Badge>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {e.all_day ? "All day" : `${new Date(e.start_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} – ${new Date(e.end_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`}
                    </div>
                    {e.location && (
                      <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                        <MapPin className="h-3 w-3" /> {e.location}
                      </div>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setEditing(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing?.id ? "Edit event" : "New event"}</DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label>Title</Label>
                <Input
                  value={editing.title}
                  onChange={(e) => setEditing({ ...editing, title: e.target.value })}
                  placeholder="Maths — Algebra recap"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Type</Label>
                  <Select value={editing.event_type} onValueChange={(v) => setEditing({ ...editing, event_type: v as EventType })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="lesson">Lesson</SelectItem>
                      <SelectItem value="assignment">Assignment</SelectItem>
                      <SelectItem value="exam">Exam</SelectItem>
                      <SelectItem value="meeting">Meeting</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Location</Label>
                  <Input
                    value={editing.location ?? ""}
                    onChange={(e) => setEditing({ ...editing, location: e.target.value })}
                    placeholder="Room 12"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Start</Label>
                  <Input
                    type="datetime-local"
                    value={toLocalInput(editing.start_at)}
                    onChange={(e) => setEditing({ ...editing, start_at: new Date(e.target.value).toISOString() })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>End</Label>
                  <Input
                    type="datetime-local"
                    value={toLocalInput(editing.end_at)}
                    onChange={(e) => setEditing({ ...editing, end_at: new Date(e.target.value).toISOString() })}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Notes</Label>
                <Textarea
                  rows={3}
                  value={editing.description}
                  onChange={(e) => setEditing({ ...editing, description: e.target.value })}
                  placeholder="Agenda, materials, links…"
                />
              </div>
            </div>
          )}
          <DialogFooter className="gap-2 sm:justify-between">
            {editing?.id ? (
              <Button variant="ghost" onClick={remove} className="text-destructive hover:text-destructive">
                <Trash2 className="h-4 w-4 mr-1" /> Delete
              </Button>
            ) : <span />}
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={save}>Save</Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
