import { useEffect, useState } from "react";
import { CalendarDays, Highlighter, Pin, PinOff, Plus, Tag, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import RichTextEditor from "@/components/RichTextEditor";
import MediaEmbedManager from "@/components/MediaEmbedManager";
import ExerciseManager from "@/components/ExerciseManager";
import type { AnswerSpace, AnnotationMark, BookTopic, LearningNote, MediaEmbed } from "@/lib/ischool";
import { calculateExerciseScore, makeId } from "@/lib/ischool";

const COLORS: { value: string; swatch: string; ring: string }[] = [
  { value: "cream", swatch: "bg-secondary", ring: "ring-secondary" },
  { value: "navy", swatch: "bg-primary", ring: "ring-primary" },
  { value: "gold", swatch: "bg-accent", ring: "ring-accent" },
  { value: "rose", swatch: "bg-destructive/40", ring: "ring-destructive" },
  { value: "sage", swatch: "bg-emerald-300", ring: "ring-emerald-400" },
];

const cardTone: Record<string, string> = {
  cream: "bg-secondary/50",
  navy: "bg-primary/10",
  gold: "bg-accent/20",
  rose: "bg-destructive/10",
  sage: "bg-emerald-100/70",
};

type Props = {
  note: LearningNote | null;
  topic?: BookTopic | null;
  saving: boolean;
  capturedQuote?: string;
  onClearCapturedQuote?: () => void;
  onUpdate: (partial: Partial<LearningNote>) => void;
  onTogglePin?: () => void;
  onDelete?: () => void;
  onSetColor?: (color: string) => void;
};

function buildAnswerSpace(): AnswerSpace {
  return { id: makeId("answer"), prompt: "Practice response", response: "", expanded: true };
}

export default function LearningNoteEditor({
  note,
  topic,
  saving,
  capturedQuote,
  onClearCapturedQuote,
  onUpdate,
  onTogglePin,
  onDelete,
  onSetColor,
}: Props) {
  const [highlightQuote, setHighlightQuote] = useState("");
  const [highlightNote, setHighlightNote] = useState("");

  useEffect(() => {
    if (capturedQuote) {
      setHighlightQuote(capturedQuote);
    }
  }, [capturedQuote]);

  if (!note) {
    return (
      <div className="flex-1 flex items-center justify-center rounded-2xl border border-dashed border-border bg-card p-8 text-center text-muted-foreground">
        <div>
          <p className="font-medium">Select a note or open a book topic</p>
          <p className="text-sm mt-1">Your lesson workspace will appear here.</p>
        </div>
      </div>
    );
  }

  const addHighlight = () => {
    if (!highlightQuote.trim()) return;
    const next: AnnotationMark = {
      id: makeId("annotation"),
      quote: highlightQuote.trim(),
      note: highlightNote.trim(),
      color: "gold",
      createdAt: new Date().toISOString(),
    };
    onUpdate({ annotation_marks: [next, ...note.annotation_marks] });
    setHighlightQuote("");
    setHighlightNote("");
    onClearCapturedQuote?.();
  };

  const addAnswerSpace = () => {
    onUpdate({ answer_spaces: [...note.answer_spaces, buildAnswerSpace()] });
  };

  const updateExerciseList = (nextExercises: LearningNote["exercises"]) => {
    onUpdate({
      exercises: nextExercises,
      exercise_score: calculateExerciseScore(nextExercises),
    });
  };

  return (
    <section className={cn("flex flex-col min-h-0 rounded-2xl border border-border overflow-hidden", cardTone[note.color] ?? "bg-card")}>
      <div className="border-b border-border/60 bg-card/70 p-4 backdrop-blur">
        <div className="flex flex-wrap items-start gap-3">
          <div className="flex-1 min-w-[240px]">
            <Input
              value={note.title}
              onChange={(event) => onUpdate({ title: event.target.value })}
              placeholder="Note title"
              className="border-0 bg-transparent px-0 text-2xl font-display font-semibold shadow-none focus-visible:ring-0"
            />
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              {note.auto_tags.subject && <Badge variant="outline">{note.auto_tags.subject}</Badge>}
              {note.auto_tags.lesson && <Badge variant="outline">{note.auto_tags.lesson}</Badge>}
              {note.note_date && (
                <span className="inline-flex items-center gap-1">
                  <CalendarDays className="h-3.5 w-3.5" />
                  {note.note_date}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 ml-auto">
            <div className="text-xs text-muted-foreground">{saving ? "Saving…" : "Saved"}</div>
            {COLORS.map((color) => (
              <button
                key={color.value}
                onClick={() => onSetColor?.(color.value)}
                className={cn(
                  "h-6 w-6 rounded-full border border-border transition-transform hover:scale-110",
                  color.swatch,
                  note.color === color.value && "ring-2 ring-offset-2 ring-offset-background", color.ring,
                )}
                aria-label={`Set ${color.value} note color`}
              />
            ))}
            {onTogglePin && (
              <Button size="sm" variant="ghost" onClick={onTogglePin}>
                {note.pinned ? <PinOff className="h-4 w-4" /> : <Pin className="h-4 w-4" />}
              </Button>
            )}
            {onDelete && (
              <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={onDelete}>
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-3 items-center">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Reading progress</span>
              <span>{note.reading_progress ?? 0}%</span>
            </div>
            <Progress value={note.reading_progress ?? 0} className="h-2" />
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={() => onUpdate({ reading_progress: Math.max(0, (note.reading_progress ?? 0) - 10) })}>
              -10%
            </Button>
            <Button size="sm" variant="outline" onClick={() => onUpdate({ reading_progress: Math.min(100, (note.reading_progress ?? 0) + 10) })}>
              +10%
            </Button>
          </div>
        </div>

        {topic && (
          <div className="mt-4 rounded-xl border border-border/60 bg-background/60 px-4 py-3">
            <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Linked topic</div>
            <div className="font-medium text-foreground mt-1">{topic.title}</div>
            <p className="text-sm text-muted-foreground mt-1">{topic.summary}</p>
          </div>
        )}
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto p-5 md:p-6">
        <Tabs defaultValue="write" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="write">Write</TabsTrigger>
            <TabsTrigger value="answers">Answer spaces</TabsTrigger>
            <TabsTrigger value="highlights">Highlights</TabsTrigger>
            <TabsTrigger value="practice">Practice</TabsTrigger>
          </TabsList>

          <TabsContent value="write" className="space-y-4">
            <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-4">
              <RichTextEditor
                content={note.content}
                onChange={(html) => onUpdate({ content: html })}
                placeholder="Capture key ideas, worked examples, or reflections..."
                className="min-h-[420px]"
              />
              <Card className="p-4 h-fit">
                <div className="text-sm font-medium text-foreground flex items-center gap-2">
                  <Tag className="h-4 w-4 text-primary" />
                  Auto tags
                </div>
                <div className="flex flex-wrap gap-2 mt-3">
                  {Object.values(note.auto_tags).filter(Boolean).map((tag) => (
                    <Badge key={tag} variant="outline">{tag}</Badge>
                  ))}
                </div>

                <div className="mt-5">
                  <div className="text-sm font-medium text-foreground">Embedded media</div>
                  <div className="text-xs text-muted-foreground mt-1">Videos, GIFs, and images stay attached to this lesson note.</div>
                </div>
                <div className="mt-3">
                  <MediaEmbedManager
                    embeds={note.media_embeds as MediaEmbed[]}
                    onAdd={(embed) => onUpdate({ media_embeds: [...note.media_embeds, embed] })}
                    onRemove={(id) => onUpdate({ media_embeds: note.media_embeds.filter((embed) => embed.id !== id) })}
                  />
                </div>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="answers" className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-display text-lg text-foreground">Expandable answer spaces</h3>
                <p className="text-sm text-muted-foreground">Keep worked responses separate from your summary notes.</p>
              </div>
              <Button variant="outline" onClick={addAnswerSpace}>
                <Plus className="h-4 w-4 mr-2" />
                Add answer space
              </Button>
            </div>

            <div className="space-y-3">
              {note.answer_spaces.length === 0 ? (
                <Card className="p-5 text-sm text-muted-foreground border-dashed">No answer spaces yet. Add one for a question, essay draft, or worked solution.</Card>
              ) : (
                note.answer_spaces.map((space) => (
                  <Card key={space.id} className="p-4 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <Input
                        value={space.prompt}
                        onChange={(event) =>
                          onUpdate({
                            answer_spaces: note.answer_spaces.map((entry) =>
                              entry.id === space.id ? { ...entry, prompt: event.target.value } : entry,
                            ),
                          })
                        }
                        className="max-w-xl"
                        placeholder="Prompt or question"
                      />
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            onUpdate({
                              answer_spaces: note.answer_spaces.map((entry) =>
                                entry.id === space.id ? { ...entry, expanded: !entry.expanded } : entry,
                              ),
                            })
                          }
                        >
                          {space.expanded ? "Collapse" : "Expand"}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-destructive hover:text-destructive"
                          onClick={() => onUpdate({ answer_spaces: note.answer_spaces.filter((entry) => entry.id !== space.id) })}
                        >
                          Remove
                        </Button>
                      </div>
                    </div>
                    {space.expanded && (
                      <Textarea
                        rows={6}
                        value={space.response}
                        onChange={(event) =>
                          onUpdate({
                            answer_spaces: note.answer_spaces.map((entry) =>
                              entry.id === space.id ? { ...entry, response: event.target.value } : entry,
                            ),
                          })
                        }
                        placeholder="Work through your answer here..."
                      />
                    )}
                  </Card>
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="highlights" className="space-y-4">
            <Card className="p-4 space-y-3">
              <div className="flex items-center gap-2 text-foreground font-medium">
                <Highlighter className="h-4 w-4 text-primary" />
                Annotation and highlight tools
              </div>
              <p className="text-sm text-muted-foreground">
                Capture a quote from the book pane or type one manually, then add a short explanation or question.
              </p>
              <Textarea
                rows={3}
                value={highlightQuote}
                onChange={(event) => setHighlightQuote(event.target.value)}
                placeholder="Paste or capture the text you want to highlight..."
              />
              <Input
                value={highlightNote}
                onChange={(event) => setHighlightNote(event.target.value)}
                placeholder="Why does this matter?"
              />
              <div className="flex gap-2">
                <Button onClick={addHighlight}>Save highlight</Button>
                {capturedQuote && (
                  <Button variant="outline" onClick={() => { setHighlightQuote(""); onClearCapturedQuote?.(); }}>
                    Clear captured text
                  </Button>
                )}
              </div>
            </Card>

            <div className="space-y-3">
              {note.annotation_marks.length === 0 ? (
                <Card className="p-5 text-sm text-muted-foreground border-dashed">No highlights yet.</Card>
              ) : (
                note.annotation_marks.map((mark) => (
                  <Card key={mark.id} className="p-4">
                    <blockquote className="border-l-4 border-accent pl-4 text-sm text-foreground/90 italic">
                      {mark.quote}
                    </blockquote>
                    {mark.note && <p className="mt-3 text-sm text-muted-foreground">{mark.note}</p>}
                    <div className="mt-3 flex justify-between items-center text-xs text-muted-foreground">
                      <span>{new Date(mark.createdAt).toLocaleString()}</span>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-destructive hover:text-destructive"
                        onClick={() => onUpdate({ annotation_marks: note.annotation_marks.filter((entry) => entry.id !== mark.id) })}
                      >
                        Remove
                      </Button>
                    </div>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="practice" className="space-y-4">
            <Card className="p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="font-medium text-foreground">Auto-scored exercises and quizzes</div>
                  <p className="text-sm text-muted-foreground mt-1">Track practice accuracy inside the lesson workspace.</p>
                </div>
                <Badge variant="outline">Score {note.exercise_score.toFixed(0)}%</Badge>
              </div>
              <div className="mt-4">
                <ExerciseManager
                  exercises={note.exercises}
                  onAdd={(exercise) => updateExerciseList([...note.exercises, exercise])}
                  onRemove={(id) => updateExerciseList(note.exercises.filter((exercise) => exercise.id !== id))}
                  onSubmitAnswer={(id, answer) => {
                    const next = note.exercises.map((exercise) =>
                      exercise.id === id
                        ? {
                            ...exercise,
                            userAnswer: answer,
                            completed: exercise.correctAnswer
                              ? exercise.correctAnswer.trim().toLowerCase() === answer.trim().toLowerCase()
                              : true,
                          }
                        : exercise,
                    );
                    updateExerciseList(next);
                  }}
                />
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </section>
  );
}
