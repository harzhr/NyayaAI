-- Add per-lawyer threading (registered lawyer id OR demo advocate key).
-- Run in Supabase SQL Editor after sender migration.

CREATE OR REPLACE FUNCTION public.auth_is_lawyer()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role = 'lawyer'
  );
$$;

ALTER TABLE public.lawyer_chats ADD COLUMN IF NOT EXISTS assigned_lawyer_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;
ALTER TABLE public.lawyer_chats ADD COLUMN IF NOT EXISTS demo_lawyer_key TEXT;

ALTER TABLE public.lawyer_chats DROP CONSTRAINT IF EXISTS lawyer_chats_target_chk;
ALTER TABLE public.lawyer_chats
  ADD CONSTRAINT lawyer_chats_target_chk CHECK (
    (assigned_lawyer_id IS NOT NULL AND demo_lawyer_key IS NULL)
    OR (assigned_lawyer_id IS NULL AND demo_lawyer_key IS NOT NULL)
    OR (assigned_lawyer_id IS NULL AND demo_lawyer_key IS NULL)
  );

DROP POLICY IF EXISTS "Authenticated users can view lawyer directory" ON public.profiles;
CREATE POLICY "Authenticated users can view lawyer directory" ON public.profiles
  FOR SELECT TO authenticated
  USING (role = 'lawyer');

ALTER TABLE public.lawyer_chats ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own lawyer chats" ON public.lawyer_chats;
DROP POLICY IF EXISTS "Users can insert own messages" ON public.lawyer_chats;
DROP POLICY IF EXISTS "Lawyers can insert responses" ON public.lawyer_chats;

CREATE POLICY "Users can view own lawyer chats" ON public.lawyer_chats
  FOR SELECT USING (
    auth.uid() = user_id
    OR (
      public.auth_is_lawyer()
      AND assigned_lawyer_id = auth.uid()
      AND demo_lawyer_key IS NULL
    )
  );

CREATE POLICY "Users can insert own messages" ON public.lawyer_chats
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
    AND sender = 'user'
    AND (
      (
        assigned_lawyer_id IS NOT NULL
        AND demo_lawyer_key IS NULL
        AND EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.id = assigned_lawyer_id AND p.role = 'lawyer'
        )
      )
      OR (assigned_lawyer_id IS NULL AND demo_lawyer_key IS NOT NULL)
      OR (assigned_lawyer_id IS NULL AND demo_lawyer_key IS NULL)
    )
  );

CREATE POLICY "Lawyers can insert responses" ON public.lawyer_chats
  FOR INSERT WITH CHECK (
    public.auth_is_lawyer()
    AND sender = 'lawyer'
    AND assigned_lawyer_id = auth.uid()
    AND demo_lawyer_key IS NULL
  );

CREATE INDEX IF NOT EXISTS idx_lawyer_chats_assigned ON public.lawyer_chats(assigned_lawyer_id);
