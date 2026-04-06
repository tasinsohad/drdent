-- RAG Knowledge Base, AI Intents, Stripe Payments, Notifications, Encryption
-- Run this in your Supabase SQL Editor

-- 1. Knowledge Base Documents Table (for PDF uploads)
CREATE TABLE IF NOT EXISTS knowledge_base (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    file_type TEXT CHECK (file_type IN ('pdf', 'txt', 'md', 'doc')) DEFAULT 'pdf',
    file_url TEXT,
    content TEXT,
    chunks TEXT[],
    status TEXT CHECK (status IN ('uploading', 'processing', 'ready', 'error')) DEFAULT 'uploading',
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. AI Intents Table (custom training)
CREATE TABLE IF NOT EXISTS ai_intents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    trigger_patterns TEXT[] NOT NULL,
    response_template TEXT NOT NULL,
    action_type TEXT CHECK (action_type IN ('info', 'booking', 'callback', 'escalate', 'payment')) DEFAULT 'info',
    confidence_threshold NUMERIC(3,2) DEFAULT 0.7,
    enabled BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Stripe Configuration
CREATE TABLE IF NOT EXISTS stripe_configs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE UNIQUE,
    publishable_key TEXT,
    secret_key_encrypted TEXT,
    webhook_secret_encrypted TEXT,
    enabled BOOLEAN DEFAULT FALSE,
    deposit_amount INTEGER DEFAULT 5000,
    currency TEXT DEFAULT 'usd',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Notifications Table
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    type TEXT CHECK (type IN ('urgent_message', 'new_patient', 'appointment_reminder', 'low_confidence', 'payment_received')) NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    read BOOLEAN DEFAULT FALSE,
    link TEXT,
    priority TEXT CHECK (priority IN ('low', 'medium', 'high')) DEFAULT 'medium',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Message Confidence Scores (for AI quality tracking)
ALTER TABLE messages ADD COLUMN IF NOT EXISTS confidence_score NUMERIC(5,4);
ALTER TABLE messages ADD COLUMN IF NOT EXISTS intent_matched TEXT;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS used_knowledge_base BOOLEAN DEFAULT FALSE;

-- 6. Enhanced Appointments with Conflict Detection
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS dentist_id UUID REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS location TEXT DEFAULT 'main';

-- 7. Payments Table
CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
    patient_id UUID REFERENCES patients(id) ON DELETE SET NULL,
    conversation_id UUID REFERENCES conversations(id) ON DELETE SET NULL,
    amount INTEGER NOT NULL,
    currency TEXT DEFAULT 'usd',
    status TEXT CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'refunded')) DEFAULT 'pending',
    stripe_payment_intent_id TEXT,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for new tables
CREATE INDEX IF NOT EXISTS idx_knowledge_base_workspace ON knowledge_base(workspace_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_base_status ON knowledge_base(status);
CREATE INDEX IF NOT EXISTS idx_ai_intents_workspace ON ai_intents(workspace_id);
CREATE INDEX IF NOT EXISTS idx_ai_intents_enabled ON ai_intents(enabled);
CREATE INDEX IF NOT EXISTS idx_notifications_workspace_user ON notifications(workspace_id, user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(workspace_id, read) WHERE read = FALSE;
CREATE INDEX IF NOT EXISTS idx_payments_workspace ON payments(workspace_id);
CREATE INDEX IF NOT EXISTS idx_payments_patient ON payments(patient_id);
CREATE INDEX IF NOT EXISTS idx_appointments_dentist ON appointments(dentist_id);
CREATE INDEX IF NOT EXISTS idx_appointments_datetime_status ON appointments(datetime, status);

-- RLS Policies for new tables
ALTER TABLE knowledge_base ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_intents ENABLE ROW LEVEL SECURITY;
ALTER TABLE stripe_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Knowledge Base Policies
CREATE POLICY "Users can view knowledge base" ON knowledge_base
    FOR SELECT USING (workspace_id IN (SELECT workspace_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Admins can manage knowledge base" ON knowledge_base
    FOR ALL USING (
        workspace_id IN (SELECT workspace_id FROM users WHERE id = auth.uid() AND role = 'admin')
    );

-- AI Intents Policies
CREATE POLICY "Users can view ai intents" ON ai_intents
    FOR SELECT USING (workspace_id IN (SELECT workspace_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Admins can manage ai intents" ON ai_intents
    FOR ALL USING (
        workspace_id IN (SELECT workspace_id FROM users WHERE id = auth.uid() AND role = 'admin')
    );

-- Stripe Config Policies (admin only)
CREATE POLICY "Admins can view stripe config" ON stripe_configs
    FOR SELECT USING (
        workspace_id IN (SELECT workspace_id FROM users WHERE id = auth.uid() AND role = 'admin')
    );

CREATE POLICY "Admins can manage stripe config" ON stripe_configs
    FOR ALL USING (
        workspace_id IN (SELECT workspace_id FROM users WHERE id = auth.uid() AND role = 'admin')
    );

-- Notifications Policies
CREATE POLICY "Users can view own notifications" ON notifications
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can update own notifications" ON notifications
    FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "System can create notifications" ON notifications
    FOR INSERT WITH CHECK (user_id IN (SELECT id FROM users));

-- Payments Policies
CREATE POLICY "Users can view payments in workspace" ON payments
    FOR SELECT USING (workspace_id IN (SELECT workspace_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Staff can manage payments" ON payments
    FOR ALL USING (workspace_id IN (SELECT workspace_id FROM users WHERE id = auth.uid()));

-- Storage bucket for knowledge base documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('knowledge-base', 'knowledge-base', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Admins can manage knowledge base files" ON storage.objects
    FOR ALL USING (bucket_id = 'knowledge-base' AND (
        bucket_id IN (
            SELECT 'knowledge-base' FROM workspaces w
            JOIN users u ON u.workspace_id = w.id
            WHERE u.id = auth.uid() AND u.role = 'admin'
        )
    ));

-- Insert sample intents for dental clinic
INSERT INTO ai_intents (workspace_id, name, trigger_patterns, response_template, action_type) 
SELECT 
    w.id,
    'Request Callback',
    ARRAY['callback', 'call me', 'phone', 'ring', 'contact me'],
    'I understand you would like a callback. I will let the clinic know and someone will call you shortly.',
    'callback'
FROM workspaces w
WHERE NOT EXISTS (SELECT 1 FROM ai_intents WHERE workspace_id = w.id AND name = 'Request Callback')
LIMIT 1;

INSERT INTO ai_intents (workspace_id, name, trigger_patterns, response_template, action_type) 
SELECT 
    w.id,
    'Book Appointment',
    ARRAY['book', 'appointment', 'schedule', 'reserve', 'visit'],
    'I can help you book an appointment. What date and time would work best for you?',
    'booking'
FROM workspaces w
WHERE NOT EXISTS (SELECT 1 FROM ai_intents WHERE workspace_id = w.id AND name = 'Book Appointment')
LIMIT 1;

INSERT INTO ai_intents (workspace_id, name, trigger_patterns, response_template, action_type) 
SELECT 
    w.id,
    'Emergency',
    ARRAY['emergency', 'urgent', 'pain', 'ache', 'broken', 'cracked', 'lost filling'],
    'I see you are experiencing an urgent issue. I will flag this for immediate attention. Please call the clinic directly at [clinic_phone] if you are in severe pain.',
    'escalate'
FROM workspaces w
WHERE NOT EXISTS (SELECT 1 FROM ai_intents WHERE workspace_id = w.id AND name = 'Emergency')
LIMIT 1;
