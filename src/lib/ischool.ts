import type { Tables, TablesInsert } from "@/integrations/supabase/types";
import type { Exercise } from "@/components/ExerciseManager";

export type MediaEmbed = {
  id: string;
  type: "image" | "video" | "gif";
  url: string;
  caption?: string;
};

export type AnswerSpace = {
  id: string;
  prompt: string;
  response: string;
  expanded: boolean;
};

export type AnnotationMark = {
  id: string;
  quote: string;
  note: string;
  color: "gold" | "navy" | "sage" | "rose";
  createdAt: string;
};

export type CrossSubjectLink = {
  id: string;
  label: string;
  subject: string;
  topicSlug: string;
};

export type BookTopic = Tables<"book_topics"> & {
  cross_subject_links: CrossSubjectLink[];
};

export type LearningNote = Omit<Tables<"notes">, "annotation_marks" | "answer_spaces" | "auto_tags" | "media_embeds" | "exercises"> & {
  annotation_marks: AnnotationMark[];
  answer_spaces: AnswerSpace[];
  auto_tags: {
    subject?: string;
    lesson?: string;
    date?: string;
    topicSlug?: string;
  };
  media_embeds: MediaEmbed[];
  exercises: Exercise[];
};

export type AppPerspective = "student" | "teacher" | "admin";

export const TERMS = ["Term 1", "Term 2", "Term 3"];

export function makeId(prefix: string) {
  return `${prefix}-${globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2, 10)}`;
}

function asRecord(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

function asString(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function asBoolean(value: unknown, fallback = false) {
  return typeof value === "boolean" ? value : fallback;
}

export function parseMediaEmbeds(value: unknown): MediaEmbed[] {
  return Array.isArray(value)
    ? value
        .map((entry) => {
          const item = asRecord(entry);
          if (!item) return null;
          const type = asString(item.type, "image");
          if (!["image", "video", "gif"].includes(type)) return null;
          const url = asString(item.url);
          if (!url) return null;
          return {
            id: asString(item.id, makeId("media")),
            type: type as MediaEmbed["type"],
            url,
            caption: asString(item.caption) || undefined,
          };
        })
        .filter(Boolean) as MediaEmbed[]
    : [];
}

export function parseAnswerSpaces(value: unknown): AnswerSpace[] {
  return Array.isArray(value)
    ? value
        .map((entry) => {
          const item = asRecord(entry);
          if (!item) return null;
          return {
            id: asString(item.id, makeId("answer")),
            prompt: asString(item.prompt, "Answer space"),
            response: asString(item.response),
            expanded: asBoolean(item.expanded, true),
          };
        })
        .filter((item): item is AnswerSpace => Boolean(item))
    : [];
}

export function parseAnnotationMarks(value: unknown): AnnotationMark[] {
  return Array.isArray(value)
    ? value
        .map((entry) => {
          const item = asRecord(entry);
          if (!item) return null;
          const color = asString(item.color, "gold");
          if (!["gold", "navy", "sage", "rose"].includes(color)) return null;
          return {
            id: asString(item.id, makeId("annotation")),
            quote: asString(item.quote),
            note: asString(item.note),
            color: color as AnnotationMark["color"],
            createdAt: asString(item.createdAt, new Date().toISOString()),
          };
        })
        .filter((item): item is AnnotationMark => Boolean(item))
    : [];
}

export function parseAutoTags(value: unknown) {
  const tags = asRecord(value);
  return {
    subject: asString(tags?.subject) || undefined,
    lesson: asString(tags?.lesson) || undefined,
    date: asString(tags?.date) || undefined,
    topicSlug: asString(tags?.topicSlug) || undefined,
  };
}

export function parseExercises(value: unknown): Exercise[] {
  return Array.isArray(value)
    ? value
        .map((entry) => {
          const item = asRecord(entry);
          if (!item) return null;
          const type = asString(item.type, "multiple-choice");
          if (!["multiple-choice", "short-answer", "fill-blank"].includes(type)) return null;
          return {
            id: asString(item.id, makeId("exercise")),
            question: asString(item.question, "Exercise"),
            type: type as Exercise["type"],
            options: Array.isArray(item.options) ? item.options.filter((option): option is string => typeof option === "string") : undefined,
            correctAnswer: asString(item.correctAnswer) || undefined,
            completed: asBoolean(item.completed),
            userAnswer: asString(item.userAnswer) || undefined,
          };
        })
        .filter(Boolean) as Exercise[]
    : [];
}

export function parseCrossSubjectLinks(value: unknown): CrossSubjectLink[] {
  return Array.isArray(value)
    ? value
        .map((entry) => {
          const item = asRecord(entry);
          if (!item) return null;
          return {
            id: asString(item.id, makeId("cross")),
            label: asString(item.label, "Reference"),
            subject: asString(item.subject, "General"),
            topicSlug: asString(item.topicSlug),
          };
        })
        .filter((item): item is CrossSubjectLink => Boolean(item) && Boolean(item.topicSlug))
    : [];
}

export function calculateExerciseScore(exercises: Exercise[]) {
  const graded = exercises.filter((exercise) => exercise.correctAnswer);
  if (graded.length === 0) return 0;
  const correct = graded.filter(
    (exercise) => exercise.userAnswer?.trim().toLowerCase() === exercise.correctAnswer?.trim().toLowerCase(),
  ).length;
  return Math.round((correct / graded.length) * 100);
}

export function gradeFromPercent(percent: number) {
  if (percent >= 80) return { letter: "A", color: "text-primary" };
  if (percent >= 70) return { letter: "B", color: "text-emerald-700" };
  if (percent >= 60) return { letter: "C", color: "text-amber-700" };
  if (percent >= 50) return { letter: "D", color: "text-orange-700" };
  return { letter: "F", color: "text-destructive" };
}

export function resolvePerspective(userRole: string | null, requested?: string | null): AppPerspective {
  if (requested === "teacher" || requested === "admin" || requested === "student") return requested;
  if (userRole === "teacher" || userRole === "admin" || userRole === "student") return userRole;
  return "student";
}

const STARTER_TOPICS = [
  {
    subject_name: "Integrated Science",
    subject_slug: "integrated-science",
    title: "Forces in Motion",
    slug: "forces-in-motion",
    lesson_label: "Week 3 · Lesson 2",
    summary: "Understand balanced and unbalanced forces using familiar movement examples.",
    content_html: `
      <h2>Forces around us</h2>
      <p>Every moving object is responding to one or more forces. A football changes direction when a player kicks it, and a bicycle slows down because friction opposes motion.</p>
      <h3>Core idea</h3>
      <p>Balanced forces keep motion steady, while unbalanced forces change speed or direction. Review the geometry of vectors in <a href="topic://vector-links-in-geometry">Vector Links in Geometry</a>.</p>
      <h3>Quick application</h3>
      <p>Pause and predict: what happens when the pushing force becomes smaller than friction?</p>
      <ul>
        <li>Motion slows down</li>
        <li>Acceleration becomes negative</li>
        <li>The object may stop completely</li>
      </ul>
    `,
    cross_subject_links: [
      { id: "cross-force-1", label: "Connect force diagrams to vectors", subject: "Mathematics", topicSlug: "vector-links-in-geometry" },
      { id: "cross-force-2", label: "Relate motion graphs to data reading", subject: "Mathematics", topicSlug: "interpreting-motion-graphs" },
    ],
    model_embed_url: "https://3d.ischoolverse.example/force-lab",
    simulation_url: "https://phet.colorado.edu/sims/html/forces-and-motion-basics/latest/forces-and-motion-basics_en.html",
    cover_color: "navy",
    estimated_minutes: 40,
    topic_order: 1,
  },
  {
    subject_name: "Mathematics",
    subject_slug: "mathematics",
    title: "Vector Links in Geometry",
    slug: "vector-links-in-geometry",
    lesson_label: "Week 3 · Lesson 3",
    summary: "Use vectors to describe magnitude and direction in diagrams and coordinates.",
    content_html: `
      <h2>Vectors as directed movement</h2>
      <p>A vector has magnitude and direction. This makes it useful in both geometry and science.</p>
      <h3>Coordinate interpretation</h3>
      <p>When a displacement is represented as <strong>(3, 4)</strong>, the object has moved 3 units horizontally and 4 units vertically.</p>
      <p>Revisit the science application in <a href="topic://forces-in-motion">Forces in Motion</a>.</p>
      <h3>Think deeper</h3>
      <p>How could the same vector be represented on a map scale or in a navigation problem?</p>
    `,
    cross_subject_links: [
      { id: "cross-vector-1", label: "See vector use in force diagrams", subject: "Integrated Science", topicSlug: "forces-in-motion" },
      { id: "cross-vector-2", label: "Read graph slopes after this topic", subject: "Mathematics", topicSlug: "interpreting-motion-graphs" },
    ],
    model_embed_url: "https://3d.ischoolverse.example/vector-room",
    simulation_url: "https://phet.colorado.edu/sims/html/vector-addition/latest/vector-addition_en.html",
    cover_color: "gold",
    estimated_minutes: 35,
    topic_order: 2,
  },
  {
    subject_name: "Mathematics",
    subject_slug: "mathematics",
    title: "Interpreting Motion Graphs",
    slug: "interpreting-motion-graphs",
    lesson_label: "Week 3 · Lesson 4",
    summary: "Read distance-time and speed-time graphs to explain motion clearly.",
    content_html: `
      <h2>Graphs tell a story</h2>
      <p>A distance-time graph can show whether an object is resting, moving steadily, or changing speed.</p>
      <h3>Key reading move</h3>
      <p>The slope shows how quickly distance changes over time. Steeper lines indicate faster movement.</p>
      <p>Use this skill when you reflect on simulation results from <a href="topic://forces-in-motion">Forces in Motion</a>.</p>
    `,
    cross_subject_links: [
      { id: "cross-graph-1", label: "Apply graph reading to science investigations", subject: "Integrated Science", topicSlug: "forces-in-motion" },
    ],
    model_embed_url: "https://3d.ischoolverse.example/graph-lab",
    simulation_url: "https://phet.colorado.edu/sims/html/moving-man/latest/moving-man_en.html",
    cover_color: "sage",
    estimated_minutes: 30,
    topic_order: 3,
  },
] satisfies Array<Omit<TablesInsert<"book_topics">, "owner_id"> & { cross_subject_links: CrossSubjectLink[] }>;

export function createStarterBookTopics(ownerId: string): TablesInsert<"book_topics">[] {
  return STARTER_TOPICS.map((topic) => ({
    owner_id: ownerId,
    ...topic,
  }));
}

export function parseBookTopic(row: Tables<"book_topics">): BookTopic {
  return {
    ...row,
    cross_subject_links: parseCrossSubjectLinks(row.cross_subject_links),
  };
}

export function parseLearningNote(row: Tables<"notes">): LearningNote {
  return {
    ...row,
    annotation_marks: parseAnnotationMarks(row.annotation_marks),
    answer_spaces: parseAnswerSpaces(row.answer_spaces),
    auto_tags: parseAutoTags(row.auto_tags),
    media_embeds: parseMediaEmbeds(row.media_embeds),
    exercises: parseExercises(row.exercises),
  };
}

export function formatClassLabel(name: string, stream: string) {
  return `${name}${stream ? ` · ${stream}` : ""}`;
}
