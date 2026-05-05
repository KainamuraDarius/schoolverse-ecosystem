import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { GraduationCap, BookOpen, NotebookPen, Calendar, Activity, BarChart3, CalendarRange, Presentation, ArrowRight } from "lucide-react";

const modules = [
  { title: "iSchoolBook", desc: "3D models, hyperlinked content, cross-subject integration.", icon: BookOpen },
  { title: "Notes", desc: "Active workspace: annotate, embed media, run simulations.", icon: NotebookPen },
  { title: "Calendar", desc: "Lessons, assignments, exams and meetings — unified.", icon: Calendar },
  { title: "Monitor", desc: "Attendance, time-on-task and teaching effectiveness.", icon: Activity },
  { title: "Reports", desc: "Continuous assessment and automated report cards.", icon: BarChart3 },
  { title: "Timetables", desc: "Conflict-free, workload-balanced scheduling.", icon: CalendarRange },
  { title: "Whiteboard", desc: "Live digital classroom: draw, share, record.", icon: Presentation },
];

export default function Index() {
  return (
    <div className="min-h-screen bg-gradient-cream">
      <header className="container mx-auto flex items-center justify-between py-6">
        <div className="flex items-center gap-2.5">
          <div className="h-10 w-10 rounded-xl bg-gradient-hero flex items-center justify-center shadow-soft">
            <GraduationCap className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="font-display text-xl font-bold text-foreground">iSchoolVerse</span>
        </div>
        <Link to="/auth"><Button variant="outline">Sign in</Button></Link>
      </header>

      <main className="container mx-auto px-4">
        <section className="py-16 md:py-24 text-center max-w-3xl mx-auto">
          <span className="inline-block text-xs uppercase tracking-widest text-accent-foreground bg-accent/30 border border-accent/40 rounded-full px-3 py-1">
            A school operating system
          </span>
          <h1 className="font-display text-4xl md:text-6xl mt-5 text-foreground leading-[1.05]">
            One ID. One dashboard.<br />
            <span className="text-primary">An entire school, unified.</span>
          </h1>
          <p className="mt-6 text-lg text-muted-foreground">
            iSchoolVerse brings teaching, learning, scheduling, monitoring and assessment into one
            intelligent ecosystem — powered by a single user identity.
          </p>
          <div className="mt-8 flex items-center justify-center gap-3">
            <Link to="/auth">
              <Button size="lg" className="gap-2">
                Get started <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </section>

        <section className="pb-24">
          <h2 className="font-display text-2xl md:text-3xl text-center text-foreground mb-10">
            Seven modules. One ecosystem.
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {modules.map((m) => (
              <div key={m.title} className="rounded-2xl bg-card border border-border/60 p-6 shadow-soft hover:shadow-elevated transition-all">
                <div className="h-11 w-11 rounded-lg bg-secondary flex items-center justify-center mb-4">
                  <m.icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="font-display text-lg font-semibold text-foreground">{m.title}</h3>
                <p className="text-sm text-muted-foreground mt-1.5">{m.desc}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-border/60 py-8 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} iSchoolVerse — A unified digital learning ecosystem.
      </footer>
    </div>
  );
}
