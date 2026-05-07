import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { Presentation, Plus, Save, Trash2, Eraser, Pencil, Download } from "lucide-react";

type Stroke = { color: string; size: number; points: { x: number; y: number }[] };
type Board = { id: string; user_id: string; title: string; data: { strokes: Stroke[] }; thumbnail: string | null };

const COLORS = ["#0a1f44", "#c9a84c", "#e85d3a", "#2d8a9e", "#1a3c2a", "#000000"];
const SIZES = [2, 4, 8, 14];

export default function WhiteboardPage() {
  const { user } = useAuth();
  const [boards, setBoards] = useState<Board[]>([]);
  const [active, setActive] = useState<Board | null>(null);
  const [color, setColor] = useState(COLORS[0]);
  const [size, setSize] = useState(4);
  const [tool, setTool] = useState<"pen" | "eraser">("pen");
  const [title, setTitle] = useState("");
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const strokes = useRef<Stroke[]>([]);
  const current = useRef<Stroke | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase.from("whiteboards").select("*").order("updated_at", { ascending: false })
      .then(({ data }) => setBoards((data ?? []) as unknown as Board[]));
  }, [user]);

  useEffect(() => {
    if (!active) return;
    strokes.current = active.data?.strokes ?? [];
    setTitle(active.title);
    redraw();
  }, [active]);

  const redraw = () => {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext("2d")!;
    ctx.fillStyle = "#fdfaf3";
    ctx.fillRect(0, 0, c.width, c.height);
    strokes.current.forEach((s) => {
      ctx.strokeStyle = s.color;
      ctx.lineWidth = s.size;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.beginPath();
      s.points.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
      ctx.stroke();
    });
  };

  const pos = (e: React.PointerEvent) => {
    const r = canvasRef.current!.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * canvasRef.current!.width, y: ((e.clientY - r.top) / r.height) * canvasRef.current!.height };
  };

  const start = (e: React.PointerEvent) => {
    if (!active) return;
    drawing.current = true;
    current.current = { color: tool === "eraser" ? "#fdfaf3" : color, size: tool === "eraser" ? size * 4 : size, points: [pos(e)] };
  };
  const move = (e: React.PointerEvent) => {
    if (!drawing.current || !current.current) return;
    current.current.points.push(pos(e));
    const ctx = canvasRef.current!.getContext("2d")!;
    const pts = current.current.points;
    ctx.strokeStyle = current.current.color;
    ctx.lineWidth = current.current.size;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(pts[pts.length - 2].x, pts[pts.length - 2].y);
    ctx.lineTo(pts[pts.length - 1].x, pts[pts.length - 1].y);
    ctx.stroke();
  };
  const end = () => {
    if (current.current) strokes.current.push(current.current);
    current.current = null;
    drawing.current = false;
  };

  const newBoard = async () => {
    if (!user) return;
    const { data, error } = await supabase.from("whiteboards").insert({ user_id: user.id, title: "Untitled board" }).select().single();
    if (error) return toast.error(error.message);
    const b = data as unknown as Board;
    setBoards((p) => [b, ...p]);
    setActive(b);
  };

  const save = async () => {
    if (!active) return;
    const thumb = canvasRef.current?.toDataURL("image/png", 0.3) ?? null;
    const { error } = await supabase.from("whiteboards").update({
      title,
      data: { strokes: strokes.current } as any,
      thumbnail: thumb,
    }).eq("id", active.id);
    if (error) return toast.error(error.message);
    setBoards((p) => p.map((b) => (b.id === active.id ? { ...b, title, thumbnail: thumb, data: { strokes: strokes.current } } : b)));
    toast.success("Board saved");
  };

  const saveToNotes = async () => {
    if (!user || !active) return;
    const thumb = canvasRef.current?.toDataURL("image/png");
    if (!thumb) return;
    const { error } = await supabase.from("notes").insert({
      user_id: user.id,
      title: `Board: ${title || "Untitled"}`,
      content: `<p>Saved from whiteboard</p><img src="${thumb}" alt="Whiteboard capture" />`,
    });
    if (error) return toast.error(error.message);
    toast.success("Saved to your Notes");
  };

  const clear = () => {
    if (!confirm("Clear the board?")) return;
    strokes.current = [];
    redraw();
  };

  const remove = async (id: string) => {
    await supabase.from("whiteboards").delete().eq("id", id);
    setBoards((p) => p.filter((b) => b.id !== id));
    if (active?.id === id) setActive(null);
  };

  const download = () => {
    const url = canvasRef.current!.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = url; a.download = `${title || "board"}.png`; a.click();
  };

  if (!active) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="font-display text-3xl font-bold text-primary flex items-center gap-2">
              <Presentation className="h-7 w-7" /> iSchool Whiteboard
            </h1>
            <p className="text-muted-foreground">Live digital classroom — draw, annotate, save into notes.</p>
          </div>
          <Button onClick={newBoard}><Plus className="h-4 w-4 mr-2" /> New board</Button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {boards.map((b) => (
            <Card key={b.id} className="p-3 cursor-pointer hover:shadow-elevated transition group" onClick={() => setActive(b)}>
              <div className="aspect-video bg-secondary/40 rounded-md mb-2 overflow-hidden flex items-center justify-center">
                {b.thumbnail ? <img src={b.thumbnail} alt={b.title} className="w-full h-full object-contain" /> : <Presentation className="h-10 w-10 text-muted-foreground" />}
              </div>
              <div className="flex items-center justify-between">
                <span className="font-semibold text-primary truncate">{b.title}</span>
                <button onClick={(e) => { e.stopPropagation(); remove(b.id); }}>
                  <Trash2 className="h-4 w-4 text-destructive opacity-0 group-hover:opacity-100" />
                </button>
              </div>
            </Card>
          ))}
          {boards.length === 0 && <div className="col-span-full text-center text-muted-foreground py-12">No boards yet. Create one!</div>}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <Button variant="ghost" onClick={() => setActive(null)}>← Back</Button>
        <Input className="max-w-xs" value={title} onChange={(e) => setTitle(e.target.value)} />
        <div className="flex-1" />
        <Button variant="outline" onClick={download}><Download className="h-4 w-4 mr-1" /> PNG</Button>
        <Button variant="outline" onClick={saveToNotes}>Save to Notes</Button>
        <Button onClick={save}><Save className="h-4 w-4 mr-1" /> Save</Button>
      </div>

      <Card className="p-3 flex items-center gap-3 flex-wrap">
        <Button size="sm" variant={tool === "pen" ? "default" : "outline"} onClick={() => setTool("pen")}><Pencil className="h-4 w-4" /></Button>
        <Button size="sm" variant={tool === "eraser" ? "default" : "outline"} onClick={() => setTool("eraser")}><Eraser className="h-4 w-4" /></Button>
        <div className="flex gap-1 ml-2">
          {COLORS.map((c) => (
            <button key={c} onClick={() => { setColor(c); setTool("pen"); }} className={`h-7 w-7 rounded-full border-2 ${color === c && tool === "pen" ? "border-foreground" : "border-border"}`} style={{ background: c }} />
          ))}
        </div>
        <div className="flex gap-1 ml-2">
          {SIZES.map((s) => (
            <button key={s} onClick={() => setSize(s)} className={`h-8 w-8 rounded-md border flex items-center justify-center ${size === s ? "border-primary bg-primary/10" : "border-border"}`}>
              <span className="rounded-full bg-foreground" style={{ width: s, height: s }} />
            </button>
          ))}
        </div>
        <div className="flex-1" />
        <Button size="sm" variant="ghost" onClick={clear}><Trash2 className="h-4 w-4 mr-1" /> Clear</Button>
      </Card>

      <Card className="p-2 overflow-hidden">
        <canvas
          ref={canvasRef}
          width={1600}
          height={900}
          onPointerDown={start}
          onPointerMove={move}
          onPointerUp={end}
          onPointerLeave={end}
          className="w-full rounded-md touch-none"
          style={{ background: "#fdfaf3", aspectRatio: "16 / 9" }}
        />
      </Card>
    </div>
  );
}
