import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { CheckCircle2, XCircle, Plus, X, BookOpen } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export interface Exercise {
  id: string;
  question: string;
  type: 'multiple-choice' | 'short-answer' | 'fill-blank';
  options?: string[];
  correctAnswer?: string;
  completed?: boolean;
  userAnswer?: string;
}

interface ExerciseManagerProps {
  exercises: Exercise[];
  onAdd: (exercise: Exercise) => void;
  onRemove: (id: string) => void;
  onSubmitAnswer: (id: string, answer: string) => void;
}

export default function ExerciseManager({
  exercises,
  onAdd,
  onRemove,
  onSubmitAnswer,
}: ExerciseManagerProps) {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<'multiple-choice' | 'short-answer' | 'fill-blank'>('multiple-choice');
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState(['', '', '', '']);
  const [correctAnswer, setCorrectAnswer] = useState('');
  const [answerInput, setAnswerInput] = useState('');
  const [activeExerciseId, setActiveExerciseId] = useState<string | null>(null);

  const handleAddExercise = () => {
    if (!question.trim()) {
      toast.error('Please enter a question');
      return;
    }

    if (type === 'multiple-choice') {
      const filledOptions = options.filter((o) => o.trim());
      if (filledOptions.length < 2) {
        toast.error('Please add at least 2 options');
        return;
      }
      if (!correctAnswer) {
        toast.error('Please select the correct answer');
        return;
      }
    } else if (!correctAnswer.trim()) {
      toast.error('Please enter the correct answer');
      return;
    }

    onAdd({
      id: Date.now().toString(),
      type,
      question: question.trim(),
      options: type === 'multiple-choice' ? options.filter((o) => o.trim()) : undefined,
      correctAnswer: correctAnswer.trim(),
    });

    // Reset form
    setQuestion('');
    setOptions(['', '', '', '']);
    setCorrectAnswer('');
    setOpen(false);
    toast.success('Exercise added');
  };

  const handleSubmitAnswer = (exerciseId: string, answer: string) => {
    if (!answer.trim()) {
      toast.error('Please enter an answer');
      return;
    }
    onSubmitAnswer(exerciseId, answer.trim());
  };

  return (
    <div className="space-y-4">
      {/* Add Exercise Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" className="gap-2">
            <BookOpen className="h-4 w-4" />
            Add Exercise
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create Exercise or Quiz Question</DialogTitle>
            <DialogDescription>Help students practice with interactive questions.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Type Selection */}
            <div>
              <label className="block text-sm font-medium mb-2">Question Type</label>
              <div className="flex gap-2">
                {(['multiple-choice', 'short-answer', 'fill-blank'] as const).map((t) => (
                  <Button
                    key={t}
                    variant={type === t ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setType(t)}
                    className="flex-1 capitalize"
                  >
                    {t.replace('-', ' ')}
                  </Button>
                ))}
              </div>
            </div>

            {/* Question Input */}
            <div>
              <label className="block text-sm font-medium mb-2">Question</label>
              <Textarea
                placeholder="Enter your question here..."
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                className="min-h-20"
              />
            </div>

            {/* Options/Answer Input */}
            {type === 'multiple-choice' ? (
              <div>
                <label className="block text-sm font-medium mb-2">Options</label>
                <div className="space-y-2">
                  {options.map((opt, i) => (
                    <div key={i} className="flex gap-2">
                      <Input
                        placeholder={`Option ${i + 1}`}
                        value={opt}
                        onChange={(e) => {
                          const newOpts = [...options];
                          newOpts[i] = e.target.value;
                          setOptions(newOpts);
                        }}
                      />
                      <Button
                        variant={correctAnswer === opt ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setCorrectAnswer(opt)}
                        className="w-24"
                      >
                        {correctAnswer === opt ? 'Correct ✓' : 'Mark'}
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div>
                <label className="block text-sm font-medium mb-2">
                  {type === 'fill-blank' ? 'Correct Answer (for blank)' : 'Correct Answer'}
                </label>
                <Textarea
                  placeholder="Enter the correct answer..."
                  value={correctAnswer}
                  onChange={(e) => setCorrectAnswer(e.target.value)}
                  className="min-h-16"
                />
              </div>
            )}

            <div className="flex gap-2 pt-4">
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddExercise}>Add Exercise</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Exercises List */}
      {exercises.length > 0 && (
        <div className="space-y-3">
          <p className="text-sm font-medium flex items-center gap-2">
            <BookOpen className="h-4 w-4" />
            Practice Exercises ({exercises.length})
          </p>

          <div className="space-y-3">
            {exercises.map((exercise) => (
              <div
                key={exercise.id}
                className={cn(
                  'border rounded-lg p-4 space-y-3',
                  exercise.completed
                    ? 'border-emerald-300 bg-emerald-50/50'
                    : 'border-border bg-card'
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <p className="font-medium text-sm">{exercise.question}</p>
                    <p className="text-xs text-muted-foreground mt-1 capitalize">
                      {exercise.type.replace('-', ' ')}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => onRemove(exercise.id)}
                    className="text-destructive hover:text-destructive"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                {/* Display Options or Answer Input */}
                {exercise.type === 'multiple-choice' && exercise.options ? (
                  <div className="space-y-2">
                    {exercise.options.map((opt, i) => (
                      <button
                        key={i}
                        onClick={() => {
                          setActiveExerciseId(exercise.id);
                          setAnswerInput(opt);
                        }}
                        className={cn(
                          'w-full text-left p-2 rounded border text-sm transition-colors',
                          exercise.userAnswer === opt
                            ? exercise.userAnswer === exercise.correctAnswer
                              ? 'border-emerald-400 bg-emerald-50 text-emerald-700'
                              : 'border-red-400 bg-red-50 text-red-700'
                            : 'border-border hover:bg-muted'
                        )}
                      >
                        <span className="flex items-center gap-2">
                          {exercise.userAnswer === opt &&
                            (exercise.userAnswer === exercise.correctAnswer ? (
                              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                            ) : (
                              <XCircle className="h-4 w-4 text-red-600" />
                            ))}
                          {opt}
                        </span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <Input
                      placeholder="Enter your answer..."
                      value={activeExerciseId === exercise.id ? answerInput : exercise.userAnswer || ''}
                      onChange={(e) => {
                        setActiveExerciseId(exercise.id);
                        setAnswerInput(e.target.value);
                      }}
                    />
                    {activeExerciseId === exercise.id && (
                      <Button
                        size="sm"
                        onClick={() => {
                          handleSubmitAnswer(exercise.id, answerInput);
                          setActiveExerciseId(null);
                          setAnswerInput('');
                        }}
                      >
                        Check
                      </Button>
                    )}
                  </div>
                )}

                {/* Feedback */}
                {exercise.userAnswer && (
                  <div
                    className={cn(
                      'text-sm p-2 rounded',
                      exercise.userAnswer === exercise.correctAnswer
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-red-50 text-red-700 border border-red-200'
                    )}
                  >
                    {exercise.userAnswer === exercise.correctAnswer ? (
                      <>
                        <p className="font-medium">✓ Correct!</p>
                      </>
                    ) : (
                      <>
                        <p className="font-medium">✗ Not quite right</p>
                        <p className="text-xs mt-1">Correct answer: {exercise.correctAnswer}</p>
                      </>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
