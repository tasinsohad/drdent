"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import {
  Database,
  Bot,
  Smartphone,
  Calendar,
  CheckCircle2,
  Copy,
  Shield,
  MessageCircle,
  ArrowRight,
  AlertTriangle,
  Loader2,
  RefreshCw,
  FileText,
  ChevronDown,
  ExternalLink,
  Code,
  Key,
  Globe,
  Phone,
  Settings as SettingsIcon,
  Zap,
  Bell,
  Clock,
  MessageSquare,
  History,
  User,
  Mail,
  Lock,
  Download,
  Trash2,
  AlertCircle,
} from "lucide-react"
import { useAppStore } from "@/lib/store"
import { supabase, testSupabaseConnection } from "@/lib/supabase-client"
import { getFollowupConfig, saveFollowupConfig, getAuditLogs, getAIConfig, getWidgetConfig, getWhatsAppConfig } from "@/lib/db"

const docSections = [
  {
    id: "getting-started",
    title: "Getting Started",
    icon: Zap,
    content: (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">Welcome to Dr. Dent! Follow these steps to get your AI dental receptionist up and running.</p>
        <div className="space-y-3">
          {[
            { step: "1", title: "Create Your Account", desc: "Sign up with your email and password. You'll be redirected to your dashboard." },
            { step: "2", title: "Run Database Migration", desc: "Go to Settings → Backend and click 'Run Database Migration' to set up your database tables." },
            { step: "3", title: "Configure AI", desc: "Go to Settings → AI Agent and enter your OpenAI or Gemini API key." },
            { step: "4", title: "Customize Your Widget", desc: "Go to Settings → Widget to customize the chat widget for your website." },
            { step: "5", title: "Go Live", desc: "Embed the widget on your website and start receiving patient messages." },
          ].map((item) => (
            <div key={item.step} className="flex gap-3 p-3 rounded-lg bg-muted/50">
              <div className="w-7 h-7 bg-blue-600 text-white rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold">
                {item.step}
              </div>
              <div>
                <p className="font-medium text-sm">{item.title}</p>
                <p className="text-xs text-muted-foreground">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  },
  {
    id: "supabase-setup",
    title: "Supabase Setup",
    icon: Database,
    content: (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">Dr. Dent uses Supabase as its database backend. Your Supabase credentials are pre-configured.</p>
        <div className="space-y-3">
          <div className="flex gap-3 p-3 rounded-lg bg-muted/50">
            <div className="w-7 h-7 bg-blue-600 text-white rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold">1</div>
            <div>
              <p className="font-medium text-sm">Database is Pre-configured</p>
              <p className="text-xs text-muted-foreground">Your Supabase project is already connected. Check the Backend tab for connection status.</p>
            </div>
          </div>
          <div className="flex gap-3 p-3 rounded-lg bg-muted/50">
            <div className="w-7 h-7 bg-blue-600 text-white rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold">2</div>
            <div>
              <p className="font-medium text-sm">Run Migration</p>
              <p className="text-xs text-muted-foreground">Click "Run Database Migration" in the Backend tab to create all required tables.</p>
            </div>
          </div>
          <div className="flex gap-3 p-3 rounded-lg bg-muted/50">
            <div className="w-7 h-7 bg-blue-600 text-white rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold">3</div>
            <div>
              <p className="font-medium text-sm">Manual Migration (if needed)</p>
              <p className="text-xs text-muted-foreground mb-2">If the migration button doesn't work, run this SQL in your Supabase SQL Editor:</p>
              <div className="bg-slate-900 text-slate-100 rounded-lg p-3 text-xs font-mono overflow-x-auto">
                <pre>{`CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS user_roles (
  user_id UUID PRIMARY KEY,
  role TEXT NOT NULL DEFAULT 'user',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS workspaces (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS patients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID REFERENCES workspaces(id),
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID REFERENCES workspaces(id),
  patient_id UUID REFERENCES patients(id),
  channel TEXT DEFAULT 'widget',
  status TEXT DEFAULT 'active',
  last_message TEXT,
  last_message_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID REFERENCES conversations(id),
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS appointments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID REFERENCES workspaces(id),
  patient_id UUID REFERENCES patients(id),
  datetime TIMESTAMP WITH TIME ZONE NOT NULL,
  duration INTEGER DEFAULT 30,
  treatment TEXT,
  status TEXT DEFAULT 'pending'
);

CREATE TABLE IF NOT EXISTS ai_configs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID REFERENCES workspaces(id),
  provider TEXT DEFAULT 'openai',
  model TEXT DEFAULT 'gpt-4o',
  api_key_encrypted TEXT,
  system_prompt TEXT,
  persona_name TEXT DEFAULT 'Dr. Dente',
  business_hours_start TEXT DEFAULT '09:00',
  business_hours_end TEXT DEFAULT '18:00'
);

CREATE TABLE IF NOT EXISTS widget_config (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID REFERENCES workspaces(id),
  primary_color TEXT DEFAULT '#0ea5e9',
  greeting_text TEXT,
  position TEXT DEFAULT 'bottom-right',
  embed_token TEXT UNIQUE DEFAULT uuid_generate_v4(),
  enabled BOOLEAN DEFAULT TRUE
);`}</pre>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  },
  {
    id: "ai-configuration",
    title: "AI Configuration",
    icon: Bot,
    content: (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">Configure your AI receptionist to handle patient conversations.</p>
        <div className="space-y-3">
          <div className="flex gap-3 p-3 rounded-lg bg-muted/50">
            <div className="w-7 h-7 bg-blue-600 text-white rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold">1</div>
            <div>
              <p className="font-medium text-sm">Get an API Key</p>
              <p className="text-xs text-muted-foreground">
                <a href="https://platform.openai.com/api-keys" target="_blank" className="text-blue-600 underline inline-flex items-center gap-1">
                  OpenAI API Key <ExternalLink className="h-3 w-3" />
                </a>
                {" "}or{" "}
                <a href="https://ai.google.dev/" target="_blank" className="text-blue-600 underline inline-flex items-center gap-1">
                  Google Gemini <ExternalLink className="h-3 w-3" />
                </a>
              </p>
            </div>
          </div>
          <div className="flex gap-3 p-3 rounded-lg bg-muted/50">
            <div className="w-7 h-7 bg-blue-600 text-white rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold">2</div>
            <div>
              <p className="font-medium text-sm">Enter API Key</p>
              <p className="text-xs text-muted-foreground">Go to Settings → AI Agent and paste your API key. It will be stored securely in your database.</p>
            </div>
          </div>
          <div className="flex gap-3 p-3 rounded-lg bg-muted/50">
            <div className="w-7 h-7 bg-blue-600 text-white rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold">3</div>
            <div>
              <p className="font-medium text-sm">Customize the AI Persona</p>
              <p className="text-xs text-muted-foreground">Edit the system prompt to define how your AI receptionist should behave. Set business hours, agent name, and off-hours messages.</p>
            </div>
          </div>
          <div className="p-3 rounded-lg bg-amber-50 border border-amber-200">
            <p className="text-xs text-amber-800">
              <AlertTriangle className="h-3 w-3 inline mr-1" />
              <strong>Tip:</strong> GPT-4o provides the best quality responses. GPT-3.5 Turbo is faster and cheaper but less accurate.
            </p>
          </div>
        </div>
      </div>
    )
  },
  {
    id: "whatsapp",
    title: "WhatsApp Integration",
    icon: MessageCircle,
    content: (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">Connect WhatsApp to receive patient messages directly.</p>
        <div className="space-y-3">
          {[
            { step: "1", title: "Create Meta Developer Account", desc: "Go to developers.facebook.com and create an app." },
            { step: "2", title: "Add WhatsApp Product", desc: "In your app dashboard, add WhatsApp from the products menu." },
            { step: "3", title: "Get Credentials", desc: "Navigate to WhatsApp → API Setup to get Phone Number ID, Business Account ID, and Access Token." },
            { step: "4", title: "Configure in Dr. Dent", desc: "Go to Settings → WhatsApp and enter your credentials." },
            { step: "5", title: "Set Up Webhook", desc: "Configure a webhook in Supabase Edge Functions for real-time message handling." },
          ].map((item) => (
            <div key={item.step} className="flex gap-3 p-3 rounded-lg bg-muted/50">
              <div className="w-7 h-7 bg-blue-600 text-white rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold">
                {item.step}
              </div>
              <div>
                <p className="font-medium text-sm">{item.title}</p>
                <p className="text-xs text-muted-foreground">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="p-3 rounded-lg bg-amber-50 border border-amber-200">
          <p className="text-xs text-amber-800">
            <AlertTriangle className="h-3 w-3 inline mr-1" />
            <strong>Note:</strong> WhatsApp Business API requires a verified business account. For testing, use Meta test phone numbers.
          </p>
        </div>
      </div>
    )
  },
  {
    id: "widget",
    title: "Widget Embedding",
    icon: Smartphone,
    content: (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">Add the chat widget to your website.</p>
        <div className="space-y-3">
          <div className="flex gap-3 p-3 rounded-lg bg-muted/50">
            <div className="w-7 h-7 bg-blue-600 text-white rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold">1</div>
            <div>
              <p className="font-medium text-sm">Configure Widget</p>
              <p className="text-xs text-muted-foreground">Go to Settings → Widget to customize colors, position, and greeting text.</p>
            </div>
          </div>
          <div className="flex gap-3 p-3 rounded-lg bg-muted/50">
            <div className="w-7 h-7 bg-blue-600 text-white rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold">2</div>
            <div>
              <p className="font-medium text-sm">Copy Embed Code</p>
              <p className="text-xs text-muted-foreground mb-2">Add this script tag before the closing &lt;/body&gt; tag of your website:</p>
              <div className="bg-slate-900 text-slate-100 rounded-lg p-3 text-xs font-mono">
                {`<script src="https://widget.drdent.ai/embed.js?token=YOUR_TOKEN"></script>`}
              </div>
            </div>
          </div>
          <div className="flex gap-3 p-3 rounded-lg bg-muted/50">
            <div className="w-7 h-7 bg-blue-600 text-white rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold">3</div>
            <div>
              <p className="font-medium text-sm">Test the Widget</p>
              <p className="text-xs text-muted-foreground">Visit your website and verify the widget appears and can send messages.</p>
            </div>
          </div>
        </div>
      </div>
    )
  },
  {
    id: "calendar",
    title: "Calendar Sync",
    icon: Calendar,
    content: (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">Connect Google Calendar for two-way appointment sync.</p>
        <div className="space-y-3">
          {[
            { step: "1", title: "Enable Google Calendar API", desc: "Go to Google Cloud Console and enable the Calendar API." },
            { step: "2", title: "Create OAuth Credentials", desc: "Create OAuth 2.0 credentials for a web application." },
            { step: "3", title: "Connect in Dr. Dent", desc: "Go to Settings → Calendar and click Connect Google Calendar." },
            { step: "4", title: "Authorize Access", desc: "Sign in with Google and grant calendar access." },
          ].map((item) => (
            <div key={item.step} className="flex gap-3 p-3 rounded-lg bg-muted/50">
              <div className="w-7 h-7 bg-blue-600 text-white rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold">
                {item.step}
              </div>
              <div>
                <p className="font-medium text-sm">{item.title}</p>
                <p className="text-xs text-muted-foreground">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="p-3 rounded-lg bg-blue-50 border border-blue-200">
          <p className="text-xs text-blue-800">
            <strong>Coming Soon:</strong> Google Calendar integration is currently in development. Stay tuned!
          </p>
        </div>
      </div>
    )
  },
  {
    id: "troubleshooting",
    title: "Troubleshooting",
    icon: AlertTriangle,
    content: (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">Common issues and solutions.</p>
        <div className="space-y-3">
          {[
            {
              issue: "Database connection failed",
              solution: "Check that your Supabase project is active. Go to Settings → Backend and click the refresh button to re-check connection. If tables don't exist, run the migration."
            },
            {
              issue: "AI not responding",
              solution: "Verify your API key is correct in Settings → AI Agent. Check that you have sufficient credits in your OpenAI/Google account."
            },
            {
              issue: "Widget not appearing on website",
              solution: "Make sure the embed script is placed before the closing </body> tag. Check that the widget is enabled in Settings → Widget."
            },
            {
              issue: "Can't sign up or log in",
              solution: "Ensure email confirmation is disabled in Supabase (Authentication → Providers → Email). Check that your Supabase URL and anon key are correct in .env.local."
            },
            {
              issue: "Appointments not showing",
              solution: "Run the database migration if you haven't already. Check that appointments are being created with the correct workspace_id."
            },
          ].map((item, i) => (
            <div key={i} className="p-3 rounded-lg bg-muted/50">
              <p className="font-medium text-sm">{item.issue}</p>
              <p className="text-xs text-muted-foreground mt-1">{item.solution}</p>
            </div>
          ))}
        </div>
      </div>
    )
  }
]

export default function SettingsPage() {
  const { supabaseConnected, supabaseError, checkSupabaseConnection } = useAppStore()

  const [apiKeyError, setApiKeyError] = useState<string | null>(null)
  const [apiKeyValidating, setApiKeyValidating] = useState(false)
  const [checking, setChecking] = useState(false)
  const [migrating, setMigrating] = useState(false)
  const [migrationResult, setMigrationResult] = useState<{success: boolean; message: string; sql?: string} | null>(null)

  // Profile tab state
  const [profileDisplayName, setProfileDisplayName] = useState("")
  const [profilePracticeName, setProfilePracticeName] = useState("")
  const [profileEmail, setProfileEmail] = useState("")
  const [profileNewPassword, setProfileNewPassword] = useState("")
  const [profileConfirmPassword, setProfileConfirmPassword] = useState("")
  const [profileSaving, setProfileSaving] = useState(false)
  const [profileMsg, setProfileMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Notification preferences state
  const [notifEmailAppointment, setNotifEmailAppointment] = useState(true)
  const [notifEmailMessage, setNotifEmailMessage] = useState(true)
  const [notifEmailWeeklySummary, setNotifEmailWeeklySummary] = useState(false)
  const [notifPushUrgent, setNotifPushUrgent] = useState(true)
  const [notifSaving, setNotifSaving] = useState(false)

  // Account tab state
  const [locale, setLocale] = useState("en")
  const [exportLoading, setExportLoading] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState("")
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [deletingAccount, setDeletingAccount] = useState(false)

  const databaseMigrationSQL = `-- =====================================================
-- Dr. Dent - Complete Database Schema
-- Run this in Supabase SQL Editor (https://supabase.com/dashboard/_/sql)
-- =====================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- MAIN TABLES
-- =====================================================

-- Workspaces (one per dental practice)
CREATE TABLE IF NOT EXISTS workspaces (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    logo_url TEXT,
    primary_color TEXT DEFAULT '#0ea5e9',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Users (linked to Supabase Auth)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
    role TEXT CHECK (role IN ('admin', 'staff')) DEFAULT 'staff',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- AI Configuration per workspace
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

-- Supabase Connection Config
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

-- Additional Admin Tables
CREATE TABLE IF NOT EXISTS user_roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'user',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID REFERENCES workspaces(id),
  plan TEXT DEFAULT 'free',
  status TEXT DEFAULT 'active',
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS activity_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID,
  workspace_id UUID,
  action TEXT NOT NULL,
  details JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RAG / Knowledge Base Tables
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

-- =====================================================
-- ADD COLUMNS TO EXISTING TABLES
-- =====================================================

ALTER TABLE messages ADD COLUMN IF NOT EXISTS confidence_score NUMERIC(5,4);
ALTER TABLE messages ADD COLUMN IF NOT EXISTS intent_matched TEXT;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS used_knowledge_base BOOLEAN DEFAULT FALSE;

ALTER TABLE appointments ADD COLUMN IF NOT EXISTS dentist_id UUID REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS location TEXT DEFAULT 'main';

-- =====================================================
-- INDEXES
-- =====================================================

CREATE INDEX idx_patients_workspace ON patients(workspace_id);
CREATE INDEX idx_conversations_workspace ON conversations(workspace_id);
CREATE INDEX idx_conversations_patient ON conversations(patient_id);
CREATE INDEX idx_messages_conversation ON messages(conversation_id);
CREATE INDEX idx_appointments_workspace ON appointments(workspace_id);
CREATE INDEX idx_appointments_datetime ON appointments(datetime);
CREATE INDEX idx_analytics_workspace_date ON analytics(workspace_id, date);

CREATE INDEX IF NOT EXISTS idx_knowledge_base_workspace ON knowledge_base(workspace_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_base_status ON knowledge_base(status);
CREATE INDEX IF NOT EXISTS idx_ai_intents_workspace ON ai_intents(workspace_id);
CREATE INDEX IF NOT EXISTS idx_ai_intents_enabled ON ai_intents(enabled);
CREATE INDEX IF NOT EXISTS idx_notifications_workspace_user ON notifications(workspace_id, user_id);
CREATE INDEX IF NOT EXISTS idx_payments_workspace ON payments(workspace_id);
CREATE INDEX IF NOT EXISTS idx_payments_patient ON payments(patient_id);

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE workspaces DISABLE ROW LEVEL SECURITY;
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE ai_configs DISABLE ROW LEVEL SECURITY;
ALTER TABLE supabase_config DISABLE ROW LEVEL SECURITY;
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
-- AUTO-SETUP FUNCTION (for new users)
-- =====================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    workspace_id UUID;
BEGIN
    INSERT INTO workspaces (name, slug)
    VALUES (
        COALESCE(NEW.raw_user_meta_data->>'practice_name', 'My Dental Practice'),
        LOWER(COALESCE(NEW.raw_user_meta_data->>'practice_name', 'dental')) || '-' || LEFT(NEW.id::TEXT, 8)
    )
    RETURNING id INTO workspace_id;

    INSERT INTO users (id, workspace_id, role)
    VALUES (NEW.id, workspace_id, 'admin');

    INSERT INTO ai_configs (workspace_id)
    VALUES (workspace_id);

    INSERT INTO widget_config (workspace_id)
    VALUES (workspace_id);

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =====================================================
-- TEMPORARY PERMISSIVE POLICIES (remove after setup)
-- =====================================================

-- Drop restrictive policies first
DROP POLICY IF EXISTS "Users can view own workspace" ON workspaces;
DROP POLICY IF EXISTS "Admins can manage workspace" ON workspaces;

-- Allow all operations on workspaces (for setup)
CREATE POLICY "Allow all on workspaces" ON workspaces
    FOR ALL USING (true) WITH CHECK (true);

-- Allow all operations on users (for setup)
DROP POLICY IF EXISTS "Users can view own users" ON users;
DROP POLICY IF EXISTS "Admins can manage users" ON users;
CREATE POLICY "Allow all on users" ON users
    FOR ALL USING (true) WITH CHECK (true);

-- Allow all operations on patients (for setup)
DROP POLICY IF EXISTS "Users can view patients in workspace" ON patients;
DROP POLICY IF EXISTS "Staff can manage patients" ON patients;
CREATE POLICY "Allow all on patients" ON patients
    FOR ALL USING (true) WITH CHECK (true);

-- Allow all operations on conversations (for setup)
DROP POLICY IF EXISTS "Users can view conversations in workspace" ON conversations;
DROP POLICY IF EXISTS "Staff can manage conversations" ON conversations;
CREATE POLICY "Allow all on conversations" ON conversations
    FOR ALL USING (true) WITH CHECK (true);

-- Allow all operations on messages (for setup)
DROP POLICY IF EXISTS "Users can view messages in their workspace" ON messages;
DROP POLICY IF EXISTS "Staff can manage messages" ON messages;
CREATE POLICY "Allow all on messages" ON messages
    FOR ALL USING (true) WITH CHECK (true);

-- Allow all operations on appointments (for setup)
DROP POLICY IF EXISTS "Users can view appointments in workspace" ON appointments;
DROP POLICY IF EXISTS "Staff can manage appointments" ON appointments;
CREATE POLICY "Allow all on appointments" ON appointments
    FOR ALL USING (true) WITH CHECK (true);

-- Allow all operations on ai_configs (for setup)
DROP POLICY IF EXISTS "Users can view ai config" ON ai_configs;
DROP POLICY IF EXISTS "Admins can manage ai config" ON ai_configs;
CREATE POLICY "Allow all on ai_configs" ON ai_configs
    FOR ALL USING (true) WITH CHECK (true);

-- Allow all operations on widget_config (for setup)
DROP POLICY IF EXISTS "Users can view widget config" ON widget_config;
DROP POLICY IF EXISTS "Admins can manage widget config" ON widget_config;
CREATE POLICY "Allow all on widget_config" ON widget_config
    FOR ALL USING (true) WITH CHECK (true);

-- =====================================================
-- STORAGE BUCKETS
-- =====================================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('widget-assets', 'widget-assets', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Users can view widget assets" ON storage.objects
    FOR SELECT USING (bucket_id = 'widget-assets');
CREATE POLICY "Admins can manage widget assets" ON storage.objects
    FOR ALL USING (bucket_id = 'widget-assets');

-- =====================================================
-- CREATE DEFAULT WORKSPACE (if none exists)
-- =====================================================

INSERT INTO workspaces (name, slug)
SELECT 'My Dental Practice', 'default-practice'
WHERE NOT EXISTS (SELECT 1 FROM workspaces LIMIT 1);

INSERT INTO ai_configs (workspace_id) 
SELECT id FROM workspaces LIMIT 1
ON CONFLICT (workspace_id) DO NOTHING;

INSERT INTO widget_config (workspace_id) 
SELECT id FROM workspaces LIMIT 1
ON CONFLICT (workspace_id) DO NOTHING;`

  const [auditLogs, setAuditLogs] = useState<any[]>([])
  const [loadingLogs, setLoadingLogs] = useState(false)

  const [aiProvider, setAiProvider] = useState("openai")
  const [aiModel, setAiModel] = useState("gpt-4o")
  const [apiKey, setApiKey] = useState("")
  const [systemPrompt, setSystemPrompt] = useState("You are Dr. Dente, a friendly and professional dental receptionist for a dental clinic. You help patients book appointments, answer questions about dental services, and provide oral health tips.")
  const [agentName, setAgentName] = useState("Dr. Dente")
  const [businessStart, setBusinessStart] = useState("09:00")
  const [businessEnd, setBusinessEnd] = useState("18:00")
  const [offHoursReply, setOffHoursReply] = useState(true)
  const [supportedLanguages, setSupportedLanguages] = useState("English")

  const [availableModels, setAvailableModels] = useState<{id: string, name: string}[]>([])
  const [isFetchingModels, setIsFetchingModels] = useState(false)

  const [primaryColor, setPrimaryColor] = useState("#0ea5e9")
  const [widgetPosition, setWidgetPosition] = useState("bottom-right")
  const [greetingText, setGreetingText] = useState("Hi! How can we help you today?")
  const [embedToken, setEmbedToken] = useState("")
  const [widgetEnabled, setWidgetEnabled] = useState(true)

  const [whatsappEnabled, setWhatsappEnabled] = useState(false)
  const [phoneNumberId, setPhoneNumberId] = useState("")
  const [whatsappToken, setWhatsappToken] = useState("")
  const [whatsappBusinessId, setWhatsappBusinessId] = useState("")
  const [whatsappVerifyToken, setWhatsappVerifyToken] = useState("")
  const [showWhatsappGuide, setShowWhatsappGuide] = useState(false)

  const [saving, setSaving] = useState<string | null>(null)
  const [openDocSection, setOpenDocSection] = useState<string | null>("getting-started")

  const [followupEnabled, setFollowupEnabled] = useState(true)
  const [reminder24h, setReminder24h] = useState(true)
  const [reminder1h, setReminder1h] = useState(true)
  const [reminder30m, setReminder30m] = useState(false)
  const [postVisitFollowup, setPostVisitFollowup] = useState(true)
  const [customMsg24h, setCustomMsg24h] = useState("Hi! Just a reminder about your appointment tomorrow. See you then!")
  const [customMsg1h, setCustomMsg1h] = useState("Reminder: Your appointment is in 1 hour. Please arrive 10 minutes early.")
  const [customMsg30m, setCustomMsg30m] = useState("Your appointment starts in 30 minutes. We look forward to seeing you!")
  const [customPostVisit, setCustomPostVisit] = useState("Hope your visit went well! Don't forget to brush twice daily and floss. See you at your next appointment.")

  const handleCheckConnection = async () => {
    setChecking(true)
    await checkSupabaseConnection()
    setChecking(false)
  }

  useEffect(() => {
    checkSupabaseConnection()
    
    // Load audit logs
    const loadLogs = async () => {
      setLoadingLogs(true)
      try {
        const logs = await getAuditLogs(20)
        setAuditLogs(logs)
      } catch (err) {
        console.error(err)
      }
      setLoadingLogs(false)
    }
    loadLogs()
  }, [checkSupabaseConnection])

  // Load existing config from database
  useEffect(() => {
    const loadConfigs = async () => {
      try {
        // Load AI config
        const aiConfig = await getAIConfig()
        if (aiConfig) {
          setAiProvider(aiConfig.provider || 'openai')
          setAiModel(aiConfig.model || 'gpt-4o')
          setApiKey(aiConfig.api_key_encrypted || '')
          setSystemPrompt(aiConfig.system_prompt || "You are Dr. Dente, a friendly and professional dental receptionist for a dental clinic. You help patients book appointments, answer questions about dental services, and provide oral health tips.")
          setAgentName(aiConfig.persona_name || 'Dr. Dente')
          setBusinessStart(aiConfig.business_hours_start || '09:00')
          setBusinessEnd(aiConfig.business_hours_end || '18:00')
          setOffHoursReply(!!aiConfig.off_hours_message)
          setSupportedLanguages(aiConfig.supported_languages?.join(', ') || 'English')
        }

        // Load Widget config
        const widgetConfig = await getWidgetConfig()
        if (widgetConfig) {
          setPrimaryColor(widgetConfig.primary_color || '#0ea5e9')
          setWidgetPosition(widgetConfig.position || 'bottom-right')
          setGreetingText(widgetConfig.greeting_text || 'Hi! How can we help you today?')
          setEmbedToken(widgetConfig.embed_token || '')
          setWidgetEnabled(widgetConfig.enabled ?? true)
        }

        // Load WhatsApp config
        const waConfig = await getWhatsAppConfig()
        if (waConfig) {
          setWhatsappEnabled(waConfig.enabled ?? false)
          setPhoneNumberId(waConfig.phone_number_id || '')
          setWhatsappBusinessId(waConfig.whatsapp_business_id || '')
          setWhatsappToken(waConfig.access_token_encrypted || '')
          setWhatsappVerifyToken(waConfig.webhook_verify_token || '')
        }

        // Load Follow-up config
        const followupConfig = await getFollowupConfig()
        if (followupConfig) {
          setFollowupEnabled(followupConfig.enabled ?? true)
          setReminder24h(followupConfig.reminder_24h ?? true)
          setReminder1h(followupConfig.reminder_1h ?? true)
          setReminder30m(followupConfig.reminder_30m ?? false)
          setPostVisitFollowup(followupConfig.post_visit_followup ?? true)
          setCustomMsg24h(followupConfig.custom_message_24h || "Hi! Just a reminder about your appointment tomorrow. See you then!")
          setCustomMsg1h(followupConfig.custom_message_1h || "Reminder: Your appointment is in 1 hour. Please arrive 10 minutes early.")
          setCustomMsg30m(followupConfig.custom_message_30m || "Your appointment starts in 30 minutes. We look forward to seeing you!")
          setCustomPostVisit(followupConfig.custom_post_visit || "Hope your visit went well! Don't forget to brush twice daily and floss. See you at your next appointment.")
        }
      } catch (err) {
        console.error('Failed to load configs:', err)
      }
    }
    loadConfigs()
  }, [])

  useEffect(() => {
    if (!apiKey) {
      if (aiProvider !== "openai") {
        setAvailableModels([
          { id: "gemini-pro", name: "Gemini 1.5 Pro" },
          { id: "gemini-flash", name: "Gemini 1.5 Flash" }
        ])
      } else {
        setAvailableModels([]) 
      }
      setApiKeyError(null)
      return
    }

    const fetchModels = async () => {
      setIsFetchingModels(true)
      setApiKeyError(null)
      try {
        let res: Response;
        let models: { id: string; name: string }[] = [];

        if (aiProvider === "openai") {
          res = await fetch("https://api.openai.com/v1/models", {
            headers: {
              "Authorization": `Bearer ${apiKey}`
            }
          })
          
          if (res.ok) {
            const data = await res.json()
            const chatModels = data.data
              .filter((m: any) => m.id.startsWith("gpt-") || m.id.startsWith("o1") || m.id.startsWith("o3"))
              .map((m: any) => ({ id: m.id, name: m.id }))
              .sort((a: any, b: any) => a.id.localeCompare(b.id))
            
            models = chatModels
          } else if (res.status === 401) {
            setApiKeyError("Invalid API key - please check and try again")
            setAvailableModels([])
          } else {
            setApiKeyError("Failed to fetch models - please try again")
            setAvailableModels([])
          }
        } else if (aiProvider === "google") {
          res = await fetch("https://generativelanguage.googleapis.com/v1/models?key=" + apiKey)
          
          if (res.ok) {
            const data = await res.json()
            models = (data.models || [])
              .filter((m: any) => m.name?.includes("gemini"))
              .map((m: any) => ({ 
                id: m.name.split('/').pop() || m.name, 
                name: m.displayName || m.name 
              }))
          } else if (res.status === 401 || res.status === 403) {
            setApiKeyError("Invalid API key - please check and try again")
            setAvailableModels([])
          } else {
            setApiKeyError("Failed to fetch models - please try again")
            setAvailableModels([])
          }
        } else if (aiProvider === "openrouter") {
          res = await fetch("https://openrouter.ai/api/v1/models", {
            headers: {
              "Authorization": `Bearer ${apiKey}`
            }
          })
          
          if (res.ok) {
            const data = await res.json()
            models = (data.data || [])
              .map((m: any) => ({ 
                id: m.id, 
                name: m.name || m.id 
              }))
          } else {
            setApiKeyError("Invalid API key - please check and try again")
            setAvailableModels([])
          }
        } else {
          setAvailableModels([])
        }
        
        setAvailableModels(models)
      } catch (err) {
        console.error(err)
        setApiKeyError("Failed to validate API key - please check your connection")
        setAvailableModels([])
      }
      setIsFetchingModels(false)
    }

    const timeout = setTimeout(fetchModels, 800)
    return () => clearTimeout(timeout)
  }, [apiKey, aiProvider])

  const handleRunMigration = async () => {
    setMigrating(true)
    setMigrationResult(null)

    try {
      const response = await fetch('/api/setup', { method: 'POST' })
      const result = await response.json()

      if (result.success) {
        setMigrationResult({ success: true, message: result.message || 'Database setup completed!' })
      } else {
        setMigrationResult({ 
          success: false, 
          message: result.message || result.error || 'Database not set up',
          sql: result.sql 
        })
      }
    } catch (err: any) {
      setMigrationResult({ success: false, message: "API call failed. " + (err.message || 'Please run SQL manually') })
    }

    setMigrating(false)
  }

  const handleSaveAIConfig = async () => {
    setSaving('ai')
    setApiKeyError(null)
    
    // Validate API key before saving
    if (apiKey && aiProvider === 'openai') {
      setApiKeyValidating(true)
      try {
        const res = await fetch("https://api.openai.com/v1/models", {
          headers: { "Authorization": `Bearer ${apiKey}` }
        })
        if (!res.ok) {
          setApiKeyError("Invalid API key - please check and try again")
          setSaving(null)
          setApiKeyValidating(false)
          return
        }
      } catch (err) {
        setApiKeyError("Failed to validate API key")
        setSaving(null)
        setApiKeyValidating(false)
        return
      }
      setApiKeyValidating(false)
    }
    
    try {
      // 1. Get/create workspace id first
      const { data: wsData, error: wsError } = await supabase
        .from('workspaces')
        .select('id')
        .limit(1)
        .single();
      
      let workspaceId = wsData?.id;
      if (!workspaceId) {
        // Fallback or error logging
        console.warn("No workspace found, skipping save.");
        setSaving(null);
        return;
      }

      const { error } = await supabase.from('ai_configs').upsert({
        workspace_id: workspaceId,
        provider: aiProvider,
        model: aiModel,
        api_key_encrypted: apiKey,
        system_prompt: systemPrompt,
        persona_name: agentName,
        business_hours_start: businessStart,
        business_hours_end: businessEnd,
        off_hours_message: offHoursReply ? "We are currently closed. Our office is open Monday-Friday 9AM-6PM." : "",
        supported_languages: supportedLanguages.split(',').map(s => s.trim()).filter(Boolean)
      }, { onConflict: 'workspace_id' })

      if (error) throw error
    } catch (err: any) {
      console.error('Failed to save AI config:', err)
    }
    setTimeout(() => setSaving(null), 1000); // simulate delay for feedback
  }

  const handleSaveWidgetConfig = async () => {
    setSaving('widget')
    try {
      const { data: wsData } = await supabase.from('workspaces').select('id').limit(1).single();
      let workspaceId = wsData?.id;
      if (!workspaceId) {
        console.warn("No workspace found.");
        setSaving(null);
        return;
      }

      const { error } = await supabase.from('widget_config').upsert({
        workspace_id: workspaceId,
        primary_color: primaryColor,
        greeting_text: greetingText,
        position: widgetPosition,
        enabled: widgetEnabled
      }, { onConflict: 'workspace_id' })

      if (error) throw error
    } catch (err: any) {
      console.error('Failed to save widget config:', err)
    }
    setTimeout(() => setSaving(null), 1000); // simulate delay for feedback
  }

  const handleSaveWhatsAppConfig = async () => {
    setSaving('whatsapp')
    try {
      const { data: wsData } = await supabase.from('workspaces').select('id').limit(1).single();
      let workspaceId = wsData?.id;
      if (!workspaceId) {
        console.warn("No workspace found.");
        setSaving(null);
        return;
      }

      const { error } = await supabase.from('whatsapp_config').upsert({
        workspace_id: workspaceId,
        phone_number_id: phoneNumberId,
        whatsapp_business_id: whatsappBusinessId,
        access_token_encrypted: whatsappToken,
        webhook_verify_token: whatsappVerifyToken,
        enabled: whatsappEnabled
      }, { onConflict: 'workspace_id' })

      if (error) throw error
    } catch (err: any) {
      console.error('Failed to save WhatsApp config:', err)
    }
    setTimeout(() => setSaving(null), 1000);
  }

  const copyEmbedCode = () => {
    navigator.clipboard.writeText(`<script src="https://widget.drdent.ai/embed.js?token=${embedToken || 'your-token'}"></script>`)
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Settings</h2>
        <p className="text-muted-foreground">Configure your workspace</p>
      </div>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className="grid grid-cols-4 md:grid-cols-12 w-full h-auto flex-wrap">
          <TabsTrigger value="profile" className="gap-1.5 text-xs py-2">
            <User className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Profile</span>
          </TabsTrigger>
          <TabsTrigger value="notifications" className="gap-1.5 text-xs py-2">
            <Bell className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Alerts</span>
          </TabsTrigger>
          <TabsTrigger value="account" className="gap-1.5 text-xs py-2">
            <Globe className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Account</span>
          </TabsTrigger>
          <TabsTrigger value="backend" className="gap-1.5 text-xs py-2">
            <Database className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Backend</span>
          </TabsTrigger>
          <TabsTrigger value="ai" className="gap-1.5 text-xs py-2">
            <Bot className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">AI</span>
          </TabsTrigger>
          <TabsTrigger value="followups" className="gap-1.5 text-xs py-2">
            <Clock className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Follow-ups</span>
          </TabsTrigger>
          <TabsTrigger value="calendar" className="gap-1.5 text-xs py-2">
            <Calendar className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Calendar</span>
          </TabsTrigger>
          <TabsTrigger value="whatsapp" className="gap-1.5 text-xs py-2">
            <MessageCircle className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">WhatsApp</span>
          </TabsTrigger>
          <TabsTrigger value="widget" className="gap-1.5 text-xs py-2">
            <Smartphone className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Widget</span>
          </TabsTrigger>
          <TabsTrigger value="security" className="gap-1.5 text-xs py-2">
            <Shield className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Security</span>
          </TabsTrigger>
          <TabsTrigger value="audit" className="gap-1.5 text-xs py-2">
            <History className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Audit Logs</span>
          </TabsTrigger>
          <TabsTrigger value="docs" className="gap-1.5 text-xs py-2">
            <FileText className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Docs</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="backend" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Database Setup
              </CardTitle>
              <CardDescription>
                Set up your Supabase database tables - required for the app to work
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                <div className="flex items-center gap-3">
                  {supabaseConnected ? (
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                  ) : (
                    <AlertTriangle className="h-5 w-5 text-amber-600" />
                  )}
                  <div>
                    <p className="font-medium">
                      {supabaseConnected ? "Connected" : "Database Not Set Up"}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {supabaseConnected ? "All tables are ready" : supabaseError || "Run migration to create tables"}
                    </p>
                  </div>
                </div>
                <Button
                  onClick={handleCheckConnection}
                  variant="outline"
                  size="sm"
                  disabled={checking}
                >
                  {checking ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                </Button>
              </div>

              {!supabaseConnected && (
                <>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h4 className="font-medium text-blue-800 flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4" />
                      Quick Setup Guide
                    </h4>
                    <ol className="mt-3 text-sm text-blue-700 space-y-2">
                      <li className="flex gap-2">
                        <span className="font-bold">1.</span>
                        <span>Go to your <a href="https://supabase.com/dashboard" target="_blank" rel="noopener" className="underline font-medium">Supabase Dashboard</a></span>
                      </li>
                      <li className="flex gap-2">
                        <span className="font-bold">2.</span>
                        <span>Click <strong>SQL Editor</strong> in the left sidebar</span>
                      </li>
                      <li className="flex gap-2">
                        <span className="font-bold">3.</span>
                        <span>Copy the SQL below and click <strong>Run</strong></span>
                      </li>
                      <li className="flex gap-2">
                        <span className="font-bold">4.</span>
                        <span>Return here and click "Check Connection"</span>
                      </li>
                    </ol>
                  </div>

                  <div className="border rounded-lg overflow-hidden">
                    <div className="bg-slate-100 px-4 py-2 flex items-center justify-between border-b">
                      <span className="text-sm font-medium">Database Migration SQL</span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigator.clipboard.writeText(databaseMigrationSQL)}
                      >
                        <Copy className="h-4 w-4 mr-1" />Copy
                      </Button>
                    </div>
                    <div className="bg-slate-900 text-slate-100 p-4 text-xs font-mono overflow-x-auto max-h-96">
                      <pre>{databaseMigrationSQL}</pre>
                    </div>
                  </div>
                </>
              )}

              {supabaseConnected && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <p className="text-green-800 flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4" />
                    Database is connected and ready!
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ai" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bot className="h-5 w-5" />
                AI Configuration
              </CardTitle>
              <CardDescription>Configure your AI provider, model, and personality</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>AI Provider</Label>
                  <Select value={aiProvider} onValueChange={setAiProvider}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="openai">OpenAI</SelectItem>
                      <SelectItem value="google">Google Gemini</SelectItem>
                      <SelectItem value="openrouter">OpenRouter</SelectItem>
                      <SelectItem value="custom">Custom</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Model {isFetchingModels && <Loader2 className="h-3 w-3 inline animate-spin ml-2" />}</Label>
                  <Select value={aiModel} onValueChange={setAiModel} disabled={availableModels.length === 0}>
                    <SelectTrigger>
                      <SelectValue placeholder={!apiKey && aiProvider === "openai" ? "Enter API Key first" : "Select a model..."} />
                    </SelectTrigger>
                    <SelectContent>
                      {availableModels.map((m) => (
                        <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {!apiKey && aiProvider === "openai" && (
                    <p className="text-xs text-amber-600 dark:text-amber-500">Please enter an API key to load models.</p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label>API Key</Label>
                <Input
                  type="password"
                  placeholder={apiKey ? "••••••••••••" : "sk-..."}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                />
                {apiKeyError && (
                  <p className="text-xs text-red-600 dark:text-red-500">{apiKeyError}</p>
                )}
                <p className="text-xs text-muted-foreground">Stored securely in your database</p>
              </div>

              <div className="space-y-2">
                <Label>System Prompt</Label>
                <Textarea
                  value={systemPrompt}
                  onChange={(e) => setSystemPrompt(e.target.value)}
                  className="min-h-[150px]"
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Agent Name</Label>
                  <Input value={agentName} onChange={(e) => setAgentName(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Supported Languages</Label>
                  <Input 
                    value={supportedLanguages} 
                    onChange={(e) => setSupportedLanguages(e.target.value)} 
                    placeholder="e.g. English, Spanish, French" 
                  />
                  <p className="text-xs text-muted-foreground">Comma-separated list of languages</p>
                </div>
                <div className="space-y-2">
                  <Label>Business Hours</Label>
                  <div className="flex gap-2">
                    <Input type="time" value={businessStart} onChange={(e) => setBusinessStart(e.target.value)} />
                    <span className="text-muted-foreground self-center">to</span>
                    <Input type="time" value={businessEnd} onChange={(e) => setBusinessEnd(e.target.value)} />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <p className="font-medium text-sm">Off-Hours Auto-Reply</p>
                  <p className="text-xs text-muted-foreground">Reply when clinic is closed</p>
                </div>
                <Switch checked={offHoursReply} onCheckedChange={setOffHoursReply} />
              </div>

              <Button
                className="bg-blue-600 hover:bg-blue-700"
                onClick={handleSaveAIConfig}
                disabled={saving === 'ai' || apiKeyValidating}
              >
                {saving === 'ai' ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving...</>
                ) : apiKeyValidating ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Validating...</>
                ) : "Save Configuration"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="followups" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Appointment Follow-ups
              </CardTitle>
              <CardDescription>
                Configure automatic reminders and follow-up messages for patients
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <p className="font-medium text-sm">Enable Follow-ups</p>
                  <p className="text-xs text-muted-foreground">Automatically send reminders and follow-ups</p>
                </div>
                <Switch checked={followupEnabled} onCheckedChange={setFollowupEnabled} />
              </div>

              {followupEnabled && (
                <>
                  <div className="space-y-4">
                    <h4 className="font-medium text-sm">Pre-Appointment Reminders</h4>
                    
                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="font-medium text-sm">24 hours before</p>
                          <p className="text-xs text-muted-foreground">Send a reminder the day before</p>
                        </div>
                      </div>
                      <Switch checked={reminder24h} onCheckedChange={setReminder24h} />
                    </div>

                    {reminder24h && (
                      <div className="space-y-2 pl-4 border-l-2 border-muted">
                        <Label>Custom Message</Label>
                        <Textarea
                          value={customMsg24h}
                          onChange={(e) => setCustomMsg24h(e.target.value)}
                          className="min-h-[80px]"
                        />
                      </div>
                    )}

                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="font-medium text-sm">1 hour before</p>
                          <p className="text-xs text-muted-foreground">Send a reminder 1 hour before</p>
                        </div>
                      </div>
                      <Switch checked={reminder1h} onCheckedChange={setReminder1h} />
                    </div>

                    {reminder1h && (
                      <div className="space-y-2 pl-4 border-l-2 border-muted">
                        <Label>Custom Message</Label>
                        <Textarea
                          value={customMsg1h}
                          onChange={(e) => setCustomMsg1h(e.target.value)}
                          className="min-h-[80px]"
                        />
                      </div>
                    )}

                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="font-medium text-sm">30 minutes before</p>
                          <p className="text-xs text-muted-foreground">Send a final reminder</p>
                        </div>
                      </div>
                      <Switch checked={reminder30m} onCheckedChange={setReminder30m} />
                    </div>

                    {reminder30m && (
                      <div className="space-y-2 pl-4 border-l-2 border-muted">
                        <Label>Custom Message</Label>
                        <Textarea
                          value={customMsg30m}
                          onChange={(e) => setCustomMsg30m(e.target.value)}
                          className="min-h-[80px]"
                        />
                      </div>
                    )}
                  </div>

                  <div className="space-y-4">
                    <h4 className="font-medium text-sm">Post-Appointment Follow-up</h4>
                    
                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <MessageSquare className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="font-medium text-sm">After visit follow-up</p>
                          <p className="text-xs text-muted-foreground">Send a check-in message after the appointment</p>
                        </div>
                      </div>
                      <Switch checked={postVisitFollowup} onCheckedChange={setPostVisitFollowup} />
                    </div>

                    {postVisitFollowup && (
                      <div className="space-y-2 pl-4 border-l-2 border-muted">
                        <Label>Custom Message</Label>
                        <Textarea
                          value={customPostVisit}
                          onChange={(e) => setCustomPostVisit(e.target.value)}
                          className="min-h-[80px]"
                        />
                      </div>
                    )}
                  </div>

                  <div className="p-4 rounded-lg bg-blue-50 border border-blue-200">
                    <p className="text-xs text-blue-800">
                      <strong>Tip:</strong> You can disable follow-ups for individual conversations from the conversation menu (3 dots).
                    </p>
                  </div>

                  <Button
                    className="bg-blue-600 hover:bg-blue-700"
                    onClick={async () => {
                      setSaving('followup')
                      try {
                        await saveFollowupConfig({
                          enabled: followupEnabled,
                          reminder_24h: reminder24h,
                          reminder_1h: reminder1h,
                          reminder_30m: reminder30m,
                          post_visit_followup: postVisitFollowup,
                          custom_message_24h: customMsg24h,
                          custom_message_1h: customMsg1h,
                          custom_message_30m: customMsg30m,
                          custom_post_visit: customPostVisit,
                        })
                      } catch (err: any) {
                        console.error('Failed to save follow-up config:', err)
                      }
                      setSaving(null)
                    }}
                    disabled={saving === 'followup'}
                  >
                    {saving === 'followup' ? (
                      <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving...</>
                    ) : "Save Follow-up Settings"}
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="calendar" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Google Calendar
              </CardTitle>
              <CardDescription>Connect for two-way appointment sync</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="h-5 w-5 text-amber-600" />
                  <div>
                    <p className="font-medium text-sm">Not Connected</p>
                    <p className="text-xs text-muted-foreground">Connect your Google account</p>
                  </div>
                </div>
                <Button size="sm">Connect</Button>
              </div>
              <div className="p-3 rounded-lg bg-blue-50 border border-blue-200">
                <p className="text-xs text-blue-800">
                  The AI will check your calendar before booking to prevent conflicts.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="whatsapp" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageCircle className="h-5 w-5" />
                WhatsApp
              </CardTitle>
              <CardDescription>Connect your business WhatsApp</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <p className="font-medium text-sm">Enable WhatsApp</p>
                  <p className="text-xs text-muted-foreground">Receive messages from patients</p>
                </div>
                <Switch checked={whatsappEnabled} onCheckedChange={setWhatsappEnabled} />
              </div>

              {whatsappEnabled && (
                <div className="space-y-4">
                  <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
                    <p className="font-medium text-sm text-blue-800 dark:text-blue-200 mb-2">Webhook URL</p>
                    <p className="text-xs text-muted-foreground mb-2">Add this URL in your Meta Developer Console → WhatsApp → Configuration → Webhook:</p>
                    <div className="flex gap-2">
                      <Input
                        readOnly
                        value={`${typeof window !== 'undefined' ? window.location.origin : ''}/api/webhook/whatsapp`}
                        className="text-xs font-mono"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigator.clipboard.writeText(`${typeof window !== 'undefined' ? window.location.origin : ''}/api/webhook/whatsapp`)}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="p-4 bg-amber-50 dark:bg-amber-950 rounded-lg border border-amber-200 dark:border-amber-800">
                    <p className="font-medium text-sm text-amber-800 dark:text-amber-200 mb-2">Verify Token</p>
                    <p className="text-xs text-muted-foreground mb-2">Set this as your verify token in Meta Developer Console:</p>
                    <Input
                      type="password"
                      placeholder="Enter a secure token"
                      value={whatsappVerifyToken}
                      onChange={(e) => setWhatsappVerifyToken(e.target.value)}
                      className="font-mono"
                    />
                    <p className="text-xs text-muted-foreground mt-2">Then add this to Vercel environment variables as WHATSAPP_VERIFY_TOKEN</p>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Phone Number ID</Label>
                      <Input value={phoneNumberId} onChange={(e) => setPhoneNumberId(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>Business Account ID</Label>
                      <Input value={whatsappBusinessId} onChange={(e) => setWhatsappBusinessId(e.target.value)} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Access Token</Label>
                    <Input type="password" value={whatsappToken} onChange={(e) => setWhatsappToken(e.target.value)} />
                  </div>
                  <Button className="bg-blue-600 hover:bg-blue-700" onClick={handleSaveWhatsAppConfig}>
                    {saving === 'whatsapp' ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving...</> : "Save WhatsApp Configuration"}
                  </Button>
                </div>
              )}

              <Button
                variant="outline"
                onClick={() => setShowWhatsappGuide(!showWhatsappGuide)}
                className="w-full justify-between"
              >
                <span>Setup Guide</span>
                <ArrowRight className={`h-4 w-4 transition-transform ${showWhatsappGuide ? 'rotate-90' : ''}`} />
              </Button>

              {showWhatsappGuide && (
                <div className="mt-4 space-y-3">
                  {[
                    { step: "1", title: "Create Meta Developer Account", desc: "Go to developers.facebook.com" },
                    { step: "2", title: "Add WhatsApp Product", desc: "Add WhatsApp from products menu" },
                    { step: "3", title: "Get Credentials", desc: "Get Phone Number ID, Business ID, and Token" },
                    { step: "4", title: "Configure Webhook", desc: "Set up in Supabase Edge Functions" },
                    { step: "5", title: "Start Receiving Messages", desc: "Patients can now message your WhatsApp" },
                  ].map((item) => (
                    <div key={item.step} className="flex gap-3 p-3 rounded-lg bg-muted/50">
                      <div className="w-7 h-7 bg-blue-600 text-white rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold">{item.step}</div>
                      <div>
                        <p className="font-medium text-sm">{item.title}</p>
                        <p className="text-xs text-muted-foreground">{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="widget" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Smartphone className="h-5 w-5" />
                Chat Widget
              </CardTitle>
              <CardDescription>Customize and embed on your website</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Primary Color</Label>
                  <div className="flex gap-2">
                    <Input type="color" value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} className="w-12 h-10 p-1" />
                    <Input value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Position</Label>
                  <Select value={widgetPosition} onValueChange={setWidgetPosition}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="bottom-right">Bottom Right</SelectItem>
                      <SelectItem value="bottom-left">Bottom Left</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Greeting Message</Label>
                <Input value={greetingText} onChange={(e) => setGreetingText(e.target.value)} />
              </div>

              <div className="space-y-2">
                <Label>Embed Code</Label>
                <div className="p-3 bg-muted rounded-lg font-mono text-xs overflow-x-auto">
                  {`<script src="https://widget.drdent.ai/embed.js?token=${embedToken || 'your-token'}"></script>`}
                </div>
                <Button variant="outline" size="sm" onClick={copyEmbedCode}>
                  <Copy className="h-3 w-3 mr-2" />
                  Copy
                </Button>
              </div>

              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <p className="font-medium text-sm">Enable Widget</p>
                  <p className="text-xs text-muted-foreground">Show on your website</p>
                </div>
                <Switch checked={widgetEnabled} onCheckedChange={setWidgetEnabled} />
              </div>

              <Button
                className="bg-blue-600 hover:bg-blue-700"
                onClick={handleSaveWidgetConfig}
                disabled={saving === 'widget'}
              >
                {saving === 'widget' ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving...</>
                ) : "Save"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Security
              </CardTitle>
              <CardDescription>Manage your account security</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <p className="font-medium text-sm">Two-Factor Authentication</p>
                  <p className="text-xs text-muted-foreground">Extra layer of security</p>
                </div>
                <Switch />
              </div>

              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <p className="font-medium text-sm">Session Timeout</p>
                  <p className="text-xs text-muted-foreground">Auto-logout after inactivity</p>
                </div>
                <Select defaultValue="30">
                  <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="15">15 min</SelectItem>
                    <SelectItem value="30">30 min</SelectItem>
                    <SelectItem value="60">1 hour</SelectItem>
                    <SelectItem value="never">Never</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="p-4 rounded-lg bg-green-50 border border-green-200">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-sm text-green-800">Your data is secure</p>
                    <p className="text-xs text-green-700">Stored in your Supabase project with encryption.</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="audit" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5" />
                Audit Logs
              </CardTitle>
              <CardDescription>Review recent administrative actions and security events</CardDescription>
            </CardHeader>
            <CardContent>
              {loadingLogs ? (
                <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
              ) : auditLogs.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">No audit logs found.</div>
              ) : (
                <div className="space-y-4">
                  {auditLogs.map((log: any) => (
                    <div key={log.id} className="flex justify-between items-start border-b pb-4 last:border-0 last:pb-0">
                      <div>
                        <p className="font-medium text-sm capitalize">{log.action.replace(/_/g, ' ')}</p>
                        <p className="text-xs text-muted-foreground mt-1">By: {log.user_email}</p>
                        {Object.keys(log.details || {}).length > 0 && (
                          <pre className="mt-2 text-[10px] bg-muted/50 p-2 rounded max-w-sm overflow-x-auto text-muted-foreground">
                            {JSON.stringify(log.details, null, 2)}
                          </pre>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                        {new Date(log.created_at).toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="docs" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Documentation
              </CardTitle>
              <CardDescription>Guides to set up and use Dr. Dent</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {docSections.map((section) => {
                  const Icon = section.icon
                  const isOpen = openDocSection === section.id
                  return (
                    <div key={section.id} className="border rounded-lg overflow-hidden">
                      <button
                        onClick={() => setOpenDocSection(isOpen ? null : section.id)}
                        className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors text-left"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-blue-50 dark:bg-blue-950 rounded-lg flex items-center justify-center">
                            <Icon className="h-4 w-4 text-blue-600" />
                          </div>
                          <span className="font-medium text-sm">{section.title}</span>
                        </div>
                        <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                      </button>
                      {isOpen && (
                        <div className="px-4 pb-4 border-t">
                          <div className="pt-4">
                            {section.content}
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── Profile Tab ─────────────────────────────────────────────── */}
        <TabsContent value="profile" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Profile Settings
              </CardTitle>
              <CardDescription>Update your personal and practice information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {profileMsg && (
                <div role="alert" className={`p-3 rounded-lg text-sm border ${
                  profileMsg.type === 'success'
                    ? 'bg-green-50 border-green-200 text-green-700'
                    : 'bg-red-50 border-red-200 text-red-700'
                }`}>
                  {profileMsg.text}
                </div>
              )}

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="displayName">Display Name</Label>
                  <Input
                    id="displayName"
                    placeholder="Dr. Jane Smith"
                    value={profileDisplayName}
                    onChange={e => setProfileDisplayName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="practiceName">Practice Name</Label>
                  <Input
                    id="practiceName"
                    placeholder="Smile Dental Clinic"
                    value={profilePracticeName}
                    onChange={e => setProfilePracticeName(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="profileEmail">Email Address</Label>
                <Input
                  id="profileEmail"
                  type="email"
                  placeholder="you@example.com"
                  value={profileEmail}
                  onChange={e => setProfileEmail(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">Changing your email requires re-confirmation.</p>
              </div>

              <div className="border-t pt-6 space-y-4">
                <h4 className="font-medium text-sm">Change Password</h4>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="newPassword">New Password</Label>
                    <Input
                      id="newPassword"
                      type="password"
                      placeholder="••••••••"
                      value={profileNewPassword}
                      onChange={e => setProfileNewPassword(e.target.value)}
                      autoComplete="new-password"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirmNewPassword">Confirm New Password</Label>
                    <Input
                      id="confirmNewPassword"
                      type="password"
                      placeholder="••••••••"
                      value={profileConfirmPassword}
                      onChange={e => setProfileConfirmPassword(e.target.value)}
                      autoComplete="new-password"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <Button
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                  onClick={async () => {
                    setProfileSaving(true)
                    setProfileMsg(null)
                    try {
                      const updates: { data?: Record<string,string>; email?: string; password?: string } = {}
                      if (profileDisplayName || profilePracticeName) {
                        updates.data = {
                          display_name: profileDisplayName,
                          practice_name: profilePracticeName,
                        }
                      }
                      if (profileEmail) updates.email = profileEmail
                      if (profileNewPassword) {
                        if (profileNewPassword !== profileConfirmPassword) {
                          setProfileMsg({ type: 'error', text: 'Passwords do not match.' })
                          setProfileSaving(false)
                          return
                        }
                        if (profileNewPassword.length < 8) {
                          setProfileMsg({ type: 'error', text: 'Password must be at least 8 characters.' })
                          setProfileSaving(false)
                          return
                        }
                        updates.password = profileNewPassword
                      }
                      const { error } = await supabase.auth.updateUser(updates)
                      if (error) throw error
                      setProfileMsg({ type: 'success', text: 'Profile updated successfully.' })
                      setProfileNewPassword('')
                      setProfileConfirmPassword('')
                    } catch (err: any) {
                      setProfileMsg({ type: 'error', text: err.message || 'Failed to update profile.' })
                    }
                    setProfileSaving(false)
                  }}
                  disabled={profileSaving}
                >
                  {profileSaving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving…</> : 'Save Changes'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── Notification Preferences Tab ────────────────────────────── */}
        <TabsContent value="notifications" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Notification Preferences
              </CardTitle>
              <CardDescription>Choose which alerts you want to receive</CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
              <div className="space-y-4">
                <h4 className="font-medium text-sm flex items-center gap-2">
                  <Mail className="h-4 w-4" aria-hidden="true" /> Email Notifications
                </h4>
                {([
                  { id: 'appt', label: 'Appointment reminders', desc: 'Get emailed when appointments are booked or cancelled', value: notifEmailAppointment, setter: setNotifEmailAppointment },
                  { id: 'msg', label: 'New patient messages', desc: 'Receive an email when a patient sends an urgent message', value: notifEmailMessage, setter: setNotifEmailMessage },
                  { id: 'summary', label: 'Weekly summary', desc: 'A digest of conversations, appointments, and analytics every Monday', value: notifEmailWeeklySummary, setter: setNotifEmailWeeklySummary },
                ] as const).map(item => (
                  <div key={item.id} className="flex items-start justify-between gap-4 p-4 rounded-lg border">
                    <div>
                      <p className="text-sm font-medium">{item.label}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{item.desc}</p>
                    </div>
                    <Switch
                      id={`notif-${item.id}`}
                      checked={item.value}
                      onCheckedChange={item.setter}
                      aria-label={item.label}
                    />
                  </div>
                ))}
              </div>

              <div className="space-y-4">
                <h4 className="font-medium text-sm flex items-center gap-2">
                  <Bell className="h-4 w-4" aria-hidden="true" /> In-App Notifications
                </h4>
                <div className="flex items-start justify-between gap-4 p-4 rounded-lg border">
                  <div>
                    <p className="text-sm font-medium">Urgent messages</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Show a badge and notification for high-priority patient messages</p>
                  </div>
                  <Switch
                    id="notif-push-urgent"
                    checked={notifPushUrgent}
                    onCheckedChange={setNotifPushUrgent}
                    aria-label="Urgent message in-app notifications"
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <Button
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                  onClick={async () => {
                    setNotifSaving(true)
                    // Persist to localStorage as a lightweight preference store
                    localStorage.setItem('dr-dent-notif-prefs', JSON.stringify({
                      emailAppointment: notifEmailAppointment,
                      emailMessage: notifEmailMessage,
                      emailWeeklySummary: notifEmailWeeklySummary,
                      pushUrgent: notifPushUrgent,
                    }))
                    await new Promise(r => setTimeout(r, 500))
                    setNotifSaving(false)
                  }}
                  disabled={notifSaving}
                >
                  {notifSaving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving…</> : 'Save Preferences'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── Account Tab ─────────────────────────────────────────────── */}
        <TabsContent value="account" className="space-y-6">
          {/* Locale */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                Language &amp; Locale
              </CardTitle>
              <CardDescription>Set your preferred language and date/time format</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-w-xs">
                <Label htmlFor="localeSelect">Language</Label>
                <Select value={locale} onValueChange={v => { setLocale(v); localStorage.setItem('dr-dent-locale', v) }}>
                  <SelectTrigger id="localeSelect">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en">English (US)</SelectItem>
                    <SelectItem value="en-GB">English (UK)</SelectItem>
                    <SelectItem value="es">Español</SelectItem>
                    <SelectItem value="fr">Français</SelectItem>
                    <SelectItem value="de">Deutsch</SelectItem>
                    <SelectItem value="ar">العربية</SelectItem>
                    <SelectItem value="bn">বাংলা</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">Full i18n support is coming soon. This saves your preference for future releases.</p>
              </div>
            </CardContent>
          </Card>

          {/* Export data */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Download className="h-5 w-5" />
                Export Your Data
              </CardTitle>
              <CardDescription>
                Download a full export of your patients, appointments, and conversations as CSV/JSON.
                Your data belongs to you.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                variant="outline"
                onClick={async () => {
                  setExportLoading(true)
                  try {
                    const res = await fetch('/api/export', { method: 'GET' })
                    if (res.ok) {
                      const blob = await res.blob()
                      const url = URL.createObjectURL(blob)
                      const a = document.createElement('a')
                      a.href = url
                      a.download = `dr-dent-export-${new Date().toISOString().split('T')[0]}.json`
                      a.click()
                      URL.revokeObjectURL(url)
                    } else {
                      alert('Export failed. Please try again.')
                    }
                  } catch {
                    alert('Export failed. Please try again.')
                  }
                  setExportLoading(false)
                }}
                disabled={exportLoading}
              >
                {exportLoading
                  ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Preparing export…</>
                  : <><Download className="h-4 w-4 mr-2" />Download My Data</>}
              </Button>
            </CardContent>
          </Card>

          {/* Delete account (GDPR) */}
          <Card className="border-red-200 dark:border-red-900">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-600">
                <Trash2 className="h-5 w-5" />
                Delete Account
              </CardTitle>
              <CardDescription>
                Permanently delete your account and all associated data. This action is irreversible and cannot be undone.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                variant="outline"
                className="border-red-300 text-red-600 hover:bg-red-50 hover:border-red-400"
                onClick={() => setDeleteModalOpen(true)}
              >
                <Trash2 className="h-4 w-4 mr-2" aria-hidden="true" />
                Delete My Account
              </Button>
            </CardContent>
          </Card>

          {/* Delete confirmation modal */}
          {deleteModalOpen && (
            <div
              className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
              role="dialog"
              aria-modal="true"
              aria-labelledby="delete-modal-title"
            >
              <div className="bg-background rounded-xl border p-6 w-full max-w-md space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center flex-shrink-0">
                    <Trash2 className="h-5 w-5 text-red-600" aria-hidden="true" />
                  </div>
                  <div>
                    <h3 id="delete-modal-title" className="font-semibold">Delete account permanently?</h3>
                    <p className="text-sm text-muted-foreground">This will erase all your data.</p>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">
                  Type <strong>DELETE</strong> below to confirm:
                </p>
                <Input
                  value={deleteConfirmText}
                  onChange={e => setDeleteConfirmText(e.target.value)}
                  placeholder="Type DELETE to confirm"
                  aria-label="Type DELETE to confirm account deletion"
                />
                <div className="flex gap-2 pt-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => { setDeleteModalOpen(false); setDeleteConfirmText('') }}
                  >
                    Cancel
                  </Button>
                  <Button
                    className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                    disabled={deleteConfirmText !== 'DELETE' || deletingAccount}
                    onClick={async () => {
                      setDeletingAccount(true)
                      try {
                        const res = await fetch('/api/auth/delete-account', { method: 'POST' })
                        if (res.ok) {
                          await supabase.auth.signOut()
                          window.location.href = '/signup'
                        } else {
                          alert('Failed to delete account. Please contact support.')
                        }
                      } catch {
                        alert('Failed to delete account. Please contact support.')
                      }
                      setDeletingAccount(false)
                    }}
                  >
                    {deletingAccount
                      ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Deleting…</>
                      : 'Confirm Delete'}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </TabsContent>

      </Tabs>
    </div>
  )
}
