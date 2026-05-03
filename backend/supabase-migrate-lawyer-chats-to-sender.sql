-- Run this ONCE in Supabase SQL Editor if lawyer_chats still has is_user/lawyer_id
-- or if you see: ERROR: column "sender" does not exist
-- Order matters: add + backfill sender BEFORE any policy that mentions sender.

-- 1) Helper for RLS (no dependency on lawyer_chats.sender)
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

-- 2) Remove policies that may reference old columns OR sender (safe to re-run)
ALTER TABLE public.lawyer_chats ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own lawyer chats" ON public.lawyer_chats;
DROP POLICY IF EXISTS "Users can insert own messages" ON public.lawyer_chats;
DROP POLICY IF EXISTS "Lawyers can insert responses" ON public.lawyer_chats;

-- 3) Add sender column FIRST (fixes "column sender does not exist")
ALTER TABLE public.lawyer_chats ADD COLUMN IF NOT EXISTS sender TEXT;

-- 4) Backfill sender from legacy is_user if present; else default 'user'
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'lawyer_chats'
      AND column_name = 'is_user'
  ) THEN
    UPDATE public.lawyer_chats
    SET sender = CASE WHEN is_user THEN 'user' ELSE 'lawyer' END
    WHERE sender IS NULL;
  ELSE
    UPDATE public.lawyer_chats
    SET sender = COALESCE(sender, 'user')
    WHERE sender IS NULL;
  END IF;
END $$;

-- 5) Enforce sender shape
ALTER TABLE public.lawyer_chats ALTER COLUMN sender SET NOT NULL;

ALTER TABLE public.lawyer_chats DROP CONSTRAINT IF EXISTS lawyer_chats_sender_check;
ALTER TABLE public.lawyer_chats
  ADD CONSTRAINT lawyer_chats_sender_check CHECK (sender IN ('user', 'lawyer'));

-- 6) Drop legacy columns (ignore errors if already gone)
ALTER TABLE public.lawyer_chats DROP COLUMN IF EXISTS is_user;
ALTER TABLE public.lawyer_chats DROP COLUMN IF EXISTS lawyer_id;

DROP INDEX IF EXISTS idx_lawyer_chats_lawyer_id;

-- 7) Policies that use sender (only after column exists)
CREATE POLICY "Users can view own lawyer chats" ON public.lawyer_chats
  FOR SELECT USING (auth.uid() = user_id OR public.auth_is_lawyer());

CREATE POLICY "Users can insert own messages" ON public.lawyer_chats
  FOR INSERT WITH CHECK (auth.uid() = user_id AND sender = 'user');

CREATE POLICY "Lawyers can insert responses" ON public.lawyer_chats
  FOR INSERT WITH CHECK (public.auth_is_lawyer() AND sender = 'lawyer');

-- 8) Lawyers can read client profiles for inbox (optional if not applied yet)
DROP POLICY IF EXISTS "Lawyers can view profiles of chat users" ON public.profiles;

CREATE POLICY "Lawyers can view profiles of chat users" ON public.profiles
  FOR SELECT USING (
    public.auth_is_lawyer()
    AND EXISTS (SELECT 1 FROM public.lawyer_chats lc WHERE lc.user_id = profiles.id)
  );
