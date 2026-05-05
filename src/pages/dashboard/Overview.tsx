import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  BookOpen, NotebookPen, Calendar, Activity, BarChart3, CalendarRange, Presentation,
} from "lucide-react";
import { Link } from "react-router-dom";

const modules = [
  { title: "iSchoolBook", desc: "Interactive 3D content & cross-subject lessons.", url: "/dashboard/book", icon: BookOpen },
  { title: "Notes", desc: "Capture, annotate & practice with multimedia.", url: "/dashboard/notes", icon: NotebookPen },
  { title: "Calendar", desc: "Lessons, assignments, exams & meetings.", url: "/dashboard/calendar", icon: Calendar },
  { title: "Monitor", desc: "Attendance, time-on-task & teaching analytics.", url: "/dashboard/monitor", icon: Activity },
  { title: "Reports", desc: "Continuous assessment & automated report cards.", url: "/dashboard/reports", icon: BarChart3 },
  { title: "Timetables", desc: "Conflict-free, balanced school scheduling.", url: "/dashboard/timetables", icon: CalendarRange },
  { title: "Whiteboard", desc: "Live digital classroom with real-time tools.", url: "/dashboard/whiteboard", icon: Presentation },
];

export default function Overview() {
  const { user } = useAuth();
  const [name, setName] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("display_name").eq("id", user.id).maybeSingle()
      .then(({ data }) => setName(data?.display_name ?? null));
  }, [user]);

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <section className="rounded-2xl bg-gradient-hero text-primary-foreground p-8 md:p-10 shadow-elevated">
        <p className="text-primary-foreground/70 text-sm uppercase tracking-widest">One ID · One Dashboard</p>
        <h1 className="font-display text-3xl md:text-4xl mt-2">
          Welcome{name ? `, ${name}` : ""} to iSchoolVerse
        </h1>
        <p className="mt-3 text-primary-foreground/80 max-w-2xl">
          Your unified school operating system — where teaching, learning, scheduling and assessment converge.
        </p>
      </section>

      <section>
        <h2 className="font-display text-xl mb-4 text-foreground">Your modules</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {modules.map((m) => (
            <Link key={m.url} to={m.url}>
              <Card className="p-5 h-full hover:shadow-elevated hover:-translate-y-0.5 transition-all border-border/60 bg-card">
                <div className="h-10 w-10 rounded-lg bg-secondary flex items-center justify-center mb-3">
                  <m.icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="font-display font-semibold text-foreground">{m.title}</h3>
                <p className="text-sm text-muted-foreground mt-1">{m.desc}</p>
              </Card>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
