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
  History
} from "lucide-react"
import { useAppStore } from "@/lib/store"
import { supabase, testSupabaseConnection } from "@/lib/supabase-client"
import { getFollowupConfig, saveFollowupConfig, getAuditLogs } from "@/lib/db"

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

  const [checking, setChecking] = useState(false)
  const [migrating, setMigrating] = useState(false)
  const [migrationResult, setMigrationResult] = useState<{success: boolean; message: string} | null>(null)

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

  useEffect(() => {
    if (!apiKey || aiProvider !== "openai") {
      if (aiProvider !== "openai") {
        setAvailableModels([
          { id: "gemini-pro", name: "Gemini 1.5 Pro" },
          { id: "gemini-flash", name: "Gemini 1.5 Flash" }
        ])
      } else {
        setAvailableModels([]) 
      }
      return
    }

    const fetchModels = async () => {
      setIsFetchingModels(true)
      try {
        const res = await fetch("https://api.openai.com/v1/models", {
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
          
          setAvailableModels(chatModels)
        } else {
          setAvailableModels([])
        }
      } catch (err) {
        console.error(err)
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
      const createTablesSQL = `
        CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

        -- Notice: user_roles references the auth.users table from Supabase
        CREATE TABLE IF NOT EXISTS user_roles (
            user_id UUID PRIMARY KEY,
            role TEXT NOT NULL DEFAULT 'user',
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
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

        CREATE TABLE IF NOT EXISTS ai_configs (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
            provider TEXT DEFAULT 'openai',
            base_url TEXT,
            api_key_encrypted TEXT,
            model TEXT DEFAULT 'gpt-4o',
            system_prompt TEXT DEFAULT 'You are Dr. Dente, a friendly dental receptionist.',
            persona_name TEXT DEFAULT 'Dr. Dente',
            business_hours_start TEXT DEFAULT '09:00',
            business_hours_end TEXT DEFAULT '18:00',
            business_hours_timezone TEXT DEFAULT 'UTC',
            off_hours_message TEXT DEFAULT 'We are currently closed.',
            supported_languages TEXT[] DEFAULT '{"English"}',
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
            gcal_event_id TEXT,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS widget_config (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
            primary_color TEXT DEFAULT '#0ea5e9',
            greeting_text TEXT DEFAULT 'Hi! How can we help you today?',
            avatar_url TEXT,
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
            custom_post_visit TEXT DEFAULT 'Hope your visit went well! Don''t forget to brush twice daily and floss.',
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );

        INSERT INTO workspaces (id, name, slug)
        VALUES (uuid_generate_v4(), 'Default Dental Practice', 'default-practice')
        ON CONFLICT (slug) DO NOTHING;

        DO $$
        DECLARE
            ws_id UUID;
        BEGIN
            SELECT id INTO ws_id FROM workspaces LIMIT 1;

            INSERT INTO ai_configs (workspace_id)
            VALUES (ws_id)
            ON CONFLICT (workspace_id) DO NOTHING;

            INSERT INTO widget_config (workspace_id)
            VALUES (ws_id)
            ON CONFLICT (workspace_id) DO NOTHING;

            INSERT INTO whatsapp_config (workspace_id)
            VALUES (ws_id)
            ON CONFLICT (workspace_id) DO NOTHING;

            INSERT INTO followup_configs (workspace_id)
            VALUES (ws_id)
            ON CONFLICT (workspace_id) DO NOTHING;
        END $$;

        -- Enable Supabase Realtime for real-time dashboard updates
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1
                FROM pg_publication_tables
                WHERE pubname = 'supabase_realtime' AND tablename = 'messages'
            ) THEN
                ALTER PUBLICATION supabase_realtime ADD TABLE messages;
            END IF;
            
            IF NOT EXISTS (
                SELECT 1
                FROM pg_publication_tables
                WHERE pubname = 'supabase_realtime' AND tablename = 'conversations'
            ) THEN
                ALTER PUBLICATION supabase_realtime ADD TABLE conversations;
            END IF;
        END $$;
      `

      const { error } = await supabase.rpc('exec_sql', { sql: createTablesSQL })

      if (error) {
        const { error: testError } = await supabase.from('workspaces').select('id').limit(1)

        if (testError && testError.message.includes('does not exist')) {
          setMigrationResult({ success: false, message: "Tables don't exist. Please run the migration SQL manually in Supabase SQL Editor." })
        } else if (testError) {
          setMigrationResult({ success: false, message: testError.message })
        } else {
          setMigrationResult({ success: true, message: "Database already set up!" })
        }
      } else {
        // Automatically make current user a developer
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          await supabase.from('user_roles').upsert({ user_id: user.id, role: 'developer' }, { onConflict: 'user_id' })
        }
        setMigrationResult({ success: true, message: "Migration completed successfully! You are now a Developer." })
      }
    } catch (err: any) {
      setMigrationResult({ success: false, message: err.message })
    }

    setMigrating(false)
  }

  const handleSaveAIConfig = async () => {
    setSaving('ai')
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

  const copyEmbedCode = () => {
    navigator.clipboard.writeText(`<script src="https://widget.drdent.ai/embed.js?token=${embedToken || 'your-token'}"></script>`)
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Settings</h2>
        <p className="text-muted-foreground">Configure your workspace</p>
      </div>

      <Tabs defaultValue="backend" className="space-y-6">
        <TabsList className="grid grid-cols-3 md:grid-cols-10 w-full h-auto flex-wrap">
          <TabsTrigger value="backend" className="gap-1.5 text-xs py-2">
            <Database className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Backend</span>
          </TabsTrigger>
          <TabsTrigger value="ai" className="gap-1.5 text-xs py-2">
            <Bot className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">AI</span>
          </TabsTrigger>
          <TabsTrigger value="followups" className="gap-1.5 text-xs py-2">
            <Bell className="h-3.5 w-3.5" />
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
                Database Connection
              </CardTitle>
              <CardDescription>
                Your Supabase database is connected automatically
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
                      {supabaseConnected ? "Connected" : "Connection Issue"}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {supabaseConnected ? "Database is ready" : supabaseError || "Checking..."}
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

              <Button
                className="bg-blue-600 hover:bg-blue-700"
                onClick={handleRunMigration}
                disabled={!supabaseConnected || migrating}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${migrating ? 'animate-spin' : ''}`} />
                {migrating ? "Running Migration..." : "Run Database Migration"}
              </Button>

              {migrationResult && (
                <div className={`p-4 rounded-lg ${migrationResult.success ? 'bg-green-50 border border-green-200' : 'bg-amber-50 border border-amber-200'}`}>
                  <p className={`text-sm ${migrationResult.success ? 'text-green-800' : 'text-amber-800'}`}>
                    {migrationResult.message}
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
                disabled={saving === 'ai'}
              >
                {saving === 'ai' ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving...</>
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
                  <Button className="bg-blue-600 hover:bg-blue-700">Save</Button>
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
      </Tabs>
    </div>
  )
}
