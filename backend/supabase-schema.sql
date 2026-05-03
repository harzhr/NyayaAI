-- NyayaAI Supabase Database Schema
-- Run this SQL in your Supabase SQL Editor to create the required tables

-- Create profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  name TEXT NOT NULL DEFAULT 'User',
  language TEXT NOT NULL DEFAULT 'en' CHECK (language IN ('en', 'hi')),
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'lawyer')),
  -- Lawyer-specific fields
  bar_council_id TEXT,
  license_number TEXT,
  specialization TEXT,
  experience TEXT,
  location TEXT,
  languages TEXT[],
  phone TEXT,
  bio TEXT,
  is_verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Used in RLS to avoid recursive policy checks on profiles
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

DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Lawyers can view profiles of chat users" ON public.profiles;
DROP POLICY IF EXISTS "Authenticated users can view lawyer directory" ON public.profiles;

-- Create policy for users to read their own profile
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

-- Signed-in users can browse lawyer profiles for the directory
CREATE POLICY "Authenticated users can view lawyer directory" ON public.profiles
  FOR SELECT TO authenticated
  USING (role = 'lawyer');

-- Lawyers may read basic profile rows for users who have lawyer_chats (inbox display)
CREATE POLICY "Lawyers can view profiles of chat users" ON public.profiles
  FOR SELECT USING (
    public.auth_is_lawyer()
    AND EXISTS (SELECT 1 FROM public.lawyer_chats lc WHERE lc.user_id = profiles.id)
  );

-- Create policy for users to update their own profile
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- Create policy for users to insert their own profile
CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Create chats table
CREATE TABLE IF NOT EXISTS public.chats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on chats
ALTER TABLE public.chats ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own chats" ON public.chats;
DROP POLICY IF EXISTS "Users can insert own chats" ON public.chats;
DROP POLICY IF EXISTS "Users can delete own chats" ON public.chats;

-- Create policy for users to read their own chats
CREATE POLICY "Users can view own chats" ON public.chats
  FOR SELECT USING (auth.uid() = user_id);

-- Create policy for users to insert their own chats
CREATE POLICY "Users can insert own chats" ON public.chats
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create policy for users to delete their own chats
CREATE POLICY "Users can delete own chats" ON public.chats
  FOR DELETE USING (auth.uid() = user_id);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_chats_user_id ON public.chats(user_id);
CREATE INDEX IF NOT EXISTS idx_chats_created_at ON public.chats(created_at DESC);

-- Create lawyer_chats table (thread = user + assigned lawyer OR demo advocate key)
CREATE TABLE IF NOT EXISTS public.lawyer_chats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  assigned_lawyer_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  demo_lawyer_key TEXT,
  message TEXT NOT NULL,
  sender TEXT NOT NULL CHECK (sender IN ('user', 'lawyer')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT lawyer_chats_target_chk CHECK (
    (assigned_lawyer_id IS NOT NULL AND demo_lawyer_key IS NULL)
    OR (assigned_lawyer_id IS NULL AND demo_lawyer_key IS NOT NULL)
    OR (assigned_lawyer_id IS NULL AND demo_lawyer_key IS NULL)
  )
);

-- Enable RLS on lawyer_chats
ALTER TABLE public.lawyer_chats ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own lawyer chats" ON public.lawyer_chats;
DROP POLICY IF EXISTS "Users can insert own messages" ON public.lawyer_chats;
DROP POLICY IF EXISTS "Lawyers can insert responses" ON public.lawyer_chats;

-- Users see all their threads; lawyers only see assigned real-lawyer threads
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

CREATE INDEX IF NOT EXISTS idx_lawyer_chats_user_id ON public.lawyer_chats(user_id);
CREATE INDEX IF NOT EXISTS idx_lawyer_chats_assigned ON public.lawyer_chats(assigned_lawyer_id);
CREATE INDEX IF NOT EXISTS idx_lawyer_chats_created_at ON public.lawyer_chats(created_at DESC);

-- Upgrading an existing DB:
-- 1) supabase-migrate-lawyer-chats-to-sender.sql (if needed)
-- 2) supabase-migrate-lawyer-assignment.sql (lawyer picker / per-lawyer threads)

-- Create trigger to automatically create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (
    id,
    email,
    name,
    language,
    role,
    bar_council_id,
    license_number,
    specialization,
    experience,
    location,
    languages,
    phone,
    bio
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    'en',
    COALESCE(NEW.raw_user_meta_data->>'role', 'user'),
    NEW.raw_user_meta_data->>'barCouncilId',
    NEW.raw_user_meta_data->>'licenseNumber',
    NEW.raw_user_meta_data->>'specialization',
    NEW.raw_user_meta_data->>'experience',
    NEW.raw_user_meta_data->>'location',
    ARRAY(
      SELECT json_array_elements_text(
        COALESCE(NEW.raw_user_meta_data->'languages', '[]'::json)
      )
    ),
    NEW.raw_user_meta_data->>'phone',
    NEW.raw_user_meta_data->>'bio'
  ) ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Do not stop user signup if profile creation fails.
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Comment for documentation
COMMENT ON TABLE public.profiles IS 'User profiles storing name and language preference';
COMMENT ON TABLE public.chats IS 'Chat history storing user questions and AI responses';