# Backend

This folder contains the backend configuration and database schemas for NyayaAI.

## Technologies
- Supabase (PostgreSQL database)
- Row Level Security (RLS) policies
- Database migrations

## Database Schema
- `supabase-schema.sql` - Main database schema for new projects
- `supabase-migrate-lawyer-assignment.sql` - Migration for lawyer assignment
- `supabase-migrate-lawyer-chats-to-sender.sql` - Migration for lawyer chats

## Setup
Apply the SQL files to your Supabase project in the SQL Editor.

For new projects: Run `supabase-schema.sql`
For existing projects: Run the migration files in order.