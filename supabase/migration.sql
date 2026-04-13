-- =====================================================
-- Dr. Dent - Complete Database Setup
-- Run this in Supabase SQL Editor
-- =====================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- CREATE ALL TABLES
-- =====================================================

-- Workspaces
CREATE TABLE IF NOT EXISTS workspaces (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    logo_url TEXT,
    primary_color TEXT DEFAULT '#0ea5e9',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Users
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
    role TEXT CHECK (role IN ('admin', 'staff')) DEFAULT 'staff',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- AI Configuration
CREATE TABLE IF NOT EXISTS ai_configs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE UNIQUE,
    provider TEXT DEFAULT 'openai',
    base_url TEXT,
    api_key_encrypted TEXT,
    model TEXT DEFAULT 'gpt-4o',
    system_prompt TEXT,
    persona_name TEXT DEFAULT 'Dr. Dente',
    business_hours_start TEXT DEFAULT '09:00',
    business_hours_end TEXT DEFAULT '18:00',
    business_hours_timezone TEXT DEFAULT 'UTC',
    off_hours_message TEXT,
    supported_languages TEXT[] DEFAULT ARRAY['en'],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Patients
CREATE TABLE IF NOT EXISTS patients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    tags TEXT[] DEFAULT '{}',
    notes TEXT,
    source TEXT DEFAULT 'widget',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Conversations
CREATE TABLE IF NOT EXISTS conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
    patient_id UUID REFERENCES patients(id) ON DELETE SET NULL,
    channel TEXT DEFAULT 'widget',
    status TEXT DEFAULT 'active',
    assigned_to UUID,
    last_message TEXT,
    last_message_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ai_paused BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Messages
CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
    role TEXT NOT NULL,
    content TEXT NOT NULL,
    channel TEXT DEFAULT 'widget',
    tokens_used INTEGER,
    wa_id TEXT UNIQUE,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Appointments
CREATE TABLE IF NOT EXISTS appointments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
    patient_id UUID REFERENCES patients(id) ON DELETE SET NULL,
    datetime TIMESTAMP WITH TIME ZONE NOT NULL,
    duration INTEGER DEFAULT 30,
    treatment TEXT,
    status TEXT DEFAULT 'pending',
    notes TEXT,
    gcal_event_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Calendar Tokens
CREATE TABLE IF NOT EXISTS calendar_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE UNIQUE,
    access_token_encrypted TEXT,
    refresh_token_encrypted TEXT,
    expiry TIMESTAMP WITH TIME ZONE,
    calendar_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Widget Configuration
CREATE TABLE IF NOT EXISTS widget_config (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE UNIQUE,
    primary_color TEXT DEFAULT '#0ea5e9',
    greeting_text TEXT,
    avatar_url TEXT,
    position TEXT DEFAULT 'bottom-right',
    embed_token TEXT UNIQUE DEFAULT uuid_generate_v4(),
    enabled BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- WhatsApp Configuration
CREATE TABLE IF NOT EXISTS whatsapp_config (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE UNIQUE,
    phone_number_id TEXT,
    whatsapp_business_id TEXT,
    access_token_encrypted TEXT,
    webhook_verify_token TEXT,
    enabled BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Follow-up Configuration
CREATE TABLE IF NOT EXISTS followup_configs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE UNIQUE,
    enabled BOOLEAN DEFAULT TRUE,
    reminder_24h BOOLEAN DEFAULT TRUE,
    reminder_1h BOOLEAN DEFAULT TRUE,
    reminder_30m BOOLEAN DEFAULT FALSE,
    post_visit_followup BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Analytics
CREATE TABLE IF NOT EXISTS analytics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    total_conversations INTEGER DEFAULT 0,
    new_patients INTEGER DEFAULT 0,
    appointments_booked INTEGER DEFAULT 0,
    ai_replies INTEGER DEFAULT 0,
    human_replies INTEGER DEFAULT 0,
    whatsapp_messages INTEGER DEFAULT 0,
    widget_messages INTEGER DEFAULT 0,
    UNIQUE(workspace_id, date)
);

-- =====================================================
-- INDEXES
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_patients_workspace ON patients(workspace_id);
CREATE INDEX IF NOT EXISTS idx_conversations_workspace ON conversations(workspace_id);
CREATE INDEX IF NOT EXISTS idx_appointments_workspace ON appointments(workspace_id);
CREATE INDEX IF NOT EXISTS idx_appointments_datetime ON appointments(datetime);

-- =====================================================
-- DISABLE RLS FOR ALL TABLES
-- =====================================================
ALTER TABLE workspaces DISABLE ROW LEVEL SECURITY;
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE ai_configs DISABLE ROW LEVEL SECURITY;
ALTER TABLE patients DISABLE ROW LEVEL SECURITY;
ALTER TABLE conversations DISABLE ROW LEVEL SECURITY;
ALTER TABLE messages DISABLE ROW LEVEL SECURITY;
ALTER TABLE appointments DISABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_tokens DISABLE ROW LEVEL SECURITY;
ALTER TABLE widget_config DISABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_config DISABLE ROW LEVEL SECURITY;
ALTER TABLE followup_configs DISABLE ROW LEVEL SECURITY;
ALTER TABLE analytics DISABLE ROW LEVEL SECURITY;

-- =====================================================
-- CREATE DEFAULT WORKSPACE & CONFIGS
-- =====================================================
INSERT INTO workspaces (name, slug)
SELECT 'My Dental Practice', 'default-practice'
WHERE NOT EXISTS (SELECT 1 FROM workspaces LIMIT 1);

INSERT INTO ai_configs (workspace_id) 
SELECT id FROM workspaces LIMIT 1
ON CONFLICT (workspace_id) DO NOTHING;

INSERT INTO widget_config (workspace_id) 
SELECT id FROM workspaces LIMIT 1
ON CONFLICT (workspace_id) DO NOTHING;

INSERT INTO followup_configs (workspace_id) 
SELECT id FROM workspaces LIMIT 1
ON CONFLICT (workspace_id) DO NOTHING;

-- =====================================================
-- STORAGE
-- =====================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('widget-assets', 'widget-assets', true)
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- ENABLE REALTIME
-- =====================================================
-- First, ensure the publication exists (Supabase default)
-- Then add our tables to it
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    CREATE PUBLICATION supabase_realtime;
  END IF;
END $$;

ALTER PUBLICATION supabase_realtime ADD TABLE messages;
ALTER PUBLICATION supabase_realtime ADD TABLE conversations;