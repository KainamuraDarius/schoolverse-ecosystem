import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { ShieldCheck, Users, BookOpen, Activity, GraduationCap, TrendingUp, Search } from "lucide-react";
import { toast } from "sonner";

type RoleName = "admin" | "teacher" | "student";
type UserRow = { user_id: string; display_name: string | null; created_at: string; roles: string[] };

export default function AdminPage() {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [stats, setStats] = useState({ subjects: 0, assessments: 0, sessions: 0, avg: 0 });
  const [q, setQ] = useState("");

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: roles } = await supabase
        .from("user_roles").select("role").eq("user_id", user.id);
      const admin = (roles ?? []).some((r: any) => r.role === "admin");
      setIsAdmin(admin);
      if (!admin) return;
      await loadAll();
    })();
  }, [user]);

  const loadAll = async () => {
    const [usersRes, subRes, assessRes, sessRes] = await Promise.all([
      supabase.rpc("list_users_with_roles"),
      supabase.from("subjects").select("id", { count: "exact", head: true }),
      supabase.from("assessments").select("score,max_score"),
      supabase.from("lesson_sessions").select("id,status", { count: "exact" }),
    ]);
    if (usersRes.error) toast.error(usersRes.error.message);
    setUsers((usersRes.data ?? []) as UserRow[]);
    const all = (assessRes.data ?? []) as any[];
    const avg = all.length
      ? all.reduce((s, a) => s + (Number(a.score) / Number(a.max_score || 1)) * 100, 0) / all.length
      : 0;
    setStats({
      subjects: subRes.count ?? 0,
      assessments: all.length,
      sessions: sessRes.count ?? 0,
      avg: Math.round(avg),
    });
  };

  const toggleRole = async (uid: string, role: RoleName, has: boolean) => {
    if (has) {
      const { error } = await supabase.from("user_roles").delete().eq("user_id", uid).eq("role", role);
      if (error) return toast.error(error.message);
    } else {
      const { error } = await supabase.from("user_roles").insert({ user_id: uid, role });
      if (error) return toast.error(error.message);
    }
    toast.success(`Role ${has ? "removed" : "granted"}: ${role}`);
    await loadAll();
  };

  const promoteSelfToAdmin = async () => {
    if (!user) return;
    const { error } = await supabase.from("user_roles").insert({ user_id: user.id, role: "admin" });
    if (error) return toast.error(error.message);
    toast.success("You are now an admin. Reloading…");
    setTimeout(() => location.reload(), 600);
  };

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return users;
    return users.filter((u) => (u.display_name ?? "").toLowerCase().includes(s) || u.user_id.includes(s));
  }, [users, q]);

  if (isAdmin === null) {
    return <div className="text-muted-foreground">Loading…</div>;
  }

  if (!isAdmin) {
    return (
      <div className="max-w-xl mx-auto">
        <Card className="p-8 text-center space-y-4">
          <ShieldCheck className="h-10 w-10 mx-auto text-muted-foreground" />
          <h1 className="font-display text-2xl">Admin access required</h1>
          <p className="text-sm text-muted-foreground">
            This area is restricted to school administrators. If you're the school owner setting up
            iSchoolVerse, you can claim the first admin role for your account below.
          </p>
          <Button onClick={promoteSelfToAdmin}>Make me an admin</Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <header>
        <h1 className="font-display text-2xl md:text-3xl text-foreground flex items-center gap-2">
          <ShieldCheck className="h-7 w-7 text-primary" /> School administration
        </h1>
        <p className="text-sm text-muted-foreground">
          Manage users, assign roles, and monitor school-wide activity.
        </p>
      </header>

      <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={Users} label="Total users" value={users.length} />
        <StatCard icon={BookOpen} label="Subjects" value={stats.subjects} />
        <StatCard icon={Activity} label="Lesson sessions" value={stats.sessions} />
        <StatCard icon={TrendingUp} label="School avg" value={`${stats.avg}%`} />
      </section>

      <Card className="p-5">
        <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
          <h2 className="font-display text-lg flex items-center gap-2">
            <GraduationCap className="h-4 w-4 text-primary" /> User roster
          </h2>
          <div className="relative">
            <Search className="h-4 w-4 absolute left-2.5 top-2.5 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search users…"
              className="pl-8 w-64"
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead>Roles</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((u) => (
                <TableRow key={u.user_id}>
                  <TableCell className="font-medium">
                    {u.display_name || <span className="text-muted-foreground">Unnamed</span>}
                    <div className="text-[10px] font-mono text-muted-foreground">{u.user_id.slice(0, 8)}…</div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(u.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1 flex-wrap">
                      {u.roles.length === 0 && <span className="text-xs text-muted-foreground">none</span>}
                      {u.roles.map((r) => (
                        <Badge key={r} variant="outline" className="capitalize">{r}</Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="inline-flex gap-1">
                      {(["student", "teacher", "admin"] as RoleName[]).map((r) => {
                        const has = u.roles.includes(r);
                        return (
                          <Button
                            key={r}
                            size="sm"
                            variant={has ? "default" : "outline"}
                            onClick={() => toggleRole(u.user_id, r, has)}
                            className="capitalize"
                          >
                            {has ? "✓ " : "+ "}{r}
                          </Button>
                        );
                      })}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground py-6">
                    No users match your search.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}

function StatCard({ icon: Icon, label, value }: { icon: any; label: string; value: number | string }) {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
        <Icon className="h-4 w-4" /> {label}
      </div>
      <div className="font-display text-2xl mt-2 text-primary">{value}</div>
    </Card>
  );
}
