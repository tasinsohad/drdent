"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { 
  MessageCircle, Phone, Calendar, Loader2, Send, Search, 
  MoreHorizontal, Bot, BotOff, UserCheck, MessageSquare, 
  Wifi, WifiOff, ArrowLeft
} from "lucide-react"
import { getConversations, getMessages, updateConversationFollowup, getWhatsAppConfig } from "@/lib/db"
import { supabase } from "@/lib/supabase-client"
import { useOfflineCache, useOfflineIndicator } from "@/hooks/useOfflineCache"
import { cn } from "@/lib/utils"

interface Conversation {
  id: string
  patient_id: string
  channel: string
  status: string
  last_message: string
  last_message_at: string
  ai_paused: boolean
  followup_disabled: boolean
  patients?: { name: string; phone: string }
  _isTemp?: boolean
}

interface Message {
  id: string
  conversation_id?: string
  role: string
  content: string
  channel?: string
  timestamp: string
  _isTemp?: boolean
}

export default function ConversationsPage() {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [messages, setMessages] = useState<Message[]>([])
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null)
  const [newMessage, setNewMessage] = useState("")
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [search, setSearch] = useState("")
  const [actionMenuOpen, setActionMenuOpen] = useState(false)
  const [updating, setUpdating] = useState(false)
  const [showMobileChat, setShowMobileChat] = useState(false)
  const [whatsappConfigured, setWhatsappConfigured] = useState(false)
  const loadingRef = useRef(false)  // Track loading state with ref
  const menuRef = useRef<HTMLDivElement>(null)
  const selectedConversationIdRef = useRef<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  
  const { isOnline, showOfflineBanner, pendingCount } = useOfflineIndicator()

  const { 
    data: cachedConversations, 
    setData: setCachedConversations,
    optimisticUpdate 
  } = useOfflineCache<Conversation>({
    table: 'conversations',
    storageKey: 'conversations'
  })

  useEffect(() => {
    selectedConversationIdRef.current = selectedConversation?.id || null
  }, [selectedConversation])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const loadMessages = useCallback(async (conversationId: string) => {
    try {
      const data = await getMessages(conversationId)
      setMessages(data)
    } catch (err) {
      console.error('Failed to load messages:', err)
    }
  }, [])

  const loadConversationsRef = useRef(async () => {
    console.log('[DEBUG UI] loadConversations called')
    if (loadingRef.current) return
    loadingRef.current = true
    setLoading(true)
    try {
      console.log('[DEBUG UI] Calling getConversations...')
      const data = await getConversations()
      console.log('[DEBUG UI] Got conversations:', data?.length || 0)
      setConversations(data)
      setCachedConversations(data)
      
      if (data.length > 0 && !selectedConversation) {
        console.log('[DEBUG UI] Setting first conversation:', data[0].id)
        setSelectedConversation(data[0])
        loadMessages(data[0].id)
      }
    } catch (err) {
      console.error('[DEBUG UI] Failed to load conversations:', err)
    }
    console.log('[DEBUG UI] loadConversations done')
    setLoading(false)
    loadingRef.current = false
  })

  useEffect(() => {
    loadConversationsRef.current()

    const checkWhatsAppConfig = async () => {
      const config = await getWhatsAppConfig()
      setWhatsappConfigured(!!config?.enabled)
    }
    checkWhatsAppConfig()

    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        (payload) => {
          if (selectedConversationIdRef.current === payload.new.conversation_id) {
            setMessages((prev) => [...prev, payload.new as Message])
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'conversations' },
        (payload) => {
          if (selectedConversationIdRef.current === payload.new.id) {
            setSelectedConversation((prev) => prev ? { ...prev, ...payload.new } as Conversation : null)
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setActionMenuOpen(false)
      }
    }
    if (actionMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [actionMenuOpen])

  const handleSendMessage = async () => {
    if (!newMessage.trim()) return
    
    if (!isOnline && selectedConversation) {
      const tempMessage: Partial<Message> = {
        id: `temp-${Date.now()}`,
        conversation_id: selectedConversation.id,
        role: 'user',
        content: newMessage,
        channel: 'widget',
        timestamp: new Date().toISOString(),
        _isTemp: true
      }
      
      setMessages((prev) => [...prev, tempMessage as Message])
      setNewMessage('')
      return
    }

    if (!selectedConversation) return
    setSending(true)
    
    try {
      const tempId = `temp-${Date.now()}`
      
      const optimisticConv = optimisticUpdate({
        id: selectedConversation.id,
        last_message: newMessage,
        last_message_at: new Date().toISOString()
      }, false)

      setMessages((prev) => [...prev, {
        id: tempId,
        role: 'user',
        content: newMessage,
        timestamp: new Date().toISOString(),
        _isTemp: true
      }])

      await supabase.from('messages').insert({
        conversation_id: selectedConversation.id,
        role: 'user',
        content: newMessage,
        channel: 'widget'
      })

      await supabase.from('conversations').update({
        last_message: newMessage,
        last_message_at: new Date().toISOString()
      }).eq('id', selectedConversation.id)

      setNewMessage('')
      loadMessages(selectedConversation.id)
      loadConversationsRef.current()
    } catch (err) {
      console.error('Failed to send message:', err)
    }
    setSending(false)
  }

  const handleToggleAI = async () => {
    if (!selectedConversation) return
    setUpdating(true)
    try {
      const newAiPaused = !selectedConversation.ai_paused
      await updateConversationFollowup(selectedConversation.id, {
        ai_paused: newAiPaused,
        assigned_to: null,
      })
      setSelectedConversation({ ...selectedConversation, ai_paused: newAiPaused })
      loadConversationsRef.current()
    } catch (err) {
      console.error('Failed to toggle AI:', err)
    }
    setUpdating(false)
    setActionMenuOpen(false)
  }

  const handleTakeOver = async () => {
    if (!selectedConversation) return
    setUpdating(true)
    try {
      await updateConversationFollowup(selectedConversation.id, {
        ai_paused: true,
        followup_disabled: true,
        assigned_to: null,
      })
      setSelectedConversation({
        ...selectedConversation,
        ai_paused: true,
        followup_disabled: true,
      })
      loadConversationsRef.current()
    } catch (err) {
      console.error('Failed to take over:', err)
    }
    setUpdating(false)
    setActionMenuOpen(false)
  }

  const handleHandBackToAI = async () => {
    if (!selectedConversation) return
    setUpdating(true)
    try {
      await updateConversationFollowup(selectedConversation.id, {
        ai_paused: false,
        followup_disabled: false,
        assigned_to: null,
      })
      setSelectedConversation({
        ...selectedConversation,
        ai_paused: false,
        followup_disabled: false,
      })
      loadConversationsRef.current()
    } catch (err) {
      console.error('Failed to hand back:', err)
    }
    setUpdating(false)
    setActionMenuOpen(false)
  }

  const handleToggleFollowup = async () => {
    if (!selectedConversation) return
    setUpdating(true)
    try {
      const newFollowupDisabled = !selectedConversation.followup_disabled
      await updateConversationFollowup(selectedConversation.id, {
        followup_disabled: newFollowupDisabled,
      })
      setSelectedConversation({ ...selectedConversation, followup_disabled: newFollowupDisabled })
      loadConversationsRef.current()
    } catch (err) {
      console.error('Failed to toggle follow-up:', err)
    }
    setUpdating(false)
    setActionMenuOpen(false)
  }

  const filteredConversations = conversations.filter(conv =>
    conv.patients?.name?.toLowerCase().includes(search.toLowerCase()) ||
    conv.last_message?.toLowerCase().includes(search.toLowerCase())
  )

  const selectConversation = (conv: Conversation) => {
    setSelectedConversation(conv)
    loadMessages(conv.id)
    setShowMobileChat(true)
  }

  return (
    <div className="h-[calc(100vh-180px)] md:h-[calc(100vh-120px)]">
      {showOfflineBanner && (
        <div className="bg-amber-500 text-white px-4 py-2 text-sm flex items-center justify-center gap-2 rounded-lg mb-4">
          <WifiOff className="h-4 w-4" />
          <span>You&apos;re offline. Changes will sync when you reconnect.</span>
          {pendingCount > 0 && <Badge className="bg-white/20 text-white">{pendingCount} pending</Badge>}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 h-full">
        {/* Conversation List - Hidden on mobile when chat is open */}
        <Card className={cn(
          "md:col-span-1 overflow-hidden flex flex-col h-full",
          showMobileChat && "hidden md:flex"
        )}>
          <div className="p-3 md:p-4 border-b">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold hidden md:block">Conversations</h2>
                <Badge variant="outline" className="md:hidden">{conversations.length}</Badge>
              </div>
              {!isOnline && <WifiOff className="h-4 w-4 text-amber-500" />}
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search..."
                className="pl-10 h-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center h-32">
                <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                <MessageCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">
                  {search 
                    ? "No results found" 
                    : whatsappConfigured 
                      ? "No conversations yet" 
                      : "WhatsApp is not configured. Go to Settings to set it up."}
                </p>
              </div>
            ) : (
              filteredConversations.map((conv) => (
                <button
                  key={conv.id}
                  onClick={() => selectConversation(conv)}
                  className={cn(
                    "w-full p-3 md:p-4 text-left border-b hover:bg-muted/50 transition-colors",
                    selectedConversation?.id === conv.id && "bg-blue-50 dark:bg-blue-950/50"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-100 to-emerald-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-blue-600 font-medium text-sm">
                        {(conv.patients?.name || 'U').split(" ").map(n => n[0]).join("").slice(0, 2)}
                      </span>
                      {conv._isTemp && (
                        <span className="absolute -top-1 -right-1 w-3 h-3 bg-amber-500 rounded-full border-2 border-white" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <p className="font-medium truncate text-sm">{conv.patients?.name || 'Unknown'}</p>
                        <span className="text-xs text-muted-foreground flex-shrink-0 ml-2">
                          {conv.last_message_at ? new Date(conv.last_message_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{conv.last_message || 'No messages'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 mt-2">
                    <Badge variant={conv.channel === "whatsapp" ? "secondary" : "outline"} className="text-[10px] py-0 px-1.5">
                      {conv.channel === "whatsapp" ? "WA" : "Web"}
                    </Badge>
                    {conv.ai_paused && (
                      <Badge variant="secondary" className="text-[10px] py-0 px-1.5 bg-amber-50 text-amber-700">
                        Human
                      </Badge>
                    )}
                  </div>
                </button>
              ))
            )}
          </div>
        </Card>

        {/* Chat Panel */}
        <Card className={cn(
          "md:col-span-2 flex flex-col overflow-hidden h-full",
          !showMobileChat && "hidden md:flex"
        )}>
          {selectedConversation ? (
            <>
              <div className="p-3 md:p-4 border-b flex-shrink-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="md:hidden h-8 w-8"
                      onClick={() => setShowMobileChat(false)}
                    >
                      <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-100 to-emerald-100 rounded-full flex items-center justify-center">
                      <span className="text-blue-600 font-medium text-sm">
                        {(selectedConversation.patients?.name || 'U').split(" ").map(n => n[0]).join("").slice(0, 2)}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium">{selectedConversation.patients?.name || 'Unknown'}</p>
                      <p className="text-xs text-muted-foreground">{selectedConversation.patients?.phone || ''}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="outline" size="icon" className="h-8 w-8 hidden sm:flex">
                      <Phone className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="icon" className="h-8 w-8 hidden sm:flex">
                      <Calendar className="h-4 w-4" />
                    </Button>
                    <div className="relative" ref={menuRef}>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setActionMenuOpen(!actionMenuOpen)}
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                      {actionMenuOpen && (
                        <div className="absolute right-0 top-full mt-2 w-56 rounded-lg border bg-background shadow-lg py-1 z-50">
                          <button onClick={handleToggleAI} className="w-full flex items-center gap-3 px-3 py-2.5 text-sm hover:bg-muted">
                            {selectedConversation.ai_paused ? <Bot className="h-4 w-4" /> : <BotOff className="h-4 w-4" />}
                            <span>{selectedConversation.ai_paused ? 'Enable AI' : 'Pause AI'}</span>
                          </button>
                          <button onClick={handleToggleFollowup} className="w-full flex items-center gap-3 px-3 py-2.5 text-sm hover:bg-muted">
                            <MessageSquare className="h-4 w-4" />
                            <span>{selectedConversation.followup_disabled ? 'Enable' : 'Disable'} Follow-ups</span>
                          </button>
                          <div className="border-t my-1" />
                          {selectedConversation.ai_paused ? (
                            <button onClick={handleHandBackToAI} className="w-full flex items-center gap-3 px-3 py-2.5 text-sm hover:bg-muted">
                              <UserCheck className="h-4 w-4" />
                              <span>Hand Back to AI</span>
                            </button>
                          ) : (
                            <button onClick={handleTakeOver} className="w-full flex items-center gap-3 px-3 py-2.5 text-sm hover:bg-muted">
                              <BotOff className="h-4 w-4" />
                              <span>Take Over</span>
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-3 md:p-4 space-y-3">
                {messages.length === 0 ? (
                  <div className="text-center text-muted-foreground py-8">
                    <MessageCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No messages yet</p>
                  </div>
                ) : (
                  messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={cn(
                        "flex",
                        msg.role === "user" ? "justify-end" : "justify-start"
                      )}
                    >
                      <div
                        className={cn(
                          "max-w-[85%] md:max-w-[70%] rounded-2xl px-3 md:px-4 py-2 md:py-2.5",
                          msg.role === "user"
                            ? "bg-blue-600 text-white"
                            : "bg-muted",
                          msg._isTemp && "opacity-70"
                        )}
                      >
                        <p className="text-sm">{msg.content}</p>
                        <p className={cn(
                          "text-[10px] mt-1",
                          msg.role === "user" ? "text-white/70" : "text-muted-foreground"
                        )}>
                          {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          {msg._isTemp && " • Sending..."}
                        </p>
                      </div>
                    </div>
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>

              <div className="border-t p-3 md:p-4 flex-shrink-0">
                <div className="flex items-center gap-2">
                  <Input
                    placeholder="Type a message..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSendMessage())}
                    className="flex-1"
                    disabled={sending}
                  />
                  <Button
                    size="icon"
                    className="bg-blue-600 hover:bg-blue-700 h-10 w-10"
                    onClick={handleSendMessage}
                    disabled={sending || !newMessage.trim()}
                  >
                    {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  </Button>
                </div>
                <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                  {selectedConversation.ai_paused ? (
                    <>
                      <UserCheck className="h-3 w-3 text-amber-600" />
                      <span className="text-amber-600">Human handling</span>
                    </>
                  ) : (
                    <>
                      <Bot className="h-3 w-3 text-blue-600" />
                      <span>AI active</span>
                    </>
                  )}
                  {!isOnline && (
                    <Badge variant="outline" className="text-[10px] ml-auto">
                      <WifiOff className="h-3 w-3 mr-1" />
                      Offline
                    </Badge>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-muted-foreground p-4">
              <div className="text-center">
                <MessageCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-sm">Select a conversation</p>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
