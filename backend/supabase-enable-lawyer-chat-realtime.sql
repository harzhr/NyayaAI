-- Run this once in Supabase SQL Editor if lawyer chat messages do not update live.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'lawyer_chats'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.lawyer_chats;
  END IF;
END $$;
