'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { Send, Loader2, User, Bot, RefreshCw } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

interface WidgetConfig {
  workspaceId: string
  workspaceName: string
  primaryColor: string
  greetingText: string
}

function WidgetContent() {
  const searchParams = useSearchParams()
  const token = searchParams.get('token')
  
  const [config, setConfig] = useState<WidgetConfig | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [initializing, setInitializing] = useState(true)
  const [conversationId, setConversationId] = useState<string | null>(null)
  
  const scrollRef = useRef<HTMLDivElement>(null)

  // Initialization: Load Config and Session
  useEffect(() => {
    if (!token) return

    const loadWidget = async () => {
      try {
        const res = await fetch(`/api/widget/config?token=${token}`)
        const data = await res.json()
        if (data.error) throw new Error(data.error)
        
        setConfig(data)
        
        // Load session
        const savedConvId = localStorage.getItem(`drdent_conv_${token}`)
        const savedMessages = localStorage.getItem(`drdent_msgs_${token}`)
        
        if (savedConvId) {
          setConversationId(savedConvId)
          if (savedMessages) {
            setMessages(JSON.parse(savedMessages).map((m: any) => ({
              ...m,
              timestamp: new Date(m.timestamp)
            })))
          } else {
             // Initial greeting
            const greeting: Message = {
                id: 'greeting',
                role: 'assistant',
                content: data.greetingText,
                timestamp: new Date()
            }
            setMessages([greeting])
          }
        } else {
          // Initialize new conversation
          const newConvId = crypto.randomUUID()
          setConversationId(newConvId)
          localStorage.setItem(`drdent_conv_${token}`, newConvId)
          
          // Initial greeting
          const greeting: Message = {
            id: 'greeting',
            role: 'assistant',
            content: data.greetingText,
            timestamp: new Date()
          }
          setMessages([greeting])
        }
      } catch (err) {
        console.error('Widget load error:', err)
      } finally {
        setInitializing(false)
      }
    }

    loadWidget()
  }, [token])

  // Save messages to local storage
  useEffect(() => {
    if (token && messages.length > 0) {
      localStorage.setItem(`drdent_msgs_${token}`, JSON.stringify(messages))
    }
  }, [messages, token])

  // Scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault()
    if (!input.trim() || loading || !config || !conversationId) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setInput('')
    setLoading(true)

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: input,
          workspaceId: config.workspaceId,
          conversationId: conversationId
        })
      })

      const data = await res.json()
      if (data.error) throw new Error(data.error)

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.reply,
        timestamp: new Date()
      }

      setMessages(prev => [...prev, aiMessage])
    } catch (err) {
      console.error('Chat error:', err)
      setMessages(prev => [...prev, {
        id: 'error-' + Date.now(),
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date()
      }])
    } finally {
      setLoading(false)
    }
  }

  const resetChat = () => {
    if (!token || !config) return
    const newConvId = crypto.randomUUID()
    setConversationId(newConvId)
    localStorage.setItem(`drdent_conv_${token}`, newConvId)
    const greeting: Message = {
      id: 'greeting-' + Date.now(),
      role: 'assistant',
      content: config.greetingText,
      timestamp: new Date()
    }
    setMessages([greeting])
  }

  if (initializing) {
    return (
      <div className="h-screen flex items-center justify-center bg-white">
        <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
      </div>
    )
  }

  if (!config) {
    return (
      <div className="h-screen flex items-center justify-center bg-white p-6 text-center text-sm text-slate-500">
        This widget is not configured correctly or has been disabled.
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen bg-white overflow-hidden">
      {/* Header */}
      <div 
        className="px-4 py-3 flex items-center justify-between text-white shadow-sm shrink-0"
        style={{ backgroundColor: config.primaryColor }}
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
            <Bot className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-sm font-bold leading-tight">{config.workspaceName}</h1>
            <div className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              <span className="text-[10px] opacity-90">Assistant is online</span>
            </div>
          </div>
        </div>
        <button 
          onClick={resetChat} 
          className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
          title="Reset chat"
        >
          <RefreshCw className="h-4 w-4" />
        </button>
      </div>

      {/* Messages */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50"
      >
        <AnimatePresence initial={false}>
          {messages.map((m) => (
            <motion.div
              key={m.id}
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              className={cn(
                "flex w-full gap-2",
                m.role === 'user' ? "flex-row-reverse" : "flex-row"
              )}
            >
              <div className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center shrink-0",
                m.role === 'user' ? "bg-slate-200" : "bg-blue-100"
              )}>
                {m.role === 'user' ? <User className="h-4 w-4 text-slate-600" /> : <Bot className="h-4 w-4 text-blue-600" />}
              </div>
              <div className={cn(
                "max-w-[80%] px-3 py-2 rounded-2xl text-sm shadow-sm",
                m.role === 'user' 
                  ? "bg-blue-600 text-white rounded-tr-none" 
                  : "bg-white border rounded-tl-none text-slate-800"
              )}
              style={m.role === 'user' ? { backgroundColor: config.primaryColor } : {}}>
                {m.content}
                <div className={cn(
                  "text-[9px] mt-1 opacity-60",
                  m.role === 'user' ? "text-right" : "text-left"
                )}>
                  {m.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        
        {loading && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex gap-2"
          >
            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
              <Bot className="h-4 w-4 text-blue-600" />
            </div>
            <div className="bg-white border px-3 py-3 rounded-2xl rounded-tl-none shadow-sm flex gap-1">
              <span className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce" />
              <span className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce delay-75" />
              <span className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce delay-150" />
            </div>
          </motion.div>
        )}
      </div>

      {/* Input */}
      <form 
        onSubmit={handleSendMessage}
        className="p-3 bg-white border-t flex gap-2 items-center shrink-0"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type your message..."
          className="flex-1 bg-slate-100 border-none rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
        />
        <button
          type="submit"
          disabled={!input.trim() || loading}
          className="p-2 rounded-xl text-white transition-all disabled:opacity-50 disabled:scale-95"
          style={{ backgroundColor: config.primaryColor }}
        >
          {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
        </button>
      </form>
      
      {/* Footer */}
      <div className="py-1 text-center bg-white border-t shrink-0">
        <span className="text-[10px] text-slate-400">Powered by Dr. Dent AI</span>
      </div>
    </div>
  )
}

export default function WidgetPage() {
    return (
        <Suspense fallback={
             <div className="h-screen flex items-center justify-center bg-white">
                <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
            </div>
        }>
            <WidgetContent />
        </Suspense>
    )
}
