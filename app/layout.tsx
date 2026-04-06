import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { ErrorBoundary } from "@/components/error-boundary"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: {
    default: "Dr. Dent - AI Dental Practice Automation",
    template: "%s | Dr. Dent",
  },
  description: "AI-powered dental practice automation platform. Automate appointment booking, eliminate no-shows, and manage patient relationships across WhatsApp and your website.",
  keywords: ["dental practice", "AI receptionist", "appointment booking", "patient management", "dental software", "WhatsApp dental", "dental automation"],
  authors: [{ name: "Dr. Dent" }],
  creator: "Dr. Dent",
  publisher: "Dr. Dent",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: process.env.NEXT_PUBLIC_APP_URL || "https://drdent.ai",
    siteName: "Dr. Dent",
    title: "Dr. Dent - AI Dental Practice Automation",
    description: "AI-powered dental practice automation platform. Automate appointment booking, eliminate no-shows, and manage patient relationships.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Dr. Dent - AI Dental Practice Automation",
    description: "AI-powered dental practice automation platform.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  icons: {
    icon: "/favicon.ico",
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ErrorBoundary>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            {children}
          </ThemeProvider>
        </ErrorBoundary>
      </body>
    </html>
  )
}
