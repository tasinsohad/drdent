"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useAppStore } from "@/lib/store"
import { Eye, EyeOff, Loader2, Mail, Lock, User, Sparkles, Check, X } from "lucide-react"
import { cn } from "@/lib/utils"

interface PasswordRule {
  label: string
  test: (pw: string) => boolean
}

const PASSWORD_RULES: PasswordRule[] = [
  { label: "At least 8 characters", test: (pw) => pw.length >= 8 },
  { label: "One uppercase letter (A–Z)", test: (pw) => /[A-Z]/.test(pw) },
  { label: "One number (0–9)", test: (pw) => /[0-9]/.test(pw) },
  { label: "One special character (!@#$…)", test: (pw) => /[^A-Za-z0-9]/.test(pw) },
]

function isStrongPassword(password: string) {
  return PASSWORD_RULES.every((r) => r.test(password))
}

export default function SignupPage() {
  const router = useRouter()
  const { signup, isLoading, error, user, isInitialized } = useAppStore()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [name, setName] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [formError, setFormError] = useState("")
  const [success, setSuccess] = useState(false)
  const [passwordTouched, setPasswordTouched] = useState(false)

  useEffect(() => {
    if (isInitialized && user) {
      router.push("/conversations")
    }
  }, [user, isInitialized, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError("")

    if (!name.trim()) {
      setFormError("Practice name is required")
      return
    }
    if (!email.trim()) {
      setFormError("Email address is required")
      return
    }
    if (!password) {
      setFormError("Password is required")
      return
    }
    if (!isStrongPassword(password)) {
      setFormError("Password does not meet the requirements below")
      return
    }
    if (password !== confirmPassword) {
      setFormError("Passwords do not match")
      return
    }

    const result = await signup(email, password)
    if (result.success) {
      setSuccess(true)
      setTimeout(() => router.push("/conversations"), 1500)
    } else {
      setFormError(result.error || "Failed to create account")
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* Left — form */}
      <div className="flex-1 flex items-center justify-center p-6 bg-gradient-to-br from-slate-50 to-white dark:from-slate-950 dark:to-slate-900">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center space-y-2">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-emerald-500 mb-4 shadow-lg shadow-blue-500/25">
              <span className="text-white text-2xl" role="img" aria-label="Tooth">🦷</span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight">Create your account</h1>
            <p className="text-muted-foreground">Start your 14-day free trial — no card required</p>
          </div>

          {success ? (
            <div className="text-center space-y-4 p-8 rounded-2xl bg-green-50 border border-green-200" role="status">
              <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mx-auto">
                <Check className="h-6 w-6 text-green-600" aria-hidden="true" />
              </div>
              <h3 className="text-lg font-semibold text-green-800">Account created!</h3>
              <p className="text-green-600 text-sm">Redirecting to your dashboard…</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              {(formError || error) && (
                <div
                  role="alert"
                  className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm"
                >
                  {formError || error}
                </div>
              )}

              {/* Practice name */}
              <div className="space-y-2">
                <label htmlFor="name" className="text-sm font-medium leading-none">
                  Practice name
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" aria-hidden="true" />
                  <Input
                    id="name"
                    type="text"
                    placeholder="Your Dental Practice"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="pl-10 h-11"
                    required
                    autoComplete="organization"
                  />
                </div>
              </div>

              {/* Email */}
              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-medium leading-none">
                  Email address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" aria-hidden="true" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10 h-11"
                    required
                    autoComplete="email"
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-2">
                <label htmlFor="password" className="text-sm font-medium leading-none">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" aria-hidden="true" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value)
                      if (!passwordTouched) setPasswordTouched(true)
                    }}
                    className="pl-10 pr-10 h-11"
                    required
                    autoComplete="new-password"
                    aria-describedby="password-requirements"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword
                      ? <EyeOff className="h-4 w-4" aria-hidden="true" />
                      : <Eye className="h-4 w-4" aria-hidden="true" />}
                  </button>
                </div>

                {/* Password rules checklist */}
                {passwordTouched && (
                  <ul id="password-requirements" className="space-y-1 pt-1">
                    {PASSWORD_RULES.map((rule) => {
                      const passed = rule.test(password)
                      return (
                        <li
                          key={rule.label}
                          className={cn(
                            "flex items-center gap-2 text-xs transition-colors",
                            passed ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"
                          )}
                        >
                          {passed
                            ? <Check className="h-3.5 w-3.5 flex-shrink-0" aria-hidden="true" />
                            : <X className="h-3.5 w-3.5 flex-shrink-0" aria-hidden="true" />}
                          {rule.label}
                        </li>
                      )
                    })}
                  </ul>
                )}
              </div>

              {/* Confirm password */}
              <div className="space-y-2">
                <label htmlFor="confirmPassword" className="text-sm font-medium leading-none">
                  Confirm password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" aria-hidden="true" />
                  <Input
                    id="confirmPassword"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="pl-10 h-11"
                    required
                    autoComplete="new-password"
                  />
                </div>
              </div>

              <Button
                type="submit"
                className="w-full h-11 bg-gradient-to-r from-blue-500 to-emerald-500 hover:from-blue-600 hover:to-emerald-600 text-white font-medium shadow-lg shadow-blue-500/25"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" aria-hidden="true" />
                    Creating account…
                  </>
                ) : (
                  "Create account"
                )}
              </Button>
            </form>
          )}

          <p className="text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link href="/login" className="text-blue-600 hover:underline font-medium">
              Sign in
            </Link>
          </p>

          <p className="text-center text-xs text-muted-foreground">
            By signing up, you agree to our{" "}
            <Link href="/terms" className="hover:underline">Terms of Service</Link>
            {" "}and{" "}
            <Link href="/privacy" className="hover:underline">Privacy Policy</Link>.
          </p>
        </div>
      </div>

      {/* Right — marketing panel */}
      <div className="hidden lg:flex flex-1 bg-gradient-to-br from-blue-600 to-emerald-600 items-center justify-center p-12" aria-hidden="true">
        <div className="max-w-md text-white space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-sm text-sm">
            <Sparkles className="h-3 w-3" />
            AI-Powered Dental Receptionist
          </div>
          <h2 className="text-4xl font-bold leading-tight">
            Everything you need to run your practice
          </h2>
          <p className="text-blue-100 text-lg">
            Join hundreds of dental practices already using Dr. Dent to automate their front desk.
          </p>
          <div className="space-y-4 pt-4">
            {[
              "24/7 AI receptionist for patient inquiries",
              "Automated appointment booking & reminders",
              "Patient CRM with full conversation history",
              "Analytics dashboard with actionable insights",
            ].map((item, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <span className="text-blue-50">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
