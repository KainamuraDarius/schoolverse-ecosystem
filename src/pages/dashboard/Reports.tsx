import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Plus, Trash2, BookOpen, Award, TrendingUp, Trophy } from "lucide-react";
import { toast } from "sonner";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip,
  ResponsiveContainer, Legend,
} from "recharts";

type AssessmentType = "test" | "quiz" | "assignment" | "exam" | "project";
type Subject = { id: string; name: string; code: string | null; color: string };
type Assessment = {
  id: string; subject_id: string; title: string; assessment_type: AssessmentType;
  score: number; max_score: number; weight: number; term: string; assessed_on: string; notes: string | null;
};

const TERMS = ["Term 1", "Term 2", "Term 3"];

function grade(pct: number) {
  if (pct >= 80) return { letter: "A", tone: "bg-primary/15 text-primary border-primary/30" };
  if (pct >= 70) return { letter: "B", tone: "bg-accent/20 text-accent-foreground border-accent/40" };
  if (pct >= 60) return { letter: "C", tone: "bg-secondary text-secondary-foreground border-border" };
  if (pct >= 50) return { letter: "D", tone: "bg-muted text-muted-foreground border-border" };
  return { letter: "F", tone: "bg-destructive/15 text-destructive border-destructive/30" };
}

export default function ReportsModule() {
  const { user } = useAuth();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [term, setTerm] = useState("Term 1");
  const [subjOpen, setSubjOpen] = useState(false);
  const [newSubj, setNewSubj] = useState({ name: "", code: "" });
  const [assessOpen, setAssessOpen] = useState(false);
  const [editing, setEditing] = useState<Assessment | null>(null);

  useEffect(() => {
    if (!user) return;
    Promise.all([
      supabase.from("subjects").select("*").order("name"),
      supabase.from("assessments").select("*").order("assessed_on", { ascending: false }),
    ]).then(([s, a]) => {
      if (s.error) toast.error(s.error.message); else setSubjects(s.data as Subject[]);
      if (a.error) toast.error(a.error.message); else setAssessments(a.data as Assessment[]);
    });
  }, [user]);

  const termAssessments = useMemo(
    () => assessments.filter(a => a.term === term),
    [assessments, term]
  );

  const subjectStats = useMemo(() => {
    return subjects.map(s => {
      const items = termAssessments.filter(a => a.subject_id === s.id);
      const totalWeight = items.reduce((sum, a) => sum + Number(a.weight), 0);
      const weightedPct = totalWeight > 0
        ? items.reduce((sum, a) => sum + (Number(a.score) / Number(a.max_score) * 100) * Number(a.weight), 0) / totalWeight
        : null;
      return { subject: s, count: items.length, average: weightedPct };
    });
  }, [subjects, termAssessments]);

  const overall = useMemo(() => {
    const valid = subjectStats.filter(s => s.average !== null);
    if (!valid.length) return null;
    return valid.reduce((sum, s) => sum + (s.average ?? 0), 0) / valid.length;
  }, [subjectStats]);

  // Performance trend over time (chronological, by date)
  const trendData = useMemo(() => {
    const sorted = [...termAssessments].sort(
      (a, b) => a.assessed_on.localeCompare(b.assessed_on)
    );
    const points: { date: string; pct: number; rolling: number }[] = [];
    let sum = 0;
    sorted.forEach((a, idx) => {
      const pct = (Number(a.score) / Number(a.max_score)) * 100;
      sum += pct;
      points.push({
        date: a.assessed_on.slice(5),
        pct: Number(pct.toFixed(1)),
        rolling: Number((sum / (idx + 1)).toFixed(1)),
      });
    });
    return points;
  }, [termAssessments]);

  // Subject ranking (best to worst this term)
  const ranking = useMemo(() => {
    return subjectStats
      .filter((s) => s.average !== null)
      .sort((a, b) => (b.average ?? 0) - (a.average ?? 0));
  }, [subjectStats]);

  const createSubject = async () => {
    if (!user || !newSubj.name.trim()) return;
    const { data, error } = await supabase.from("subjects")
      .insert({ user_id: user.id, name: newSubj.name.trim(), code: newSubj.code.trim() || null })
      .select().single();
    if (error) return toast.error(error.message);
    setSubjects(s => [...s, data as Subject]);
    setNewSubj({ name: "", code: "" });
    setSubjOpen(false);
    toast.success("Subject added");
  };

  const deleteSubject = async (id: string) => {
    if (!confirm("Delete subject and all its assessments?")) return;
    const { error } = await supabase.from("subjects").delete().eq("id", id);
    if (error) return toast.error(error.message);
    setSubjects(s => s.filter(x => x.id !== id));
    setAssessments(a => a.filter(x => x.subject_id !== id));
  };

  const openNewAssessment = () => {
    if (!subjects.length) { toast.error("Add a subject first"); return; }
    setEditing({
      id: "", subject_id: subjects[0].id, title: "", assessment_type: "test",
      score: 0, max_score: 100, weight: 1, term, assessed_on: new Date().toISOString().slice(0, 10), notes: "",
    });
    setAssessOpen(true);
  };

  const saveAssessment = async () => {
    if (!editing || !user) return;
    const payload = {
      subject_id: editing.subject_id,
      title: editing.title || "Untitled",
      assessment_type: editing.assessment_type,
      score: Number(editing.score),
      max_score: Number(editing.max_score),
      weight: Number(editing.weight),
      term: editing.term,
      assessed_on: editing.assessed_on,
      notes: editing.notes,
    };
    if (editing.id) {
      const { error } = await supabase.from("assessments").update(payload).eq("id", editing.id);
      if (error) return toast.error(error.message);
      setAssessments(a => a.map(x => x.id === editing.id ? { ...x, ...payload } as Assessment : x));
    } else {
      const { data, error } = await supabase.from("assessments")
        .insert({ ...payload, user_id: user.id }).select().single();
      if (error) return toast.error(error.message);
      setAssessments(a => [data as Assessment, ...a]);
    }
    setAssessOpen(false); setEditing(null);
    toast.success("Saved");
  };

  const removeAssessment = async () => {
    if (!editing?.id) return;
    const { error } = await supabase.from("assessments").delete().eq("id", editing.id);
    if (error) return toast.error(error.message);
    setAssessments(a => a.filter(x => x.id !== editing.id));
    setAssessOpen(false); setEditing(null);
  };

  const subjectName = (id: string) => subjects.find(s => s.id === id)?.name ?? "—";

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl md:text-3xl text-foreground">iSchool Reports</h1>
          <p className="text-sm text-muted-foreground">Continuous assessment & automated report cards.</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={term} onValueChange={setTerm}>
            <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {TERMS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={() => setSubjOpen(true)}>
            <BookOpen className="h-4 w-4 mr-1" /> Subject
          </Button>
          <Button onClick={openNewAssessment}>
            <Plus className="h-4 w-4 mr-1" /> Assessment
          </Button>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-5">
          <div className="flex items-center gap-2 text-muted-foreground text-xs uppercase tracking-wider">
            <Award className="h-4 w-4" /> Overall average
          </div>
          <div className="font-display text-3xl mt-2">
            {overall !== null ? `${overall.toFixed(1)}%` : "—"}
          </div>
          {overall !== null && (
            <Badge variant="outline" className={`mt-2 ${grade(overall).tone}`}>Grade {grade(overall).letter}</Badge>
          )}
        </Card>
        <Card className="p-5">
          <div className="flex items-center gap-2 text-muted-foreground text-xs uppercase tracking-wider">
            <BookOpen className="h-4 w-4" /> Subjects
          </div>
          <div className="font-display text-3xl mt-2">{subjects.length}</div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center gap-2 text-muted-foreground text-xs uppercase tracking-wider">
            <TrendingUp className="h-4 w-4" /> {term} entries
          </div>
          <div className="font-display text-3xl mt-2">{termAssessments.length}</div>
        </Card>
      </div>

      <Card className="p-5">
        <h2 className="font-display text-lg mb-4">Report card · {term}</h2>
        {subjects.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">No subjects yet. Add one to get started.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Subject</TableHead>
                <TableHead className="text-center">Entries</TableHead>
                <TableHead className="text-right">Average</TableHead>
                <TableHead className="text-center">Grade</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {subjectStats.map(({ subject, count, average }) => {
                const g = average !== null ? grade(average) : null;
                return (
                  <TableRow key={subject.id}>
                    <TableCell className="font-medium">
                      {subject.name}
                      {subject.code && <span className="ml-2 text-xs text-muted-foreground">{subject.code}</span>}
                    </TableCell>
                    <TableCell className="text-center text-muted-foreground">{count}</TableCell>
                    <TableCell className="text-right font-mono">
                      {average !== null ? `${average.toFixed(1)}%` : "—"}
                    </TableCell>
                    <TableCell className="text-center">
                      {g ? <Badge variant="outline" className={g.tone}>{g.letter}</Badge> : <span className="text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell>
                      <Button size="icon" variant="ghost" onClick={() => deleteSubject(subject.id)}>
                        <Trash2 className="h-4 w-4 text-muted-foreground" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-lg flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" /> Performance trend
            </h2>
            <span className="text-xs text-muted-foreground">{term}</span>
          </div>
          {trendData.length === 0 ? (
            <p className="text-sm text-muted-foreground py-12 text-center">No data yet — record an assessment to see trends.</p>
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendData} margin={{ top: 5, right: 12, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                  <YAxis domain={[0, 100]} stroke="hsl(var(--muted-foreground))" fontSize={11} />
                  <RTooltip
                    contentStyle={{
                      background: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Line type="monotone" dataKey="pct" name="Score %" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="rolling" name="Running avg" stroke="hsl(var(--accent))" strokeWidth={2} strokeDasharray="4 4" dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>

        <Card className="p-5">
          <h2 className="font-display text-lg mb-4 flex items-center gap-2">
            <Trophy className="h-4 w-4 text-primary" /> Subject ranking
          </h2>
          {ranking.length === 0 ? (
            <p className="text-sm text-muted-foreground py-12 text-center">No graded subjects yet.</p>
          ) : (
            <ol className="space-y-2">
              {ranking.map((r, idx) => {
                const g = grade(r.average ?? 0);
                return (
                  <li key={r.subject.id} className="flex items-center gap-3 p-2 rounded-md border border-border/60">
                    <span className={`h-7 w-7 shrink-0 rounded-full flex items-center justify-center text-xs font-semibold ${
                      idx === 0 ? "bg-primary text-primary-foreground"
                      : idx === 1 ? "bg-accent text-accent-foreground"
                      : idx === 2 ? "bg-secondary text-secondary-foreground"
                      : "bg-muted text-muted-foreground"
                    }`}>{idx + 1}</span>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">{r.subject.name}</div>
                      <div className="text-xs text-muted-foreground">{r.count} entries</div>
                    </div>
                    <Badge variant="outline" className={g.tone}>
                      {(r.average ?? 0).toFixed(1)}%
                    </Badge>
                  </li>
                );
              })}
            </ol>
          )}
        </Card>
      </div>

      <Card className="p-5">
        <h2 className="font-display text-lg mb-4">Assessments · {term}</h2>
        {termAssessments.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">No assessments recorded for this term.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Subject</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Score</TableHead>
                <TableHead className="text-right">%</TableHead>
                <TableHead className="text-right">Weight</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {termAssessments.map(a => {
                const pct = (Number(a.score) / Number(a.max_score)) * 100;
                return (
                  <TableRow key={a.id} className="cursor-pointer" onClick={() => { setEditing(a); setAssessOpen(true); }}>
                    <TableCell className="text-muted-foreground text-sm">{a.assessed_on}</TableCell>
                    <TableCell>{subjectName(a.subject_id)}</TableCell>
                    <TableCell className="font-medium">{a.title}</TableCell>
                    <TableCell><Badge variant="outline">{a.assessment_type}</Badge></TableCell>
                    <TableCell className="text-right font-mono">{a.score}/{a.max_score}</TableCell>
                    <TableCell className="text-right font-mono">{pct.toFixed(1)}%</TableCell>
                    <TableCell className="text-right text-muted-foreground">×{a.weight}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </Card>

      <Dialog open={subjOpen} onOpenChange={setSubjOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>New subject</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Name</Label>
              <Input value={newSubj.name} onChange={(e) => setNewSubj({ ...newSubj, name: e.target.value })} placeholder="Mathematics" />
            </div>
            <div className="space-y-1.5">
              <Label>Code (optional)</Label>
              <Input value={newSubj.code} onChange={(e) => setNewSubj({ ...newSubj, code: e.target.value })} placeholder="MATH101" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSubjOpen(false)}>Cancel</Button>
            <Button onClick={createSubject}>Add</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={assessOpen} onOpenChange={(v) => { setAssessOpen(v); if (!v) setEditing(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editing?.id ? "Edit assessment" : "New assessment"}</DialogTitle></DialogHeader>
          {editing && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Subject</Label>
                  <Select value={editing.subject_id} onValueChange={(v) => setEditing({ ...editing, subject_id: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {subjects.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Type</Label>
                  <Select value={editing.assessment_type} onValueChange={(v) => setEditing({ ...editing, assessment_type: v as AssessmentType })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {(["test","quiz","assignment","exam","project"] as AssessmentType[]).map(t =>
                        <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Title</Label>
                <Input value={editing.title} onChange={(e) => setEditing({ ...editing, title: e.target.value })} placeholder="Algebra mid-term" />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label>Score</Label>
                  <Input type="number" value={editing.score} onChange={(e) => setEditing({ ...editing, score: Number(e.target.value) })} />
                </div>
                <div className="space-y-1.5">
                  <Label>Out of</Label>
                  <Input type="number" value={editing.max_score} onChange={(e) => setEditing({ ...editing, max_score: Number(e.target.value) })} />
                </div>
                <div className="space-y-1.5">
                  <Label>Weight</Label>
                  <Input type="number" step="0.1" value={editing.weight} onChange={(e) => setEditing({ ...editing, weight: Number(e.target.value) })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Term</Label>
                  <Select value={editing.term} onValueChange={(v) => setEditing({ ...editing, term: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{TERMS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Date</Label>
                  <Input type="date" value={editing.assessed_on} onChange={(e) => setEditing({ ...editing, assessed_on: e.target.value })} />
                </div>
              </div>
            </div>
          )}
          <DialogFooter className="gap-2 sm:justify-between">
            {editing?.id ? (
              <Button variant="ghost" className="text-destructive hover:text-destructive" onClick={removeAssessment}>
                <Trash2 className="h-4 w-4 mr-1" /> Delete
              </Button>
            ) : <span />}
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setAssessOpen(false)}>Cancel</Button>
              <Button onClick={saveAssessment}>Save</Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
