import { type PointerEvent as ReactPointerEvent, useEffect, useMemo, useRef, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import {
  Camera,
  Cast,
  Eraser,
  Loader2,
  Mic,
  MicOff,
  PauseCircle,
  PenLine,
  PlayCircle,
  Presentation,
  RectangleHorizontal,
  Save,
  Share2,
  Sparkles,
  SquarePen,
  StopCircle,
  Type,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { useAuth } from "@/hooks/useAuth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  WHITEBOARD_COLORS,
  type WhiteboardElement,
  type WhiteboardPoint,
  type WhiteboardTool,
  canvasDataUrl,
  drawWhiteboard,
  parseWhiteboardElement,
  pointHitsElement,
} from "@/lib/whiteboard";

type LessonEvent = {
  id: string;
  title: string;
  description: string;
  start_at: string;
  end_at: string;
  location: string | null;
  metadata: Record<string, unknown> | null;
  subject: string | null;
  teacher: string | null;
  source_id: string | null;
};

type WhiteboardSessionRow = {
  id: string;
  owner_id: string;
  event_id: string | null;
  lesson_source_id: string | null;
  title: string;
  room_code: string;
  status: "scheduled" | "live" | "ended";
  participant_ids: string[];
  active_quiz: LiveQuiz | null;
  starts_at: string | null;
  ended_at: string | null;
};

type QuizResponseRow = {
  id: string;
  quiz_id: string;
  answer: string;
  user_id: string;
  is_correct: boolean | null;
};

type LiveQuiz = {
  id: string;
  question: string;
  options: string[];
  correctOption?: string;
  launchedAt: string;
};

type WhiteboardSessionTableRow = Tables<"whiteboard_sessions">;
type WhiteboardElementTableRow = Tables<"whiteboard_elements">;
type WhiteboardQuizResponseTableRow = Tables<"whiteboard_quiz_responses">;

type DrawingDraft =
  | { tool: "pen"; points: WhiteboardPoint[] }
  | { tool: "rectangle" | "ellipse" | "line"; start: WhiteboardPoint; current: WhiteboardPoint }
  | null;

const BOARD_WIDTH = 1280;
const BOARD_HEIGHT = 760;

function startOfDay(date: Date) {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function addDays(date: Date, amount: number) {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + amount);
  return copy;
}

function parseQuiz(value: unknown): LiveQuiz | null {
  const quiz = value as Record<string, unknown> | null;
  if (!quiz || typeof quiz.id !== "string" || typeof quiz.question !== "string" || !Array.isArray(quiz.options)) {
    return null;
  }

  return {
    id: quiz.id,
    question: quiz.question,
    options: quiz.options.filter((item): item is string => typeof item === "string"),
    correctOption: typeof quiz.correctOption === "string" ? quiz.correctOption : undefined,
    launchedAt: typeof quiz.launchedAt === "string" ? quiz.launchedAt : new Date().toISOString(),
  };
}

function eventStatus(event: LessonEvent) {
  const now = Date.now();
  const start = new Date(event.start_at).getTime();
  const end = new Date(event.end_at).getTime();
  if (start <= now && end >= now) return "live";
  if (start > now) return "upcoming";
  return "completed";
}

function eventTimeLabel(event: LessonEvent) {
  return `${new Date(event.start_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} - ${new Date(event.end_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
}

function eventMetadata(event: LessonEvent | null) {
  return event?.metadata && typeof event.metadata === "object" && !Array.isArray(event.metadata)
    ? (event.metadata as Record<string, unknown>)
    : null;
}

function metadataString(value: unknown) {
  return typeof value === "string" ? value : null;
}

function makeDraftElement(
  draft: DrawingDraft,
  color: string,
  lineWidth: number,
  textDraft: string,
): WhiteboardElement | null {
  if (!draft) return null;
  if (draft.tool === "pen") {
    if (draft.points.length < 2) return null;
    return {
      id: "draft",
      kind: "stroke",
      payload: { points: draft.points, color, width: lineWidth },
    };
  }

  return {
    id: "draft",
    kind: "shape",
    payload: {
      shape: draft.tool,
      x: draft.start.x,
      y: draft.start.y,
      width: draft.current.x - draft.start.x,
      height: draft.current.y - draft.start.y,
      color,
      strokeWidth: lineWidth,
    },
  };
}

function sameSession(left: WhiteboardSessionRow | null, right: WhiteboardSessionRow | null) {
  return left?.id === right?.id;
}

function mapSessionRow(row: WhiteboardSessionTableRow): WhiteboardSessionRow {
  return {
    id: row.id,
    owner_id: row.owner_id,
    event_id: row.event_id,
    lesson_source_id: row.lesson_source_id,
    title: row.title,
    room_code: row.room_code,
    status: row.status,
    participant_ids: row.participant_ids,
    active_quiz: parseQuiz(row.active_quiz),
    starts_at: row.starts_at,
    ended_at: row.ended_at,
  };
}

export default function Whiteboard() {
  const { user } = useAuth();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const screenVideoRef = useRef<HTMLVideoElement | null>(null);
  const cameraVideoRef = useRef<HTMLVideoElement | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const attendanceSessionRef = useRef<string | null>(null);
  const attendanceStartedAtRef = useRef<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [lessonEvents, setLessonEvents] = useState<LessonEvent[]>([]);
  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(null);
  const [activeSession, setActiveSession] = useState<WhiteboardSessionRow | null>(null);
  const [elements, setElements] = useState<WhiteboardElement[]>([]);
  const [quizResponses, setQuizResponses] = useState<QuizResponseRow[]>([]);
  const [sessionLoading, setSessionLoading] = useState(false);
  const [tool, setTool] = useState<WhiteboardTool>("pen");
  const [color, setColor] = useState<string>(WHITEBOARD_COLORS[0]);
  const [lineWidth, setLineWidth] = useState(4);
  const [textDraft, setTextDraft] = useState("Key idea");
  const [draft, setDraft] = useState<DrawingDraft>(null);
  const [joinCode, setJoinCode] = useState("");
  const [quizQuestion, setQuizQuestion] = useState("");
  const [quizOptionsText, setQuizOptionsText] = useState("Yes\nNo");
  const [quizCorrectOption, setQuizCorrectOption] = useState("");
  const [playbackActive, setPlaybackActive] = useState(false);
  const [playbackIndex, setPlaybackIndex] = useState(0);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);
  const [cameraEnabled, setCameraEnabled] = useState(true);
  const [micEnabled, setMicEnabled] = useState(true);

  const selectedLesson = useMemo(
    () => lessonEvents.find((event) => event.id === selectedLessonId) ?? null,
    [lessonEvents, selectedLessonId],
  );

  const isOwner = activeSession?.owner_id === user?.id;
  const activeQuiz = activeSession?.active_quiz ?? null;
  const activeSessionId = activeSession?.id ?? null;
  const activeSessionOwnerId = activeSession?.owner_id ?? null;
  const activeSessionStatus = activeSession?.status ?? null;
  const selectedLessonMeta = eventMetadata(selectedLesson);
  const selectedClassName = metadataString(selectedLessonMeta?.class_name);
  const selectedMetaSubject = metadataString(selectedLessonMeta?.subject_name);
  const selectedTimetableClassKey = metadataString(selectedLessonMeta?.class_id);
  
  const selectedLessonStartAt = selectedLesson?.start_at ?? null;
  const selectedLessonSubject = selectedLesson?.subject ?? null;
  const selectedLessonTitle = selectedLesson?.title ?? null;
  const visibleElements = useMemo(
    () => elements.filter((element) => !element.removedAt).sort((left, right) => (left.createdAt ?? "").localeCompare(right.createdAt ?? "")),
    [elements],
  );
  const previewElement = useMemo(() => makeDraftElement(draft, color, lineWidth, textDraft), [color, draft, lineWidth, textDraft]);
  const renderedElements = useMemo(() => {
    if (playbackActive) return visibleElements.slice(0, playbackIndex);
    return previewElement ? [...visibleElements, previewElement] : visibleElements;
  }, [playbackActive, playbackIndex, previewElement, visibleElements]);
  const currentQuizAnswer = useMemo(
    () => (activeQuiz ? quizResponses.find((response) => response.quiz_id === activeQuiz.id && response.user_id === user?.id)?.answer ?? null : null),
    [activeQuiz, quizResponses, user?.id],
  );
  const quizResponseCounts = useMemo(() => {
    if (!activeQuiz) return {} as Record<string, number>;
    return activeQuiz.options.reduce<Record<string, number>>((accumulator, option) => {
      accumulator[option] = quizResponses.filter((response) => response.quiz_id === activeQuiz.id && response.answer === option).length;
      return accumulator;
    }, {});
  }, [activeQuiz, quizResponses]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    (async () => {
      setLoading(true);
      const start = startOfDay(new Date());
      const end = addDays(start, 2);
      const { data, error } = await supabase
        .from("events")
        .select("id,title,description,start_at,end_at,location,metadata,subject,teacher,source_id")
        .eq("event_type", "lesson")
        .gte("start_at", start.toISOString())
        .lt("start_at", end.toISOString())
        .order("start_at", { ascending: true });

      if (error) {
        toast.error(error.message);
      } else if (!cancelled) {
        const nextEvents = (data ?? []) as LessonEvent[];
        setLessonEvents(nextEvents);

        const current = nextEvents.find((event) => eventStatus(event) === "live");
        const upcoming = nextEvents.find((event) => eventStatus(event) === "upcoming");
        setSelectedLessonId((previous) => previous ?? current?.id ?? upcoming?.id ?? nextEvents[0]?.id ?? null);
      }

      if (!cancelled) setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [user]);

  useEffect(() => {
    if (!selectedLesson) {
      setActiveSession(null);
      setElements([]);
      setQuizResponses([]);
      return;
    }

    let cancelled = false;
    setSessionLoading(true);

    (async () => {
      const { data, error } = await supabase
        .from("whiteboard_sessions")
        .select("*")
        .eq("event_id", selectedLesson.id)
        .order("created_at", { ascending: false })
        .limit(1);

      if (error) {
        toast.error(error.message);
      } else if (!cancelled) {
        const session = data?.[0] ? mapSessionRow(data[0] as WhiteboardSessionTableRow) : null;
        setActiveSession((previous) => (sameSession(previous, session) ? previous : session));
      }

      if (!cancelled) setSessionLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [selectedLesson]);

  useEffect(() => {
    if (!activeSessionId) {
      setElements([]);
      setQuizResponses([]);
      return;
    }

    let cancelled = false;
    setSessionLoading(true);

    const refreshSession = async () => {
      const [{ data: sessionRows, error: sessionError }, { data: elementRows, error: elementError }, { data: responseRows, error: responseError }] =
        await Promise.all([
          supabase.from("whiteboard_sessions").select("*").eq("id", activeSessionId).limit(1),
          supabase.from("whiteboard_elements").select("*").eq("session_id", activeSessionId).order("created_at", { ascending: true }),
          supabase.from("whiteboard_quiz_responses").select("*").eq("session_id", activeSessionId),
        ]);

      if (sessionError) toast.error(sessionError.message);
      if (elementError) toast.error(elementError.message);
      if (responseError) toast.error(responseError.message);

      if (cancelled) return;

      if (sessionRows?.[0]) {
        setActiveSession(mapSessionRow(sessionRows[0] as WhiteboardSessionTableRow));
      }

      setElements(
        (elementRows ?? [])
          .map((row) => parseWhiteboardElement(row as WhiteboardElementTableRow))
          .filter((value): value is WhiteboardElement => Boolean(value)),
      );
      setQuizResponses(
        ((responseRows ?? []) as WhiteboardQuizResponseTableRow[]).map((row) => ({
          id: row.id,
          quiz_id: row.quiz_id,
          answer: row.answer,
          user_id: row.user_id,
          is_correct: row.is_correct,
        })),
      );
      setSessionLoading(false);
    };

    void refreshSession();

    const channel = supabase.channel(`whiteboard:${activeSessionId}`);
    channelRef.current = channel;
    channel
      .on("broadcast", { event: "element-created" }, ({ payload }) => {
        const parsed = parseWhiteboardElement(payload.element as WhiteboardElementTableRow);
        if (!parsed) return;
        setElements((current) => (current.some((element) => element.id === parsed.id) ? current : [...current, parsed]));
      })
      .on("broadcast", { event: "element-removed" }, ({ payload }) => {
        setElements((current) =>
          current.map((element) => (element.id === payload.id ? { ...element, removedAt: payload.removedAt as string } : element)),
        );
      })
      .on("broadcast", { event: "board-cleared" }, ({ payload }) => {
        setElements((current) => current.map((element) => ({ ...element, removedAt: payload.removedAt as string })));
      })
      .on("broadcast", { event: "quiz-updated" }, ({ payload }) => {
        setActiveSession((current) => (current ? { ...current, active_quiz: parseQuiz(payload.quiz) } : current));
      })
      .on("broadcast", { event: "quiz-response" }, ({ payload }) => {
        const response = payload.response as QuizResponseRow;
        setQuizResponses((current) => {
          const next = current.filter((item) => item.id !== response.id);
          return [...next, response];
        });
      })
      .subscribe();

    const interval = window.setInterval(refreshSession, 12000);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
      channelRef.current = null;
      supabase.removeChannel(channel);
    };
  }, [activeSessionId]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;
    drawWhiteboard(context, renderedElements, BOARD_WIDTH, BOARD_HEIGHT);
  }, [renderedElements]);

  useEffect(() => {
    if (!playbackActive) return;
    setPlaybackIndex(0);
    const interval = window.setInterval(() => {
      setPlaybackIndex((current) => {
        if (current >= visibleElements.length) {
          window.clearInterval(interval);
          setPlaybackActive(false);
          return visibleElements.length;
        }
        return current + 1;
      });
    }, 220);
    return () => window.clearInterval(interval);
  }, [playbackActive, visibleElements.length]);

  useEffect(() => {
    if (screenVideoRef.current && screenStream) {
      screenVideoRef.current.srcObject = screenStream;
    }
  }, [screenStream]);

  useEffect(() => {
    if (cameraVideoRef.current && cameraStream) {
      cameraVideoRef.current.srcObject = cameraStream;
    }
  }, [cameraStream]);

  useEffect(() => {
    return () => {
      cameraStream?.getTracks().forEach((track) => track.stop());
      screenStream?.getTracks().forEach((track) => track.stop());
    };
  }, [cameraStream, screenStream]);

  useEffect(() => {
    if (!user || !selectedLessonId || !activeSessionId || !activeSessionOwnerId || activeSessionStatus !== "live") return;
    if (attendanceSessionRef.current === activeSessionId) return;

    attendanceSessionRef.current = activeSessionId;
    attendanceStartedAtRef.current = Date.now();
    const joinedAt = new Date().toISOString();
    const lateThreshold = new Date(selectedLessonStartAt ?? joinedAt).getTime() + 5 * 60 * 1000;
    const status = Date.now() > lateThreshold ? "late" : "present";

    void supabase.from("lesson_attendance").upsert(
      {
        owner_id: activeSessionOwnerId,
        event_id: selectedLessonId,
        whiteboard_session_id: activeSessionId,
        class_name: selectedClassName,
        subject_name: selectedLessonSubject || selectedMetaSubject,
        teacher_id: activeSessionOwnerId,
        student_id: user.id,
        lesson_title: selectedLessonSubject || selectedLessonTitle || "Lesson",
        joined_at: joinedAt,
        status,
        minutes_attended: 0,
      },
      { onConflict: "whiteboard_session_id,student_id" },
    );

    return () => {
      const startedAt = attendanceStartedAtRef.current;
      const minutes = startedAt ? Math.max(1, Math.round((Date.now() - startedAt) / 60000)) : 1;
      const endedAt = new Date().toISOString();

      void supabase
        .from("lesson_attendance")
        .update({
          left_at: endedAt,
          minutes_attended: minutes,
        })
        .eq("whiteboard_session_id", activeSessionId)
        .eq("student_id", user.id);

      void supabase.from("learning_activity").insert({
        owner_id: activeSessionOwnerId,
        student_id: user.id,
        subject_name: selectedLessonSubject || selectedMetaSubject,
        source: "whiteboard",
        lesson_title: selectedLessonSubject || selectedLessonTitle || "Lesson",
        minutes_spent: minutes,
        progress_percent: 100,
        content_percent: 100,
      });

      attendanceSessionRef.current = null;
      attendanceStartedAtRef.current = null;
    };
  }, [
    activeSessionId,
    activeSessionOwnerId,
    activeSessionStatus,
    selectedClassName,
    selectedLessonId,
    selectedLessonStartAt,
    selectedLessonSubject,
    selectedLessonTitle,
    selectedMetaSubject,
    user?.id,
  ]);

  const canvasPoint = (event: ReactPointerEvent<HTMLCanvasElement>): WhiteboardPoint => {
    const rect = event.currentTarget.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * BOARD_WIDTH,
      y: ((event.clientY - rect.top) / rect.height) * BOARD_HEIGHT,
    };
  };

  const broadcast = (event: string, payload: Record<string, unknown>) => {
    if (!channelRef.current) return;
    void channelRef.current.send({ type: "broadcast", event, payload });
  };

  const pushElement = async (element: WhiteboardElement) => {
    if (!activeSession || !user) {
      toast.info("Open or join a lesson session first");
      return;
    }

    const localElement = { ...element, userId: user.id, createdAt: new Date().toISOString() };
    setElements((current) => [...current, localElement]);
    broadcast("element-created", { element: { ...localElement, user_id: user.id, created_at: localElement.createdAt, removed_at: null } });

    const { error } = await supabase.from("whiteboard_elements").insert({
      id: localElement.id,
      session_id: activeSession.id,
      user_id: user.id,
      kind: localElement.kind,
      payload: localElement.payload,
    });

    if (error) toast.error(error.message);
  };

  const removeTopElement = async (point: WhiteboardPoint) => {
    if (!activeSession) return;
    const target = [...visibleElements].reverse().find((element) => pointHitsElement(element, point));
    if (!target) return;
    const removedAt = new Date().toISOString();
    setElements((current) => current.map((element) => (element.id === target.id ? { ...element, removedAt } : element)));
    broadcast("element-removed", { id: target.id, removedAt });
    const { error } = await supabase.from("whiteboard_elements").update({ removed_at: removedAt }).eq("id", target.id);
    if (error) toast.error(error.message);
  };

  const clearBoard = async () => {
    if (!activeSession) return;
    const removedAt = new Date().toISOString();
    setElements((current) => current.map((element) => ({ ...element, removedAt })));
    broadcast("board-cleared", { removedAt });
    const { error } = await supabase
      .from("whiteboard_elements")
      .update({ removed_at: removedAt })
      .eq("session_id", activeSession.id)
      .is("removed_at", null);
    if (error) toast.error(error.message);
  };

  const handlePointerDown = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (!activeSession) {
      toast.info("Start or join a lesson to annotate");
      return;
    }

    const point = canvasPoint(event);
    if (tool === "eraser") {
      void removeTopElement(point);
      return;
    }

    if (tool === "text") {
      if (!textDraft.trim()) {
        toast.info("Add some text first");
        return;
      }
      void pushElement({
        id: crypto.randomUUID(),
        kind: "text",
        payload: {
          text: textDraft.trim(),
          x: point.x,
          y: point.y,
          color,
          fontSize: Math.max(18, lineWidth * 6),
        },
      });
      return;
    }

    event.currentTarget.setPointerCapture(event.pointerId);
    if (tool === "pen") {
      setDraft({ tool: "pen", points: [point] });
      return;
    }
    setDraft({ tool, start: point, current: point });
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (!draft) return;
    const point = canvasPoint(event);
    if (draft.tool === "pen") {
      setDraft((current) => (current && current.tool === "pen" ? { ...current, points: [...current.points, point] } : current));
      return;
    }
    setDraft((current) => (current && current.tool !== "pen" ? { ...current, current: point } : current));
  };

  const handlePointerUp = async (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (!draft) return;
    event.currentTarget.releasePointerCapture(event.pointerId);
    const point = canvasPoint(event);

    if (draft.tool === "pen") {
      await pushElement({
        id: crypto.randomUUID(),
        kind: "stroke",
        payload: {
          points: [...draft.points, point],
          color,
          width: lineWidth,
        },
      });
      setDraft(null);
      return;
    }

    await pushElement({
      id: crypto.randomUUID(),
      kind: "shape",
      payload: {
        shape: draft.tool,
        x: draft.start.x,
        y: draft.start.y,
        width: point.x - draft.start.x,
        height: point.y - draft.start.y,
        color,
        strokeWidth: lineWidth,
      },
    });
    setDraft(null);
  };

  const loadSessionById = async (sessionId: string) => {
    const { data, error } = await supabase.from("whiteboard_sessions").select("*").eq("id", sessionId).limit(1);
    if (error) {
      toast.error(error.message);
      return;
    }
    const session = data?.[0] ? mapSessionRow(data[0] as WhiteboardSessionTableRow) : null;
    if (session) {
      setActiveSession(session);
      if (session.event_id) setSelectedLessonId(session.event_id);
    }
  };

  const startOrResumeSession = async () => {
    if (!user || !selectedLesson) {
      toast.info("Select a scheduled lesson first");
      return;
    }

    if (activeSession && activeSession.status !== "ended") {
      const { data, error } = await supabase
        .from("whiteboard_sessions")
        .update({ status: "live", starts_at: activeSession?.starts_at ?? new Date().toISOString(), ended_at: null })
        .eq("id", activeSession?.id ?? "")
        .select()
        .single();

      if (error && activeSession) {
        toast.error(error.message);
      } else if (data) {
        setActiveSession(mapSessionRow(data as WhiteboardSessionTableRow));
        toast.success("Lesson room is live");
      }
      if (activeSession) return;
    }

    const { data, error } = await supabase
      .from("whiteboard_sessions")
      .insert({
        owner_id: user.id,
        event_id: selectedLesson.id,
        lesson_source_id: selectedLesson.source_id,
        title: selectedLesson.subject || selectedLesson.title,
        status: "live",
        starts_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      toast.error(error.message);
      return;
    }

    setActiveSession(mapSessionRow(data as WhiteboardSessionTableRow));
    toast.success("Live whiteboard session started");
  };

  const endSession = async () => {
    if (!activeSession || !user) return;

    if (selectedTimetableClassKey) {
      const { data: classRows, error: classError } = await supabase
        .from("school_classes")
        .select("*")
        .eq("owner_id", user.id)
        .eq("timetable_class_key", selectedTimetableClassKey)
        .limit(1);

      if (classError) {
        toast.error(classError.message);
      } else {
        const schoolClass = classRows?.[0];
        if (schoolClass) {
          const [{ data: classEnrollments, error: enrollmentError }, { data: attendanceRows, error: attendanceError }] = await Promise.all([
            supabase.from("class_enrollments").select("*").eq("class_id", schoolClass.id),
            supabase.from("lesson_attendance").select("*").eq("whiteboard_session_id", activeSession.id),
          ]);

          if (enrollmentError) toast.error(enrollmentError.message);
          if (attendanceError) toast.error(attendanceError.message);

          const attended = new Set((attendanceRows ?? []).map((row) => row.student_id));
          const missedRows = (classEnrollments ?? [])
            .filter((enrollment) => !attended.has(enrollment.student_id))
            .map((enrollment) => ({
              owner_id: user.id,
              event_id: selectedLesson?.id ?? null,
              whiteboard_session_id: activeSession.id,
              class_id: schoolClass.id,
              class_name: `${schoolClass.name}${schoolClass.stream ? ` · ${schoolClass.stream}` : ""}`,
              subject_name: selectedLesson?.subject || selectedMetaSubject,
              teacher_id: user.id,
              student_id: enrollment.student_id,
              lesson_title: selectedLesson?.subject || selectedLesson?.title || activeSession.title,
              joined_at: selectedLesson?.start_at ?? new Date().toISOString(),
              left_at: selectedLesson?.end_at ?? new Date().toISOString(),
              minutes_attended: 0,
              status: "missed",
            }));

          if (missedRows.length > 0) {
            const { error: missedError } = await supabase.from("lesson_attendance").upsert(missedRows, {
              onConflict: "whiteboard_session_id,student_id",
            });
            if (missedError) toast.error(missedError.message);
          }
        }
      }
    }

    const { data, error } = await supabase
      .from("whiteboard_sessions")
      .update({ status: "ended", ended_at: new Date().toISOString(), active_quiz: null })
      .eq("id", activeSession.id)
      .select()
      .single();

    if (error) {
      toast.error(error.message);
      return;
    }

    setActiveSession(mapSessionRow(data as WhiteboardSessionTableRow));
    broadcast("quiz-updated", { quiz: null });
    toast.success("Session ended");
  };

  const joinSession = async () => {
    if (!joinCode.trim()) return;
    const { data, error } = await supabase.rpc("join_whiteboard_session", { _room_code: joinCode.trim().toUpperCase() });
    if (error) {
      toast.error(error.message);
      return;
    }
    await loadSessionById(data);
    toast.success("Joined lesson room");
  };

  const launchQuiz = async () => {
    if (!activeSession || !isOwner) return;
    const options = quizOptionsText
      .split("\n")
      .map((option) => option.trim())
      .filter(Boolean);
    if (!quizQuestion.trim() || options.length < 2) {
      toast.info("Add a question and at least two options");
      return;
    }

    const quiz: LiveQuiz = {
      id: crypto.randomUUID(),
      question: quizQuestion.trim(),
      options,
      correctOption: quizCorrectOption.trim() || undefined,
      launchedAt: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from("whiteboard_sessions")
      .update({ active_quiz: quiz })
      .eq("id", activeSession.id)
      .select()
      .single();

    if (error) {
      toast.error(error.message);
      return;
    }

    setActiveSession(mapSessionRow(data as WhiteboardSessionTableRow));
    setQuizResponses([]);
    broadcast("quiz-updated", { quiz });
    toast.success("Quiz launched");
  };

  const closeQuiz = async () => {
    if (!activeSession || !isOwner) return;
    const { data, error } = await supabase
      .from("whiteboard_sessions")
      .update({ active_quiz: null })
      .eq("id", activeSession.id)
      .select()
      .single();

    if (error) {
      toast.error(error.message);
      return;
    }

    setActiveSession(mapSessionRow(data as WhiteboardSessionTableRow));
    broadcast("quiz-updated", { quiz: null });
  };

  const submitQuizAnswer = async (answer: string) => {
    if (!activeSession || !activeQuiz || !user) return;
    const payload = {
      session_id: activeSession.id,
      user_id: user.id,
      quiz_id: activeQuiz.id,
      answer,
      is_correct: activeQuiz.correctOption ? activeQuiz.correctOption === answer : null,
    };
    const { data, error } = await supabase
      .from("whiteboard_quiz_responses")
      .upsert(payload, { onConflict: "session_id,user_id,quiz_id" })
      .select()
      .single();

    if (error) {
      toast.error(error.message);
      return;
    }

    const response = data as QuizResponseRow;
    setQuizResponses((current) => [...current.filter((item) => item.id !== response.id), response]);
    broadcast("quiz-response", { response });
    toast.success("Answer submitted");
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      setCameraStream(stream);
      setCameraEnabled(true);
      setMicEnabled(true);
    } catch {
      toast.error("Camera or microphone access was denied");
    }
  };

  const startScreenShare = async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
      setScreenStream(stream);
    } catch {
      toast.error("Screen sharing was cancelled");
    }
  };

  const toggleCamera = () => {
    if (!cameraStream) return;
    const next = !cameraEnabled;
    cameraStream.getVideoTracks().forEach((track) => {
      track.enabled = next;
    });
    setCameraEnabled(next);
  };

  const toggleMic = () => {
    if (!cameraStream) return;
    const next = !micEnabled;
    cameraStream.getAudioTracks().forEach((track) => {
      track.enabled = next;
    });
    setMicEnabled(next);
  };

  const saveToNotes = async () => {
    if (!user || visibleElements.length === 0) {
      toast.info("There is no board content to save yet");
      return;
    }

    const image = canvasDataUrl(visibleElements, BOARD_WIDTH, BOARD_HEIGHT);
    const lessonTitle = selectedLesson?.subject || activeSession?.title || "Live lesson";
    const html = `
      <h2>${lessonTitle} whiteboard snapshot</h2>
      <p>Captured on ${new Date().toLocaleString()}.</p>
      <p>${selectedLesson?.teacher ? `Teacher: ${selectedLesson.teacher}. ` : ""}${selectedLesson?.location ? `Location: ${selectedLesson.location}.` : ""}</p>
      <img src="${image}" alt="Whiteboard snapshot" />
      <p>Session room: ${activeSession?.room_code ?? "offline preview"}.</p>
    `;

    const { error } = await supabase.from("notes").insert({
      user_id: user.id,
      title: `${lessonTitle} board snapshot`,
      subject: lessonTitle,
      lesson_title: lessonTitle,
      note_date: new Date().toISOString().slice(0, 10),
      auto_tags: {
        subject: lessonTitle,
        lesson: selectedLesson?.title,
        date: new Date().toISOString().slice(0, 10),
      },
      content: html,
      color: "cream",
    });

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success("Board saved into iSchool Notes");
  };

  if (loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center text-muted-foreground">
        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
        Loading whiteboard classroom…
      </div>
    );
  }

  return (
    <div className="max-w-[1600px] mx-auto space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl md:text-3xl text-foreground flex items-center gap-2">
            <Presentation className="h-6 w-6 text-primary" />
            iSchool Whiteboard
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Live lesson delivery space with shared annotation, hybrid teaching tools, quiz prompts, playback, and one-click export to Notes.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" onClick={() => setPlaybackActive((current) => !current)} disabled={visibleElements.length === 0}>
            {playbackActive ? <PauseCircle className="h-4 w-4 mr-2" /> : <PlayCircle className="h-4 w-4 mr-2" />}
            {playbackActive ? "Stop playback" : "Replay lesson"}
          </Button>
          <Button variant="outline" onClick={saveToNotes}>
            <Save className="h-4 w-4 mr-2" />
            Save to Notes
          </Button>
          {isOwner ? (
            <Button variant="outline" onClick={clearBoard} disabled={!activeSession}>
              <Eraser className="h-4 w-4 mr-2" />
              Clear board
            </Button>
          ) : null}
          {isOwner && activeSession?.status === "live" ? (
            <Button variant="destructive" onClick={endSession}>
              <StopCircle className="h-4 w-4 mr-2" />
              End lesson
            </Button>
          ) : (
            <Button onClick={startOrResumeSession} disabled={!selectedLesson || sessionLoading}>
              {sessionLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
              {activeSession ? "Go live" : "Start lesson"}
            </Button>
          )}
        </div>
      </header>

      <section className="grid grid-cols-1 xl:grid-cols-[320px_1fr_360px] gap-6">
        <div className="space-y-4">
          <Card className="p-4">
            <div className="flex items-center gap-2">
              <Badge className="bg-primary text-primary-foreground">Linked schedule</Badge>
              <span className="text-sm text-muted-foreground">Auto-focuses the current or next lesson</span>
            </div>
            <div className="mt-4 space-y-3">
              {lessonEvents.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">
                  No lessons found in the next 48 hours. Generate one from Timetables or add a lesson event in Calendar.
                </div>
              ) : (
                lessonEvents.map((event) => {
                  const status = eventStatus(event);
                  return (
                    <button
                      key={event.id}
                      onClick={() => setSelectedLessonId(event.id)}
                      className={cn(
                        "w-full rounded-2xl border p-4 text-left transition-colors",
                        selectedLessonId === event.id ? "border-primary ring-2 ring-primary/20" : "border-border hover:bg-muted/40",
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <Badge variant={status === "live" ? "default" : status === "upcoming" ? "outline" : "secondary"}>
                          {status === "live" ? "Live now" : status === "upcoming" ? "Upcoming" : "Completed"}
                        </Badge>
                        {activeSession?.event_id === event.id && <Badge className="bg-accent text-accent-foreground">Room open</Badge>}
                      </div>
                      <div className="font-display text-lg text-foreground mt-3">{event.subject || event.title}</div>
                      <div className="text-sm text-muted-foreground mt-1">{eventTimeLabel(event)}</div>
                      {event.teacher && <div className="text-sm text-muted-foreground mt-1">{event.teacher}</div>}
                      {event.location && <div className="text-sm text-muted-foreground mt-1">{event.location}</div>}
                    </button>
                  );
                })
              )}
            </div>
          </Card>

          <Card className="p-4 space-y-4">
            <div>
              <h2 className="font-display text-lg text-foreground">Join by room code</h2>
              <p className="text-sm text-muted-foreground mt-1">Students can join the live board with the code shared by the lesson host.</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="join-room">Room code</Label>
              <Input id="join-room" value={joinCode} onChange={(event) => setJoinCode(event.target.value.toUpperCase())} placeholder="AB12CD34" />
            </div>
            <Button className="w-full" variant="outline" onClick={joinSession}>
              <Share2 className="h-4 w-4 mr-2" />
              Join lesson room
            </Button>
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="p-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge className="bg-primary text-primary-foreground">{activeSession?.status ?? "offline"}</Badge>
                  {selectedLesson && <Badge variant="outline">{selectedLesson.subject || selectedLesson.title}</Badge>}
                  {activeSession?.room_code && <Badge className="bg-accent text-accent-foreground">Room {activeSession.room_code}</Badge>}
                </div>
                <div className="font-display text-xl text-foreground mt-3">
                  {selectedLesson?.subject || activeSession?.title || "Whiteboard canvas"}
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  {selectedLesson ? `${eventTimeLabel(selectedLesson)}${selectedLesson.location ? ` · ${selectedLesson.location}` : ""}` : "Open a session to begin teaching."}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {[
                  { value: "pen" as const, icon: PenLine, label: "Pen" },
                  { value: "rectangle" as const, icon: RectangleHorizontal, label: "Rect" },
                  { value: "ellipse" as const, icon: Cast, label: "Ellipse" },
                  { value: "line" as const, icon: Share2, label: "Line" },
                  { value: "text" as const, icon: Type, label: "Text" },
                  { value: "eraser" as const, icon: Eraser, label: "Eraser" },
                ].map((entry) => (
                  <Button
                    key={entry.value}
                    variant={tool === entry.value ? "default" : "outline"}
                    size="sm"
                    onClick={() => setTool(entry.value)}
                  >
                    <entry.icon className="h-4 w-4 mr-2" />
                    {entry.label}
                  </Button>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 py-4">
              {WHITEBOARD_COLORS.map((swatch) => (
                <button
                  key={swatch}
                  type="button"
                  onClick={() => setColor(swatch)}
                  className={cn("h-7 w-7 rounded-full border-2", color === swatch ? "border-primary" : "border-background")}
                  style={{ backgroundColor: swatch }}
                  aria-label={`Select ${swatch}`}
                />
              ))}
              <div className="flex items-center gap-2">
                <Label>Stroke</Label>
                <Input
                  type="number"
                  min={2}
                  max={18}
                  value={lineWidth}
                  onChange={(event) => setLineWidth(Number(event.target.value) || 4)}
                  className="w-20"
                />
              </div>
              <div className="flex-1 min-w-[220px] flex items-center gap-2">
                <Label>Text</Label>
                <Input value={textDraft} onChange={(event) => setTextDraft(event.target.value)} placeholder="Type and click the board" />
              </div>
            </div>

            <div className="overflow-auto rounded-2xl border border-border bg-white shadow-sm">
              <canvas
                ref={canvasRef}
                width={BOARD_WIDTH}
                height={BOARD_HEIGHT}
                className="w-full min-w-[900px] touch-none"
                style={{ touchAction: "none" }}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerLeave={() => setDraft(null)}
              />
            </div>
          </Card>

          {activeQuiz && !isOwner && (
            <Card className="border-accent/50 bg-accent/15 p-4">
              <div className="flex items-center gap-2">
                <Badge className="bg-accent text-accent-foreground">Live quiz</Badge>
                {currentQuizAnswer && <Badge variant="outline">Answered</Badge>}
              </div>
              <div className="font-display text-lg text-foreground mt-3">{activeQuiz.question}</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-4">
                {activeQuiz.options.map((option) => (
                  <Button
                    key={option}
                    variant={currentQuizAnswer === option ? "default" : "outline"}
                    onClick={() => submitQuizAnswer(option)}
                  >
                    {option}
                  </Button>
                ))}
              </div>
            </Card>
          )}
        </div>

        <div className="space-y-4">
          <Card className="p-4">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              <h2 className="font-display text-lg text-foreground">Session panel</h2>
            </div>
            <div className="space-y-3 mt-4">
              <div className="rounded-xl border border-border/60 p-3">
                <div className="text-sm text-muted-foreground">Host</div>
                <div className="font-medium text-foreground mt-1">{isOwner ? "You" : activeSession ? "Session owner" : "Not connected"}</div>
              </div>
              <div className="rounded-xl border border-border/60 p-3">
                <div className="text-sm text-muted-foreground">Participants</div>
                <div className="font-medium text-foreground mt-1">
                  {activeSession ? activeSession.participant_ids.length + 1 : 0} connected profile(s)
                </div>
              </div>
              <div className="rounded-xl border border-border/60 p-3">
                <div className="text-sm text-muted-foreground">Recording</div>
                <div className="font-medium text-foreground mt-1">Auto-captured via whiteboard actions</div>
                <p className="text-xs text-muted-foreground mt-1">Replay uses the persisted stroke, shape, and text timeline.</p>
              </div>
            </div>
          </Card>

          <Card className="p-4 space-y-4">
            <div>
              <h2 className="font-display text-lg text-foreground">Hybrid teaching controls</h2>
              <p className="text-sm text-muted-foreground mt-1">Start local screen and camera previews for live lesson delivery.</p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={startScreenShare}>
                <Cast className="h-4 w-4 mr-2" />
                Share screen
              </Button>
              <Button variant="outline" onClick={startCamera}>
                <Camera className="h-4 w-4 mr-2" />
                Camera preview
              </Button>
              <Button variant="outline" onClick={toggleCamera} disabled={!cameraStream}>
                <SquarePen className="h-4 w-4 mr-2" />
                {cameraEnabled ? "Camera on" : "Camera off"}
              </Button>
              <Button variant="outline" onClick={toggleMic} disabled={!cameraStream}>
                {micEnabled ? <Mic className="h-4 w-4 mr-2" /> : <MicOff className="h-4 w-4 mr-2" />}
                {micEnabled ? "Mic on" : "Mic muted"}
              </Button>
            </div>

            <div className="grid grid-cols-1 gap-4">
              <div className="rounded-xl border border-border/60 bg-card p-3">
                <div className="text-sm text-muted-foreground mb-2">Screen share preview</div>
                {screenStream ? (
                  <video ref={screenVideoRef} autoPlay muted playsInline className="w-full rounded-lg bg-black" />
                ) : (
                  <div className="rounded-lg border border-dashed border-border p-6 text-sm text-muted-foreground text-center">
                    No screen being shared yet.
                  </div>
                )}
              </div>
              <div className="rounded-xl border border-border/60 bg-card p-3">
                <div className="text-sm text-muted-foreground mb-2">Camera preview</div>
                {cameraStream ? (
                  <video ref={cameraVideoRef} autoPlay muted playsInline className="w-full rounded-lg bg-black" />
                ) : (
                  <div className="rounded-lg border border-dashed border-border p-6 text-sm text-muted-foreground text-center">
                    Camera preview is inactive.
                  </div>
                )}
              </div>
            </div>
          </Card>

          <Card className="p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-display text-lg text-foreground">Live quiz launcher</h2>
                <p className="text-sm text-muted-foreground mt-1">Use quick checks to keep learners engaged mid-lesson.</p>
              </div>
              {activeQuiz && isOwner && (
                <Button variant="outline" size="sm" onClick={closeQuiz}>
                  Close quiz
                </Button>
              )}
            </div>

            {isOwner ? (
              <>
                <div className="space-y-2">
                  <Label>Question</Label>
                  <Input value={quizQuestion} onChange={(event) => setQuizQuestion(event.target.value)} placeholder="What should happen next?" />
                </div>
                <div className="space-y-2">
                  <Label>Options</Label>
                  <Textarea
                    rows={4}
                    value={quizOptionsText}
                    onChange={(event) => setQuizOptionsText(event.target.value)}
                    placeholder={"Option A\nOption B\nOption C"}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Correct option (optional)</Label>
                  <Input value={quizCorrectOption} onChange={(event) => setQuizCorrectOption(event.target.value)} placeholder="Option A" />
                </div>
                <Button className="w-full" onClick={launchQuiz} disabled={!activeSession}>
                  Launch quiz
                </Button>
              </>
            ) : activeQuiz ? (
              <div className="rounded-xl border border-border/60 p-4">
                <div className="font-medium text-foreground">{activeQuiz.question}</div>
                <div className="text-sm text-muted-foreground mt-2">
                  {currentQuizAnswer ? `You answered: ${currentQuizAnswer}` : "Waiting for your answer on the board popup."}
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">
                No active quiz right now.
              </div>
            )}

            {activeQuiz && (
              <ScrollArea className="max-h-48 rounded-xl border border-border/60">
                <div className="space-y-2 p-3">
                  {activeQuiz.options.map((option) => (
                    <div key={option} className="rounded-xl bg-secondary/60 px-3 py-2">
                      <div className="font-medium text-foreground">{option}</div>
                      <div className="text-xs text-muted-foreground mt-1">{quizResponseCounts[option] ?? 0} response(s)</div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </Card>
        </div>
      </section>
    </div>
  );
}
