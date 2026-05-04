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

DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;

-- Create policy for users to read their own profile
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

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

-- Create lawyer_chats table
CREATE TABLE IF NOT EXISTS public.lawyer_chats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lawyer_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  message TEXT NOT NULL,
  is_user BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on lawyer_chats
ALTER TABLE public.lawyer_chats ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own lawyer chats" ON public.lawyer_chats;
DROP POLICY IF EXISTS "Users can insert own messages" ON public.lawyer_chats;
DROP POLICY IF EXISTS "Lawyers can insert responses" ON public.lawyer_chats;

-- Create policy for users to read their own lawyer chats
CREATE POLICY "Users can view own lawyer chats" ON public.lawyer_chats
  FOR SELECT USING (auth.uid() = user_id OR (auth.uid() IN (SELECT id FROM profiles WHERE role = 'lawyer')));

-- Create policy for users to insert their own messages
CREATE POLICY "Users can insert own messages" ON public.lawyer_chats
  FOR INSERT WITH CHECK (auth.uid() = user_id AND is_user = TRUE);

-- Create policy for lawyers to insert responses
CREATE POLICY "Lawyers can insert responses" ON public.lawyer_chats
  FOR INSERT WITH CHECK ((auth.uid() IN (SELECT id FROM profiles WHERE role = 'lawyer')) AND is_user = FALSE);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_lawyer_chats_user_id ON public.lawyer_chats(user_id);
CREATE INDEX IF NOT EXISTS idx_lawyer_chats_lawyer_id ON public.lawyer_chats(lawyer_id);
CREATE INDEX IF NOT EXISTS idx_lawyer_chats_created_at ON public.lawyer_chats(created_at DESC);

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