import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, ChevronRight, Clock3, MapPin, Plus, Sparkles, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

type EventType = "lesson" | "assignment" | "exam" | "meeting" | "other";
type CalendarView = "month" | "week" | "day";

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
  subject: string | null;
  teacher: string | null;
  source_type: string | null;
  source_id: string | null;
  notification_minutes: number;
};

const TYPE_STYLES: Record<EventType, string> = {
  lesson: "bg-primary/10 text-primary border-primary/20",
  assignment: "bg-accent/20 text-accent-foreground border-accent/30",
  exam: "bg-destructive/10 text-destructive border-destructive/25",
  meeting: "bg-secondary text-secondary-foreground border-border",
  other: "bg-muted text-muted-foreground border-border",
};

function startOfDay(date: Date) {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function addDays(date: Date, amount: number) {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + amount);
  return copy;
}

function startOfWeek(date: Date) {
  const copy = startOfDay(date);
  const day = copy.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  copy.setDate(copy.getDate() + diff);
  return copy;
}

function endOfWeek(date: Date) {
  return addDays(startOfWeek(date), 7);
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function endOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 1);
}

function addMonths(date: Date, amount: number) {
  return new Date(date.getFullYear(), date.getMonth() + amount, 1);
}

function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function toLocalInput(iso: string) {
  const date = new Date(iso);
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function prettyTimeRange(event: EventRow) {
  if (event.all_day) return "All day";
  return `${new Date(event.start_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} - ${new Date(event.end_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
}

function viewLabel(view: CalendarView, cursor: Date) {
  if (view === "day") {
    return cursor.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" });
  }
  if (view === "week") {
    const start = startOfWeek(cursor);
    const end = addDays(start, 6);
    return `${start.toLocaleDateString(undefined, { month: "short", day: "numeric" })} - ${end.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}`;
  }
  return cursor.toLocaleDateString(undefined, { month: "long", year: "numeric" });
}

function fetchRange(view: CalendarView, cursor: Date) {
  if (view === "day") return { start: startOfDay(cursor), end: addDays(startOfDay(cursor), 1) };
  if (view === "week") return { start: startOfWeek(cursor), end: endOfWeek(cursor) };
  return { start: addDays(startOfWeek(startOfMonth(cursor)), -7), end: addDays(endOfWeek(endOfMonth(cursor)), 7) };
}

function moveCursor(cursor: Date, view: CalendarView, direction: -1 | 1) {
  if (view === "day") return addDays(cursor, direction);
  if (view === "week") return addDays(cursor, direction * 7);
  return addMonths(cursor, direction);
}

function hoursUntil(startAt: string) {
  const diff = new Date(startAt).getTime() - Date.now();
  return diff / (1000 * 60 * 60);
}

function isUpcoming(event: EventRow) {
  const hours = hoursUntil(event.start_at);
  return hours >= 0 && hours <= 24;
}

function isNotificationHot(event: EventRow) {
  const minutes = (new Date(event.start_at).getTime() - Date.now()) / (1000 * 60);
  return minutes >= 0 && minutes <= event.notification_minutes;
}

function formatCountdown(event: EventRow) {
  const minutes = Math.round((new Date(event.start_at).getTime() - Date.now()) / (1000 * 60));
  if (minutes < 60) return `${minutes} min`;
  return `${Math.round(minutes / 60)} hr`;
}

export default function CalendarModule() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [view, setView] = useState<CalendarView>("month");
  const [cursor, setCursor] = useState(() => startOfDay(new Date()));
  const [selectedDate, setSelectedDate] = useState(() => startOfDay(new Date()));
  const [events, setEvents] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<EventRow | null>(null);

  const range = useMemo(() => fetchRange(view, cursor), [cursor, view]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("events")
        .select("*")
        .gte("start_at", range.start.toISOString())
        .lt("start_at", range.end.toISOString())
        .order("start_at", { ascending: true });

      if (error) {
        toast.error(error.message);
      } else if (!cancelled) {
        setEvents((data ?? []) as EventRow[]);
      }

      if (!cancelled) setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [range.end, range.start, user]);

  const monthGrid = useMemo(() => {
    const first = startOfMonth(cursor);
    const gridStart = startOfWeek(first);
    return Array.from({ length: 42 }, (_, index) => addDays(gridStart, index));
  }, [cursor]);

  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, index) => addDays(startOfWeek(cursor), index)), [cursor]);

  const eventsForDay = (date: Date) =>
    events
      .filter((event) => sameDay(new Date(event.start_at), date))
      .sort((left, right) => left.start_at.localeCompare(right.start_at));

  const selectedEvents = eventsForDay(selectedDate);
  const upcomingEvents = useMemo(() => events.filter(isUpcoming), [events]);

  const openNew = (date?: Date) => {
    const base = date ?? selectedDate;
    const start = new Date(base);
    start.setHours(9, 0, 0, 0);
    const end = new Date(base);
    end.setHours(10, 0, 0, 0);
    setEditing({
      id: "",
      user_id: user?.id ?? "",
      title: "",
      description: "",
      event_type: "lesson",
      start_at: start.toISOString(),
      end_at: end.toISOString(),
      all_day: false,
      location: "",
      color: "navy",
      subject: "",
      teacher: "",
      source_type: null,
      source_id: null,
      notification_minutes: 20,
    });
    setOpen(true);
  };

  const openEdit = (event: EventRow) => {
    setEditing(event);
    setOpen(true);
  };

  const save = async () => {
    if (!editing || !user) return;
    if (editing.source_type === "timetable_lesson") {
      toast.info("Timetable lessons are managed from the Timetables module");
      return;
    }
    if (new Date(editing.end_at) <= new Date(editing.start_at)) {
      toast.error("End time must be after start time");
      return;
    }

    const payload = {
      title: editing.title || editing.subject || "Untitled event",
      description: editing.description,
      event_type: editing.event_type,
      start_at: editing.start_at,
      end_at: editing.end_at,
      all_day: editing.all_day,
      location: editing.location,
      subject: editing.subject || null,
      teacher: editing.teacher || null,
      notification_minutes: editing.notification_minutes,
    };

    if (editing.id) {
      const { error } = await supabase.from("events").update(payload).eq("id", editing.id);
      if (error) return toast.error(error.message);
      setEvents((current) => current.map((event) => (event.id === editing.id ? { ...event, ...editing } : event)));
    } else {
      const { data, error } = await supabase.from("events").insert({ user_id: user.id, ...payload }).select().single();
      if (error) return toast.error(error.message);
      setEvents((current) => [...current, data as EventRow].sort((left, right) => left.start_at.localeCompare(right.start_at)));
    }

    setOpen(false);
    setEditing(null);
    toast.success("Calendar saved");
  };

  const remove = async () => {
    if (!editing?.id) return;
    if (editing.source_type === "timetable_lesson") {
      toast.info("Generated lesson slots should be changed from Timetables");
      return;
    }

    const { error } = await supabase.from("events").delete().eq("id", editing.id);
    if (error) return toast.error(error.message);
    setEvents((current) => current.filter((event) => event.id !== editing.id));
    setOpen(false);
    setEditing(null);
    toast.success("Event deleted");
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl md:text-3xl text-foreground">iSchool Calendar</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Day, week, and month views for lessons, assignments, exams, meetings, and timetable-published sessions.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => setCursor((current) => moveCursor(current, view, -1))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="min-w-[15rem] text-center font-display">{viewLabel(view, cursor)}</div>
          <Button variant="outline" size="icon" onClick={() => setCursor((current) => moveCursor(current, view, 1))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              const today = startOfDay(new Date());
              setCursor(today);
              setSelectedDate(today);
            }}
          >
            Today
          </Button>
          <Button onClick={() => openNew()}>
            <Plus className="h-4 w-4 mr-2" />
            New event
          </Button>
        </div>
      </header>

      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-5">
          <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">Upcoming badges</p>
          <div className="flex items-center gap-3 mt-3">
            <span className="text-3xl font-display text-primary">{upcomingEvents.length}</span>
            <Badge className="bg-accent text-accent-foreground">Next 24 hours</Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-2">These are the events currently close enough to surface as push-style reminders.</p>
        </Card>

        <Card className="p-5">
          <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">Auto-published lessons</p>
          <div className="flex items-center gap-3 mt-3">
            <span className="text-3xl font-display text-primary">
              {events.filter((event) => event.source_type === "timetable_lesson").length}
            </span>
            <Badge variant="outline">Timetable sync</Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-2">Changes from Timetables flow here automatically for the user’s personal schedule.</p>
        </Card>

        <Card className="p-5">
          <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">Selected day</p>
          <div className="mt-3 text-2xl font-display text-primary">
            {selectedDate.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}
          </div>
          <p className="text-sm text-muted-foreground mt-2">{selectedEvents.length} scheduled item(s) in focus.</p>
        </Card>
      </section>

      <Tabs value={view} onValueChange={(value) => setView(value as CalendarView)} className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="month">Month</TabsTrigger>
          <TabsTrigger value="week">Week</TabsTrigger>
          <TabsTrigger value="day">Day</TabsTrigger>
        </TabsList>

        <div className="grid grid-cols-1 xl:grid-cols-[1fr_340px] gap-6">
          <Card className="p-4">
            {loading ? (
              <div className="min-h-[24rem] flex items-center justify-center text-muted-foreground">
                <Sparkles className="h-4 w-4 mr-2" />
                Loading events…
              </div>
            ) : view === "month" ? (
              <>
                <div className="grid grid-cols-7 text-xs font-medium text-muted-foreground mb-2">
                  {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => (
                    <div key={day} className="px-2 py-1">{day}</div>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-1">
                  {monthGrid.map((date) => {
                    const dayEvents = eventsForDay(date);
                    const inMonth = date.getMonth() === cursor.getMonth();
                    const isSelected = sameDay(date, selectedDate);
                    return (
                      <button
                        key={date.toISOString()}
                        onClick={() => {
                          setSelectedDate(date);
                          setCursor(date);
                        }}
                        onDoubleClick={() => openNew(date)}
                        className={cn(
                          "min-h-[100px] rounded-xl border p-2 text-left transition-colors",
                          inMonth ? "bg-card" : "bg-muted/30",
                          isSelected ? "border-primary ring-2 ring-primary/20" : "border-border",
                        )}
                      >
                        <div className={cn(
                          "inline-flex h-6 min-w-6 items-center justify-center rounded-full px-1 text-xs font-medium",
                          sameDay(date, new Date()) ? "bg-accent text-accent-foreground" : "text-foreground",
                        )}>
                          {date.getDate()}
                        </div>

                        <div className="mt-2 space-y-1">
                          {dayEvents.slice(0, 3).map((event) => (
                            <div key={event.id} className={cn("rounded-md border px-2 py-1 text-[11px] truncate", TYPE_STYLES[event.event_type])}>
                              {event.subject || event.title}
                            </div>
                          ))}
                          {dayEvents.length > 3 && <div className="text-[10px] text-muted-foreground">+{dayEvents.length - 3} more</div>}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </>
            ) : view === "week" ? (
              <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
                {weekDays.map((date) => {
                  const dayEvents = eventsForDay(date);
                  return (
                    <button
                      key={date.toISOString()}
                      onClick={() => setSelectedDate(date)}
                      className={cn(
                        "rounded-2xl border p-4 text-left min-h-[28rem]",
                        sameDay(date, selectedDate) ? "border-primary ring-2 ring-primary/20" : "border-border",
                      )}
                    >
                      <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{date.toLocaleDateString(undefined, { weekday: "short" })}</div>
                      <div className="text-lg font-display text-foreground mt-1">{date.getDate()}</div>
                      <div className="mt-4 space-y-2">
                        {dayEvents.length === 0 && <div className="text-sm text-muted-foreground">No events</div>}
                        {dayEvents.map((event) => (
                          <div key={event.id} className={cn("rounded-xl border px-3 py-2", TYPE_STYLES[event.event_type])}>
                            <div className="font-medium text-sm">{event.subject || event.title}</div>
                            <div className="text-xs mt-1 opacity-80">{prettyTimeRange(event)}</div>
                            {event.teacher && <div className="text-xs mt-1 opacity-80">{event.teacher}</div>}
                          </div>
                        ))}
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="space-y-3">
                {selectedEvents.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
                    Nothing scheduled for this day yet.
                  </div>
                ) : (
                  selectedEvents.map((event) => (
                    <button
                      key={event.id}
                      onClick={() => openEdit(event)}
                      className={cn("w-full rounded-2xl border p-4 text-left transition-colors hover:bg-muted/40", TYPE_STYLES[event.event_type])}
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline">{event.event_type}</Badge>
                        {isUpcoming(event) && <Badge className="bg-accent text-accent-foreground">Upcoming</Badge>}
                        {isNotificationHot(event) && <Badge variant="destructive">Starts in {formatCountdown(event)}</Badge>}
                      </div>
                      <div className="font-display text-xl mt-3">{event.subject || event.title}</div>
                      <div className="text-sm mt-2 flex flex-wrap items-center gap-3 text-muted-foreground">
                        <span className="inline-flex items-center gap-1"><Clock3 className="h-4 w-4" />{prettyTimeRange(event)}</span>
                        {event.teacher && <span>{event.teacher}</span>}
                        {event.location && <span className="inline-flex items-center gap-1"><MapPin className="h-4 w-4" />{event.location}</span>}
                      </div>
                      {event.description && <p className="text-sm text-foreground/80 mt-3">{event.description}</p>}
                    </button>
                  ))
                )}
              </div>
            )}
          </Card>

          <Card className="p-4 h-fit">
            <div className="flex items-center justify-between gap-3 mb-4">
              <div>
                <div className="text-xs uppercase tracking-[0.25em] text-muted-foreground">Agenda</div>
                <div className="font-display text-lg text-foreground mt-1">
                  {selectedDate.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={() => openNew(selectedDate)}>
                <Plus className="h-4 w-4 mr-2" />
                Add
              </Button>
            </div>

            <div className="space-y-3">
              {selectedEvents.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">
                  No events here yet.
                </div>
              ) : (
                selectedEvents.map((event) => (
                  <button
                    key={event.id}
                    onClick={() => openEdit(event)}
                    className="w-full rounded-xl border border-border/70 bg-card px-4 py-3 text-left hover:bg-muted/40"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline">{event.event_type}</Badge>
                      {event.source_type === "timetable_lesson" && <Badge className="bg-primary text-primary-foreground">Synced</Badge>}
                      {isNotificationHot(event) && <Badge variant="destructive">Soon</Badge>}
                    </div>
                    <div className="font-medium text-foreground mt-2">{event.subject || event.title}</div>
                    <div className="text-xs text-muted-foreground mt-1">{prettyTimeRange(event)}</div>
                    {event.teacher && <div className="text-xs text-muted-foreground mt-1">{event.teacher}</div>}
                    {event.location && <div className="text-xs text-muted-foreground mt-1">{event.location}</div>}
                  </button>
                ))
              )}
            </div>
          </Card>
        </div>
      </Tabs>

      <Dialog open={open} onOpenChange={(value) => { setOpen(value); if (!value) setEditing(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing?.id ? "Event details" : "New event"}</DialogTitle>
          </DialogHeader>

          {editing && (
            <div className="space-y-4">
              {editing.source_type === "timetable_lesson" && (
                <div className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-primary">
                  This lesson is generated from the Timetables module. Edit the source timetable if you need to move or replace it.
                </div>
              )}

              <div className="space-y-1.5">
                <Label>Title</Label>
                <Input
                  value={editing.title}
                  onChange={(event) => setEditing({ ...editing, title: event.target.value })}
                  disabled={editing.source_type === "timetable_lesson"}
                  placeholder="Science revision"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Type</Label>
                  <Select
                    value={editing.event_type}
                    onValueChange={(value) => setEditing({ ...editing, event_type: value as EventType })}
                    disabled={editing.source_type === "timetable_lesson"}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
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
                  <Label>Reminder window (minutes)</Label>
                  <Input
                    type="number"
                    min={5}
                    max={180}
                    value={editing.notification_minutes}
                    onChange={(event) => setEditing({ ...editing, notification_minutes: Number(event.target.value) || 20 })}
                    disabled={editing.source_type === "timetable_lesson"}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Subject</Label>
                  <Input
                    value={editing.subject ?? ""}
                    onChange={(event) => setEditing({ ...editing, subject: event.target.value })}
                    disabled={editing.source_type === "timetable_lesson"}
                    placeholder="Mathematics"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label>Teacher</Label>
                  <Input
                    value={editing.teacher ?? ""}
                    onChange={(event) => setEditing({ ...editing, teacher: event.target.value })}
                    disabled={editing.source_type === "timetable_lesson"}
                    placeholder="Mrs. Njoroge"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Location</Label>
                <Input
                  value={editing.location ?? ""}
                  onChange={(event) => setEditing({ ...editing, location: event.target.value })}
                  disabled={editing.source_type === "timetable_lesson"}
                  placeholder="Room 12"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Start</Label>
                  <Input
                    type="datetime-local"
                    value={toLocalInput(editing.start_at)}
                    onChange={(event) => setEditing({ ...editing, start_at: new Date(event.target.value).toISOString() })}
                    disabled={editing.source_type === "timetable_lesson"}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>End</Label>
                  <Input
                    type="datetime-local"
                    value={toLocalInput(editing.end_at)}
                    onChange={(event) => setEditing({ ...editing, end_at: new Date(event.target.value).toISOString() })}
                    disabled={editing.source_type === "timetable_lesson"}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Notes</Label>
                <Textarea
                  rows={4}
                  value={editing.description}
                  onChange={(event) => setEditing({ ...editing, description: event.target.value })}
                  disabled={editing.source_type === "timetable_lesson"}
                  placeholder="Agenda, materials, links..."
                />
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:justify-between">
            {editing?.source_type === "timetable_lesson" ? (
              <Button variant="outline" onClick={() => navigate("/dashboard/timetables")}>
                Manage in Timetables
              </Button>
            ) : editing?.id ? (
              <Button variant="ghost" onClick={remove} className="text-destructive hover:text-destructive">
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </Button>
            ) : <span />}

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setOpen(false)}>Close</Button>
              {editing?.source_type !== "timetable_lesson" && <Button onClick={save}>Save</Button>}
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
