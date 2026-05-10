import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, GraduationCap, Plus, ClipboardList, TrendingUp, BookOpen } from "lucide-react";
import { toast } from "sonner";

type Klass = {
  id: string; name: string; stream: string; term: string;
  teacher_id: string | null; teacher_name: string | null;
};
type Enrollment = {
  id: string; class_id: string; student_id: string;
  student_name: string; admission_no: string | null;
};
type Subject = { id: string; name: string };
type Assessment = {
  id: string; title: string; score: number; max_score: number;
  assessment_type: string; assessed_on: string; class_id: string | null;
  student_id: string | null; student_name: string | null; subject_name: string | null;
};

export default function TeacherPage() {
  const { user } = useAuth();
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [classes, setClasses] = useState<Klass[]>([]);
  const [enroll, setEnroll] = useState<Enrollment[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [activeClassId, setActiveClassId] = useState<string | null>(null);

  // dialogs
  const [classOpen, setClassOpen] = useState(false);
  const [studentOpen, setStudentOpen] = useState(false);
  const [scoreOpen, setScoreOpen] = useState(false);

  const [newClass, setNewClass] = useState({ name: "", stream: "", term: "Term 1" });
  const [newStudent, setNewStudent] = useState({ name: "", admission_no: "" });
  const [newScore, setNewScore] = useState({
    student_id: "", subject_id: "", title: "Quiz",
    score: "", max_score: "100", assessment_type: "test",
  });

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: roles } = await supabase
        .from("user_roles").select("role").eq("user_id", user.id);
      const rs = (roles ?? []).map((r: any) => r.role);
      const ok = rs.includes("teacher") || rs.includes("admin");
      setAllowed(ok);
      if (ok) await loadAll();
    })();
  }, [user]);

  const loadAll = async () => {
    if (!user) return;
    const [cRes, eRes, sRes, aRes] = await Promise.all([
      supabase.from("school_classes").select("*")
        .or(`owner_id.eq.${user.id},teacher_id.eq.${user.id}`)
        .order("created_at", { ascending: false }),
      supabase.from("class_enrollments").select("*").eq("owner_id", user.id),
      supabase.from("subjects").select("id,name").eq("user_id", user.id).order("name"),
      supabase.from("assessments").select(
        "id,title,score,max_score,assessment_type,assessed_on,class_id,student_id,student_name,subject_name"
      ).eq("recorded_by", user.id).order("assessed_on", { ascending: false }).limit(200),
    ]);
    if (cRes.error) toast.error(cRes.error.message);
    setClasses((cRes.data ?? []) as Klass[]);
    setEnroll((eRes.data ?? []) as Enrollment[]);
    setSubjects((sRes.data ?? []) as Subject[]);
    setAssessments((aRes.data ?? []) as Assessment[]);
    if (!activeClassId && cRes.data?.length) setActiveClassId(cRes.data[0].id);
  };

  const createClass = async () => {
    if (!user || !newClass.name.trim()) return;
    const { error, data } = await supabase.from("school_classes").insert({
      owner_id: user.id, teacher_id: user.id,
      teacher_name: user.email ?? "Teacher",
      name: newClass.name.trim(),
      stream: newClass.stream.trim(),
      term: newClass.term,
    }).select().single();
    if (error) return toast.error(error.message);
    toast.success("Class created");
    setClassOpen(false);
    setNewClass({ name: "", stream: "", term: "Term 1" });
    setActiveClassId(data.id);
    await loadAll();
  };

  const addStudent = async () => {
    if (!user || !activeClassId || !newStudent.name.trim()) return;
    // Use a synthetic UUID for student_id when no auth user is linked yet.
    const fakeId = crypto.randomUUID();
    const { error } = await supabase.from("class_enrollments").insert({
      owner_id: user.id, class_id: activeClassId,
      student_id: fakeId, student_name: newStudent.name.trim(),
      admission_no: newStudent.admission_no.trim() || null,
    });
    if (error) return toast.error(error.message);
    toast.success("Student enrolled");
    setStudentOpen(false);
    setNewStudent({ name: "", admission_no: "" });
    await loadAll();
  };

  const recordScore = async () => {
    if (!user || !activeClassId) return;
    const stu = enroll.find((e) => e.student_id === newScore.student_id);
    const subj = subjects.find((s) => s.id === newScore.subject_id);
    if (!stu || !subj) return toast.error("Pick a student and subject");
    const { error } = await supabase.from("assessments").insert({
      user_id: user.id,
      recorded_by: user.id,
      recorded_by_name: user.email ?? "Teacher",
      subject_id: subj.id,
      subject_name: subj.name,
      class_id: activeClassId,
      student_id: stu.student_id,
      student_name: stu.student_name,
      title: newScore.title || "Assessment",
      score: Number(newScore.score) || 0,
      max_score: Number(newScore.max_score) || 100,
      assessment_type: newScore.assessment_type as any,
    });
    if (error) return toast.error(error.message);
    toast.success("Score recorded");
    setScoreOpen(false);
    setNewScore({ ...newScore, score: "" });
    await loadAll();
  };

  const activeClass = classes.find((c) => c.id === activeClassId) || null;
  const classStudents = useMemo(
    () => enroll.filter((e) => e.class_id === activeClassId),
    [enroll, activeClassId],
  );
  const classScores = useMemo(
    () => assessments.filter((a) => a.class_id === activeClassId),
    [assessments, activeClassId],
  );
  const classAvg = useMemo(() => {
    if (!classScores.length) return null;
    const pcts = classScores.map((a) => (Number(a.score) / Number(a.max_score || 1)) * 100);
    return Math.round(pcts.reduce((s, x) => s + x, 0) / pcts.length);
  }, [classScores]);

  if (allowed === null) return <div className="text-muted-foreground">Loading…</div>;

  if (!allowed) {
    return (
      <div className="max-w-xl mx-auto">
        <Card className="p-8 text-center space-y-3">
          <GraduationCap className="h-10 w-10 mx-auto text-muted-foreground" />
          <h1 className="font-display text-2xl">Teacher access required</h1>
          <p className="text-sm text-muted-foreground">
            This workspace is for teachers and admins. Ask an administrator to grant you the
            <span className="font-medium"> teacher</span> role from School administration.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <header className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-display text-2xl md:text-3xl text-foreground flex items-center gap-2">
            <GraduationCap className="h-7 w-7 text-primary" /> Teacher workspace
          </h1>
          <p className="text-sm text-muted-foreground">
            Manage your classes, enroll students, and record assessments.
          </p>
        </div>
        <Dialog open={classOpen} onOpenChange={setClassOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-1" /> New class</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Create a class</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Name</Label><Input value={newClass.name}
                onChange={(e) => setNewClass({ ...newClass, name: e.target.value })}
                placeholder="Form 3 East" /></div>
              <div><Label>Stream</Label><Input value={newClass.stream}
                onChange={(e) => setNewClass({ ...newClass, stream: e.target.value })}
                placeholder="East" /></div>
              <div>
                <Label>Term</Label>
                <Select value={newClass.term} onValueChange={(v) => setNewClass({ ...newClass, term: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Term 1">Term 1</SelectItem>
                    <SelectItem value="Term 2">Term 2</SelectItem>
                    <SelectItem value="Term 3">Term 3</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter><Button onClick={createClass}>Create</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </header>

      <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Stat icon={Users} label="Classes" value={classes.length} />
        <Stat icon={GraduationCap} label="Students" value={enroll.length} />
        <Stat icon={ClipboardList} label="Assessments" value={assessments.length} />
        <Stat icon={TrendingUp} label="Class avg"
          value={classAvg === null ? "—" : `${classAvg}%`} />
      </section>

      {classes.length === 0 ? (
        <Card className="p-10 text-center">
          <BookOpen className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground">No classes yet. Create your first class to begin.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-4">
          <Card className="p-3">
            <div className="text-xs uppercase tracking-wider text-muted-foreground px-2 pb-2">My classes</div>
            <ul className="space-y-1">
              {classes.map((c) => {
                const active = c.id === activeClassId;
                return (
                  <li key={c.id}>
                    <button
                      onClick={() => setActiveClassId(c.id)}
                      className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                        active ? "bg-secondary text-foreground" : "hover:bg-secondary/60 text-muted-foreground"
                      }`}
                    >
                      <div className="font-medium text-foreground">{c.name}</div>
                      <div className="text-[11px] text-muted-foreground">
                        {c.stream || "—"} · {c.term}
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          </Card>

          <Card className="p-5">
            {!activeClass ? (
              <p className="text-sm text-muted-foreground">Select a class.</p>
            ) : (
              <Tabs defaultValue="students" className="w-full">
                <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
                  <div>
                    <h2 className="font-display text-xl">{activeClass.name}</h2>
                    <p className="text-xs text-muted-foreground">
                      {activeClass.stream || "—"} · {activeClass.term}
                    </p>
                  </div>
                  <TabsList>
                    <TabsTrigger value="students">Students</TabsTrigger>
                    <TabsTrigger value="scores">Scores</TabsTrigger>
                  </TabsList>
                </div>

                <TabsContent value="students" className="space-y-3">
                  <div className="flex justify-end">
                    <Dialog open={studentOpen} onOpenChange={setStudentOpen}>
                      <DialogTrigger asChild>
                        <Button size="sm" variant="outline"><Plus className="h-4 w-4 mr-1" /> Enroll student</Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader><DialogTitle>Enroll a student</DialogTitle></DialogHeader>
                        <div className="space-y-3">
                          <div><Label>Full name</Label><Input value={newStudent.name}
                            onChange={(e) => setNewStudent({ ...newStudent, name: e.target.value })} /></div>
                          <div><Label>Admission no.</Label><Input value={newStudent.admission_no}
                            onChange={(e) => setNewStudent({ ...newStudent, admission_no: e.target.value })} /></div>
                        </div>
                        <DialogFooter><Button onClick={addStudent}>Enroll</Button></DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </div>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Student</TableHead>
                        <TableHead>Adm.</TableHead>
                        <TableHead className="text-right">Avg</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {classStudents.map((s) => {
                        const own = classScores.filter((a) => a.student_id === s.student_id);
                        const avg = own.length
                          ? Math.round(own.reduce((sum, a) =>
                              sum + (Number(a.score) / Number(a.max_score || 1)) * 100, 0) / own.length)
                          : null;
                        return (
                          <TableRow key={s.id}>
                            <TableCell className="font-medium">{s.student_name}</TableCell>
                            <TableCell className="text-muted-foreground text-sm">
                              {s.admission_no || "—"}
                            </TableCell>
                            <TableCell className="text-right">
                              {avg === null ? <span className="text-muted-foreground">—</span> : `${avg}%`}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                      {classStudents.length === 0 && (
                        <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground py-6">
                          No students enrolled yet.
                        </TableCell></TableRow>
                      )}
                    </TableBody>
                  </Table>
                </TabsContent>

                <TabsContent value="scores" className="space-y-3">
                  <div className="flex justify-end">
                    <Dialog open={scoreOpen} onOpenChange={setScoreOpen}>
                      <DialogTrigger asChild>
                        <Button size="sm"><Plus className="h-4 w-4 mr-1" /> Record score</Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader><DialogTitle>Record assessment</DialogTitle></DialogHeader>
                        <div className="space-y-3">
                          <div>
                            <Label>Student</Label>
                            <Select value={newScore.student_id}
                              onValueChange={(v) => setNewScore({ ...newScore, student_id: v })}>
                              <SelectTrigger><SelectValue placeholder="Pick student" /></SelectTrigger>
                              <SelectContent>
                                {classStudents.map((s) => (
                                  <SelectItem key={s.id} value={s.student_id}>{s.student_name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label>Subject</Label>
                            <Select value={newScore.subject_id}
                              onValueChange={(v) => setNewScore({ ...newScore, subject_id: v })}>
                              <SelectTrigger><SelectValue placeholder="Pick subject" /></SelectTrigger>
                              <SelectContent>
                                {subjects.length === 0 && (
                                  <div className="px-3 py-2 text-xs text-muted-foreground">
                                    No subjects yet — create one in Reports/Subjects.
                                  </div>
                                )}
                                {subjects.map((s) => (
                                  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div><Label>Score</Label><Input type="number" value={newScore.score}
                              onChange={(e) => setNewScore({ ...newScore, score: e.target.value })} /></div>
                            <div><Label>Max</Label><Input type="number" value={newScore.max_score}
                              onChange={(e) => setNewScore({ ...newScore, max_score: e.target.value })} /></div>
                          </div>
                          <div><Label>Title</Label><Input value={newScore.title}
                            onChange={(e) => setNewScore({ ...newScore, title: e.target.value })} /></div>
                          <div>
                            <Label>Type</Label>
                            <Select value={newScore.assessment_type}
                              onValueChange={(v) => setNewScore({ ...newScore, assessment_type: v })}>
                              <SelectTrigger><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="test">Test</SelectItem>
                                <SelectItem value="quiz">Quiz</SelectItem>
                                <SelectItem value="exam">Exam</SelectItem>
                                <SelectItem value="assignment">Assignment</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <DialogFooter><Button onClick={recordScore}>Save</Button></DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </div>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Student</TableHead>
                        <TableHead>Subject</TableHead>
                        <TableHead>Title</TableHead>
                        <TableHead className="text-right">Score</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {classScores.map((a) => (
                        <TableRow key={a.id}>
                          <TableCell className="text-sm text-muted-foreground">
                            {new Date(a.assessed_on).toLocaleDateString()}
                          </TableCell>
                          <TableCell className="font-medium">{a.student_name || "—"}</TableCell>
                          <TableCell><Badge variant="outline">{a.subject_name || "—"}</Badge></TableCell>
                          <TableCell className="text-sm">{a.title}</TableCell>
                          <TableCell className="text-right font-mono">
                            {a.score}/{a.max_score}
                          </TableCell>
                        </TableRow>
                      ))}
                      {classScores.length === 0 && (
                        <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-6">
                          No scores recorded for this class yet.
                        </TableCell></TableRow>
                      )}
                    </TableBody>
                  </Table>
                </TabsContent>
              </Tabs>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}

function Stat({ icon: Icon, label, value }:
  { icon: any; label: string; value: number | string }) {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
        <Icon className="h-4 w-4" /> {label}
      </div>
      <div className="font-display text-2xl mt-2 text-primary">{value}</div>
    </Card>
  );
}
