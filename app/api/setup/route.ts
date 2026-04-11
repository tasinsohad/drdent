import { NextResponse } from 'next/server'

export async function POST() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  const encryptionKey = process.env.ENCRYPTION_KEY
  const whatsappToken = process.env.WHATSAPP_VERIFY_TOKEN

  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json({ 
      success: false, 
      error: 'Missing Supabase credentials',
      diagnostics: {
        supabaseUrl: !!supabaseUrl,
        supabaseKey: !!supabaseKey
      }
    }, { status: 500 })
  }

  try {
    // Check if tables already exist by querying workspaces
    const wsResponse = await fetch(`${supabaseUrl}/rest/v1/workspaces?select=id&limit=1`, {
      method: 'GET',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
      },
    })

    if (wsResponse.status === 200) {
      return NextResponse.json({ 
        success: true, 
        message: 'Connected to Supabase successfully!',
        diagnostics: {
          encryptionKeySet: !!encryptionKey,
          encryptionKeyValid: (encryptionKey?.length || 0) >= 32,
          whatsappTokenSet: !!whatsappToken,
          databaseInitialized: true
        }
      })
    }

    // Tables don't exist - return the SQL to run
    const migrationSQL = `-- Run this SQL in your Supabase SQL Editor to set up the database

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create tables
CREATE TABLE IF NOT EXISTS user_roles (
    user_id UUID PRIMARY KEY,
    role TEXT NOT NULL DEFAULT 'user',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS workspaces (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    logo_url TEXT,
    primary_color TEXT DEFAULT '#0ea5e9',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS patients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    tags TEXT[] DEFAULT '{}',
    notes TEXT,
    source TEXT DEFAULT 'widget',
    status TEXT DEFAULT 'lead',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

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
    followup_disabled BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
    role TEXT NOT NULL,
    content TEXT NOT NULL,
    channel TEXT DEFAULT 'widget',
    tokens_used INTEGER,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS appointments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
    patient_id UUID REFERENCES patients(id) ON DELETE SET NULL,
    datetime TIMESTAMP WITH TIME ZONE NOT NULL,
    duration INTEGER DEFAULT 30,
    treatment TEXT,
    status TEXT DEFAULT 'pending',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ai_configs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID UNIQUE,
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

CREATE TABLE IF NOT EXISTS widget_config (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID UNIQUE,
    primary_color TEXT DEFAULT '#0ea5e9',
    greeting_text TEXT,
    position TEXT DEFAULT 'bottom-right',
    embed_token TEXT UNIQUE DEFAULT uuid_generate_v4(),
    enabled BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS whatsapp_config (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
    phone_number_id TEXT,
    whatsapp_business_id TEXT,
    access_token_encrypted TEXT,
    webhook_verify_token TEXT,
    enabled BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

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

CREATE TABLE IF NOT EXISTS followup_configs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
    enabled BOOLEAN DEFAULT TRUE,
    reminder_24h BOOLEAN DEFAULT TRUE,
    reminder_1h BOOLEAN DEFAULT TRUE,
    reminder_30m BOOLEAN DEFAULT FALSE,
    post_visit_followup BOOLEAN DEFAULT TRUE,
    custom_message_24h TEXT,
    custom_message_1h TEXT,
    custom_message_30m TEXT,
    custom_post_visit TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default workspace
INSERT INTO workspaces (id, name, slug)
VALUES ('00000000-0000-0000-0000-000000000000', 'Default Dental Practice', 'default-practice')
ON CONFLICT (slug) DO NOTHING;

-- Policies to allow initial setup without complex auth
CREATE POLICY "Allow all on workspaces" ON workspaces FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on ai_configs" ON ai_configs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on patients" ON patients FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on conversations" ON conversations FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on messages" ON messages FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on popup_configs" ON widget_config FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on followup_configs" ON followup_configs FOR ALL USING (true) WITH CHECK (true);

-- Insert default configurations for the workspace
INSERT INTO ai_configs (workspace_id)
VALUES ('00000000-0000-0000-0000-000000000000')
ON CONFLICT (workspace_id) DO NOTHING;

INSERT INTO widget_config (workspace_id)
VALUES ('00000000-0000-0000-0000-000000000000')
ON CONFLICT (workspace_id) DO NOTHING;

INSERT INTO followup_configs (workspace_id)
VALUES ('00000000-0000-0000-0000-000000000000')
ON CONFLICT (workspace_id) DO NOTHING;`

    return NextResponse.json({ 
      success: false, 
      error: 'Database tables not found',
      sql: migrationSQL,
      message: 'Please copy the SQL below and run it in your Supabase SQL Editor'
    }, { status: 500 })

  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
