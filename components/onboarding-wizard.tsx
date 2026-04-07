"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import * as Dialog from "@radix-ui/react-dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useAppStore } from "@/lib/store"
import { getAIConfig, saveAIConfig, getWorkspace } from "@/lib/db"
import { Loader2, CheckCircle2, ChevronRight, Zap } from "lucide-react"

export function OnboardingWizard() {
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState(1)
  const [checking, setChecking] = useState(true)
  const [loading, setLoading] = useState(false)
  
  const [apiKey, setApiKey] = useState("")
  
  const { user, supabaseConnected } = useAppStore()
  const router = useRouter()

  useEffect(() => {
    const checkOnboarding = async () => {
      if (!user) return
      
      try {
        const workspace = await getWorkspace()
        const config = await getAIConfig()
        
        // If no config exists, prompt onboarding
        if (!config || !config.provider) {
          setOpen(true)
        }
      } catch (err) {
        console.error("Onboarding check failed", err)
      } finally {
        setChecking(false)
      }
    }
    
    if (user && supabaseConnected) {
      checkOnboarding()
    } else {
      setChecking(false)
    }
  }, [user, supabaseConnected])

  const handleComplete = async () => {
    setLoading(true)
    try {
      await saveAIConfig({
        provider: "openai",
        model: "gpt-4o",
        api_key_encrypted: apiKey || undefined,
        system_prompt: "You are Dr. Dente, a friendly and professional dental receptionist for a dental clinic. You help patients book appointments, answer questions about dental services, and provide oral health tips.",
        persona_name: "Dr. Dente",
        business_hours_start: "09:00",
        business_hours_end: "18:00",
        off_hours_message: "We are currently closed. We'll get back to you soon!",
        supported_languages: ["English"]
      })
      setOpen(false)
      router.refresh()
    } catch (err) {
      console.error("Failed to complete onboarding", err)
    }
    setLoading(false)
  }

  if (checking) return null

  return (
    <Dialog.Root open={open} onOpenChange={(val) => {
      // Prevent closing by clicking outside during onboarding
      if (!val && step < 3) return
      setOpen(val)
    }}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content className="fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background shadow-xl duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 sm:rounded-xl overflow-hidden p-6 sm:p-8">
          
          {step === 1 && (
            <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/50 rounded-2xl flex items-center justify-center text-blue-600">
                  <Zap className="h-8 w-8" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold tracking-tight">Welcome to Dr. Dent!</h2>
                  <p className="text-muted-foreground mt-2">Let's get your AI Receptionist set up in just a few clicks.</p>
                </div>
              </div>
              
              <div className="bg-muted p-4 rounded-lg flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-sm">Database Connected</p>
                  <p className="text-xs text-muted-foreground">Your Supabase connection is active and models are migrated.</p>
                </div>
              </div>

              <Button className="w-full h-11" onClick={() => setStep(2)}>
                Continue to AI Setup <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
              
              <Button variant="outline" className="w-full" onClick={() => setOpen(false)}>
                Skip for now
              </Button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
              <div>
                <h2 className="text-xl font-bold">Connect your AI</h2>
                <p className="text-muted-foreground text-sm mt-1">Dr. Dent uses OpenAI to power your receptionist.</p>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>OpenAI API Key (Optional)</Label>
                  <Input 
                    type="password" 
                    placeholder="sk-..." 
                    value={apiKey} 
                    onChange={(e) => setApiKey(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">You can skip this and add it later in Settings.</p>
                </div>
              </div>

              <div className="flex gap-3">
                <Button variant="outline" className="w-full flex-1" onClick={() => handleComplete()}>
                  Skip for now
                </Button>
                <Button className="w-full flex-1" onClick={() => handleComplete()} disabled={loading}>
                  {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Complete Setup
                </Button>
              </div>
            </div>
          )}
          
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
