import { NextResponse } from 'next/server'

export async function POST() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json({ success: false, error: 'Missing Supabase credentials' }, { status: 500 })
  }

  const createTablesSQL = `
    CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

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
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS conversations (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
      patient_id UUID REFERENCES patients(id) ON DELETE SET NULL,
      channel TEXT CHECK (channel IN ('whatsapp', 'widget')) DEFAULT 'widget',
      status TEXT CHECK (status IN ('active', 'handled', 'closed')) DEFAULT 'active',
      assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
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
      role TEXT CHECK (role IN ('user', 'assistant', 'system')) NOT NULL,
      content TEXT NOT NULL,
      channel TEXT CHECK (channel IN ('whatsapp', 'widget')) DEFAULT 'widget',
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
      status TEXT CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed')) DEFAULT 'pending',
      notes TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS ai_configs (
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
      supported_languages TEXT[] DEFAULT ARRAY['en'],
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS widget_config (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE UNIQUE,
      primary_color TEXT DEFAULT '#0ea5e9',
      greeting_text TEXT DEFAULT 'Hi! How can I help you today?',
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
      custom_message_24h TEXT DEFAULT 'Hi! Just a reminder about your appointment tomorrow. See you then!',
      custom_message_1h TEXT DEFAULT 'Reminder: Your appointment is in 1 hour. Please arrive 10 minutes early.',
      custom_message_30m TEXT DEFAULT 'Your appointment starts in 30 minutes. We look forward to seeing you!',
      custom_post_visit TEXT DEFAULT 'Hope your visit went well! Do not forget to brush twice daily and floss.',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );

    INSERT INTO workspaces (id, name, slug)
    VALUES (uuid_generate_v4(), 'Default Dental Practice', 'default-practice')
    ON CONFLICT (slug) DO NOTHING;
  `

  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
      },
      body: JSON.stringify({ sql: createTablesSQL }),
    })

    if (!response.ok) {
      const text = await response.text()
      
      if (text.includes('relation') || text.includes('does not exist')) {
        return NextResponse.json({ 
          success: false, 
          error: 'Could not create tables. Please run migration SQL manually in Supabase SQL Editor.' 
        }, { status: 500 })
      }
      
      return NextResponse.json({ success: false, error: text }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: 'Database setup completed!' })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
