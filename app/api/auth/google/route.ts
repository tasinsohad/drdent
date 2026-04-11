import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase-client"

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${requestUrl.origin}/auth/callback`,
      queryParams: {
        access_type: "offline",
        prompt: "consent",
      },
    },
  })

  if (error || !data.url) {
    return NextResponse.redirect(
      `${requestUrl.origin}/login?error=${encodeURIComponent(
        error?.message ?? "Google sign-in failed"
      )}`
    )
  }

  return NextResponse.redirect(data.url)
}