import { useEffect, useMemo, useRef, useState } from "react";
import { BookOpenCheck, Loader2, NotebookPen, Pin, Plus, Search } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import LearningNoteEditor from "@/components/LearningNoteEditor";
import { createStarterBookTopics, makeId, parseBookTopic, parseLearningNote, type BookTopic, type LearningNote } from "@/lib/ischool";
import type { Tables } from "@/integrations/supabase/types";
import { cn } from "@/lib/utils";

type NoteRow = Tables<"notes">;
type TopicRow = Tables<"book_topics">;

function todayDate() {
  return new Date().toISOString().slice(0, 10);
}

function defaultTopicNote(topic: BookTopic | null, userId: string) {
  return {
    user_id: userId,
    title: topic ? `${topic.title} notes` : "Untitled note",
    topic_id: topic?.id ?? null,
    lesson_title: topic?.title ?? null,
    note_date: todayDate(),
    subject: topic?.subject_name ?? null,
    content: "",
    auto_tags: {
      subject: topic?.subject_name,
      lesson: topic?.title,
      date: todayDate(),
      topicSlug: topic?.slug,
    },
    answer_spaces: [
      {
        id: makeId("answer"),
        prompt: "Practice response",
        response: "",
        expanded: true,
      },
    ],
    annotation_marks: [],
    media_embeds: [],
    exercises: [],
  };
}

export default function Notes() {
  const { user } = useAuth();
  const [topics, setTopics] = useState<BookTopic[]>([]);
  const [notes, setNotes] = useState<LearningNote[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const saveTimer = useRef<number | null>(null);
  const noteOpenedAt = useRef<number | null>(null);
  const currentNoteRef = useRef<LearningNote | null>(null);

  useEffect(() => {
    currentNoteRef.current = notes.find((note) => note.id === activeId) ?? null;
  }, [activeId, notes]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    (async () => {
      setLoading(true);
      const [{ data: noteRows, error: noteError }, { data: topicRows, error: topicError }] = await Promise.all([
        supabase.from("notes").select("*").order("pinned", { ascending: false }).order("updated_at", { ascending: false }),
        supabase.from("book_topics").select("*").order("subject_name").order("topic_order"),
      ]);

      if (noteError) toast.error(noteError.message);
      if (topicError) toast.error(topicError.message);

      if (!cancelled) {
        setNotes((noteRows ?? []).map((row) => parseLearningNote(row as NoteRow)));
        setTopics((topicRows ?? []).map((row) => parseBookTopic(row as TopicRow)));
        setActiveId((current) => current ?? noteRows?.[0]?.id ?? null);
        setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user]);

  useEffect(() => {
    noteOpenedAt.current = Date.now();
    return () => {
      const current = currentNoteRef.current;
      if (!user || !current || !noteOpenedAt.current) return;
      const minutes = Math.max(1, Math.round((Date.now() - noteOpenedAt.current) / 60000));
      void supabase.from("learning_activity").insert({
        owner_id: user.id,
        student_id: user.id,
        subject_name: current.subject,
        topic_id: current.topic_id,
        note_id: current.id,
        source: "notes",
        lesson_title: current.lesson_title,
        minutes_spent: minutes,
        progress_percent: current.reading_progress ?? 0,
        content_percent: current.reading_progress ?? 0,
      });
    };
  }, [activeId, user]);

  const active = useMemo(() => notes.find((note) => note.id === activeId) ?? null, [activeId, notes]);
  const activeTopic = useMemo(() => topics.find((topic) => topic.id === active?.topic_id) ?? null, [active?.topic_id, topics]);

  const filtered = useMemo(() => {
    const search = query.trim().toLowerCase();
    if (!search) return notes;
    return notes.filter((note) =>
      [note.title, note.content, note.subject ?? "", note.lesson_title ?? ""].some((value) => value.toLowerCase().includes(search)),
    );
  }, [notes, query]);

  const createNote = async () => {
    if (!user) return;
    if (topics.length === 0) {
      const { error } = await supabase.from("book_topics").insert(createStarterBookTopics(user.id));
      if (error) {
        toast.error(error.message);
        return;
      }
      const { data: topicRows } = await supabase.from("book_topics").select("*").order("subject_name").order("topic_order");
      setTopics((topicRows ?? []).map((row) => parseBookTopic(row as TopicRow)));
    }

    const topic = topics[0] ?? null;
    const { data, error } = await supabase.from("notes").insert(defaultTopicNote(topic, user.id)).select().single();
    if (error || !data) {
      toast.error(error?.message ?? "Could not create note");
      return;
    }

    const parsed = parseLearningNote(data as NoteRow);
    setNotes((current) => [parsed, ...current]);
    setActiveId(parsed.id);
  };

  const patch = (id: string, partial: Partial<LearningNote>) => {
    setNotes((current) => current.map((note) => (note.id === id ? { ...note, ...partial } : note)));
  };

  const scheduleSave = (id: string, partial: Partial<LearningNote>) => {
    patch(id, partial);
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    setSaving(true);
    saveTimer.current = window.setTimeout(async () => {
      const { error } = await supabase.from("notes").update(partial as any).eq("id", id);
      setSaving(false);
      if (error) toast.error(error.message);
    }, 450);
  };

  const setColor = async (color: string) => {
    if (!active) return;
    patch(active.id, { color });
    const { error } = await supabase.from("notes").update({ color }).eq("id", active.id);
    if (error) toast.error(error.message);
  };

  const togglePin = async () => {
    if (!active) return;
    const next = !active.pinned;
    patch(active.id, { pinned: next });
    const { error } = await supabase.from("notes").update({ pinned: next }).eq("id", active.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    setNotes((current) => [...current].sort((left, right) => Number(right.pinned) - Number(left.pinned) || right.updated_at.localeCompare(left.updated_at)));
  };

  const remove = async () => {
    if (!active) return;
    const removingId = active.id;
    const { error } = await supabase.from("notes").delete().eq("id", active.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    const remaining = notes.filter((note) => note.id !== removingId);
    setNotes(remaining);
    setActiveId((current) => (current === removingId ? remaining[0]?.id ?? null : current));
    toast.success("Note deleted");
  };

  const retagToTopic = async (topicId: string) => {
    if (!active) return;
    const topic = topics.find((entry) => entry.id === topicId) ?? null;
    const partial = {
      topic_id: topic?.id ?? null,
      lesson_title: topic?.title ?? null,
      subject: topic?.subject_name ?? null,
      auto_tags: {
        subject: topic?.subject_name,
        lesson: topic?.title,
        date: active.note_date,
        topicSlug: topic?.slug,
      },
    };
    patch(active.id, partial);
    const { error } = await supabase.from("notes").update(partial).eq("id", active.id);
    if (error) toast.error(error.message);
  };

  if (loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center text-muted-foreground">
        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
        Loading iSchool Notes…
      </div>
    );
  }

  return (
    <div className="max-w-[1600px] mx-auto h-[calc(100vh-9rem)] flex flex-col">
      <header className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div>
          <h1 className="font-display text-2xl md:text-3xl text-foreground flex items-center gap-2">
            <NotebookPen className="h-6 w-6 text-primary" />
            iSchool Notes
          </h1>
          <p className="text-sm text-muted-foreground">Learner workspace with auto-tagged lesson notes, practice, highlights, and progress tracking.</p>
        </div>
        <Button onClick={createNote}>
          <Plus className="h-4 w-4 mr-2" />
          New note
        </Button>
      </header>

      <div className="grid grid-cols-1 xl:grid-cols-[330px_1fr] gap-4 flex-1 min-h-0">
        <aside className="flex flex-col rounded-2xl border border-border bg-card overflow-hidden">
          <div className="p-3 border-b border-border">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search notes…" className="pl-9" />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="p-6 text-center text-sm text-muted-foreground">
                {notes.length === 0 ? "No notes yet. Create your first lesson note." : "No notes matched your search."}
              </div>
            ) : (
              <ul>
                {filtered.map((note) => (
                  <li key={note.id}>
                    <button
                      onClick={() => setActiveId(note.id)}
                      className={cn(
                        "w-full text-left px-4 py-4 border-b border-border/60 transition-colors hover:bg-muted/40",
                        activeId === note.id && "bg-secondary/60",
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-foreground truncate">{note.title || "Untitled note"}</span>
                        {note.pinned && <Pin className="h-3.5 w-3.5 text-accent ml-auto" />}
                      </div>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {note.subject && <Badge variant="outline">{note.subject}</Badge>}
                        {note.lesson_title && <Badge variant="outline">{note.lesson_title}</Badge>}
                        <Badge variant="outline">{note.reading_progress ?? 0}% read</Badge>
                        <Badge variant="outline">{note.exercise_score.toFixed(0)}% quiz</Badge>
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-2">{new Date(note.updated_at).toLocaleString()}</p>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </aside>

        <div className="min-h-0 flex flex-col gap-4">
          {active && (
            <Card className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-[1fr_240px_180px] gap-4 items-end">
                <div>
                  <Label>Linked topic</Label>
                  <Select value={active.topic_id ?? "__none"} onValueChange={(value) => retagToTopic(value === "__none" ? "" : value)}>
                    <SelectTrigger className="mt-2">
                      <SelectValue placeholder="Choose a lesson topic" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none">Standalone note</SelectItem>
                      {topics.map((topic) => (
                        <SelectItem key={topic.id} value={topic.id}>
                          {topic.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Note date</Label>
                  <Input
                    type="date"
                    value={active.note_date}
                    className="mt-2"
                    onChange={(event) => scheduleSave(active.id, { note_date: event.target.value })}
                  />
                </div>
                <div className="rounded-xl border border-border/60 bg-secondary/50 px-4 py-3">
                  <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Companion topic</div>
                  <div className="font-medium text-foreground mt-2 inline-flex items-center gap-2">
                    <BookOpenCheck className="h-4 w-4 text-primary" />
                    {activeTopic ? activeTopic.title : "Standalone note"}
                  </div>
                </div>
              </div>
            </Card>
          )}

          <div className="flex-1 min-h-0">
            <LearningNoteEditor
              note={active}
              topic={activeTopic}
              saving={saving}
              onUpdate={(partial) => active && scheduleSave(active.id, partial)}
              onTogglePin={togglePin}
              onDelete={remove}
              onSetColor={setColor}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
