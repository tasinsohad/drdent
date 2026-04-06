"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Loader2,
  Calendar as CalendarIcon,
  Clock,
  User,
  AlertTriangle,
  CheckCircle,
  X
} from "lucide-react"
import { format, addDays, startOfWeek, isSameDay, addMonths, subMonths } from "date-fns"
import { getAppointments } from "@/lib/db"
import { supabase } from "@/lib/supabase-client"

interface Conflict {
  id: string
  datetime: string
  duration: number
  treatment: string
  status: string
  patientName: string
  location: string
}

interface Appointment {
  id: string
  patient_id: string
  datetime: string
  duration: number
  treatment: string
  status: string
  notes: string
  patients?: { name: string; phone: string }
}

interface Patient {
  id: string
  name: string
  phone: string
}

export default function AppointmentsPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [patients, setPatients] = useState<Patient[]>([])
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [checkConflicts, setCheckConflicts] = useState(false)
  const [conflicts, setConflicts] = useState<Conflict[]>([])
  const [hasConflict, setHasConflict] = useState(false)
  const [newAppointment, setNewAppointment] = useState({
    patientId: '',
    datetime: '',
    duration: 30,
    treatment: '',
    notes: ''
  })
  const [addError, setAddError] = useState("")
  const [saving, setSaving] = useState(false)
  const [workspaceId, setWorkspaceId] = useState<string | null>(null)

  const loadWorkspaceId = useCallback(async () => {
    const { data } = await supabase
      .from('workspaces')
      .select('id')
      .limit(1)
      .single()
    setWorkspaceId(data?.id || null)
  }, [])

  const loadPatients = useCallback(async () => {
    const data = await getPatients()
    setPatients(data)
  }, [])

  const loadAppointments = useCallback(async () => {
    setLoading(true)
    try {
      const data = await getAppointments()
      setAppointments(data)
    } catch (err) {
      console.error('Failed to load appointments:', err)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    loadWorkspaceId()
    loadPatients()
    loadAppointments()
  }, [loadWorkspaceId, loadPatients, loadAppointments])

  const getPatients = async () => {
    const { data } = await supabase
      .from('patients')
      .select('id, name, phone')
      .order('name')
    return data || []
  }

  const checkForConflicts = async (datetime: string, duration: number, excludeId?: string) => {
    if (!workspaceId || !datetime) return

    try {
      const params = new URLSearchParams({
        workspaceId,
        datetime,
        duration: String(duration)
      })
      if (excludeId) params.append('excludeId', excludeId)

      const response = await fetch(`/api/appointments/conflicts?${params}`)
      const data = await response.json()

      setConflicts(data.conflicts || [])
      setHasConflict(data.hasConflict || false)
      return data
    } catch (err) {
      console.error('Conflict check failed:', err)
      return null
    }
  }

  const handleDatetimeChange = async (datetime: string) => {
    setNewAppointment(prev => ({ ...prev, datetime }))
    setCheckConflicts(true)
    await checkForConflicts(datetime, newAppointment.duration)
  }

  const handleDurationChange = async (duration: number) => {
    setNewAppointment(prev => ({ ...prev, duration }))
    if (newAppointment.datetime) {
      setCheckConflicts(true)
      await checkForConflicts(newAppointment.datetime, duration)
    }
  }

  const handleAddAppointment = async () => {
    if (!newAppointment.datetime || !newAppointment.treatment) return
    
    if (hasConflict) {
      setAddError("Please select a different time - this slot has a conflict")
      return
    }

    setSaving(true)
    setAddError("")
    try {
      const response = await fetch('/api/appointments/conflicts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspaceId,
          patientId: newAppointment.patientId || null,
          datetime: new Date(newAppointment.datetime).toISOString(),
          treatment: newAppointment.treatment,
          duration: newAppointment.duration,
          notes: newAppointment.notes
        })
      })

      const data = await response.json()

      if (!response.ok) {
        if (response.status === 409) {
          setAddError("Time slot conflicts with an existing appointment. Please select a different time.")
          setHasConflict(true)
          await checkForConflicts(newAppointment.datetime, newAppointment.duration)
          return
        }
        throw new Error(data.error || 'Failed to add appointment')
      }

      setShowAddModal(false)
      setNewAppointment({ patientId: '', datetime: '', duration: 30, treatment: '', notes: '' })
      setConflicts([])
      setHasConflict(false)
      loadAppointments()
    } catch (err: any) {
      setAddError(err.message || 'Failed to add appointment')
    }
    setSaving(false)
  }

  const weekStart = startOfWeek(currentDate)
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))

  const timeSlots = [
    "08:00", "09:00", "10:00", "11:00", "12:00",
    "13:00", "14:00", "15:00", "16:00", "17:00", "18:00"
  ]

  const getAppointmentsForSlot = (date: Date, time: string) => {
    return appointments.filter(apt => {
      const aptDate = new Date(apt.datetime)
      const aptTime = `${aptDate.getHours().toString().padStart(2, '0')}:00`
      return isSameDay(aptDate, date) && aptTime === time
    })
  }

  const todayAppointments = appointments.filter(apt => isSameDay(new Date(apt.datetime), new Date()))
  const confirmedCount = appointments.filter(a => a.status === 'confirmed').length
  const pendingCount = appointments.filter(a => a.status === 'pending').length

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Appointments</h2>
          <p className="text-muted-foreground">Schedule and manage appointments</p>
        </div>
        <Button className="bg-blue-600 hover:bg-blue-700 text-white w-full sm:w-auto" onClick={() => setShowAddModal(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Appointment
        </Button>
      </div>

      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950 flex items-center justify-center">
                <CalendarIcon className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Today</p>
                <p className="text-2xl font-bold">{todayAppointments.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-green-50 dark:bg-green-950 flex items-center justify-center">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Confirmed</p>
                <p className="text-2xl font-bold text-green-600">{confirmedCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950 flex items-center justify-center">
                <Clock className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Pending</p>
                <p className="text-2xl font-bold text-amber-600">{pendingCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950 flex items-center justify-center">
                <User className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">This Week</p>
                <p className="text-2xl font-bold">{appointments.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
        </div>
      ) : appointments.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="p-12 text-center">
            <CalendarIcon className="h-12 w-12 mx-auto text-muted-foreground mb-4 opacity-50" />
            <h3 className="text-lg font-semibold mb-2">No appointments yet</h3>
            <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
              Create your first appointment or wait for patients to book through the AI.
            </p>
            <Button onClick={() => setShowAddModal(true)}>
              <Plus className="h-4 w-4 mr-2" />
              New Appointment
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <div className="min-w-[800px]">
                <div className="grid grid-cols-8 border-b">
                  <div className="p-3 text-center text-sm font-medium text-muted-foreground border-r"></div>
                  {weekDays.map((day, i) => (
                    <div key={i} className="p-3 text-center border-r last:border-r-0">
                      <p className="text-sm text-muted-foreground">{format(day, "EEE")}</p>
                      <p className={`text-lg font-semibold ${isSameDay(day, selectedDate) ? "text-blue-600" : ""}`}>
                        {format(day, "d")}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="max-h-[500px] overflow-y-auto">
                  {timeSlots.map((time) => (
                    <div key={time} className="grid grid-cols-8 border-b last:border-b-0">
                      <div className="p-3 text-sm text-muted-foreground border-r flex items-center justify-center">
                        {time}
                      </div>
                      {weekDays.map((day, dayIndex) => {
                        const slotAppointments = getAppointmentsForSlot(day, time)
                        return (
                          <div
                            key={dayIndex}
                            className="p-2 border-r last:border-r-0 min-h-[80px] hover:bg-muted/30 cursor-pointer transition-colors"
                            onClick={() => setSelectedDate(day)}
                          >
                            {slotAppointments.map((apt) => (
                              <div
                                key={apt.id}
                                className={`p-2 rounded-lg text-xs mb-1 ${
                                  apt.status === "confirmed"
                                    ? "bg-green-50 text-green-700 border border-green-200 dark:bg-green-950 dark:text-green-300 dark:border-green-800"
                                    : "bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800"
                                }`}
                              >
                                <p className="font-medium truncate">{apt.patients?.name || 'Unknown'}</p>
                                <p className="text-muted-foreground truncate">{apt.treatment}</p>
                              </div>
                            ))}
                          </div>
                        )
                      })}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Card>

          <div className="flex items-center justify-center gap-2">
            <Button variant="outline" size="icon" onClick={() => setCurrentDate(subMonths(currentDate, 1))}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium min-w-[120px] text-center">
              {format(currentDate, "MMMM yyyy")}
            </span>
            <Button variant="outline" size="icon" onClick={() => setCurrentDate(addMonths(currentDate, 1))}>
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button variant="outline" className="ml-2" onClick={() => setCurrentDate(new Date())}>
              Today
            </Button>
          </div>
        </>
      )}

      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>New Appointment</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Patient</Label>
              <Select
                value={newAppointment.patientId}
                onValueChange={(value) => setNewAppointment({ ...newAppointment, patientId: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select patient (optional)" />
                </SelectTrigger>
                <SelectContent>
                  {patients.map((patient) => (
                    <SelectItem key={patient.id} value={patient.id}>
                      {patient.name} - {patient.phone}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Date & Time *</Label>
              <Input
                type="datetime-local"
                value={newAppointment.datetime}
                onChange={(e) => handleDatetimeChange(e.target.value)}
              />
              {checkConflicts && newAppointment.datetime && (
                <div className="flex items-center gap-2 text-sm">
                  {hasConflict ? (
                    <>
                      <AlertTriangle className="h-4 w-4 text-red-500" />
                      <span className="text-red-600">Conflict detected</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span className="text-green-600">Time slot available</span>
                    </>
                  )}
                </div>
              )}
            </div>

            {hasConflict && conflicts.length > 0 && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="h-4 w-4 text-red-500" />
                  <span className="text-sm font-medium text-red-700">Conflicting Appointment</span>
                </div>
                {conflicts.map((conflict) => (
                  <div key={conflict.id} className="text-sm text-red-600">
                    <p><strong>{conflict.patientName}</strong> - {conflict.treatment}</p>
                    <p className="text-xs text-red-500">
                      {format(new Date(conflict.datetime), 'PPpp')} ({conflict.duration}min)
                    </p>
                  </div>
                ))}
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Duration (minutes)</Label>
                <Select
                  value={String(newAppointment.duration)}
                  onValueChange={(value) => handleDurationChange(parseInt(value))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="15">15 min</SelectItem>
                    <SelectItem value="30">30 min</SelectItem>
                    <SelectItem value="45">45 min</SelectItem>
                    <SelectItem value="60">60 min</SelectItem>
                    <SelectItem value="90">90 min</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Treatment *</Label>
                <Select
                  value={newAppointment.treatment}
                  onValueChange={(value) => setNewAppointment({ ...newAppointment, treatment: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select treatment" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Checkup">Checkup</SelectItem>
                    <SelectItem value="Cleaning">Cleaning</SelectItem>
                    <SelectItem value="Filling">Filling</SelectItem>
                    <SelectItem value="Root Canal">Root Canal</SelectItem>
                    <SelectItem value="Extraction">Extraction</SelectItem>
                    <SelectItem value="Crown">Crown</SelectItem>
                    <SelectItem value="Whitening">Whitening</SelectItem>
                    <SelectItem value="Consultation">Consultation</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Notes</Label>
              <Input
                value={newAppointment.notes}
                onChange={(e) => setNewAppointment({ ...newAppointment, notes: e.target.value })}
                placeholder="Additional notes..."
              />
            </div>

            {addError && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                {addError}
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => {
                setShowAddModal(false)
                setConflicts([])
                setHasConflict(false)
                setAddError("")
              }}>
                Cancel
              </Button>
              <Button 
                className="flex-1 bg-blue-600 hover:bg-blue-700" 
                onClick={handleAddAppointment}
                disabled={saving || !newAppointment.datetime || !newAppointment.treatment}
              >
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Checking...
                  </>
                ) : (
                  'Create Appointment'
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
