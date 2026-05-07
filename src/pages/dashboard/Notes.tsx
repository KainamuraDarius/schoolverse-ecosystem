import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Plus, Pin, PinOff, Trash2, Search, NotebookPen, Loader2, Eye } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import RichTextEditor from "@/components/RichTextEditor";
import MediaEmbedManager from "@/components/MediaEmbedManager";
import ExerciseManager, { Exercise } from "@/components/ExerciseManager";

type Note = {
  id: string;
  user_id: string;
  title: string;
  content: string;
  color: string;
  pinned: boolean;
  subject: string | null;
  media_embeds?: any[];
  exercises?: Exercise[];
  reading_progress?: number;
  created_at: string;
  updated_at: string;
};

const COLORS: { value: string; swatch: string; ring: string }[] = [
  { value: "cream", swatch: "bg-secondary", ring: "ring-secondary" },
  { value: "navy",  swatch: "bg-primary",   ring: "ring-primary"   },
  { value: "gold",  swatch: "bg-accent",    ring: "ring-accent"    },
  { value: "rose",  swatch: "bg-destructive/30", ring: "ring-destructive" },
  { value: "sage",  swatch: "bg-emerald-300", ring: "ring-emerald-400" },
];

const cardTone: Record<string, string> = {
  cream: "bg-secondary/60",
  navy: "bg-primary/10",
  gold: "bg-accent/20",
  rose: "bg-destructive/10",
  sage: "bg-emerald-100/60",
};

export default function Notes() {
  const { user } = useAuth();
  const [notes, setNotes] = useState<Note[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const saveTimer = useRef<number | null>(null);

  // Load
  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("notes").select("*").order("pinned", { ascending: false }).order("updated_at", { ascending: false });
      if (error) toast.error(error.message);
      else setNotes((data ?? []) as Note[]);
      setLoading(false);
    })();
  }, [user]);

  const active = useMemo(() => notes.find((n) => n.id === activeId) ?? null, [notes, activeId]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return notes;
    return notes.filter(
      (n) =>
        n.title.toLowerCase().includes(q) ||
        n.content.toLowerCase().includes(q) ||
        (n.subject ?? "").toLowerCase().includes(q),
    );
  }, [notes, query]);

  const createNote = async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from("notes")
      .insert({ user_id: user.id, title: "Untitled note", content: "", color: "cream" })
      .select().single();
    if (error || !data) return toast.error(error?.message ?? "Failed");
    setNotes((p) => [data as Note, ...p]);
    setActiveId(data.id);
  };

  const patch = (id: string, partial: Partial<Note>) => {
    setNotes((p) => p.map((n) => (n.id === id ? { ...n, ...partial } : n)));
  };

  // Debounced autosave on content/title edits
  const scheduleSave = (id: string, partial: Partial<Note>) => {
    patch(id, partial);
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    setSaving(true);
    saveTimer.current = window.setTimeout(async () => {
      const { error } = await supabase.from("notes").update(partial as any).eq("id", id);
      setSaving(false);
      if (error) toast.error(error.message);
    }, 500);
  };

  const togglePin = async (n: Note) => {
    const next = !n.pinned;
    patch(n.id, { pinned: next });
    const { error } = await supabase.from("notes").update({ pinned: next }).eq("id", n.id);
    if (error) toast.error(error.message);
    else setNotes((p) => [...p].sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.updated_at.localeCompare(a.updated_at)));
  };

  const setColor = async (n: Note, color: string) => {
    patch(n.id, { color });
    const { error } = await supabase.from("notes").update({ color }).eq("id", n.id);
    if (error) toast.error(error.message);
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("notes").delete().eq("id", id);
    if (error) return toast.error(error.message);
    setNotes((p) => p.filter((n) => n.id !== id));
    if (activeId === id) setActiveId(null);
    toast.success("Note deleted");
  };

  return (
    <div className="max-w-7xl mx-auto h-[calc(100vh-9rem)] flex flex-col">
      <header className="flex items-center justify-between mb-5">
        <div>
          <h1 className="font-display text-2xl md:text-3xl text-foreground flex items-center gap-2">
            <NotebookPen className="h-6 w-6 text-primary" /> iSchool Notes
          </h1>
          <p className="text-sm text-muted-foreground">Your interactive learning workspace.</p>
        </div>
        <Button onClick={createNote} className="gap-2"><Plus className="h-4 w-4" /> New note</Button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-[320px_1fr] gap-4 flex-1 min-h-0">
        {/* List */}
        <aside className="flex flex-col bg-card border border-border rounded-xl overflow-hidden">
          <div className="p-3 border-b border-border">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search notes…" className="pl-8" />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="p-6 text-center text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin inline mr-2" />Loading…</div>
            ) : filtered.length === 0 ? (
              <div className="p-6 text-center text-sm text-muted-foreground">
                {notes.length === 0 ? "No notes yet. Create your first." : "No matches."}
              </div>
            ) : (
              <ul>
                {filtered.map((n) => (
                  <li key={n.id}>
                    <button
                      onClick={() => setActiveId(n.id)}
                      className={cn(
                        "w-full text-left px-4 py-3 border-b border-border/60 hover:bg-muted/50 transition-colors",
                        activeId === n.id && "bg-secondary/70",
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <span className={cn("h-2.5 w-2.5 rounded-full shrink-0", cardTone[n.color] ?? "bg-secondary")} />
                        <span className="font-medium text-foreground truncate">{n.title || "Untitled"}</span>
                        {n.pinned && <Pin className="h-3.5 w-3.5 text-accent ml-auto shrink-0" />}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{n.content || "Empty note"}</p>
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground/70 mt-1">
                        {new Date(n.updated_at).toLocaleString()}
                      </p>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </aside>

        {/* Editor */}
        <section className={cn("rounded-xl border border-border overflow-hidden flex flex-col min-h-0", active ? cardTone[active.color] : "bg-card")}>
          {!active ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-muted-foreground">
              <NotebookPen className="h-10 w-10 mb-3 opacity-40" />
              <p className="font-medium">Select or create a note</p>
              <p className="text-sm">Your notes autosave as you type.</p>
            </div>
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-2 p-3 border-b border-border/60 bg-card/50 backdrop-blur">
                <Input
                  value={active.subject ?? ""}
                  onChange={(e) => scheduleSave(active.id, { subject: e.target.value })}
                  placeholder="Subject"
                  className="w-40 h-8"
                />
                <div className="flex items-center gap-1.5 ml-1">
                  {COLORS.map((c) => (
                    <button
                      key={c.value}
                      onClick={() => setColor(active, c.value)}
                      className={cn(
                        "h-6 w-6 rounded-full border border-border/70 transition-transform hover:scale-110",
                        c.swatch,
                        active.color === c.value && "ring-2 ring-offset-2 ring-offset-background", c.ring,
                      )}
                      aria-label={`Color ${c.value}`}
                    />
                  ))}
                </div>
                <div className="ml-auto flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">{saving ? "Saving…" : "Saved"}</span>
                  <Button size="sm" variant="ghost" onClick={() => togglePin(active)}>
                    {active.pinned ? <PinOff className="h-4 w-4" /> : <Pin className="h-4 w-4" />}
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete this note?</AlertDialogTitle>
                        <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => remove(active.id)}>Delete</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-6 md:p-8">
                <Input
                  value={active.title}
                  onChange={(e) => scheduleSave(active.id, { title: e.target.value })}
                  placeholder="Note title"
                  className="border-0 bg-transparent px-0 text-2xl md:text-3xl font-display font-semibold focus-visible:ring-0 shadow-none h-auto"
                />
                
                <Tabs defaultValue="editor" className="w-full mt-6">
                  <TabsList className="grid w-full grid-cols-3 mb-4">
                    <TabsTrigger value="editor">Write</TabsTrigger>
                    <TabsTrigger value="media">Media</TabsTrigger>
                    <TabsTrigger value="exercises">Exercises</TabsTrigger>
                  </TabsList>

                  <TabsContent value="editor" className="mt-0">
                    <div className="space-y-4">
                      <RichTextEditor
                        content={active.content}
                        onChange={(html) => scheduleSave(active.id, { content: html })}
                        placeholder="Start writing… Add formatted text, links, and embeds."
                        className="min-h-[400px]"
                      />
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Eye className="h-3 w-3" />
                        <span>Reading progress: {active.reading_progress ?? 0}%</span>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="media" className="mt-0">
                    <MediaEmbedManager
                      embeds={active.media_embeds ?? []}
                      onAdd={(embed) => {
                        const updated = [...(active.media_embeds ?? []), embed];
                        scheduleSave(active.id, { media_embeds: updated });
                      }}
                      onRemove={(id) => {
                        const updated = (active.media_embeds ?? []).filter((e) => e.id !== id);
                        scheduleSave(active.id, { media_embeds: updated });
                      }}
                    />
                  </TabsContent>

                  <TabsContent value="exercises" className="mt-0">
                    <ExerciseManager
                      exercises={active.exercises ?? []}
                      onAdd={(exercise) => {
                        const updated = [...(active.exercises ?? []), exercise];
                        scheduleSave(active.id, { exercises: updated });
                      }}
                      onRemove={(id) => {
                        const updated = (active.exercises ?? []).filter((e) => e.id !== id);
                        scheduleSave(active.id, { exercises: updated });
                      }}
                      onSubmitAnswer={(id, answer) => {
                        const updated = (active.exercises ?? []).map((e) =>
                          e.id === id ? { ...e, userAnswer: answer } : e
                        );
                        scheduleSave(active.id, { exercises: updated });
                      }}
                    />
                  </TabsContent>
                </Tabs>
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
