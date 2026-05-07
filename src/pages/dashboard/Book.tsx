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
    </div>
  );
}
