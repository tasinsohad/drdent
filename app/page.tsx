"use client"

import Link from "next/link"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { AuroraBackground } from "@/components/ui/aurora-background"
import {
  MessageCircle,
  Calendar,
  Users,
  BarChart3,
  Bot,
  Shield,
  Zap,
  ArrowRight,
  Sparkles,
  Check,
  ChevronRight,
  Star,
  Clock,
  TrendingDown,
  Phone,
  HelpCircle,
  Quote
} from "lucide-react"
import { ThemeToggle } from "@/components/theme-toggle"

const features = [
  {
    icon: Bot,
    title: "AI Receptionist",
    description:
      "Natural conversation AI that handles booking, rescheduling, cancellations, and FAQs — conflict-aware to prevent double bookings.",
    gradient: "from-blue-50 to-indigo-50",
    iconColor: "text-blue-600",
    borderColor: "group-hover:border-blue-200",
  },
  {
    icon: MessageCircle,
    title: "Multi-Channel",
    description:
      "Deploy across WhatsApp and your website. Same AI brain, unified inbox, seamless patient experience.",
    gradient: "from-emerald-50 to-teal-50",
    iconColor: "text-emerald-600",
    borderColor: "group-hover:border-emerald-200",
  },
  {
    icon: Calendar,
    title: "Calendar Sync",
    description:
      "Two-way Google Calendar sync. AI checks real-time availability — no conflicts, ever.",
    gradient: "from-violet-50 to-purple-50",
    iconColor: "text-violet-600",
    borderColor: "group-hover:border-violet-200",
  },
  {
    icon: Users,
    title: "Patient CRM",
    description:
      "Full patient profiles with history, notes, tags, and complete conversation timeline.",
    gradient: "from-cyan-50 to-sky-50",
    iconColor: "text-cyan-600",
    borderColor: "group-hover:border-cyan-200",
  },
  {
    icon: Shield,
    title: "Your Data, Your Control",
    description:
      "Connect your own Supabase project. Full data ownership, zero infrastructure cost.",
    gradient: "from-amber-50 to-orange-50",
    iconColor: "text-amber-600",
    borderColor: "group-hover:border-amber-200",
  },
  {
    icon: BarChart3,
    title: "Analytics Dashboard",
    description:
      "Track conversations, bookings, peak hours, and AI vs human reply ratios in real time.",
    gradient: "from-rose-50 to-pink-50",
    iconColor: "text-rose-600",
    borderColor: "group-hover:border-rose-200",
  },
]

const steps = [
  { step: 1, title: "Create Account", desc: "Sign up with email or Google in seconds" },
  { step: 2, title: "Connect Supabase", desc: "Paste your project credentials" },
  { step: 3, title: "Configure AI", desc: "Choose provider, model & persona" },
  { step: 4, title: "Go Live", desc: "Deploy widget or connect WhatsApp" },
]

const stats = [
  { icon: Clock, value: "20+", label: "Hours saved per week" },
  { icon: TrendingDown, value: "40%", label: "Reduction in no-shows" },
  { icon: Phone, value: "24/7", label: "Patient availability" },
]

const testimonials = [
  {
    quote: "Dr. Dent saves our front desk at least 20 hours a week. Patients love booking via WhatsApp, and the AI handles everything flawlessly.",
    name: "Dr. Sarah Jenkins",
    role: "Lead Dentist, Smile Care Clinic",
  },
  {
    quote: "The seamless integration with our Google Calendar means zero double bookings. It's like having a 24/7 receptionist who never takes a break.",
    name: "Mark Thompson",
    role: "Practice Manager, City Dental",
  },
  {
    quote: "We've seen a 40% reduction in no-shows since the AI started handling our reminders and rescheduling requests automatically. Highly recommended.",
    name: "Dr. Emily Chen",
    role: "Orthodontist, Precision Smiles",
  },
]

const faqs = [
  {
    q: "How does the calendar sync work?",
    a: "Dr. Dent connects directly with your Google Calendar. It checks real-time availability before offering slots to patients and instantly blocks out booked times, ensuring double booking is impossible."
  },
  {
    q: "Can the AI handle complex dental questions?",
    a: "Yes! Our AI is pre-configured with extensive dental knowledge. It can accurately answer common questions regarding procedures like root canals, whitening, or aftercare instructions."
  },
  {
    q: "What happens if a patient has an emergency?",
    a: "The AI is programmed to recognize urgency. If someone indicates severe pain or an emergency, it immediately flags the conversation, stops the AI flow, and directs them to call your emergency line."
  },
  {
    q: "Do I lose control over my conversations?",
    a: "Not at all. You can monitor all conversations in real time from the dashboard. At any point, a human staff member can seamlessly jump in, pause the AI, and take over the chat."
  }
]

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-50 font-sans transition-colors duration-300">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-slate-200/50 dark:border-slate-800/50 bg-white/70 dark:bg-slate-950/70 backdrop-blur-xl transition-colors duration-300">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-9 h-9 shrink-0 relative overflow-hidden rounded-xl shadow-sm border border-slate-200 dark:border-slate-800">
              <img src="/logo.png" alt="Dr. Dent Logo" className="object-cover w-full h-full" />
            </div>
            <span className="font-bold text-lg text-slate-800 dark:text-slate-100">Dr. Dent</span>
          </Link>
          <nav className="hidden md:flex items-center gap-10">
            <Link
              href="#features"
              className="text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors duration-200"
            >
              Features
            </Link>
            <Link
              href="#benefits"
              className="text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors duration-200"
            >
              Benefits
            </Link>
            <Link
              href="#how-it-works"
              className="text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors duration-200"
            >
              How It Works
            </Link>
          </nav>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Link href="/admin/login">
              <Button
                variant="ghost"
                size="sm"
                className="text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              >
                Admin
              </Button>
            </Link>
            <Link href="/login">
              <Button
                variant="ghost"
                className="text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              >
                Log in
              </Button>
            </Link>
            <Link href="/signup">
              <Button className="bg-blue-600 text-white hover:bg-blue-700 font-medium shadow-md shadow-blue-600/20">
                Get Started
                <ArrowRight className="w-4 h-4 ml-1.5" />
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section with Light Aurora Background */}
      <AuroraBackground className="min-h-screen pt-20">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.8, ease: "easeOut" }}
          className="relative z-10 flex flex-col items-center justify-center px-4 text-center max-w-5xl mx-auto"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1, duration: 0.5 }}
          >
            <Badge
              variant="outline"
              className="mb-8 bg-blue-50 text-blue-700 border-blue-200 px-4 py-1.5 text-sm font-medium"
            >
              <Sparkles className="w-3.5 h-3.5 mr-2 text-blue-500" />
              The Future of Dental Practice Automation
            </Badge>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.8, ease: "easeOut" }}
            className="text-5xl md:text-7xl font-extrabold mb-8 tracking-tight leading-[1.1] text-slate-900 dark:text-white"
          >
            Your 24/7 AI-Powered
            <br />
            <span className="bg-gradient-to-r from-blue-600 to-sky-500 bg-clip-text text-transparent">
              Dental Receptionist
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.8, ease: "easeOut" }}
            className="text-lg md:text-xl text-slate-600 dark:text-slate-300 max-w-2xl mx-auto mb-10 leading-relaxed font-medium"
          >
            Automate appointment booking, eliminate no-shows, and manage patient relationships 
            across WhatsApp and your website — while you focus on patient care.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7, duration: 0.8, ease: "easeOut" }}
            className="flex flex-col sm:flex-row gap-4 justify-center"
          >
            <Link href="/signup">
              <Button
                size="lg"
                className="bg-blue-600 hover:bg-blue-700 text-white text-lg px-8 h-14 shadow-lg shadow-blue-600/25 transition-all duration-300 hover:shadow-blue-600/40 hover:-translate-y-0.5 rounded-xl"
              >
                Start Free Trial
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </Link>
            <Link href="#how-it-works">
              <Button
                size="lg"
                variant="outline"
                className="text-lg px-8 h-14 border-slate-300 text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-all duration-300 rounded-xl bg-white/50 backdrop-blur-sm"
              >
                See How It Works
              </Button>
            </Link>
          </motion.div>

          {/* Trust indicators */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1, duration: 1 }}
            className="flex flex-wrap justify-center items-center gap-x-8 gap-y-4 mt-16 text-sm font-medium text-slate-500"
          >
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-500" />
              <span>No credit card required</span>
            </div>
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-500" />
              <span>14-day free trial</span>
            </div>
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-500" />
              <span>Cancel anytime</span>
            </div>
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-500" />
              <span>HIPAA Compliant</span>
            </div>
          </motion.div>
        </motion.div>
      </AuroraBackground>

      {/* Quick Stats Section */}
      <section id="benefits" className="py-16 bg-white dark:bg-slate-900 border-y border-slate-100 dark:border-slate-800 transition-colors duration-300 relative z-20">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-3 gap-8 text-center divide-y md:divide-y-0 md:divide-x divide-slate-100 dark:divide-slate-800">
            {stats.map((stat, i) => (
              <div key={i} className="pt-8 md:pt-0 flex flex-col items-center">
                <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/30 rounded-full flex items-center justify-center mb-4">
                  <stat.icon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
                <h3 className="text-4xl font-extrabold text-slate-900 dark:text-white mb-2">{stat.value}</h3>
                <p className="text-slate-600 dark:text-slate-400 font-medium">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-28 bg-slate-50 dark:bg-slate-950 transition-colors duration-300 relative">
        <div className="container mx-auto px-4 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6 }}
            className="text-center mb-20"
          >
            <Badge
              variant="outline"
              className="mb-4 bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-800 px-3 py-1 font-semibold"
            >
              <Zap className="w-3.5 h-3.5 mr-1.5 text-sky-600 dark:text-sky-400 fill-sky-500 dark:fill-sky-400" />
              Platform Features
            </Badge>
            <h2 className="text-4xl md:text-5xl font-extrabold mb-6 text-slate-900 dark:text-white tracking-tight">
              Everything your practice needs
            </h2>
            <p className="text-slate-600 dark:text-slate-400 text-xl max-w-2xl mx-auto font-medium">
              We've built a comprehensive suite of tools to automate the busywork 
              so you can focus on delivering perfect smiles.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, i) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className="group h-full"
              >
                <div
                  className={`h-full relative rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 transition-all duration-300 hover:shadow-xl hover:shadow-slate-200/50 dark:hover:shadow-black/50 ${feature.borderColor} hover:-translate-y-1`}
                >
                  <div
                    className={`w-14 h-14 rounded-xl bg-gradient-to-br ${feature.gradient} dark:opacity-80 flex items-center justify-center mb-6 transition-transform duration-300 group-hover:scale-110 shadow-sm inner-border`}
                  >
                    <feature.icon className={`w-7 h-7 ${feature.iconColor}`} />
                  </div>
                  <h3 className="font-bold text-xl text-slate-900 dark:text-white mb-3">
                    {feature.title}
                  </h3>
                  <p className="text-slate-600 dark:text-slate-400 text-base leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-28 bg-white dark:bg-slate-900 border-y border-slate-100 dark:border-slate-800 transition-colors duration-300">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6 }}
            className="text-center mb-20"
          >
            <h2 className="text-4xl md:text-5xl font-extrabold mb-6 text-slate-900 dark:text-white tracking-tight">
              Up and running in minutes
            </h2>
            <p className="text-slate-600 dark:text-slate-400 text-xl max-w-2xl mx-auto font-medium">
              We've made setup incredibly simple. You bring your API keys, we do the rest.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-4 gap-8 max-w-6xl mx-auto relative">
            <div className="hidden md:block absolute top-10 left-[12%] right-[12%] h-[2px] bg-slate-100 dark:bg-slate-800 -z-10" />
            
            {steps.map((item, i) => (
              <motion.div
                key={item.step}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.5, delay: i * 0.15 }}
                className="text-center bg-white dark:bg-slate-900"
              >
                <div className="w-20 h-20 bg-white dark:bg-slate-800 border-4 border-slate-50 dark:border-slate-950 flex items-center justify-center text-blue-600 dark:text-blue-400 font-extrabold text-3xl mx-auto rounded-full mb-6 shadow-xl shadow-slate-200/50 dark:shadow-none">
                  {item.step}
                </div>
                <h3 className="font-bold text-xl text-slate-900 dark:text-white mb-3">
                  {item.title}
                </h3>
                <p className="text-slate-600 dark:text-slate-400 text-base">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-28 bg-slate-50 dark:bg-slate-950 transition-colors duration-300 relative overflow-hidden">
        <div className="absolute top-0 right-0 -mr-40 w-96 h-96 bg-blue-100 dark:bg-blue-900/20 rounded-full blur-[100px] opacity-60" />
        <div className="absolute bottom-0 left-0 -ml-40 w-96 h-96 bg-sky-100 dark:bg-sky-900/20 rounded-full blur-[100px] opacity-60" />
        
        <div className="container mx-auto px-4 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6 }}
            className="text-center mb-20"
          >
            <h2 className="text-4xl md:text-5xl font-extrabold mb-6 text-slate-900 dark:text-white tracking-tight">
              Trusted by modern clinics
            </h2>
            <p className="text-slate-600 dark:text-slate-400 text-xl max-w-2xl mx-auto font-medium">
              See what practice managers and dentists are saying about Dr. Dent.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {testimonials.map((t, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
              >
                <div className="h-full bg-white dark:bg-slate-900 p-8 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow relative">
                  <Quote className="absolute top-6 right-6 w-10 h-10 text-slate-100 dark:text-slate-800 -z-0" />
                  <div className="flex gap-1 mb-6 relative z-10">
                    {[1, 2, 3, 4, 5].map(star => (
                      <Star key={star} className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>
                  <p className="text-slate-700 dark:text-slate-300 font-medium text-lg mb-8 relative z-10 leading-relaxed">
                    "{t.quote}"
                  </p>
                  <div className="mt-auto pt-4 border-t border-slate-100 dark:border-slate-800">
                    <p className="font-bold text-slate-900 dark:text-white">{t.name}</p>
                    <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">{t.role}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-24 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 transition-colors duration-300">
        <div className="container mx-auto px-4 max-w-4xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl font-extrabold mb-4 text-slate-900 dark:text-white tracking-tight">
              Frequently Asked Questions
            </h2>
            <p className="text-slate-600 dark:text-slate-400 text-lg">Got questions? We've got answers.</p>
          </motion.div>

          <div className="space-y-6">
            {faqs.map((faq, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.4, delay: i * 0.1 }}
                className="bg-slate-50 dark:bg-slate-950 p-6 sm:p-8 rounded-2xl border border-slate-200 dark:border-slate-800"
              >
                <div className="flex items-start gap-4">
                  <HelpCircle className="w-6 h-6 text-blue-500 flex-shrink-0 mt-1" />
                  <div>
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3">{faq.q}</h3>
                    <p className="text-slate-600 dark:text-slate-400 leading-relaxed">{faq.a}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 relative overflow-hidden bg-blue-600">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600 via-blue-700 to-sky-900 opacity-90"></div>
        
        <div className="container mx-auto px-4 text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.7 }}
            className="max-w-3xl mx-auto"
          >
            <h2 className="text-4xl md:text-6xl font-extrabold mb-6 text-white tracking-tight">
              Ready to automate your practice?
            </h2>
            <p className="text-blue-100 text-xl md:text-2xl mb-12 font-medium">
              Join modern dental practices that use Dr. Dent to deliver exceptional 24/7 patient experiences.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Link href="/signup" className="w-full sm:w-auto">
                <Button
                  size="lg"
                  className="w-full sm:w-auto bg-white text-blue-700 hover:bg-slate-50 text-xl px-12 h-16 font-extrabold shadow-2xl transition-all duration-300 hover:scale-[1.02] rounded-xl"
                >
                  Start Your Free Trial
                </Button>
              </Link>
              <p className="text-blue-200 text-sm sm:hidden mt-2">No credit card required</p>
            </div>
            
            <p className="hidden sm:block text-blue-200 mt-6 font-medium">No credit card required. Setup takes less than 5 minutes.</p>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 bg-slate-950">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 shrink-0 relative overflow-hidden rounded-lg bg-white">
                <img src="/logo.png" alt="Dr. Dent Logo" className="object-cover w-full h-full" />
              </div>
              <span className="font-bold text-white text-xl">Dr. Dent</span>
            </div>
            <div className="flex flex-wrap justify-center gap-8 text-sm font-medium text-slate-400">
              <Link href="#features" className="hover:text-white transition-colors">Features</Link>
              <Link href="#benefits" className="hover:text-white transition-colors">Benefits</Link>
              <Link href="#how-it-works" className="hover:text-white transition-colors">How It Works</Link>
              <Link href="/login" className="hover:text-white transition-colors">Sign In</Link>
            </div>
            <div className="text-slate-500 text-sm">
              © {new Date().getFullYear()} Dr. Dent. All rights reserved.
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
