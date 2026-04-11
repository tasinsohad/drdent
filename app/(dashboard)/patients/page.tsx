"use client"

import { useState, useEffect, useMemo } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog"
import { useToast } from "@/components/ui/toaster"
import { Search, Plus, Phone, Mail, Tag, UserPlus, Loader2, Edit, Trash2, GripVertical, AlertTriangle } from "lucide-react"
import { getPatients, createPatient, updatePatient, deletePatient, updatePatientStatus } from "@/lib/db"
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragOverEvent,
  DragEndEvent,
  defaultDropAnimationSideEffects,
} from "@dnd-kit/core"
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"

interface Patient {
  id: string
  name: string
  phone: string
  email: string
  tags: string[]
  notes: string
  source: string
  status: string
  created_at: string
}

const COLUMNS = [
  { id: "lead", title: "Leads" },
  { id: "active", title: "Active" },
  { id: "completed", title: "Completed" }
]

function SortablePatientCard({ 
  patient, 
  onEdit, 
  onDelete 
}: { 
  patient: Patient, 
  onEdit: (p: Patient) => void, 
  onDelete: (p: Patient) => void 
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: patient.id, data: { type: "Patient", patient } })

  const style = {
    transition,
    transform: CSS.Transform.toString(transform),
    opacity: isDragging ? 0.4 : 1,
  }

  return (
    <div ref={setNodeRef} style={style} className="relative group touch-none mb-3">
      <Card className={`border-none shadow-sm transition-all hover:shadow-md ${isDragging ? "ring-2 ring-blue-500" : ""}`}>
        <CardContent className="p-4 bg-white/60 dark:bg-slate-900/60 backdrop-blur-sm rounded-xl">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3 w-full">
              <div 
                {...attributes} 
                {...listeners} 
                className="cursor-grab active:cursor-grabbing p-1 text-slate-300 hover:text-slate-500 transition-colors"
                aria-label="Drag patient card"
              >
                <GripVertical className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start">
                  <div className="w-9 h-9 bg-gradient-to-br from-blue-100 to-emerald-100 rounded-full flex items-center justify-center flex-shrink-0 mb-2">
                    <span className="text-blue-700 font-semibold text-xs">
                      {patient.name.split(" ").map(n => n[0]).join("").toUpperCase().substring(0, 2)}
                    </span>
                  </div>
                  <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity">
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-500 hover:text-blue-600" onClick={(e) => { e.stopPropagation(); onEdit(patient); }}>
                      <Edit className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-500 hover:text-red-600" onClick={(e) => { e.stopPropagation(); onDelete(patient); }}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
                <p className="font-semibold text-sm truncate text-slate-900 dark:text-slate-100">{patient.name}</p>
                <p className="text-[10px] text-slate-500 mb-2">
                  Added {new Date(patient.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </p>
                <div className="space-y-1">
                  {patient.phone && (
                    <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400 truncate">
                      <Phone className="h-3 w-3 shrink-0" />
                      <span className="truncate">{patient.phone}</span>
                    </div>
                  )}
                  {patient.email && (
                    <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400 truncate">
                      <Mail className="h-3 w-3 shrink-0" />
                      <span className="truncate">{patient.email}</span>
                    </div>
                  )}
                </div>
                {patient.tags && patient.tags.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1">
                    {patient.tags.map((tag) => (
                      <Badge key={tag} variant="secondary" className="text-[10px] px-1.5 py-0 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default function PatientsKanbanPage() {
  const [patients, setPatients] = useState<Patient[]>([])
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  // DND State
  const [activeId, setActiveId] = useState<string | null>(null)

  // Modal States
  const [isFormModalOpen, setIsFormModalOpen] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [editingPatient, setEditingPatient] = useState<Patient | null>(null)
  const [deletingPatient, setDeletingPatient] = useState<Patient | null>(null)

  // Form State
  const [formData, setFormData] = useState({ name: '', phone: '', email: '', status: 'lead' })
  const [isSubmitting, setIsSubmitting] = useState(false)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  useEffect(() => {
    loadPatients()
  }, [])

  const loadPatients = async () => {
    setLoading(true)
    try {
      const data = await getPatients()
      // Normalize legacy data
      const normalizedData = data.map((p: any) => ({
        ...p,
        status: p.status || 'lead'
      }))
      setPatients(normalizedData)
    } catch (err) {
      console.error('Failed to load patients:', err)
      toast({ title: "Error", description: "Failed to load patients", variant: "error" })
    }
    setLoading(false)
  }

  const columns = useMemo(() => {
    const list = patients.filter(p => 
      p.name.toLowerCase().includes(search.toLowerCase()) || 
      p.phone?.includes(search) || 
      p.email?.toLowerCase().includes(search.toLowerCase())
    )
    return {
      lead: list.filter(p => p.status === 'lead'),
      active: list.filter(p => p.status === 'active'),
      completed: list.filter(p => !['lead', 'active'].includes(p.status))
    }
  }, [patients, search])

  // Drag and Drop Handlers
  const onDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string)
  }

  const onDragOver = (event: DragOverEvent) => {
    const { active, over } = event
    if (!over) return

    const activeId = active.id
    const overId = over.id

    if (activeId === overId) return

    const isActiveTask = active.data.current?.type === "Patient"
    const isOverTask = over.data.current?.type === "Patient"
    const isOverColumn = over.data.current?.type === "Column"

    if (!isActiveTask) return

    // Dropping a patient over another patient
    if (isActiveTask && isOverTask) {
      setPatients((patients) => {
        const activeIndex = patients.findIndex(p => p.id === activeId)
        const overIndex = patients.findIndex(p => p.id === overId)

        if (patients[activeIndex].status !== patients[overIndex].status) {
          const newPatients = [...patients]
          newPatients[activeIndex].status = newPatients[overIndex].status
          return arrayMove(newPatients, activeIndex, overIndex)
        }

        return arrayMove(patients, activeIndex, overIndex)
      })
    }

    // Dropping a patient over an empty column
    if (isActiveTask && isOverColumn) {
      setPatients((patients) => {
        const activeIndex = patients.findIndex(p => p.id === activeId)
        const newPatients = [...patients]
        newPatients[activeIndex].status = overId as string
        return arrayMove(newPatients, activeIndex, activeIndex)
      })
    }
  }

  const onDragEnd = async (event: DragEndEvent) => {
    setActiveId(null)
    const { active, over } = event
    if (!over) return

    const activePatient = patients.find(p => p.id === active.id)
    if (!activePatient) return

    // Find what status it settled in locally
    const currentStatus = activePatient.status

    try {
      await updatePatientStatus(activePatient.id, currentStatus)
    } catch (err: any) {
      toast({ title: "Error saving position", description: err.message, variant: "error" })
      loadPatients() // Revert on failure
    }
  }

  // Crud Ops
  const handleOpenAdd = () => {
    setEditingPatient(null)
    setFormData({ name: '', phone: '', email: '', status: 'lead' })
    setIsFormModalOpen(true)
  }

  const handleOpenEdit = (p: Patient) => {
    setEditingPatient(p)
    setFormData({ name: p.name, phone: p.phone || '', email: p.email || '', status: p.status || 'lead' })
    setIsFormModalOpen(true)
  }

  const handleSubmitForm = async () => {
    if (!formData.name) return
    setIsSubmitting(true)
    try {
      if (editingPatient) {
        await updatePatient(editingPatient.id, {
          name: formData.name,
          phone: formData.phone,
          email: formData.email,
        })
        toast({ title: "Success", description: "Patient updated successfully." })
      } else {
        await createPatient(formData)
        toast({ title: "Success", description: "Patient added successfully." })
      }
      setIsFormModalOpen(false)
      loadPatients()
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to save patient", variant: "error" })
    }
    setIsSubmitting(false)
  }

  const handleConfirmDelete = async () => {
    if (!deletingPatient) return
    setIsSubmitting(true)
    try {
      await deletePatient(deletingPatient.id)
      toast({ title: "Success", description: "Patient deleted successfully." })
      setIsDeleteModalOpen(false)
      setDeletingPatient(null)
      loadPatients()
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to delete patient", variant: "error" })
    }
    setIsSubmitting(false)
  }

  const activePatientOverlay = useMemo(() => {
    if (!activeId) return null
    return patients.find((p) => p.id === activeId)
  }, [activeId, patients])

  return (
    <div className="flex flex-col h-full space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold font-heading tracking-tight text-slate-800 dark:text-slate-100">Patients Pipeline</h2>
          <p className="text-sm text-slate-500">Manage patient journey from lead to completed</p>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search patients..."
              className="pl-9 bg-white dark:bg-slate-900 border-none shadow-sm h-10 rounded-xl"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Button 
            className="bg-gradient-to-r from-blue-600 to-emerald-500 hover:from-blue-700 hover:to-emerald-600 text-white shadow-md shadow-blue-500/20 rounded-xl h-10 px-4 shrink-0 transition-all active:scale-95" 
            onClick={handleOpenAdd}
          >
            <Plus className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Add Patient</span>
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
        </div>
      ) : patients.length === 0 && !search ? (
        <Card className="border-dashed bg-transparent shadow-none border-slate-300 dark:border-slate-800 mt-8">
          <CardContent className="p-16 text-center">
            <div className="w-16 h-16 bg-blue-50 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-6">
              <UserPlus className="h-8 w-8 text-blue-500" />
            </div>
            <h3 className="text-xl font-bold font-heading text-slate-800 dark:text-slate-200 mb-2">No patients yet</h3>
            <p className="text-slate-500 max-w-sm mx-auto mb-8">
              Your patient pipeline is empty. Add a new patient manually or wait for leads to come through the widget.
            </p>
            <Button onClick={handleOpenAdd} className="bg-blue-600 rounded-xl">
              <Plus className="h-4 w-4 mr-2" /> Add First Patient
            </Button>
          </CardContent>
        </Card>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={onDragStart}
          onDragOver={onDragOver}
          onDragEnd={onDragEnd}
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pb-8 h-full min-h-[600px] overflow-x-auto">
            {COLUMNS.map(col => {
              const columnPatients = columns[col.id as keyof typeof columns] || []
              return (
                <div key={col.id} className="flex flex-col flex-1 bg-slate-50/50 dark:bg-slate-950/20 rounded-2xl p-4 min-w-[300px]">
                  <div className="flex items-center justify-between mb-4 px-1">
                    <h3 className="font-semibold text-slate-700 dark:text-slate-300">{col.title}</h3>
                    <Badge variant="secondary" className="bg-white dark:bg-slate-800 rounded-full text-xs font-semibold px-2 py-0.5 shadow-sm">
                      {columnPatients.length}
                    </Badge>
                  </div>
                  
                  {/* Droppable Column Area */}
                  <div 
                    id={col.id} 
                    className="flex-1 flex flex-col min-h-[150px] rounded-xl"
                  >
                    <SortableContext
                      id={col.id}
                      items={columnPatients.map(p => p.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      {columnPatients.map(patient => (
                        <SortablePatientCard 
                          key={patient.id} 
                          patient={patient} 
                          onEdit={handleOpenEdit} 
                          onDelete={(p) => { setDeletingPatient(p); setIsDeleteModalOpen(true); }} 
                        />
                      ))}
                      {/* Empty column placeholder component logic handled by SortableContext using column ID data */}
                      <DataDroppable areaId={col.id} />
                    </SortableContext>
                  </div>
                </div>
              )
            })}
          </div>

          <DragOverlay dropAnimation={{
            sideEffects: defaultDropAnimationSideEffects({ styles: { active: { opacity: "0.4" } } })
          }}>
            {activePatientOverlay && (
              <div className="rotate-3 scale-105 opacity-90 shadow-xl rounded-xl">
                <SortablePatientCard 
                  patient={activePatientOverlay} 
                  onEdit={() => {}} 
                  onDelete={() => {}} 
                />
              </div>
            )}
          </DragOverlay>
        </DndContext>
      )}

      {/* Add / Edit Modal */}
      <Dialog open={isFormModalOpen} onOpenChange={setIsFormModalOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold font-heading">{editingPatient ? "Edit Patient" : "Add Patient"}</DialogTitle>
            <DialogDescription>
              {editingPatient ? "Update patient contact details." : "Enter new lead information."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Full Name *</label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="h-11 rounded-xl"
                placeholder="John Doe"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Phone</label>
              <Input
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="h-11 rounded-xl"
                placeholder="+1 234 567 8900"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Email Address</label>
              <Input
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="h-11 rounded-xl"
                placeholder="john@example.com"
                type="email"
              />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0 mt-2">
            <Button variant="outline" onClick={() => setIsFormModalOpen(false)} className="rounded-xl h-11 border-slate-200">
              Cancel
            </Button>
            <Button onClick={handleSubmitForm} disabled={isSubmitting || !formData.name.trim()} className="rounded-xl h-11 bg-blue-600">
              {isSubmitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              {editingPatient ? "Save Changes" : "Create Patient"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl border-red-100">
          <DialogHeader>
            <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mb-4">
              <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-500" />
            </div>
            <DialogTitle className="text-xl font-bold font-heading">Delete Patient</DialogTitle>
            <DialogDescription className="text-slate-500 mt-2">
              Are you sure you want to permanently delete <strong className="text-slate-800 dark:text-slate-200">{deletingPatient?.name}</strong>? 
              This action cannot be undone and will remove them from the pipeline.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0 mt-6">
            <Button variant="outline" onClick={() => setIsDeleteModalOpen(false)} className="rounded-xl h-11">
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleConfirmDelete} disabled={isSubmitting} className="rounded-xl h-11 bg-red-600 hover:bg-red-700">
              {isSubmitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Trash2 className="h-4 w-4 mr-2" />}
              Yes, delete patient
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  )
}

// A hidden droppable area to allow dropping into empty columns
import { useDroppable } from '@dnd-kit/core';
function DataDroppable({ areaId }: { areaId: string }) {
  const { setNodeRef } = useDroppable({
    id: areaId,
    data: {
      type: "Column"
    }
  });

  return <div ref={setNodeRef} className="flex-1 w-full min-h-[80px]" />
}
