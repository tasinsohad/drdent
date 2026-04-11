import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Conversations",
  description: "Manage patient conversations across WhatsApp and web chat in your Dr. Dent dashboard.",
}

export default function ConversationsLayout({ children }: { children: React.ReactNode }) {
  return children
}
