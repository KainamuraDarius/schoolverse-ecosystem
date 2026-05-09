import type { TablesInsert, TablesUpdate } from "@/integrations/supabase/types";

export const WEEK_DAYS = [
  { value: 1, label: "Mon" },
  { value: 2, label: "Tue" },
  { value: 3, label: "Wed" },
  { value: 4, label: "Thu" },
  { value: 5, label: "Fri" },
  { value: 6, label: "Sat" },
  { value: 7, label: "Sun" },
] as const;

export type WeekDay = typeof WEEK_DAYS[number]["value"];
export type ScheduleScopeType = "teacher" | "class" | "all";

export type TeacherInput = {
  id: string;
  name: string;
  code: string;
  maxLessonsPerDay: number;
  unavailable: string[];
};

export type ClassInput = {
  id: string;
  name: string;
  stream: string;
  homeRoom: string;
  maxLessonsPerDay: number;
  unavailable: string[];
};

export type SubjectInput = {
  id: string;
  name: string;
  code: string;
  teacherId: string;
  classId: string;
  sessionsPerWeek: number;
  preferredDays: WeekDay[];
  color: string;
  location: string;
};

export type PeriodInput = {
  id: string;
  label: string;
  startsAt: string;
  endsAt: string;
  isBreak: boolean;
};

export type BlockedSlot = {
  id: string;
  day: WeekDay;
  periodId: string;
  reason: string;
};

export type ConstraintInput = {
  workingDays: WeekDay[];
  termStartsOn: string;
  publishWeeks: number;
  maxTeacherLessonsPerDay: number;
  maxClassLessonsPerDay: number;
  avoidConsecutiveSameSubject: boolean;
  blockedSlots: BlockedSlot[];
};

export type TimetablePlanDraft = {
  id: string | null;
  title: string;
  teachers: TeacherInput[];
  classes: ClassInput[];
  subjects: SubjectInput[];
  periods: PeriodInput[];
  constraints: ConstraintInput;
  scheduleScopeType: ScheduleScopeType;
  scheduleScopeId: string | null;
};

export type GeneratedLesson = {
  sourceKey: string;
  dayOfWeek: WeekDay;
  periodNumber: number;
  periodId: string;
  periodLabel: string;
  startsAt: string;
  endsAt: string;
  teacherId: string;
  teacherName: string;
  classId: string;
  className: string;
  subjectId: string;
  subjectName: string;
  subjectCode: string;
  subjectColor: string;
  location: string;
};

export type TimetableConflict = {
  id: string;
  subjectId?: string;
  teacherId?: string;
  classId?: string;
  dayOfWeek?: WeekDay;
  periodId?: string;
  reason: string;
};

type Demand = SubjectInput & {
  demandIndex: number;
};

type LoadSummary = {
  teacherDailyLoads: Record<string, Record<number, number>>;
  classDailyLoads: Record<string, Record<number, number>>;
  teacherWeeklyLoads: Record<string, number>;
};

const DEFAULT_CONSTRAINTS: ConstraintInput = {
  workingDays: [1, 2, 3, 4, 5],
  termStartsOn: startOfCurrentWeek(),
  publishWeeks: 6,
  maxTeacherLessonsPerDay: 5,
  maxClassLessonsPerDay: 6,
  avoidConsecutiveSameSubject: true,
  blockedSlots: [],
};

type JsonRecord = Record<string, unknown>;

function makeId(prefix: string) {
  return `${prefix}-${globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2, 10)}`;
}

function startOfCurrentWeek() {
  const now = new Date();
  const copy = new Date(now);
  const day = copy.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  copy.setDate(copy.getDate() + diff);
  copy.setHours(0, 0, 0, 0);
  return copy.toISOString().slice(0, 10);
}

export function getWeekdayLabel(day: number) {
  return WEEK_DAYS.find((entry) => entry.value === day)?.label ?? `Day ${day}`;
}

function parseTime(value: string) {
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
}

function slotToken(day: number, periodId: string) {
  return `${day}:${periodId}`;
}

function byPeriodTime(a: PeriodInput, b: PeriodInput) {
  return parseTime(a.startsAt) - parseTime(b.startsAt);
}

function toPositiveInt(value: number, fallback: number) {
  const rounded = Math.round(value);
  return Number.isFinite(rounded) && rounded > 0 ? rounded : fallback;
}

function asStringArray(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function asJsonRecord(value: unknown): JsonRecord | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as JsonRecord) : null;
}

function asJsonRecordArray(value: unknown) {
  return Array.isArray(value) ? value.map(asJsonRecord).filter((item): item is JsonRecord => Boolean(item)) : [];
}

function asWeekDays(value: unknown, fallback: WeekDay[]) {
  const days = Array.isArray(value)
    ? value
        .map((item) => Number(item))
        .filter((item): item is WeekDay => Number.isInteger(item) && item >= 1 && item <= 7)
    : [];
  return days.length > 0 ? days : fallback;
}

function overlaps(a: PeriodInput, b: PeriodInput) {
  return parseTime(a.startsAt) < parseTime(b.endsAt) && parseTime(b.startsAt) < parseTime(a.endsAt);
}

export function createDefaultTimetablePlan(): TimetablePlanDraft {
  const teachers: TeacherInput[] = [
    { id: "teacher-njoroge", name: "Mrs. Njoroge", code: "MAT", maxLessonsPerDay: 5, unavailable: [] },
    { id: "teacher-oketch", name: "Mr. Oketch", code: "SCI", maxLessonsPerDay: 4, unavailable: [] },
    { id: "teacher-kimani", name: "Ms. Kimani", code: "ENG", maxLessonsPerDay: 5, unavailable: [] },
  ];

  const classes: ClassInput[] = [
    { id: "class-j1-north", name: "Junior 1", stream: "North", homeRoom: "Room 12", maxLessonsPerDay: 6, unavailable: [] },
    { id: "class-j1-east", name: "Junior 1", stream: "East", homeRoom: "Room 14", maxLessonsPerDay: 6, unavailable: [] },
  ];

  const periods: PeriodInput[] = [
    { id: "period-1", label: "Period 1", startsAt: "08:00", endsAt: "08:40", isBreak: false },
    { id: "period-2", label: "Period 2", startsAt: "08:45", endsAt: "09:25", isBreak: false },
    { id: "period-break", label: "Break", startsAt: "09:25", endsAt: "09:45", isBreak: true },
    { id: "period-3", label: "Period 3", startsAt: "09:45", endsAt: "10:25", isBreak: false },
    { id: "period-4", label: "Period 4", startsAt: "10:30", endsAt: "11:10", isBreak: false },
    { id: "period-5", label: "Period 5", startsAt: "11:20", endsAt: "12:00", isBreak: false },
    { id: "period-6", label: "Period 6", startsAt: "12:05", endsAt: "12:45", isBreak: false },
  ];

  const subjects: SubjectInput[] = [
    {
      id: "subject-maths-north",
      name: "Mathematics",
      code: "MAT",
      teacherId: teachers[0].id,
      classId: classes[0].id,
      sessionsPerWeek: 5,
      preferredDays: [1, 2, 4, 5],
      color: "navy",
      location: classes[0].homeRoom,
    },
    {
      id: "subject-science-north",
      name: "Integrated Science",
      code: "SCI",
      teacherId: teachers[1].id,
      classId: classes[0].id,
      sessionsPerWeek: 4,
      preferredDays: [2, 3, 5],
      color: "gold",
      location: "Lab 1",
    },
    {
      id: "subject-english-east",
      name: "English",
      code: "ENG",
      teacherId: teachers[2].id,
      classId: classes[1].id,
      sessionsPerWeek: 5,
      preferredDays: [1, 3, 4, 5],
      color: "sage",
      location: classes[1].homeRoom,
    },
    {
      id: "subject-maths-east",
      name: "Mathematics",
      code: "MAT",
      teacherId: teachers[0].id,
      classId: classes[1].id,
      sessionsPerWeek: 4,
      preferredDays: [1, 2, 4],
      color: "navy",
      location: classes[1].homeRoom,
    },
  ];

  return {
    id: null,
    title: "My weekly timetable",
    teachers,
    classes,
    subjects,
    periods,
    constraints: DEFAULT_CONSTRAINTS,
    scheduleScopeType: "teacher",
    scheduleScopeId: teachers[0].id,
  };
}

export function normalizeTimetablePlan(row?: Partial<TablesUpdate<"timetable_plans">> & { id?: string | null } | null): TimetablePlanDraft {
  const fallback = createDefaultTimetablePlan();
  if (!row) return fallback;

  const teachers = Array.isArray(row.teachers)
    ? asJsonRecordArray(row.teachers).map((teacher) => ({
        id: typeof teacher?.id === "string" ? teacher.id : makeId("teacher"),
        name: typeof teacher?.name === "string" ? teacher.name : "Teacher",
        code: typeof teacher?.code === "string" ? teacher.code : "",
        maxLessonsPerDay: toPositiveInt(Number(teacher?.maxLessonsPerDay), fallback.constraints.maxTeacherLessonsPerDay),
        unavailable: asStringArray(teacher?.unavailable),
      }))
    : fallback.teachers;

  const classes = Array.isArray(row.classes)
    ? asJsonRecordArray(row.classes).map((classroom) => ({
        id: typeof classroom?.id === "string" ? classroom.id : makeId("class"),
        name: typeof classroom?.name === "string" ? classroom.name : "Class",
        stream: typeof classroom?.stream === "string" ? classroom.stream : "",
        homeRoom: typeof classroom?.homeRoom === "string" ? classroom.homeRoom : "",
        maxLessonsPerDay: toPositiveInt(Number(classroom?.maxLessonsPerDay), fallback.constraints.maxClassLessonsPerDay),
        unavailable: asStringArray(classroom?.unavailable),
      }))
    : fallback.classes;

  const periods = Array.isArray(row.periods)
    ? asJsonRecordArray(row.periods)
        .map((period) => ({
          id: typeof period?.id === "string" ? period.id : makeId("period"),
          label: typeof period?.label === "string" ? period.label : "Period",
          startsAt: typeof period?.startsAt === "string" ? period.startsAt : "08:00",
          endsAt: typeof period?.endsAt === "string" ? period.endsAt : "08:40",
          isBreak: Boolean(period?.isBreak),
        }))
        .sort(byPeriodTime)
    : fallback.periods;

  const subjects = Array.isArray(row.subjects)
    ? asJsonRecordArray(row.subjects).map((subject) => ({
        id: typeof subject?.id === "string" ? subject.id : makeId("subject"),
        name: typeof subject?.name === "string" ? subject.name : "Subject",
        code: typeof subject?.code === "string" ? subject.code : "",
        teacherId: typeof subject?.teacherId === "string" ? subject.teacherId : teachers[0]?.id ?? "",
        classId: typeof subject?.classId === "string" ? subject.classId : classes[0]?.id ?? "",
        sessionsPerWeek: toPositiveInt(Number(subject?.sessionsPerWeek), 3),
        preferredDays: asWeekDays(subject?.preferredDays, fallback.constraints.workingDays),
        color: typeof subject?.color === "string" ? subject.color : "navy",
        location: typeof subject?.location === "string" ? subject.location : "",
      }))
    : fallback.subjects;

  const rawConstraints = asJsonRecord(row.constraints);
  const constraints: ConstraintInput = {
    workingDays: asWeekDays(rawConstraints?.workingDays, fallback.constraints.workingDays),
    termStartsOn: typeof rawConstraints?.termStartsOn === "string" ? rawConstraints.termStartsOn : fallback.constraints.termStartsOn,
    publishWeeks: toPositiveInt(Number(rawConstraints?.publishWeeks), fallback.constraints.publishWeeks),
    maxTeacherLessonsPerDay: toPositiveInt(Number(rawConstraints?.maxTeacherLessonsPerDay), fallback.constraints.maxTeacherLessonsPerDay),
    maxClassLessonsPerDay: toPositiveInt(Number(rawConstraints?.maxClassLessonsPerDay), fallback.constraints.maxClassLessonsPerDay),
    avoidConsecutiveSameSubject: rawConstraints?.avoidConsecutiveSameSubject !== false,
    blockedSlots: Array.isArray(rawConstraints?.blockedSlots)
      ? asJsonRecordArray(rawConstraints.blockedSlots).map((slot) => ({
          id: typeof slot?.id === "string" ? slot.id : makeId("blocked"),
          day: asWeekDays([slot?.day], fallback.constraints.workingDays)[0],
          periodId: typeof slot?.periodId === "string" ? slot.periodId : periods[0]?.id ?? "",
          reason: typeof slot?.reason === "string" ? slot.reason : "Blocked slot",
        }))
      : [],
  };

  const scheduleScopeType = row.schedule_scope_type === "class" || row.schedule_scope_type === "all" ? row.schedule_scope_type : "teacher";
  const scheduleScopeId = typeof row.schedule_scope_id === "string" ? row.schedule_scope_id : null;

  return {
    id: row.id ?? null,
    title: typeof row.title === "string" ? row.title : fallback.title,
    teachers,
    classes,
    subjects,
    periods,
    constraints,
    scheduleScopeType,
    scheduleScopeId,
  };
}

export function serializeTimetablePlan(plan: TimetablePlanDraft, userId: string): TablesInsert<"timetable_plans"> {
  return {
    id: plan.id ?? undefined,
    user_id: userId,
    title: plan.title,
    teachers: plan.teachers,
    subjects: plan.subjects,
    classes: plan.classes,
    periods: plan.periods,
    constraints: plan.constraints,
    schedule_scope_type: plan.scheduleScopeType,
    schedule_scope_id: plan.scheduleScopeId,
  };
}

export function generateTimetable(plan: TimetablePlanDraft): { lessons: GeneratedLesson[]; conflicts: TimetableConflict[]; loadSummary: LoadSummary } {
  const periods = [...plan.periods].sort(byPeriodTime);
  const teachingPeriods = periods.filter((period) => !period.isBreak);
  const teachersById = Object.fromEntries(plan.teachers.map((teacher) => [teacher.id, teacher]));
  const classesById = Object.fromEntries(plan.classes.map((classroom) => [classroom.id, classroom]));
  const blockedSlots = new Set(plan.constraints.blockedSlots.map((slot) => slotToken(slot.day, slot.periodId)));
  const teacherBusy = new Set<string>();
  const classBusy = new Set<string>();
  const teacherDailyLoads = Object.fromEntries(plan.teachers.map((teacher) => [teacher.id, {} as Record<number, number>]));
  const classDailyLoads = Object.fromEntries(plan.classes.map((classroom) => [classroom.id, {} as Record<number, number>]));
  const teacherWeeklyLoads = Object.fromEntries(plan.teachers.map((teacher) => [teacher.id, 0]));
  const classSubjectDayLoads = new Map<string, number>();
  const dayLessons = new Map<string, GeneratedLesson[]>();
  const conflicts: TimetableConflict[] = [];
  const lessons: GeneratedLesson[] = [];

  if (teachingPeriods.length === 0) {
    return {
      lessons: [],
      conflicts: [{ id: makeId("conflict"), reason: "Add at least one teaching period before generating the timetable." }],
      loadSummary: { teacherDailyLoads, classDailyLoads, teacherWeeklyLoads },
    };
  }

  const overlappingPeriods = periods
    .flatMap((period, index) =>
      periods.slice(index + 1).filter((other) => overlaps(period, other)).map((other) => ({ period, other })),
    );

  overlappingPeriods.forEach(({ period, other }) => {
    conflicts.push({
      id: makeId("conflict"),
      reason: `${period.label} overlaps with ${other.label}. Adjust the time ranges to avoid impossible slots.`,
      periodId: period.id,
    });
  });

  const demands: Demand[] = plan.subjects
    .flatMap((subject) =>
      Array.from({ length: toPositiveInt(subject.sessionsPerWeek, 1) }, (_, demandIndex) => ({ ...subject, demandIndex })),
    )
    .sort((a, b) => {
      const aFlex = availabilityWeight(a, plan, teachingPeriods.length);
      const bFlex = availabilityWeight(b, plan, teachingPeriods.length);
      return aFlex - bFlex || b.sessionsPerWeek - a.sessionsPerWeek || a.name.localeCompare(b.name);
    });

  for (const demand of demands) {
    const teacher = teachersById[demand.teacherId];
    const classroom = classesById[demand.classId];

    if (!teacher || !classroom) {
      conflicts.push({
        id: makeId("conflict"),
        subjectId: demand.id,
        teacherId: demand.teacherId,
        classId: demand.classId,
        reason: `${demand.name} is missing a valid teacher or class mapping.`,
      });
      continue;
    }

    let bestCandidate:
      | {
          dayOfWeek: WeekDay;
          period: PeriodInput;
          periodNumber: number;
          score: number;
        }
      | undefined;

    plan.constraints.workingDays.forEach((dayOfWeek) => {
      teachingPeriods.forEach((period, index) => {
        const currentSlotToken = slotToken(dayOfWeek, period.id);
        const teacherSlotKey = `${teacher.id}:${currentSlotToken}`;
        const classSlotKey = `${classroom.id}:${currentSlotToken}`;

        if (blockedSlots.has(currentSlotToken)) return;
        if (teacher.unavailable.includes(currentSlotToken)) return;
        if (classroom.unavailable.includes(currentSlotToken)) return;
        if (teacherBusy.has(teacherSlotKey) || classBusy.has(classSlotKey)) return;

        const teacherDayLoad = teacherDailyLoads[teacher.id][dayOfWeek] ?? 0;
        const classDayLoad = classDailyLoads[classroom.id][dayOfWeek] ?? 0;
        if (teacherDayLoad >= Math.min(teacher.maxLessonsPerDay, plan.constraints.maxTeacherLessonsPerDay)) return;
        if (classDayLoad >= Math.min(classroom.maxLessonsPerDay, plan.constraints.maxClassLessonsPerDay)) return;

        const sameSubjectKey = `${classroom.id}:${demand.id}:${dayOfWeek}`;
        const sameSubjectDayLoad = classSubjectDayLoads.get(sameSubjectKey) ?? 0;
        const existingDayLessons = dayLessons.get(`${classroom.id}:${dayOfWeek}`) ?? [];
        const adjacencyPenalty = existingDayLessons.some((lesson) => Math.abs(lesson.periodNumber - (index + 1)) === 1 && lesson.subjectId === demand.id) ? 6 : 0;
        const preferredDayBonus = demand.preferredDays.includes(dayOfWeek) ? -4 : 2;
        const spreadPenalty = sameSubjectDayLoad * 5;
        const consecutivePenalty = plan.constraints.avoidConsecutiveSameSubject ? adjacencyPenalty : 0;
        const workloadPenalty = teacherDayLoad * 3 + classDayLoad * 3 + (teacherWeeklyLoads[teacher.id] ?? 0);
        const score = workloadPenalty + spreadPenalty + preferredDayBonus + consecutivePenalty;

        if (!bestCandidate || score < bestCandidate.score) {
          bestCandidate = { dayOfWeek, period, periodNumber: index + 1, score };
        }
      });
    });

    if (!bestCandidate) {
      conflicts.push({
        id: makeId("conflict"),
        subjectId: demand.id,
        teacherId: teacher.id,
        classId: classroom.id,
        reason: `No conflict-free slot could be found for ${demand.name} (${classroom.name} ${classroom.stream}). Reduce load or free up more periods.`,
      });
      continue;
    }

    const { dayOfWeek, period, periodNumber } = bestCandidate;
    const currentSlotToken = slotToken(dayOfWeek, period.id);
    teacherBusy.add(`${teacher.id}:${currentSlotToken}`);
    classBusy.add(`${classroom.id}:${currentSlotToken}`);
    teacherDailyLoads[teacher.id][dayOfWeek] = (teacherDailyLoads[teacher.id][dayOfWeek] ?? 0) + 1;
    classDailyLoads[classroom.id][dayOfWeek] = (classDailyLoads[classroom.id][dayOfWeek] ?? 0) + 1;
    teacherWeeklyLoads[teacher.id] = (teacherWeeklyLoads[teacher.id] ?? 0) + 1;
    classSubjectDayLoads.set(`${classroom.id}:${demand.id}:${dayOfWeek}`, (classSubjectDayLoads.get(`${classroom.id}:${demand.id}:${dayOfWeek}`) ?? 0) + 1);

    const lesson: GeneratedLesson = {
      sourceKey: `${demand.id}-${dayOfWeek}-${period.id}-${demand.demandIndex + 1}`,
      dayOfWeek,
      periodNumber,
      periodId: period.id,
      periodLabel: period.label,
      startsAt: period.startsAt,
      endsAt: period.endsAt,
      teacherId: teacher.id,
      teacherName: teacher.name,
      classId: classroom.id,
      className: `${classroom.name} ${classroom.stream}`.trim(),
      subjectId: demand.id,
      subjectName: demand.name,
      subjectCode: demand.code,
      subjectColor: demand.color,
      location: demand.location || classroom.homeRoom,
    };

    lessons.push(lesson);
    dayLessons.set(`${classroom.id}:${dayOfWeek}`, [...(dayLessons.get(`${classroom.id}:${dayOfWeek}`) ?? []), lesson]);
  }

  lessons.sort((a, b) => a.dayOfWeek - b.dayOfWeek || a.periodNumber - b.periodNumber || a.className.localeCompare(b.className));

  return {
    lessons,
    conflicts,
    loadSummary: { teacherDailyLoads, classDailyLoads, teacherWeeklyLoads },
  };
}

function availabilityWeight(subject: SubjectInput, plan: TimetablePlanDraft, teachingPeriodsPerDay: number) {
  const teacher = plan.teachers.find((entry) => entry.id === subject.teacherId);
  const classroom = plan.classes.find((entry) => entry.id === subject.classId);
  const blocked = plan.constraints.blockedSlots.length;
  const teacherUnavailable = teacher?.unavailable.length ?? 0;
  const classUnavailable = classroom?.unavailable.length ?? 0;
  const preferredSlack = Math.max(0, plan.constraints.workingDays.length - subject.preferredDays.length);
  return teacherUnavailable + classUnavailable + blocked + preferredSlack + (teachingPeriodsPerDay - subject.sessionsPerWeek);
}

export function createTimetableLessonRows(lessons: GeneratedLesson[], planId: string, userId: string): TablesInsert<"timetable_lessons">[] {
  return lessons.map((lesson) => ({
    user_id: userId,
    plan_id: planId,
    source_key: lesson.sourceKey,
    day_of_week: lesson.dayOfWeek,
    period_number: lesson.periodNumber,
    period_id: lesson.periodId,
    period_label: lesson.periodLabel,
    starts_at: lesson.startsAt,
    ends_at: lesson.endsAt,
    teacher_id: lesson.teacherId,
    teacher_name: lesson.teacherName,
    class_id: lesson.classId,
    class_name: lesson.className,
    subject_id: lesson.subjectId,
    subject_name: lesson.subjectName,
    subject_code: lesson.subjectCode,
    subject_color: lesson.subjectColor,
    location: lesson.location,
  }));
}

export function filterLessonsForScope(lessons: GeneratedLesson[], scopeType: ScheduleScopeType, scopeId: string | null) {
  if (scopeType === "all" || !scopeId) return lessons;
  if (scopeType === "teacher") return lessons.filter((lesson) => lesson.teacherId === scopeId);
  return lessons.filter((lesson) => lesson.classId === scopeId);
}

function combineDateAndTime(date: Date, time: string) {
  const [hours, minutes] = time.split(":").map(Number);
  const combined = new Date(date);
  combined.setHours(hours, minutes, 0, 0);
  return combined.toISOString();
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function mondayFromISO(dateString: string) {
  const seed = new Date(`${dateString}T00:00:00`);
  const day = seed.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  seed.setDate(seed.getDate() + diff);
  seed.setHours(0, 0, 0, 0);
  return seed;
}

export function createTimetableEvents(
  lessons: GeneratedLesson[],
  plan: TimetablePlanDraft,
  planId: string,
  userId: string,
): TablesInsert<"events">[] {
  const scopedLessons = filterLessonsForScope(lessons, plan.scheduleScopeType, plan.scheduleScopeId);
  const weekStart = mondayFromISO(plan.constraints.termStartsOn);

  return scopedLessons.flatMap((lesson) =>
    Array.from({ length: Math.max(1, plan.constraints.publishWeeks) }, (_, weekIndex) => {
      const lessonDate = addDays(weekStart, weekIndex * 7 + (lesson.dayOfWeek - 1));
      const occurrenceKey = `${planId}:${lesson.sourceKey}:${lessonDate.toISOString().slice(0, 10)}`;
      return {
        user_id: userId,
        title: `${lesson.subjectName} · ${lesson.className}`,
        description: `Auto-generated from iSchool Timetables for ${lesson.periodLabel}.`,
        event_type: "lesson",
        start_at: combineDateAndTime(lessonDate, lesson.startsAt),
        end_at: combineDateAndTime(lessonDate, lesson.endsAt),
        all_day: false,
        location: lesson.location,
        color: lesson.subjectColor,
        subject: lesson.subjectName,
        teacher: lesson.teacherName,
        source_type: "timetable_lesson",
        source_id: occurrenceKey,
        metadata: {
          plan_id: planId,
          lesson_source_key: lesson.sourceKey,
          day_of_week: lesson.dayOfWeek,
          period_number: lesson.periodNumber,
          class_id: lesson.classId,
          class_name: lesson.className,
          subject_id: lesson.subjectId,
          subject_name: lesson.subjectName,
          teacher_id: lesson.teacherId,
          teacher_name: lesson.teacherName,
          schedule_scope_type: plan.scheduleScopeType,
          schedule_scope_id: plan.scheduleScopeId,
        },
        notification_minutes: 20,
      } satisfies TablesInsert<"events">;
    }),
  );
}

export function createBlankTeacher(): TeacherInput {
  return { id: makeId("teacher"), name: "", code: "", maxLessonsPerDay: 5, unavailable: [] };
}

export function createBlankClass(): ClassInput {
  return { id: makeId("class"), name: "", stream: "", homeRoom: "", maxLessonsPerDay: 6, unavailable: [] };
}

export function createBlankSubject(teacherId: string, classId: string): SubjectInput {
  return {
    id: makeId("subject"),
    name: "",
    code: "",
    teacherId,
    classId,
    sessionsPerWeek: 3,
    preferredDays: [1, 3, 5],
    color: "navy",
    location: "",
  };
}

export function createBlankPeriod(position: number): PeriodInput {
  const startHour = 8 + Math.floor(position / 2);
  const startMinute = position % 2 === 0 ? 0 : 45;
  const endHour = startMinute === 45 ? startHour + 1 : startHour;
  const endMinute = startMinute === 45 ? 25 : 40;
  const pad = (value: number) => String(value).padStart(2, "0");
  return {
    id: makeId("period"),
    label: `Period ${position + 1}`,
    startsAt: `${pad(startHour)}:${pad(startMinute)}`,
    endsAt: `${pad(endHour)}:${pad(endMinute)}`,
    isBreak: false,
  };
}

export function createBlankBlockedSlot(periodId: string): BlockedSlot {
  return {
    id: makeId("blocked"),
    day: 1,
    periodId,
    reason: "Assembly / special event",
  };
}

export function scopeOptions(plan: TimetablePlanDraft, scopeType: ScheduleScopeType) {
  if (scopeType === "teacher") {
    return plan.teachers.map((teacher) => ({ value: teacher.id, label: teacher.name || teacher.code || "Teacher" }));
  }
  if (scopeType === "class") {
    return plan.classes.map((classroom) => ({
      value: classroom.id,
      label: `${classroom.name} ${classroom.stream}`.trim(),
    }));
  }
  return [{ value: "all", label: "Whole timetable" }];
}
