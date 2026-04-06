"use client"

import React, { useState, useCallback, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  FileText,
  Upload,
  Trash2,
  Loader2,
  File,
  FileCheck,
  AlertCircle,
  Search,
  BookOpen
} from "lucide-react"
import { supabase } from "@/lib/supabase-client"

interface Document {
  id: string
  name: string
  file_type: string
  file_url: string
  status: string
  created_at: string
}

interface KnowledgeBaseManagerProps {
  workspaceId: string
}

export function KnowledgeBaseManager({ workspaceId }: KnowledgeBaseManagerProps) {
  const [documents, setDocuments] = useState<Document[]>([])
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false)

  const loadDocuments = useCallback(async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('knowledge_base')
        .select('*')
        .eq('workspace_id', workspaceId)
        .order('created_at', { ascending: false })

      if (error) throw error
      setDocuments(data || [])
    } catch (err: any) {
      setError(err.message)
    }
    setLoading(false)
  }, [workspaceId])

  const handleUpload = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setUploading(true)
    setError(null)

    const formData = new FormData(e.currentTarget)
    const file = formData.get('file') as File

    if (!file) {
      setError('Please select a file')
      setUploading(false)
      return
    }

    try {
      const response = await fetch('/api/knowledge-base', {
        method: 'POST',
        body: formData
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Upload failed')
      }

      await loadDocuments()
      setUploadDialogOpen(false)
    } catch (err: any) {
      setError(err.message)
    }
    setUploading(false)
  }

  const handleDelete = async (docId: string) => {
    if (!confirm('Are you sure you want to delete this document?')) return

    try {
      const response = await fetch(`/api/knowledge-base?id=${docId}&workspaceId=${workspaceId}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Delete failed')
      }

      setDocuments(prev => prev.filter(d => d.id !== docId))
    } catch (err: any) {
      setError(err.message)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ready':
        return <Badge className="bg-green-100 text-green-700 border-green-200"><FileCheck className="h-3 w-3 mr-1" />Ready</Badge>
      case 'processing':
        return <Badge className="bg-amber-100 text-amber-700 border-amber-200"><Loader2 className="h-3 w-3 mr-1 animate-spin" />Processing</Badge>
      case 'error':
        return <Badge className="bg-red-100 text-red-700 border-red-200"><AlertCircle className="h-3 w-3 mr-1" />Error</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  const getFileIcon = (fileType: string) => {
    switch (fileType) {
      case 'pdf':
        return <FileText className="h-8 w-8 text-red-500" />
      case 'txt':
      case 'md':
        return <File className="h-8 w-8 text-blue-500" />
      default:
        return <File className="h-8 w-8 text-gray-500" />
    }
  }

  useEffect(() => {
    if (uploadDialogOpen) {
      loadDocuments()
    }
  }, [uploadDialogOpen, loadDocuments])

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              Knowledge Base
            </CardTitle>
            <CardDescription>
              Upload PDFs and documents for the AI to answer from
            </CardDescription>
          </div>
          <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Upload className="h-4 w-4 mr-2" />
                Upload Document
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Upload Knowledge Base Document</DialogTitle>
                <DialogDescription>
                  Upload PDFs, text files, or markdown documents. The AI will use these to answer patient questions accurately.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleUpload} className="space-y-4 mt-4">
                <input type="hidden" name="workspaceId" value={workspaceId} />
                <div className="space-y-2">
                  <Label htmlFor="file">Document File</Label>
                  <Input
                    id="file"
                    name="file"
                    type="file"
                    accept=".pdf,.txt,.md"
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    Supported formats: PDF, TXT, MD (max 10MB)
                  </p>
                </div>
                {error && (
                  <div className="p-3 rounded-lg bg-red-50 text-red-600 text-sm flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" />
                    {error}
                  </div>
                )}
                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setUploadDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={uploading}>
                    {uploading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4 mr-2" />
                        Upload
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
        ) : documents.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <BookOpen className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p className="font-medium">No documents yet</p>
            <p className="text-sm">Upload pricing, FAQs, or aftercare guides</p>
          </div>
        ) : (
          <div className="space-y-2">
            {documents.map((doc) => (
              <div
                key={doc.id}
                className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  {getFileIcon(doc.file_type)}
                  <div className="min-w-0">
                    <p className="font-medium text-sm truncate">{doc.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(doc.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {getStatusBadge(doc.status)}
                  {doc.status === 'ready' && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50"
                      onClick={() => handleDelete(doc.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
