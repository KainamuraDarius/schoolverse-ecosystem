import { useEffect, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard, BookOpen, NotebookPen, Calendar, Activity,
  BarChart3, CalendarRange, Presentation, GraduationCap, LogOut, ShieldCheck, Users,
} from "lucide-react";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarHeader, SidebarFooter, useSidebar,
} from "@/components/ui/sidebar";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

const modules = [
  { title: "Overview", url: "/dashboard", icon: LayoutDashboard },
  { title: "iSchoolBook", url: "/dashboard/book", icon: BookOpen },
  { title: "Notes", url: "/dashboard/notes", icon: NotebookPen },
  { title: "Calendar", url: "/dashboard/calendar", icon: Calendar },
  { title: "Monitor", url: "/dashboard/monitor", icon: Activity },
  { title: "Reports", url: "/dashboard/reports", icon: BarChart3 },
  { title: "Timetables", url: "/dashboard/timetables", icon: CalendarRange },
  { title: "Whiteboard", url: "/dashboard/whiteboard", icon: Presentation },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { pathname } = useLocation();
  const { signOut, user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isTeacher, setIsTeacher] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase.from("user_roles").select("role").eq("user_id", user.id).then(({ data }) => {
      const rs = (data ?? []).map((r: any) => r.role);
      setIsAdmin(rs.includes("admin"));
      setIsTeacher(rs.includes("teacher"));
    });
  }, [user]);

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border p-4">
        <div className="flex items-center gap-2.5">
          <div className="h-9 w-9 shrink-0 rounded-lg bg-accent flex items-center justify-center">
            <GraduationCap className="h-5 w-5 text-accent-foreground" />
          </div>
          {!collapsed && (
            <div className="flex flex-col leading-tight">
              <span className="font-display font-bold text-sidebar-foreground">iSchoolVerse</span>
              <span className="text-xs text-sidebar-foreground/60">School OS</span>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Modules</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {modules.map((m) => {
                const active = pathname === m.url;
                return (
                  <SidebarMenuItem key={m.url}>
                    <SidebarMenuButton asChild isActive={active}>
                      <NavLink to={m.url} end className="flex items-center gap-2">
                        <m.icon className="h-4 w-4" />
                        {!collapsed && <span>{m.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {isAdmin && (
          <SidebarGroup>
            <SidebarGroupLabel>Administration</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={pathname === "/dashboard/admin"}>
                    <NavLink to="/dashboard/admin" className="flex items-center gap-2">
                      <ShieldCheck className="h-4 w-4" />
                      {!collapsed && <span>School admin</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-3">
        {!collapsed && user && (
          <div className="text-xs text-sidebar-foreground/70 mb-2 truncate px-1">
            {user.email}
          </div>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={signOut}
          className="w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
        >
          <LogOut className="h-4 w-4" />
          {!collapsed && <span className="ml-2">Sign out</span>}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
