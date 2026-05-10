import { useEffect, useMemo, useState } from "react";
import { Award, BarChart3, BookOpen, GraduationCap, Loader2, Plus, Trash2, TrendingUp, Users } from "lucide-react";
import { Line, LineChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { useAuth } from "@/hooks/useAuth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TERMS, formatClassLabel, gradeFromPercent, resolvePerspective, type AppPerspective } from "@/lib/ischool";

type SubjectRow = Tables<"subjects">;
type AssessmentRow = Tables<"assessments">;
type ClassRow = Tables<"school_classes">;
type EnrollmentRow = Tables<"class_enrollments">;
type ProfileRow = Tables<"profiles">;
type UserRoleRow = Tables<"user_roles">;

type AssessmentType = AssessmentRow["assessment_type"];

function percentage(score: number, maxScore: number) {
  if (maxScore <= 0) return 0;
  return (score / maxScore) * 100;
}

export default function ReportsModule() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [perspective, setPerspective] = useState<AppPerspective>("student");
  const [profileRole, setProfileRole] = useState<string | null>(null);
  const [subjects, setSubjects] = useState<SubjectRow[]>([]);
  const [assessments, setAssessments] = useState<AssessmentRow[]>([]);
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [enrollments, setEnrollments] = useState<EnrollmentRow[]>([]);
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [term, setTerm] = useState("Term 1");
  const [selectedClass, setSelectedClass] = useState("all");
  const [selectedSubject, setSelectedSubject] = useState("all");

  const [subjectDialog, setSubjectDialog] = useState(false);
  const [classDialog, setClassDialog] = useState(false);
  const [enrollmentDialog, setEnrollmentDialog] = useState(false);
  const [assessmentDialog, setAssessmentDialog] = useState(false);

  const [newSubject, setNewSubject] = useState({ name: "", code: "" });
  const [newClass, setNewClass] = useState({ name: "", stream: "", term: "Term 1" });
  const [newEnrollment, setNewEnrollment] = useState({ class_id: "", student_id: "" });
  const [editing, setEditing] = useState<AssessmentRow | null>(null);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    (async () => {
      setLoading(true);
      const [
        { data: roleRows, error: roleError },
        { data: profileRows, error: profileError },
        { data: subjectRows, error: subjectError },
        { data: assessmentRows, error: assessmentError },
        { data: classRows, error: classError },
        { data: enrollmentRows, error: enrollmentError },
      ] = await Promise.all([
        supabase.from("user_roles").select("*").eq("user_id", user.id),
        supabase.from("profiles").select("*"),
        supabase.from("subjects").select("*").order("name"),
        supabase.from("assessments").select("*").order("assessed_on", { ascending: false }),
        supabase.from("school_classes").select("*").order("term").order("name"),
        supabase.from("class_enrollments").select("*").order("created_at", { ascending: false }),
      ]);

      [roleError, profileError, subjectError, assessmentError, classError, enrollmentError]
        .filter(Boolean)
        .forEach((error) => toast.error(error?.message ?? "Could not load reports data"));

      if (cancelled) return;

      const userRole =
        ((roleRows ?? []).find((row: UserRoleRow) => row.role === "admin")?.role ??
          (roleRows ?? []).find((row: UserRoleRow) => row.role === "teacher")?.role ??
          profileRows?.find((row: ProfileRow) => row.id === user.id)?.role ??
          "student") as string;

      setProfileRole(userRole);
      setPerspective(resolvePerspective(userRole));
      setProfiles((profileRows ?? []) as ProfileRow[]);
      setSubjects((subjectRows ?? []) as SubjectRow[]);
      setAssessments((assessmentRows ?? []) as AssessmentRow[]);
      setClasses((classRows ?? []) as ClassRow[]);
      setEnrollments((enrollmentRows ?? []) as EnrollmentRow[]);
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [user]);

  const profileMap = useMemo(
    () =>
      Object.fromEntries(
        profiles.map((profile) => [profile.id, profile.display_name || `User ${profile.id.slice(0, 6)}`]),
      ),
    [profiles],
  );

  const visibleAssessments = useMemo(() => {
    const base =
      perspective === "student"
        ? assessments.filter((assessment) => assessment.student_id === user?.id)
        : assessments.filter((assessment) => assessment.user_id === user?.id);

    return base.filter((assessment) => {
      const termMatches = assessment.term === term;
      const classMatches = selectedClass === "all" || assessment.class_id === selectedClass;
      const subjectMatches = selectedSubject === "all" || assessment.subject_name === selectedSubject;
      return termMatches && classMatches && subjectMatches;
    });
  }, [assessments, perspective, selectedClass, selectedSubject, term, user?.id]);

  const trendData = useMemo(() => {
    const grouped = new Map<string, { total: number; count: number }>();
    visibleAssessments.forEach((assessment) => {
      const key = assessment.assessed_on;
      const current = grouped.get(key) ?? { total: 0, count: 0 };
      current.total += percentage(Number(assessment.score), Number(assessment.max_score));
      current.count += 1;
      grouped.set(key, current);
    });
    return [...grouped.entries()]
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([date, value]) => ({
        date: date.slice(5),
        average: Number((value.total / value.count).toFixed(1)),
      }));
  }, [visibleAssessments]);

  const reportCard = useMemo(() => {
    const grouped = new Map<string, { subject: string; weighted: number; totalWeight: number; items: number }>();
    visibleAssessments.forEach((assessment) => {
      const subject = assessment.subject_name || subjects.find((entry) => entry.id === assessment.subject_id)?.name || "Subject";
      const current = grouped.get(subject) ?? { subject, weighted: 0, totalWeight: 0, items: 0 };
      const weight = Number(assessment.weight);
      current.weighted += percentage(Number(assessment.score), Number(assessment.max_score)) * weight;
      current.totalWeight += weight;
      current.items += 1;
      grouped.set(subject, current);
    });
    return [...grouped.values()].map((entry) => ({
      subject: entry.subject,
      average: entry.totalWeight > 0 ? entry.weighted / entry.totalWeight : 0,
      items: entry.items,
    }));
  }, [subjects, visibleAssessments]);

  const ranking = useMemo(() => {
    const grouped = new Map<string, { student: string; className: string; weighted: number; totalWeight: number }>();
    visibleAssessments.forEach((assessment) => {
      const studentId = assessment.student_id || "unknown";
      const student = assessment.student_name || profileMap[studentId] || "Learner";
      const className = classes.find((entry) => entry.id === assessment.class_id)
        ? formatClassLabel(classes.find((entry) => entry.id === assessment.class_id)!.name, classes.find((entry) => entry.id === assessment.class_id)!.stream)
        : "No class";
      const current = grouped.get(studentId) ?? { student, className, weighted: 0, totalWeight: 0 };
      const weight = Number(assessment.weight);
      current.weighted += percentage(Number(assessment.score), Number(assessment.max_score)) * weight;
      current.totalWeight += weight;
      grouped.set(studentId, current);
    });
    return [...grouped.values()]
      .map((entry) => ({
        ...entry,
        average: entry.totalWeight > 0 ? entry.weighted / entry.totalWeight : 0,
      }))
      .sort((left, right) => right.average - left.average)
      .map((entry, index) => ({ ...entry, rank: index + 1 }));
  }, [classes, profileMap, visibleAssessments]);

  const overallAverage = useMemo(() => {
    if (reportCard.length === 0) return 0;
    return reportCard.reduce((sum, entry) => sum + entry.average, 0) / reportCard.length;
  }, [reportCard]);

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

  const createSubject = async () => {
    if (!user || !newSubject.name.trim()) return;
    const { data, error } = await supabase
      .from("subjects")
      .insert({
        user_id: user.id,
        name: newSubject.name.trim(),
        code: newSubject.code.trim() || null,
      })
      .select()
      .single();
    if (error) {
      toast.error(error.message);
      return;
    }
    setSubjects((current) => [...current, data as SubjectRow]);
    setNewSubject({ name: "", code: "" });
    setSubjectDialog(false);
    toast.success("Subject added");
  };

  const createClass = async () => {
    if (!user || !newClass.name.trim()) return;
    const { data, error } = await supabase
      .from("school_classes")
      .insert({
        owner_id: user.id,
        name: newClass.name.trim(),
        stream: newClass.stream.trim(),
        term: newClass.term,
        teacher_id: user.id,
        teacher_name: profileMap[user.id] ?? "Teacher",
      })
      .select()
      .single();
    if (error) {
      toast.error(error.message);
      return;
    }
    setClasses((current) => [...current, data as ClassRow]);
    setNewClass({ name: "", stream: "", term: term });
    setClassDialog(false);
    toast.success("Class added");
  };

  const enrollLearner = async () => {
    if (!user || !newEnrollment.class_id || !newEnrollment.student_id) return;
    const { data, error } = await supabase
      .from("class_enrollments")
      .insert({
        owner_id: user.id,
        class_id: newEnrollment.class_id,
        student_id: newEnrollment.student_id,
        student_name: profileMap[newEnrollment.student_id] ?? "Learner",
      })
      .select()
      .single();
    if (error) {
      toast.error(error.message);
      return;
    }
    setEnrollments((current) => [data as EnrollmentRow, ...current]);
    setNewEnrollment({ class_id: "", student_id: "" });
    setEnrollmentDialog(false);
    toast.success("Learner enrolled");
  };

  const openNewAssessment = () => {
    if (!user) return;
    if (subjects.length === 0) {
      toast.info("Add a subject first");
      return;
    }
    const firstEnrollment = enrollments[0];
    setEditing({
      id: "",
      user_id: user.id,
      class_id: firstEnrollment?.class_id ?? classes[0]?.id ?? null,
      subject_id: subjects[0].id,
      student_id: firstEnrollment?.student_id ?? user.id,
      student_name: firstEnrollment?.student_name ?? profileMap[user.id] ?? "Learner",
      subject_name: subjects[0].name,
      recorded_by: user.id,
      recorded_by_name: profileMap[user.id] ?? "Teacher",
      title: "",
      assessment_type: "test",
      score: 0,
      max_score: 100,
      weight: 1,
      term,
      assessed_on: new Date().toISOString().slice(0, 10),
      notes: "",
      score_comment: "",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    setAssessmentDialog(true);
  };

  const saveAssessment = async () => {
    if (!editing || !user) return;
    const subject = subjects.find((entry) => entry.id === editing.subject_id);
    const payload = {
      user_id: user.id,
      class_id: editing.class_id,
      subject_id: editing.subject_id,
      subject_name: subject?.name ?? editing.subject_name,
      student_id: editing.student_id,
      student_name: editing.student_name,
      recorded_by: user.id,
      recorded_by_name: profileMap[user.id] ?? "Teacher",
      title: editing.title || "Untitled assessment",
      assessment_type: editing.assessment_type,
      score: Number(editing.score),
      max_score: Number(editing.max_score),
      weight: Number(editing.weight),
      term: editing.term,
      assessed_on: editing.assessed_on,
      notes: editing.notes,
      score_comment: editing.score_comment,
    };

    if (editing.id) {
      const { error } = await supabase.from("assessments").update(payload).eq("id", editing.id);
      if (error) return toast.error(error.message);
      setAssessments((current) => current.map((assessment) => (assessment.id === editing.id ? { ...assessment, ...payload } as AssessmentRow : assessment)));
    } else {
      const { data, error } = await supabase.from("assessments").insert(payload).select().single();
      if (error) return toast.error(error.message);
      setAssessments((current) => [data as AssessmentRow, ...current]);
    }

    setAssessmentDialog(false);
    setEditing(null);
    toast.success("Assessment saved");
  };

  const removeAssessment = async () => {
    if (!editing?.id) return;
    const { error } = await supabase.from("assessments").delete().eq("id", editing.id);
    if (error) return toast.error(error.message);
    setAssessments((current) => current.filter((assessment) => assessment.id !== editing.id));
    setAssessmentDialog(false);
    setEditing(null);
  };

  if (loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center text-muted-foreground">
        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
        Loading iSchool Reports…
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl md:text-3xl text-foreground flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-primary" />
            iSchool Reports
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Assessment tracker, report-card summaries, performance trends, and class ranking linked to the learner profile.
          </p>
        </div>

        <div className="flex flex-wrap items-end gap-3">
          <div>
            <Label>Perspective</Label>
            <Select value={perspective} onValueChange={(value) => setPerspective(value as AppPerspective)}>
              <SelectTrigger className="w-[170px] mt-2">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="student">Student view</SelectItem>
                <SelectItem value="teacher">Teacher view</SelectItem>
                <SelectItem value="admin">Admin view</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Term</Label>
            <Select value={term} onValueChange={setTerm}>
              <SelectTrigger className="w-[140px] mt-2">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TERMS.map((entry) => (
                  <SelectItem key={entry} value={entry}>
                    {entry}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Class</Label>
            <Select value={selectedClass} onValueChange={setSelectedClass}>
              <SelectTrigger className="w-[200px] mt-2">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All classes</SelectItem>
                {classes.map((classroom) => (
                  <SelectItem key={classroom.id} value={classroom.id}>
                    {formatClassLabel(classroom.name, classroom.stream)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Subject</Label>
            <Select value={selectedSubject} onValueChange={setSelectedSubject}>
              <SelectTrigger className="w-[180px] mt-2">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All subjects</SelectItem>
                {subjects.map((subject) => (
                  <SelectItem key={subject.id} value={subject.name}>
                    {subject.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </header>

      {(perspective === "teacher" || perspective === "admin") && (
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => setSubjectDialog(true)}>
            <BookOpen className="h-4 w-4 mr-2" />
            Subject
          </Button>
          <Button variant="outline" onClick={() => setClassDialog(true)}>
            <GraduationCap className="h-4 w-4 mr-2" />
            Class
          </Button>
          <Button variant="outline" onClick={() => setEnrollmentDialog(true)} disabled={classes.length === 0 || profiles.length === 0}>
            <Users className="h-4 w-4 mr-2" />
            Enrol learner
          </Button>
          <Button onClick={openNewAssessment} disabled={subjects.length === 0}>
            <Plus className="h-4 w-4 mr-2" />
            Assessment
          </Button>
        </div>
      )}

      <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <Card className="p-5">
          <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Overall average</div>
          <div className="font-display text-3xl text-primary mt-2">{overallAverage ? `${overallAverage.toFixed(1)}%` : "—"}</div>
          {overallAverage > 0 && <div className={`text-sm mt-2 ${gradeFromPercent(overallAverage).color}`}>Grade {gradeFromPercent(overallAverage).letter}</div>}
        </Card>
        <Card className="p-5">
          <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Assessments</div>
          <div className="font-display text-3xl text-primary mt-2">{visibleAssessments.length}</div>
          <div className="text-sm text-muted-foreground mt-2">Captured for the selected filters.</div>
        </Card>
        <Card className="p-5">
          <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Active classes</div>
          <div className="font-display text-3xl text-primary mt-2">{classes.length}</div>
          <div className="text-sm text-muted-foreground mt-2">Managed in this reporting workspace.</div>
        </Card>
        <Card className="p-5">
          <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Learners</div>
          <div className="font-display text-3xl text-primary mt-2">{new Set(enrollments.map((enrollment) => enrollment.student_id)).size}</div>
          <div className="text-sm text-muted-foreground mt-2">Enrolled into the tracked classes.</div>
        </Card>
      </section>

      <div className="grid grid-cols-1 xl:grid-cols-[1.05fr_0.95fr] gap-6">
        <Card className="p-5">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            <h2 className="font-display text-lg text-foreground">Performance trend</h2>
          </div>
          <div className="h-[280px] mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.15} />
                <XAxis dataKey="date" />
                <YAxis domain={[0, 100]} />
                <Tooltip />
                <Line type="monotone" dataKey="average" stroke="hsl(var(--primary))" strokeWidth={3} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center gap-2">
            <Award className="h-4 w-4 text-primary" />
            <h2 className="font-display text-lg text-foreground">Report card summary</h2>
          </div>
          <div className="space-y-3 mt-4">
            {reportCard.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border p-6 text-sm text-muted-foreground">
                No report data yet for these filters.
              </div>
            ) : (
              reportCard.map((entry) => (
                <div key={entry.subject} className="rounded-xl border border-border/60 px-4 py-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="font-medium text-foreground">{entry.subject}</div>
                    <Badge variant="outline">{entry.items} entries</Badge>
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <div className="font-display text-2xl text-primary">{entry.average.toFixed(1)}%</div>
                    <div className={gradeFromPercent(entry.average).color}>Grade {gradeFromPercent(entry.average).letter}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>

      <Card className="p-5">
        <h2 className="font-display text-lg text-foreground mb-4">Class ranking</h2>
        {ranking.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-6 text-sm text-muted-foreground">No ranking data available yet.</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Rank</TableHead>
                <TableHead>Learner</TableHead>
                <TableHead>Class</TableHead>
                <TableHead className="text-right">Average</TableHead>
                <TableHead className="text-center">Grade</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ranking.map((row) => (
                <TableRow key={`${row.student}-${row.rank}`}>
                  <TableCell className="font-medium">#{row.rank}</TableCell>
                  <TableCell>{row.student}</TableCell>
                  <TableCell className="text-muted-foreground">{row.className}</TableCell>
                  <TableCell className="text-right font-mono">{row.average.toFixed(1)}%</TableCell>
                  <TableCell className="text-center">{gradeFromPercent(row.average).letter}</TableCell>
                </TableRow>
              ))}
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
        <h2 className="font-display text-lg text-foreground mb-4">Assessment ledger</h2>
        {visibleAssessments.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-6 text-sm text-muted-foreground">No assessment entries for these filters.</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Student</TableHead>
                <TableHead>Subject</TableHead>
                <TableHead>Assessment</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Score</TableHead>
                <TableHead className="text-right">%</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visibleAssessments.map((assessment) => (
                <TableRow key={assessment.id} className="cursor-pointer" onClick={() => { setEditing(assessment); setAssessmentDialog(true); }}>
                  <TableCell className="text-muted-foreground">{assessment.assessed_on}</TableCell>
                  <TableCell>{assessment.student_name || profileMap[assessment.student_id ?? ""] || "Learner"}</TableCell>
                  <TableCell>{assessment.subject_name || subjects.find((entry) => entry.id === assessment.subject_id)?.name || "Subject"}</TableCell>
                  <TableCell className="font-medium">{assessment.title}</TableCell>
                  <TableCell><Badge variant="outline">{assessment.assessment_type}</Badge></TableCell>
                  <TableCell className="text-right font-mono">{assessment.score}/{assessment.max_score}</TableCell>
                  <TableCell className="text-right font-mono">{percentage(Number(assessment.score), Number(assessment.max_score)).toFixed(1)}%</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      <Dialog open={subjectDialog} onOpenChange={setSubjectDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>New subject</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Name</Label>
              <Input value={newSubject.name} onChange={(event) => setNewSubject({ ...newSubject, name: event.target.value })} placeholder="Mathematics" />
            </div>
            <div className="space-y-1.5">
              <Label>Code</Label>
              <Input value={newSubject.code} onChange={(event) => setNewSubject({ ...newSubject, code: event.target.value })} placeholder="MAT" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSubjectDialog(false)}>Cancel</Button>
            <Button onClick={createSubject}>Add</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={classDialog} onOpenChange={setClassDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>New class</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Class name</Label>
              <Input value={newClass.name} onChange={(event) => setNewClass({ ...newClass, name: event.target.value })} placeholder="Junior 1" />
            </div>
            <div className="space-y-1.5">
              <Label>Stream</Label>
              <Input value={newClass.stream} onChange={(event) => setNewClass({ ...newClass, stream: event.target.value })} placeholder="North" />
            </div>
            <div className="space-y-1.5">
              <Label>Term</Label>
              <Select value={newClass.term} onValueChange={(value) => setNewClass({ ...newClass, term: value })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TERMS.map((entry) => (
                    <SelectItem key={entry} value={entry}>{entry}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setClassDialog(false)}>Cancel</Button>
            <Button onClick={createClass}>Add</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={enrollmentDialog} onOpenChange={setEnrollmentDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Enroll learner</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Class</Label>
              <Select value={newEnrollment.class_id} onValueChange={(value) => setNewEnrollment({ ...newEnrollment, class_id: value })}>
                <SelectTrigger><SelectValue placeholder="Select class" /></SelectTrigger>
                <SelectContent>
                  {classes.map((classroom) => (
                    <SelectItem key={classroom.id} value={classroom.id}>
                      {formatClassLabel(classroom.name, classroom.stream)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Learner profile</Label>
              <Select value={newEnrollment.student_id} onValueChange={(value) => setNewEnrollment({ ...newEnrollment, student_id: value })}>
                <SelectTrigger><SelectValue placeholder="Select learner" /></SelectTrigger>
                <SelectContent>
                  {profiles.map((profile) => (
                    <SelectItem key={profile.id} value={profile.id}>
                      {profile.display_name || profile.id.slice(0, 6)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEnrollmentDialog(false)}>Cancel</Button>
            <Button onClick={enrollLearner}>Enroll</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={assessmentDialog} onOpenChange={(value) => { setAssessmentDialog(value); if (!value) setEditing(null); }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>{editing?.id ? "Edit assessment" : "New assessment"}</DialogTitle></DialogHeader>
          {editing && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label>Class</Label>
                  <Select value={editing.class_id ?? "__none"} onValueChange={(value) => setEditing({ ...editing, class_id: value === "__none" ? null : value })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none">No class</SelectItem>
                      {classes.map((classroom) => (
                        <SelectItem key={classroom.id} value={classroom.id}>
                          {formatClassLabel(classroom.name, classroom.stream)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Learner</Label>
                  <Select
                    value={editing.student_id ?? user?.id ?? ""}
                    onValueChange={(value) =>
                      setEditing({
                        ...editing,
                        student_id: value,
                        student_name: profileMap[value] ?? "Learner",
                      })
                    }
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {profiles.map((profile) => (
                        <SelectItem key={profile.id} value={profile.id}>
                          {profile.display_name || profile.id.slice(0, 6)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Subject</Label>
                  <Select
                    value={editing.subject_id}
                    onValueChange={(value) =>
                      setEditing({
                        ...editing,
                        subject_id: value,
                        subject_name: subjects.find((subject) => subject.id === value)?.name ?? editing.subject_name,
                      })
                    }
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {subjects.map((subject) => (
                        <SelectItem key={subject.id} value={subject.id}>
                          {subject.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-[1fr_220px] gap-3">
                <div className="space-y-1.5">
                  <Label>Assessment title</Label>
                  <Input value={editing.title} onChange={(event) => setEditing({ ...editing, title: event.target.value })} placeholder="Algebra quiz 1" />
                </div>
                <div className="space-y-1.5">
                  <Label>Type</Label>
                  <Select value={editing.assessment_type} onValueChange={(value) => setEditing({ ...editing, assessment_type: value as AssessmentType })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {(["test", "quiz", "assignment", "exam", "project"] as AssessmentType[]).map((entry) => (
                        <SelectItem key={entry} value={entry}>{entry}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label>Score</Label>
                  <Input type="number" value={editing.score} onChange={(event) => setEditing({ ...editing, score: Number(event.target.value) })} />
                </div>
                <div className="space-y-1.5">
                  <Label>Out of</Label>
                  <Input type="number" value={editing.max_score} onChange={(event) => setEditing({ ...editing, max_score: Number(event.target.value) })} />
                </div>
                <div className="space-y-1.5">
                  <Label>Weight</Label>
                  <Input type="number" step="0.1" value={editing.weight} onChange={(event) => setEditing({ ...editing, weight: Number(event.target.value) })} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Term</Label>
                  <Select value={editing.term} onValueChange={(value) => setEditing({ ...editing, term: value })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {TERMS.map((entry) => (
                        <SelectItem key={entry} value={entry}>{entry}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Date</Label>
                  <Input type="date" value={editing.assessed_on} onChange={(event) => setEditing({ ...editing, assessed_on: event.target.value })} />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Teacher comment</Label>
                <Input value={editing.score_comment ?? ""} onChange={(event) => setEditing({ ...editing, score_comment: event.target.value })} placeholder="Strong conceptual understanding" />
              </div>
            </div>
          )}
          <DialogFooter className="gap-2 sm:justify-between">
            {editing?.id ? (
              <Button variant="ghost" className="text-destructive hover:text-destructive" onClick={removeAssessment}>
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </Button>
            ) : <span />}
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setAssessmentDialog(false)}>Cancel</Button>
              <Button onClick={saveAssessment}>Save</Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="text-xs text-muted-foreground">
        Current workspace role: <span className="font-medium text-foreground">{profileRole ?? "student"}</span>. Perspective switching is enabled here so you can preview teacher, admin, and student reporting flows in the same prototype.
      </div>
    </div>
  );
}
