<<<<<<< HEAD
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { BookOpen, Plus, Pin, Trash2, ExternalLink, Search } from "lucide-react";

type ResType = "video" | "simulation" | "3d_model" | "article" | "link" | "document";
type Resource = {
  id: string;
  user_id: string;
  subject_id: string | null;
  title: string;
  description: string;
  resource_type: ResType;
  url: string;
  thumbnail_url: string | null;
  tags: string[];
  pinned: boolean;
};
type Subject = { id: string; name: string };

const TYPES: { value: ResType; label: string }[] = [
  { value: "video", label: "Video" },
  { value: "simulation", label: "Simulation" },
  { value: "3d_model", label: "3D Model" },
  { value: "article", label: "Article" },
  { value: "document", label: "Document" },
  { value: "link", label: "Link" },
];

const isEmbeddable = (r: Resource) => /youtube\.com|youtu\.be|vimeo\.com|phet\.colorado\.edu|sketchfab\.com/.test(r.url);
const embedUrl = (url: string) => {
  const yt = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]+)/);
  if (yt) return `https://www.youtube.com/embed/${yt[1]}`;
  const vm = url.match(/vimeo\.com\/(\d+)/);
  if (vm) return `https://player.vimeo.com/video/${vm[1]}`;
  return url;
};

export default function BookPage() {
  const { user } = useAuth();
  const [resources, setResources] = useState<Resource[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [preview, setPreview] = useState<Resource | null>(null);
  const [form, setForm] = useState({ title: "", description: "", url: "", resource_type: "link" as ResType, subject_id: "", tags: "" });

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [{ data: r }, { data: s }] = await Promise.all([
        supabase.from("book_resources").select("*").order("pinned", { ascending: false }).order("created_at", { ascending: false }),
        supabase.from("subjects").select("id,name"),
      ]);
      setResources((r ?? []) as Resource[]);
      setSubjects((s ?? []) as Subject[]);
    })();
  }, [user]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return resources.filter((r) => !q || r.title.toLowerCase().includes(q) || r.description.toLowerCase().includes(q) || r.tags.some((t) => t.toLowerCase().includes(q)));
  }, [resources, search]);

  const create = async () => {
    if (!user || !form.url.trim()) return toast.error("URL required");
    const payload = {
      user_id: user.id,
      title: form.title || "Untitled",
      description: form.description,
      url: form.url,
      resource_type: form.resource_type,
      subject_id: form.subject_id || null,
      tags: form.tags.split(",").map((t) => t.trim()).filter(Boolean),
    };
    const { data, error } = await supabase.from("book_resources").insert(payload).select().single();
    if (error) return toast.error(error.message);
    setResources((p) => [data as Resource, ...p]);
    setOpen(false);
    setForm({ title: "", description: "", url: "", resource_type: "link", subject_id: "", tags: "" });
  };

  const togglePin = async (r: Resource) => {
    const next = !r.pinned;
    setResources((p) => p.map((x) => (x.id === r.id ? { ...x, pinned: next } : x)));
    await supabase.from("book_resources").update({ pinned: next }).eq("id", r.id);
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("book_resources").delete().eq("id", id);
    if (error) return toast.error(error.message);
    setResources((p) => p.filter((r) => r.id !== id));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold text-primary flex items-center gap-2">
            <BookOpen className="h-7 w-7" /> iSchoolBook
          </h1>
          <p className="text-muted-foreground">Your interactive content library — videos, simulations, 3D models.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" /> Add resource</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Add a learning resource</DialogTitle></DialogHeader>
            <div className="grid gap-3">
              <div><Label>Title</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
              <div><Label>URL</Label><Input placeholder="https://..." value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Type</Label>
                  <Select value={form.resource_type} onValueChange={(v) => setForm({ ...form, resource_type: v as ResType })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Subject</Label>
                  <Select value={form.subject_id} onValueChange={(v) => setForm({ ...form, subject_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Optional" /></SelectTrigger>
                    <SelectContent>{subjects.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div><Label>Description</Label><Textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
              <div><Label>Tags (comma separated)</Label><Input value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} /></div>
            </div>
            <DialogFooter><Button onClick={create}>Save</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input className="pl-9" placeholder="Search resources..." value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((r) => (
          <Card key={r.id} className="p-4 flex flex-col gap-2 hover:shadow-elevated transition group">
            <div className="flex items-start justify-between gap-2">
              <Badge variant="outline" className="text-xs">{r.resource_type.replace("_", " ")}</Badge>
              <div className="flex gap-1">
                <button onClick={() => togglePin(r)}><Pin className={`h-4 w-4 ${r.pinned ? "text-primary fill-primary" : "text-muted-foreground"}`} /></button>
                <button onClick={() => remove(r.id)}><Trash2 className="h-4 w-4 text-destructive opacity-0 group-hover:opacity-100 transition" /></button>
              </div>
            </div>
            <h3 className="font-display font-semibold text-primary line-clamp-1">{r.title}</h3>
            {r.description && <p className="text-xs text-muted-foreground line-clamp-2">{r.description}</p>}
            {r.tags.length > 0 && <div className="flex gap-1 flex-wrap">{r.tags.map((t) => <Badge key={t} variant="secondary" className="text-xs">{t}</Badge>)}</div>}
            <div className="flex gap-2 mt-auto pt-2">
              {isEmbeddable(r) && <Button size="sm" variant="outline" onClick={() => setPreview(r)}>Preview</Button>}
              <Button size="sm" variant="ghost" asChild><a href={r.url} target="_blank" rel="noreferrer"><ExternalLink className="h-3 w-3 mr-1" /> Open</a></Button>
            </div>
          </Card>
        ))}
        {filtered.length === 0 && <div className="col-span-full text-center text-muted-foreground py-12">No resources yet.</div>}
      </div>

      <Dialog open={!!preview} onOpenChange={(o) => !o && setPreview(null)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader><DialogTitle>{preview?.title}</DialogTitle></DialogHeader>
          {preview && (
            <div className="aspect-video w-full">
              <iframe src={embedUrl(preview.url)} className="w-full h-full rounded-md border border-border" allowFullScreen allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture" />
            </div>
          )}
        </DialogContent>
      </Dialog>
=======
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Box, ExternalLink, Highlighter, Layers3, Link2, Loader2, Orbit, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import LearningNoteEditor from "@/components/LearningNoteEditor";
import {
  type BookTopic,
  type LearningNote,
  createStarterBookTopics,
  makeId,
  parseBookTopic,
  parseLearningNote,
} from "@/lib/ischool";
import type { Tables } from "@/integrations/supabase/types";
import { cn } from "@/lib/utils";

type TopicRow = Tables<"book_topics">;
type NoteRow = Tables<"notes">;

function todayDate() {
  return new Date().toISOString().slice(0, 10);
}

export default function Book() {
  const { user } = useAuth();
  const [topics, setTopics] = useState<BookTopic[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);
  const [note, setNote] = useState<LearningNote | null>(null);
  const [saving, setSaving] = useState(false);
  const [capturedQuote, setCapturedQuote] = useState("");
  const contentRef = useRef<HTMLDivElement | null>(null);
  const saveTimer = useRef<number | null>(null);
  const topicOpenedAt = useRef<number | null>(null);
  const currentNoteRef = useRef<LearningNote | null>(null);

  useEffect(() => {
    currentNoteRef.current = note;
  }, [note]);

  const selectedTopic = useMemo(
    () => topics.find((topic) => topic.slug === selectedSlug) ?? topics[0] ?? null,
    [selectedSlug, topics],
  );

  const subjectGroups = useMemo(() => {
    return topics.reduce<Record<string, BookTopic[]>>((accumulator, topic) => {
      accumulator[topic.subject_name] = [...(accumulator[topic.subject_name] ?? []), topic];
      return accumulator;
    }, {});
  }, [topics]);

  const loadTopics = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase.from("book_topics").select("*").order("subject_name").order("topic_order");
    if (error) {
      toast.error(error.message);
      setLoading(false);
      return;
    }
    const nextTopics = (data ?? []).map((row) => parseBookTopic(row as TopicRow));
    setTopics(nextTopics);
    setSelectedSlug((current) => current ?? nextTopics[0]?.slug ?? null);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    void loadTopics();
  }, [loadTopics]);

  useEffect(() => {
    if (!selectedTopic || !user) {
      setNote(null);
      return;
    }

    const ensureNote = async () => {
      const { data, error } = await supabase
        .from("notes")
        .select("*")
        .eq("user_id", user.id)
        .eq("topic_id", selectedTopic.id)
        .order("updated_at", { ascending: false })
        .limit(1);

      if (error) {
        toast.error(error.message);
        return;
      }

      if (data?.[0]) {
        setNote(parseLearningNote(data[0] as NoteRow));
      } else {
        const { data: created, error: createError } = await supabase
          .from("notes")
          .insert({
            user_id: user.id,
            topic_id: selectedTopic.id,
            title: `${selectedTopic.title} notes`,
            lesson_title: selectedTopic.title,
            note_date: todayDate(),
            subject: selectedTopic.subject_name,
            content: "",
            auto_tags: {
              subject: selectedTopic.subject_name,
              lesson: selectedTopic.title,
              date: todayDate(),
              topicSlug: selectedTopic.slug,
            },
            answer_spaces: [
              {
                id: makeId("answer"),
                prompt: "Quick response",
                response: "",
                expanded: true,
              },
            ],
            annotation_marks: [],
            media_embeds: [],
            exercises: [],
          })
          .select()
          .single();

        if (createError) {
          toast.error(createError.message);
          return;
        }

        setNote(parseLearningNote(created as NoteRow));
      }
    };

    void ensureNote();
    topicOpenedAt.current = Date.now();
    if (contentRef.current) contentRef.current.scrollTop = 0;
  }, [selectedTopic, user]);

  useEffect(() => {
    return () => {
      if (!user || !selectedTopic || !currentNoteRef.current || !topicOpenedAt.current) return;
      const minutes = Math.max(1, Math.round((Date.now() - topicOpenedAt.current) / 60000));
      void supabase.from("learning_activity").insert({
        owner_id: user.id,
        student_id: user.id,
        subject_name: selectedTopic.subject_name,
        topic_id: selectedTopic.id,
        note_id: currentNoteRef.current.id,
        source: "book",
        lesson_title: selectedTopic.title,
        minutes_spent: minutes,
        progress_percent: currentNoteRef.current.reading_progress ?? 0,
        content_percent: currentNoteRef.current.reading_progress ?? 0,
      });
    };
  }, [selectedTopic, user]);

  const seedTopics = async () => {
    if (!user) return;
    const { error } = await supabase.from("book_topics").insert(createStarterBookTopics(user.id));
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Starter iSchoolBook topics added");
    await loadTopics();
  };

  const patchNote = (partial: Partial<LearningNote>) => {
    setNote((current) => (current ? { ...current, ...partial } : current));
  };

  const scheduleSave = (partial: Partial<LearningNote>) => {
    if (!note) return;
    patchNote(partial);
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    setSaving(true);
    saveTimer.current = window.setTimeout(async () => {
      const { error } = await supabase.from("notes").update(partial).eq("id", note.id);
      setSaving(false);
      if (error) toast.error(error.message);
    }, 450);
  };

  const setColor = async (color: string) => {
    if (!note) return;
    patchNote({ color });
    const { error } = await supabase.from("notes").update({ color }).eq("id", note.id);
    if (error) toast.error(error.message);
  };

  const togglePin = async () => {
    if (!note) return;
    const next = !note.pinned;
    patchNote({ pinned: next });
    const { error } = await supabase.from("notes").update({ pinned: next }).eq("id", note.id);
    if (error) toast.error(error.message);
  };

  const deleteNote = async () => {
    if (!note) return;
    const { error } = await supabase.from("notes").delete().eq("id", note.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    setNote(null);
    toast.success("Topic note deleted");
  };

  const handleTopicLink = (slug: string) => {
    const exists = topics.some((topic) => topic.slug === slug);
    if (!exists) {
      toast.info("That linked topic has not been added to your library yet");
      return;
    }
    setSelectedSlug(slug);
  };

  const captureSelection = () => {
    const quote = window.getSelection()?.toString().trim() ?? "";
    if (!quote) {
      toast.info("Select some text from the topic first");
      return;
    }
    setCapturedQuote(quote);
    toast.success("Selection captured for annotation");
  };

  const handleContentClick = (event: React.MouseEvent<HTMLDivElement>) => {
    const anchor = (event.target as HTMLElement).closest("a");
    const href = anchor?.getAttribute("href");
    if (href?.startsWith("topic://")) {
      event.preventDefault();
      handleTopicLink(href.replace("topic://", ""));
    }
  };

  const handleScroll = () => {
    if (!contentRef.current || !note) return;
    const element = contentRef.current;
    const total = element.scrollHeight - element.clientHeight;
    const ratio = total <= 0 ? 100 : Math.min(100, Math.round((element.scrollTop / total) * 100));
    if (Math.abs((note.reading_progress ?? 0) - ratio) >= 5) {
      scheduleSave({ reading_progress: ratio });
    }
  };

  if (loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center text-muted-foreground">
        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
        Loading iSchoolBook…
      </div>
    );
  }

  if (topics.length === 0) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <Card className="p-8 text-center border-border/60">
          <div className="mx-auto h-16 w-16 rounded-2xl bg-gradient-hero flex items-center justify-center">
            <Layers3 className="h-8 w-8 text-primary-foreground" />
          </div>
          <h1 className="font-display text-3xl text-foreground mt-5">iSchoolBook</h1>
          <p className="text-muted-foreground mt-3 max-w-2xl mx-auto">
            Build your digital content engine with topic navigation, cross-subject references, placeholder 3D views, and live notes beside every lesson.
          </p>
          <Button className="mt-6" onClick={seedTopics}>
            <Sparkles className="h-4 w-4 mr-2" />
            Load starter topics
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-[1700px] mx-auto space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl md:text-3xl text-foreground flex items-center gap-2">
            <Layers3 className="h-6 w-6 text-primary" />
            iSchoolBook
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Digital content delivery with topic links, cross-subject references, embedded simulations, and topic-linked learner notes.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge className="bg-primary text-primary-foreground">{topics.length} topics</Badge>
          {selectedTopic && <Badge variant="outline">{selectedTopic.subject_name}</Badge>}
        </div>
      </header>

      <div className="grid grid-cols-1 xl:grid-cols-[290px_1fr_520px] gap-6 items-start">
        <Card className="p-4">
          <div className="text-xs uppercase tracking-[0.25em] text-muted-foreground">Subjects</div>
          <div className="mt-4 space-y-4">
            {Object.entries(subjectGroups).map(([subject, subjectTopics]) => (
              <div key={subject}>
                <div className="text-sm font-medium text-foreground mb-2">{subject}</div>
                <div className="space-y-2">
                  {subjectTopics.map((topic) => (
                    <button
                      key={topic.id}
                      onClick={() => setSelectedSlug(topic.slug)}
                      className={cn(
                        "w-full rounded-xl border px-4 py-3 text-left transition-colors",
                        selectedTopic?.id === topic.id ? "border-primary bg-primary/10" : "border-border hover:bg-muted/40",
                      )}
                    >
                      <div className="font-medium text-foreground">{topic.title}</div>
                      <div className="text-xs text-muted-foreground mt-1">{topic.lesson_label || "Lesson topic"}</div>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Card>

        {selectedTopic && (
          <div className="space-y-4">
            <Card className="p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{selectedTopic.subject_name}</Badge>
                    {selectedTopic.lesson_label && <Badge variant="outline">{selectedTopic.lesson_label}</Badge>}
                  </div>
                  <h2 className="font-display text-3xl text-foreground mt-4">{selectedTopic.title}</h2>
                  <p className="text-muted-foreground mt-3 max-w-3xl">{selectedTopic.summary}</p>
                </div>
                <div className="text-right">
                  <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Estimated time</div>
                  <div className="font-display text-2xl text-primary mt-2">{selectedTopic.estimated_minutes} min</div>
                </div>
              </div>
            </Card>

            <Card className="p-5">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <div>
                  <div className="font-medium text-foreground">Interactive lesson content</div>
                  <div className="text-sm text-muted-foreground mt-1">Hyperlinked topics, placeholder 3D models, and embedded simulations.</div>
                </div>
                <Button variant="outline" onClick={captureSelection}>
                  <Highlighter className="h-4 w-4 mr-2" />
                  Capture highlight
                </Button>
              </div>

              <div className="grid grid-cols-1 2xl:grid-cols-[1fr_320px] gap-4">
                <ScrollArea className="h-[720px] rounded-2xl border border-border/60 bg-card">
                  <div
                    ref={contentRef}
                    onScroll={handleScroll}
                    onClick={handleContentClick}
                    className="h-full overflow-y-auto p-6 prose prose-slate max-w-none [&_a]:text-primary [&_a]:underline [&_blockquote]:border-primary/30"
                    dangerouslySetInnerHTML={{ __html: selectedTopic.content_html }}
                  />
                </ScrollArea>

                <div className="space-y-4">
                  <Card className="p-4 bg-gradient-to-br from-primary/95 to-primary-glow text-primary-foreground">
                    <div className="flex items-center gap-2">
                      <Orbit className="h-4 w-4" />
                      <div className="font-medium">3D model viewer</div>
                    </div>
                    <div className="mt-4 rounded-2xl border border-primary-foreground/15 bg-white/10 p-5 min-h-[180px] flex flex-col justify-between">
                      <div>
                        <div className="text-sm text-primary-foreground/80">Placeholder 3D frame</div>
                        <div className="text-lg font-display mt-2">Interactive concept model</div>
                        <p className="text-sm text-primary-foreground/75 mt-2">
                          Use this slot for molecules, geometry solids, lab apparatus, or historical artifacts.
                        </p>
                      </div>
                      <div className="mt-4 inline-flex items-center gap-2 text-xs text-primary-foreground/80">
                        <Box className="h-4 w-4" />
                        {selectedTopic.model_embed_url || "3D embed source ready"}
                      </div>
                    </div>
                  </Card>

                  <Card className="p-4">
                    <div className="font-medium text-foreground flex items-center gap-2">
                      <Link2 className="h-4 w-4 text-primary" />
                      Cross-subject references
                    </div>
                    <div className="space-y-2 mt-4">
                      {selectedTopic.cross_subject_links.map((link) => (
                        <button
                          key={link.id}
                          onClick={() => handleTopicLink(link.topicSlug)}
                          className="w-full rounded-xl border border-border/60 px-4 py-3 text-left hover:bg-muted/40"
                        >
                          <div className="font-medium text-foreground">{link.label}</div>
                          <div className="text-xs text-muted-foreground mt-1">{link.subject}</div>
                        </button>
                      ))}
                    </div>
                  </Card>

                  <Card className="p-4">
                    <div className="font-medium text-foreground flex items-center gap-2">
                      <ExternalLink className="h-4 w-4 text-primary" />
                      Embedded PhET simulation
                    </div>
                    <div className="mt-4 aspect-video rounded-2xl overflow-hidden border border-border/60 bg-muted">
                      <iframe
                        src={selectedTopic.simulation_url ?? "about:blank"}
                        title={`${selectedTopic.title} simulation`}
                        className="w-full h-full"
                        allowFullScreen
                      />
                    </div>
                  </Card>

                  <Card className="p-4">
                    <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Content coverage</div>
                    <div className="mt-3 flex items-center justify-between text-sm text-muted-foreground">
                      <span>How much of this topic has been covered?</span>
                      <span>{note?.reading_progress ?? 0}%</span>
                    </div>
                    <Progress value={note?.reading_progress ?? 0} className="mt-3" />
                  </Card>
                </div>
              </div>
            </Card>
          </div>
        )}

        <div className="min-h-[720px]">
          <LearningNoteEditor
            note={note}
            topic={selectedTopic}
            saving={saving}
            capturedQuote={capturedQuote}
            onClearCapturedQuote={() => setCapturedQuote("")}
            onUpdate={scheduleSave}
            onTogglePin={togglePin}
            onDelete={deleteNote}
            onSetColor={setColor}
          />
        </div>
      </div>
>>>>>>> df6fcd8 (feat: add timetable and whiteboard modules with associated policies and triggers)
    </div>
  );
}
