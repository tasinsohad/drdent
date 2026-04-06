"use client"

import { useState, useCallback, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Bot,
  Plus,
  Trash2,
  Loader2,
  AlertCircle,
  Zap,
  Calendar,
  Phone,
  CreditCard,
  MessageCircle,
  Edit,
  CheckCircle
} from "lucide-react"

interface Intent {
  id: string
  name: string
  trigger_patterns: string[]
  response_template: string
  action_type: string
  confidence_threshold: number
  enabled: boolean
}

interface AIIntentsManagerProps {
  workspaceId: string
}

export function AIIntentsManager({ workspaceId }: AIIntentsManagerProps) {
  const [intents, setIntents] = useState<Intent[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingIntent, setEditingIntent] = useState<Intent | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    triggerPatterns: '',
    responseTemplate: '',
    actionType: 'info',
    confidenceThreshold: 0.7
  })

  const loadIntents = useCallback(async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/intents?workspaceId=${workspaceId}`)
      if (!response.ok) throw new Error('Failed to load intents')
      const data = await response.json()
      setIntents(data.intents || [])
    } catch (err: any) {
      setError(err.message)
    }
    setLoading(false)
  }, [workspaceId])

  useEffect(() => {
    if (dialogOpen) {
      loadIntents()
    }
  }, [dialogOpen, loadIntents])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)

    const payload = {
      workspaceId,
      name: formData.name,
      triggerPatterns: formData.triggerPatterns.split(',').map(p => p.trim()).filter(Boolean),
      responseTemplate: formData.responseTemplate,
      actionType: formData.actionType,
      confidenceThreshold: formData.confidenceThreshold
    }

    try {
      const url = editingIntent 
        ? `/api/intents?id=${editingIntent.id}&workspaceId=${workspaceId}`
        : '/api/intents'
      
      const response = await fetch(url, {
        method: editingIntent ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingIntent ? { ...payload, id: editingIntent.id } : payload)
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Save failed')
      }

      await loadIntents()
      resetForm()
      setDialogOpen(false)
    } catch (err: any) {
      setError(err.message)
    }
    setSaving(false)
  }

  const handleEdit = (intent: Intent) => {
    setEditingIntent(intent)
    setFormData({
      name: intent.name,
      triggerPatterns: intent.trigger_patterns.join(', '),
      responseTemplate: intent.response_template,
      actionType: intent.action_type,
      confidenceThreshold: intent.confidence_threshold
    })
    setDialogOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this intent?')) return

    try {
      const response = await fetch(`/api/intents?id=${id}&workspaceId=${workspaceId}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Delete failed')
      }

      setIntents(prev => prev.filter(i => i.id !== id))
    } catch (err: any) {
      setError(err.message)
    }
  }

  const handleToggle = async (intent: Intent) => {
    try {
      const response = await fetch('/api/intents', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: intent.id,
          workspaceId,
          enabled: !intent.enabled
        })
      })

      if (!response.ok) throw new Error('Toggle failed')

      setIntents(prev => prev.map(i => 
        i.id === intent.id ? { ...i, enabled: !i.enabled } : i
      ))
    } catch (err: any) {
      setError(err.message)
    }
  }

  const resetForm = () => {
    setEditingIntent(null)
    setFormData({
      name: '',
      triggerPatterns: '',
      responseTemplate: '',
      actionType: 'info',
      confidenceThreshold: 0.7
    })
  }

  const getActionIcon = (type: string) => {
    switch (type) {
      case 'booking': return <Calendar className="h-4 w-4 text-blue-500" />
      case 'callback': return <Phone className="h-4 w-4 text-green-500" />
      case 'payment': return <CreditCard className="h-4 w-4 text-purple-500" />
      case 'escalate': return <Zap className="h-4 w-4 text-red-500" />
      default: return <MessageCircle className="h-4 w-4 text-gray-500" />
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Bot className="h-5 w-5" />
              AI Intents
            </CardTitle>
            <CardDescription>
              Train the AI on custom conversation flows
            </CardDescription>
          </div>
          <Dialog open={dialogOpen} onOpenChange={(open) => {
            setDialogOpen(open)
            if (!open) resetForm()
          }}>
            <DialogTrigger asChild>
              <Button size="sm" onClick={() => setDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Intent
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingIntent ? 'Edit Intent' : 'Add New Intent'}
                </DialogTitle>
                <DialogDescription>
                  Define patterns that trigger specific AI responses and actions.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Intent Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g., Request Callback"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="patterns">Trigger Patterns</Label>
                  <Input
                    id="patterns"
                    value={formData.triggerPatterns}
                    onChange={(e) => setFormData(prev => ({ ...prev, triggerPatterns: e.target.value }))}
                    placeholder="callback, call me, phone, ring (comma-separated)"
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    Comma-separated keywords that trigger this intent
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="response">Response Template</Label>
                  <Textarea
                    id="response"
                    value={formData.responseTemplate}
                    onChange={(e) => setFormData(prev => ({ ...prev, responseTemplate: e.target.value }))}
                    placeholder="I understand you'd like a callback. I'll let the clinic know."
                    rows={3}
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    The AI will use this response when this intent is matched
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="actionType">Action Type</Label>
                    <Select
                      value={formData.actionType}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, actionType: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="info">Information</SelectItem>
                        <SelectItem value="booking">Book Appointment</SelectItem>
                        <SelectItem value="callback">Request Callback</SelectItem>
                        <SelectItem value="payment">Collect Payment</SelectItem>
                        <SelectItem value="escalate">Escalate</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="threshold">Confidence Threshold</Label>
                    <Input
                      id="threshold"
                      type="number"
                      min="0"
                      max="1"
                      step="0.1"
                      value={formData.confidenceThreshold}
                      onChange={(e) => setFormData(prev => ({ 
                        ...prev, 
                        confidenceThreshold: parseFloat(e.target.value) 
                      }))}
                    />
                  </div>
                </div>

                {error && (
                  <div className="p-3 rounded-lg bg-red-50 text-red-600 text-sm flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" />
                    {error}
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setDialogOpen(false)
                      resetForm()
                    }}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={saving}>
                    {saving ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        {editingIntent ? 'Update' : 'Create'} Intent
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : intents.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Bot className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p className="font-medium">No custom intents yet</p>
            <p className="text-sm">Add intents to handle specific patient requests</p>
          </div>
        ) : (
          <div className="space-y-3">
            {intents.map((intent) => (
              <div
                key={intent.id}
                className={`p-4 rounded-lg border transition-colors ${
                  intent.enabled ? 'bg-card' : 'bg-muted/30 opacity-60'
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {getActionIcon(intent.action_type)}
                      <h4 className="font-medium">{intent.name}</h4>
                      {!intent.enabled && (
                        <Badge variant="secondary">Disabled</Badge>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-1 mb-2">
                      {intent.trigger_patterns.map((pattern, i) => (
                        <Badge key={i} variant="outline" className="text-xs">
                          {pattern}
                        </Badge>
                      ))}
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {intent.response_template}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleToggle(intent)}
                      title={intent.enabled ? 'Disable' : 'Enable'}
                    >
                      {intent.enabled ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <AlertCircle className="h-4 w-4 text-muted-foreground" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleEdit(intent)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-red-500 hover:text-red-600"
                      onClick={() => handleDelete(intent.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
