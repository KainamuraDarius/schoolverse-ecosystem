import { BookOpen, NotebookPen, Calendar, Activity, BarChart3, CalendarRange, Presentation } from "lucide-react";
import ModulePlaceholder from "./ModulePlaceholder";

export const Book = () => (
  <ModulePlaceholder
    title="iSchoolBook"
    tagline="Interactive Digital Content Engine"
    icon={BookOpen}
    features={["3D models and visualizations", "Hyperlinked navigation", "Cross-subject integration", "Embedded simulations"]}
  />
);

export { default as Notes } from "./Notes";

export { default as CalendarPage } from "./Calendar";

export const Monitor = () => (
  <ModulePlaceholder
    title="iSchool Monitor"
    tagline="Teaching & Time Analytics Engine"
    icon={Activity}
    features={["Lesson attendance timestamps", "Missed lesson tracking", "Time-on-task analytics", "Performance dashboards"]}
  />
);

export { default as Reports } from "./Reports";

export const Timetables = () => (
  <ModulePlaceholder
    title="iSchool Timetables"
    tagline="Automated Scheduling Engine"
    icon={CalendarRange}
    features={["Conflict-free scheduling", "Workload balancing", "Smart distribution of lessons", "Calendar integration"]}
  />
);

export const Whiteboard = () => (
  <ModulePlaceholder
    title="iSchool Whiteboard"
    tagline="Live Digital Classroom Engine"
    icon={Presentation}
    features={[
      "Multi-color pens, shapes & text", "Real-time annotation",
      "Screen sharing", "Video conferencing",
      "Lesson recording for playback", "Save board work into notes",
      "Live quizzes during teaching", "Multi-user collaboration",
    ]}
  />
);
