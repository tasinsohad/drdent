"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  MessageCircle,
  Calendar,
  Users,
  TrendingUp,
  Loader2,
  Download,
  Bot,
  UserCheck,
  Clock,
  AlertCircle
} from "lucide-react"
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Legend
} from "recharts"
import { getConversations, getPatients, getAppointments, getAnalytics } from "@/lib/db"

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444"]

const DATE_RANGES = [
  { label: "7 days", value: 7 },
  { label: "30 days", value: 30 },
  { label: "90 days", value: 90 },
]

export default function AnalyticsPage() {
  const [loading, setLoading] = useState(true)
  const [dateRange, setDateRange] = useState(7)
  const [exporting, setExporting] = useState<string | null>(null)

  const [stats, setStats] = useState({
    totalConversations: 0,
    appointmentsBooked: 0,
    newPatients: 0,
    aiHandoffs: 0,
    pendingAppointments: 0,
    confirmedAppointments: 0,
  })
  const [conversationData, setConversationData] = useState<{ name: string; conversations: number }[]>([])
  const [channelData, setChannelData] = useState<{ name: string; value: number }[]>([])
  const [appointmentStatusData, setAppointmentStatusData] = useState<{ name: string; value: number }[]>([])
  const [aiVsHumanData, setAiVsHumanData] = useState<{ name: string; ai: number; human: number }[]>([])
  const [hasData, setHasData] = useState(false)

  const loadAnalytics = useCallback(async () => {
    setLoading(true)
    try {
      const [conversations, patients, appointments, analytics] = await Promise.all([
        getConversations(),
        getPatients(),
        getAppointments(),
        getAnalytics(dateRange)
      ])

      const aiHandoffs = conversations.filter(c => c.ai_paused).length

      const aptByStatus: Record<string, number> = {}
      appointments.forEach(a => {
        aptByStatus[a.status] = (aptByStatus[a.status] || 0) + 1
      })

      setStats({
        totalConversations: conversations.length,
        appointmentsBooked: appointments.length,
        newPatients: patients.length,
        aiHandoffs,
        pendingAppointments: aptByStatus['pending'] || 0,
        confirmedAppointments: aptByStatus['confirmed'] || 0,
      })

      // Channel distribution
      const whatsappCount = conversations.filter(c => c.channel === 'whatsapp').length
      const widgetCount = conversations.filter(c => c.channel === 'widget').length
      if (conversations.length > 0) {
        setChannelData([
          { name: "WhatsApp", value: whatsappCount },
          { name: "Web Widget", value: widgetCount },
        ])
      }

      // Appointment status donut
      const statusEntries = Object.entries(aptByStatus).map(([name, value]) => ({ name, value }))
      setAppointmentStatusData(statusEntries)

      // Conversations over time
      if (analytics && analytics.length > 0) {
        const chartData = analytics.map(item => ({
          name: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          conversations: item.total_conversations || 0,
        }))
        setConversationData(chartData)
      }

      // AI vs Human breakdown (use weekly buckets from conversations)
      const weeklyBuckets: Record<string, { ai: number; human: number }> = {}
      conversations.forEach(c => {
        const week = new Date(c.last_message_at || Date.now())
        const key = week.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        if (!weeklyBuckets[key]) weeklyBuckets[key] = { ai: 0, human: 0 }
        if (c.ai_paused) weeklyBuckets[key].human++
        else weeklyBuckets[key].ai++
      })
      setAiVsHumanData(Object.entries(weeklyBuckets).slice(-7).map(([name, v]) => ({ name, ...v })))

      setHasData(conversations.length > 0 || patients.length > 0 || appointments.length > 0)
    } catch (err) {
      console.error('Failed to load analytics:', err)
    }
    setLoading(false)
  }, [dateRange])

  useEffect(() => {
    loadAnalytics()
  }, [loadAnalytics])

  const handleExport = async (type: 'patients' | 'appointments') => {
    setExporting(type)
    try {
      const res = await fetch(`/api/export/${type}`)
      if (!res.ok) throw new Error('Export failed')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${type}-${new Date().toISOString().split('T')[0]}.csv`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error(err)
    }
    setExporting(null)
  }

  const statCards = [
    { label: "Total Conversations", value: stats.totalConversations, icon: MessageCircle, color: "blue", change: "All time" },
    { label: "Appointments", value: stats.appointmentsBooked, icon: Calendar, color: "emerald", change: `${stats.confirmedAppointments} confirmed` },
    { label: "Patients", value: stats.newPatients, icon: Users, color: "violet", change: "Registered" },
    { label: "Human Handoffs", value: stats.aiHandoffs, icon: UserCheck, color: "amber", change: "AI paused" },
  ]

  const colorMap: Record<string, string> = {
    blue: "bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400",
    emerald: "bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400",
    violet: "bg-violet-50 dark:bg-violet-950 text-violet-600 dark:text-violet-400",
    amber: "bg-amber-50 dark:bg-amber-950 text-amber-600 dark:text-amber-400",
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Analytics</h2>
          <p className="text-muted-foreground text-sm mt-1">Track your practice performance over time</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
            {DATE_RANGES.map(r => (
              <button
                key={r.value}
                onClick={() => setDateRange(r.value)}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                  dateRange === r.value
                    ? "bg-white dark:bg-slate-800 shadow-sm text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleExport('patients')}
            disabled={exporting === 'patients'}
          >
            {exporting === 'patients' ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Download className="h-3.5 w-3.5 mr-1.5" />}
            Patients CSV
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleExport('appointments')}
            disabled={exporting === 'appointments'}
          >
            {exporting === 'appointments' ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Download className="h-3.5 w-3.5 mr-1.5" />}
            Appointments CSV
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="grid gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map(i => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="animate-pulse space-y-3">
                  <div className="w-12 h-12 bg-muted rounded-xl" />
                  <div className="w-16 h-8 bg-muted rounded" />
                  <div className="w-24 h-4 bg-muted rounded" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : !hasData ? (
        <Card className="p-12 text-center">
          <CardContent className="pt-6">
            <TrendingUp className="h-12 w-12 mx-auto text-muted-foreground mb-4 opacity-40" />
            <h3 className="text-lg font-semibold mb-2">No data yet</h3>
            <p className="text-muted-foreground max-w-md mx-auto text-sm">
              Analytics will appear here once you start receiving conversations, booking appointments, or adding patients.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Stat Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {statCards.map((stat, i) => (
              <Card key={i} className="relative overflow-hidden">
                <CardContent className="p-6">
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center mb-4 ${colorMap[stat.color]}`}>
                    <stat.icon className="h-5 w-5" />
                  </div>
                  <p className="text-3xl font-bold tracking-tight">{stat.value}</p>
                  <p className="text-sm font-medium text-foreground mt-1">{stat.label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{stat.change}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Charts Row 1 */}
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Conversations Over Time */}
            <Card className="lg:col-span-2">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Conversations Over Time</CardTitle>
                <CardDescription>Daily conversation volume</CardDescription>
              </CardHeader>
              <CardContent>
                {conversationData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={240}>
                    <BarChart data={conversationData} barSize={24}>
                      <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.3} />
                      <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip
                        contentStyle={{ borderRadius: '8px', fontSize: '12px' }}
                        cursor={{ fill: 'rgba(59,130,246,0.07)' }}
                      />
                      <Bar dataKey="conversations" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[240px] flex items-center justify-center">
                    <div className="text-center text-muted-foreground">
                      <MessageCircle className="h-8 w-8 mx-auto mb-2 opacity-40" />
                      <p className="text-sm">No time-series data yet</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Channel Distribution */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Channel Split</CardTitle>
                <CardDescription>WhatsApp vs Web Widget</CardDescription>
              </CardHeader>
              <CardContent>
                {channelData.length > 0 ? (
                  <>
                    <ResponsiveContainer width="100%" height={180}>
                      <PieChart>
                        <Pie data={channelData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={4} dataKey="value">
                          {channelData.map((_, index) => (
                            <Cell key={index} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={{ borderRadius: '8px', fontSize: '12px' }} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="flex justify-center gap-4 mt-2">
                      {channelData.map((item, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[i] }} />
                          <span className="text-xs text-muted-foreground">{item.name}: <strong>{item.value}</strong></span>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="h-[220px] flex items-center justify-center text-muted-foreground">
                    <p className="text-sm">No channel data</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Charts Row 2 */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* AI vs Human */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Bot className="h-4 w-4 text-blue-500" />
                  AI vs Human Handled
                </CardTitle>
                <CardDescription>Breakdown of who handled conversations</CardDescription>
              </CardHeader>
              <CardContent>
                {aiVsHumanData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={aiVsHumanData} barSize={16}>
                      <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.3} />
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip contentStyle={{ borderRadius: '8px', fontSize: '12px' }} />
                      <Legend wrapperStyle={{ fontSize: '12px' }} />
                      <Bar dataKey="ai" name="AI" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="human" name="Human" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[220px] flex items-center justify-center text-muted-foreground">
                    <p className="text-sm">No handoff data</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Appointment Status */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-emerald-500" />
                  Appointment Status
                </CardTitle>
                <CardDescription>Breakdown by current status</CardDescription>
              </CardHeader>
              <CardContent>
                {appointmentStatusData.length > 0 ? (
                  <>
                    <ResponsiveContainer width="100%" height={180}>
                      <PieChart>
                        <Pie data={appointmentStatusData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={4} dataKey="value">
                          {appointmentStatusData.map((_, index) => (
                            <Cell key={index} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={{ borderRadius: '8px', fontSize: '12px' }} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="flex flex-wrap justify-center gap-3 mt-2">
                      {appointmentStatusData.map((item, i) => (
                        <div key={i} className="flex items-center gap-1.5">
                          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[i] }} />
                          <span className="text-xs text-muted-foreground capitalize">{item.name}: <strong>{item.value}</strong></span>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="h-[220px] flex items-center justify-center text-muted-foreground">
                    <div className="text-center">
                      <Calendar className="h-8 w-8 mx-auto mb-2 opacity-40" />
                      <p className="text-sm">No appointments yet</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Quick Summary row */}
          <div className="grid gap-4 md:grid-cols-2">
            <Card className="bg-blue-50/50 dark:bg-blue-950/20 border-blue-100 dark:border-blue-900">
              <CardContent className="p-5 flex items-start gap-4">
                <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/50 rounded-xl flex items-center justify-center">
                  <Clock className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="font-semibold text-sm">Pending Appointments</p>
                  <p className="text-3xl font-bold text-blue-700 dark:text-blue-300">{stats.pendingAppointments}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Awaiting confirmation</p>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-amber-50/50 dark:bg-amber-950/20 border-amber-100 dark:border-amber-900">
              <CardContent className="p-5 flex items-start gap-4">
                <div className="w-10 h-10 bg-amber-100 dark:bg-amber-900/50 rounded-xl flex items-center justify-center">
                  <AlertCircle className="h-5 w-5 text-amber-600" />
                </div>
                <div>
                  <p className="font-semibold text-sm">Needs Human Attention</p>
                  <p className="text-3xl font-bold text-amber-700 dark:text-amber-300">{stats.aiHandoffs}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">AI paused conversations</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  )
}
