import Link from "next/link"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Page Not Found | Dr. Dent",
  description: "The page you're looking for doesn't exist.",
}

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-6 text-center">
      {/* Animated icon */}
      <div className="relative mb-8 select-none">
        <div className="text-[6rem] leading-none animate-bounce">🦷</div>
        <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-16 h-2 bg-black/10 dark:bg-white/10 rounded-full blur-sm" />
      </div>

      {/* Status code */}
      <p className="text-sm font-semibold uppercase tracking-widest text-muted-foreground mb-2">
        404 — Page not found
      </p>

      <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-3">
        Oops! This page is missing
      </h1>

      <p className="text-muted-foreground max-w-md mb-8 text-base">
        Looks like this page took a day off. The URL might be wrong, or the page may have been moved or deleted.
      </p>

      <div className="flex flex-col sm:flex-row gap-3">
        <Link
          href="/conversations"
          className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-medium transition-colors shadow-lg shadow-blue-500/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
        >
          Go to Dashboard
        </Link>
        <Link
          href="/login"
          className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl border border-border hover:bg-muted font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          Sign In
        </Link>
      </div>

      {/* Brand footer */}
      <p className="mt-16 text-xs text-muted-foreground/60">
        Dr. Dent — AI Dental Practice Automation
      </p>
    </div>
  )
}
