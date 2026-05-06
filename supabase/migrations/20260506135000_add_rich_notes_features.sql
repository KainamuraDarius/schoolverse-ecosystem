-- Add media and exercises storage to notes table
ALTER TABLE public.notes ADD COLUMN IF NOT EXISTS media_embeds JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.notes ADD COLUMN IF NOT EXISTS exercises JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.notes ADD COLUMN IF NOT EXISTS reading_progress INTEGER DEFAULT 0;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_notes_reading_progress ON public.notes(user_id, reading_progress DESC);
