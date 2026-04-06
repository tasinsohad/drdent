-- Dr. Dent Database Schema
-- Run this in your Supabase SQL Editor

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Workspaces (one per dental practice)
CREATE TABLE workspaces (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    logo_url TEXT,
    primary_color TEXT DEFAULT '#0ea5e9',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Users (linked to Supabase Auth)
CREATE TABLE users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
    role TEXT CHECK (role IN ('admin', 'staff')) DEFAULT 'staff',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- AI Configuration per workspace
CREATE TABLE ai_configs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE UNIQUE,
    provider TEXT CHECK (provider IN ('google', 'openai', 'openrouter', 'custom')) DEFAULT 'openai',
    base_url TEXT,
    api_key_encrypted TEXT,
    model TEXT DEFAULT 'gpt-4o',
    system_prompt TEXT DEFAULT 'You are Dr. Dente, a friendly dental receptionist.',
    persona_name TEXT DEFAULT 'Dr. Dente',
    business_hours_start TEXT DEFAULT '09:00',
    business_hours_end TEXT DEFAULT '18:00',
    business_hours_timezone TEXT DEFAULT 'UTC',
    off_hours_message TEXT DEFAULT 'We are currently closed. Our office is open Monday-Friday 9AM-6PM.',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Supabase Connection Config (stored per workspace)
CREATE TABLE supabase_config (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE UNIQUE,
    project_url TEXT NOT NULL,
    anon_key_encrypted TEXT NOT NULL,
    connection_status TEXT CHECK (connection_status IN ('connected', 'disconnected', 'error')) DEFAULT 'disconnected',
    last_tested TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Patients
CREATE TABLE patients (
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
CREATE TABLE conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
    patient_id UUID REFERENCES patients(id) ON DELETE SET NULL,
    channel TEXT CHECK (channel IN ('whatsapp', 'widget')) DEFAULT 'widget',
    status TEXT CHECK (status IN ('active', 'handled', 'closed')) DEFAULT 'active',
    assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
    last_message TEXT,
    last_message_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ai_paused BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Messages
CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
    role TEXT CHECK (role IN ('user', 'assistant', 'system')) NOT NULL,
    content TEXT NOT NULL,
    channel TEXT CHECK (channel IN ('whatsapp', 'widget')) DEFAULT 'widget',
    tokens_used INTEGER,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Appointments
CREATE TABLE appointments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
    patient_id UUID REFERENCES patients(id) ON DELETE SET NULL,
    datetime TIMESTAMP WITH TIME ZONE NOT NULL,
    duration INTEGER DEFAULT 30,
    treatment TEXT,
    status TEXT CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed')) DEFAULT 'pending',
    notes TEXT,
    gcal_event_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Calendar Tokens (Google Calendar OAuth)
CREATE TABLE calendar_tokens (
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
CREATE TABLE widget_config (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE UNIQUE,
    primary_color TEXT DEFAULT '#0ea5e9',
    greeting_text TEXT DEFAULT 'Hi! How can we help you today?',
    avatar_url TEXT,
    position TEXT CHECK (position IN ('bottom-right', 'bottom-left')) DEFAULT 'bottom-right',
    embed_token TEXT UNIQUE DEFAULT uuid_generate_v4(),
    enabled BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- WhatsApp Configuration
CREATE TABLE whatsapp_config (
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

-- Analytics (aggregated stats)
CREATE TABLE analytics (
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

-- Create indexes for performance
CREATE INDEX idx_patients_workspace ON patients(workspace_id);
CREATE INDEX idx_conversations_workspace ON conversations(workspace_id);
CREATE INDEX idx_conversations_patient ON conversations(patient_id);
CREATE INDEX idx_messages_conversation ON messages(conversation_id);
CREATE INDEX idx_appointments_workspace ON appointments(workspace_id);
CREATE INDEX idx_appointments_datetime ON appointments(datetime);
CREATE INDEX idx_analytics_workspace_date ON analytics(workspace_id, date);

-- Row Level Security Policies
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE supabase_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE widget_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics ENABLE ROW LEVEL SECURITY;

-- Workspace policies (users can only see their own workspace)
CREATE POLICY "Users can view own workspace" ON workspaces
    FOR SELECT USING (id IN (SELECT workspace_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Admins can manage workspace" ON workspaces
    FOR ALL USING (
        id IN (SELECT workspace_id FROM users WHERE id = auth.uid() AND role = 'admin')
    );

-- Patients policies
CREATE POLICY "Users can view patients in workspace" ON patients
    FOR SELECT USING (workspace_id IN (SELECT workspace_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Staff can manage patients" ON patients
    FOR ALL USING (workspace_id IN (SELECT workspace_id FROM users WHERE id = auth.uid()));

-- Conversations policies
CREATE POLICY "Users can view conversations in workspace" ON conversations
    FOR SELECT USING (workspace_id IN (SELECT workspace_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Staff can manage conversations" ON conversations
    FOR ALL USING (workspace_id IN (SELECT workspace_id FROM users WHERE id = auth.uid()));

-- Messages policies
CREATE POLICY "Users can view messages in their workspace" ON messages
    FOR SELECT USING (
        conversation_id IN (
            SELECT id FROM conversations 
            WHERE workspace_id IN (SELECT workspace_id FROM users WHERE id = auth.uid())
        )
    );

CREATE POLICY "Staff can manage messages" ON messages
    FOR ALL USING (
        conversation_id IN (
            SELECT id FROM conversations 
            WHERE workspace_id IN (SELECT workspace_id FROM users WHERE id = auth.uid())
        )
    );

-- Appointments policies
CREATE POLICY "Users can view appointments in workspace" ON appointments
    FOR SELECT USING (workspace_id IN (SELECT workspace_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Staff can manage appointments" ON appointments
    FOR ALL USING (workspace_id IN (SELECT workspace_id FROM users WHERE id = auth.uid()));

-- Analytics policies
CREATE POLICY "Users can view analytics in workspace" ON analytics
    FOR SELECT USING (workspace_id IN (SELECT workspace_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Admins can manage analytics" ON analytics
    FOR ALL USING (
        workspace_id IN (SELECT workspace_id FROM users WHERE id = auth.uid() AND role = 'admin')
    );

-- Config tables (read-only for staff, full for admins)
CREATE POLICY "Users can view ai config" ON ai_configs
    FOR SELECT USING (workspace_id IN (SELECT workspace_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Admins can manage ai config" ON ai_configs
    FOR ALL USING (
        workspace_id IN (SELECT workspace_id FROM users WHERE id = auth.uid() AND role = 'admin')
    );

CREATE POLICY "Users can view supabase config" ON supabase_config
    FOR SELECT USING (workspace_id IN (SELECT workspace_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Admins can manage supabase config" ON supabase_config
    FOR ALL USING (
        workspace_id IN (SELECT workspace_id FROM users WHERE id = auth.uid() AND role = 'admin')
    );

CREATE POLICY "Users can view calendar config" ON calendar_tokens
    FOR SELECT USING (workspace_id IN (SELECT workspace_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Admins can manage calendar config" ON calendar_tokens
    FOR ALL USING (
        workspace_id IN (SELECT workspace_id FROM users WHERE id = auth.uid() AND role = 'admin')
    );

CREATE POLICY "Users can view widget config" ON widget_config
    FOR SELECT USING (workspace_id IN (SELECT workspace_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Admins can manage widget config" ON widget_config
    FOR ALL USING (
        workspace_id IN (SELECT workspace_id FROM users WHERE id = auth.uid() AND role = 'admin')
    );

CREATE POLICY "Users can view whatsapp config" ON whatsapp_config
    FOR SELECT USING (workspace_id IN (SELECT workspace_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Admins can manage whatsapp config" ON whatsapp_config
    FOR ALL USING (
        workspace_id IN (SELECT workspace_id FROM users WHERE id = auth.uid() AND role = 'admin')
    );

-- Storage bucket for widget assets
INSERT INTO storage.buckets (id, name, public)
VALUES ('widget-assets', 'widget-assets', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Users can view widget assets" ON storage.objects
    FOR SELECT USING (bucket_id = 'widget-assets');

CREATE POLICY "Admins can manage widget assets" ON storage.objects
    FOR ALL USING (bucket_id = 'widget-assets');

-- Function to create workspace on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    workspace_id UUID;
BEGIN
    -- Create workspace
    INSERT INTO workspaces (name, slug)
    VALUES (
        COALESCE(NEW.raw_user_meta_data->>'practice_name', 'My Dental Practice'),
        LOWER(COALESCE(NEW.raw_user_meta_data->>'practice_name', 'dental')) || '-' || LEFT(NEW.id::TEXT, 8)
    )
    RETURNING id INTO workspace_id;

    -- Add user to workspace
    INSERT INTO users (id, workspace_id, role)
    VALUES (NEW.id, workspace_id, 'admin');

    -- Create default AI config
    INSERT INTO ai_configs (workspace_id)
    VALUES (workspace_id);

    -- Create default widget config
    INSERT INTO widget_config (workspace_id)
    VALUES (workspace_id);

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new user signup
CREATE OR REPLACE FUNCTION auth.auth_user_created()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM public.handle_new_user();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Note: This trigger should be set up in Supabase dashboard
-- Go to Database -> Triggers -> New trigger
-- Event: INSERT on auth.users
-- Function: auth.auth_user_created()

-- For now, we'll create the trigger directly
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION auth.auth_user_created();
