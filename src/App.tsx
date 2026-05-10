import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/useAuth";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import AuthPage from "./pages/Auth";
import DashboardLayout from "./layouts/DashboardLayout";
import Overview from "./pages/dashboard/Overview";
import AdminPage from "./pages/dashboard/Admin";
import TeacherPage from "./pages/dashboard/Teacher";
import { Book, Notes, CalendarPage, Monitor, Reports, Timetables, Whiteboard } from "./pages/dashboard/modules";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/dashboard" element={<DashboardLayout />}>
              <Route index element={<Overview />} />
              <Route path="book" element={<Book />} />
              <Route path="notes" element={<Notes />} />
              <Route path="calendar" element={<CalendarPage />} />
              <Route path="monitor" element={<Monitor />} />
              <Route path="reports" element={<Reports />} />
              <Route path="timetables" element={<Timetables />} />
              <Route path="whiteboard" element={<Whiteboard />} />
              <Route path="admin" element={<AdminPage />} />
              <Route path="teacher" element={<TeacherPage />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
