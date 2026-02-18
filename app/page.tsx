"use client"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { Activity, Shield, Zap, CheckCircle2 } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ThemeToggle } from "@/components/theme-toggle"
import { KeyboardShortcutHint } from "@/components/keyboard-shortcut-hint"

const features = [
  {
    icon: Activity,
    title: "Next.js App Router",
    status: "complete",
    description: "Server components, streaming, and optimized routing"
  },
  {
    icon: Shield,
    title: "Google OAuth",
    status: "complete",
    description: "Domain-restricted authentication for @sapira.ai"
  },
  {
    icon: Zap,
    title: "BFF Proxy Layer",
    status: "complete",
    description: "Secure gateway communication via Cloudflare Tunnel"
  },
]

export default function Home() {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return null
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-sm">OC</span>
            </div>
            <h1 className="text-xl font-semibold">OpenClaw Dashboard</h1>
          </div>
          <div className="flex items-center gap-6">
            <KeyboardShortcutHint />
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="max-w-4xl mx-auto space-y-12"
        >
          {/* Hero Section */}
          <div className="text-center space-y-4">
            <Badge variant="info" className="mb-4">
              SAP-4: Project Scaffolding
            </Badge>
            <h2 className="text-5xl font-bold tracking-tight text-balance">
              Infrastructure Complete
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Professional-grade foundation with dark mode, authentication, and secure gateway communication.
            </p>
          </div>

          {/* Status Cards */}
          <div className="grid md:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 * index }}
              >
                <Card className="h-full">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                        <feature.icon className="h-6 w-6 text-primary" />
                      </div>
                      <Badge variant="success">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Complete
                      </Badge>
                    </div>
                    <CardTitle className="text-lg">{feature.title}</CardTitle>
                    <CardDescription>{feature.description}</CardDescription>
                  </CardHeader>
                </Card>
              </motion.div>
            ))}
          </div>

          {/* Technical Details */}
          <Card>
            <CardHeader>
              <CardTitle>Technical Stack</CardTitle>
              <CardDescription>
                Professional tooling for a production-grade dashboard
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <h4 className="font-medium text-sm text-muted-foreground">Frontend</h4>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-success" />
                      Next.js 15 (App Router)
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-success" />
                      ShadCN UI + Tailwind CSS
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-success" />
                      Framer Motion animations
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-success" />
                      Dark mode support
                    </li>
                  </ul>
                </div>
                <div className="space-y-3">
                  <h4 className="font-medium text-sm text-muted-foreground">Backend</h4>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-success" />
                      NextAuth.js (Google OAuth)
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-success" />
                      BFF proxy pattern
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-success" />
                      Cloudflare Tunnel ready
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-success" />
                      Vercel deployment
                    </li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Dashboard CTA */}
          <Card className="border-primary/20 bg-primary/5">
            <CardHeader>
              <CardTitle>Ready to Manage Your Agents</CardTitle>
              <CardDescription>
                View agent status, monitor token usage, and control your OpenClaw infrastructure
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild size="lg">
                <a href="/dashboard">
                  Go to Dashboard →
                </a>
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </main>

      {/* Footer */}
      <footer className="border-t mt-24">
        <div className="container mx-auto px-6 py-8">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <p>OpenClaw Dashboard — Built by Sapira AI</p>
            <p>Professional infrastructure · Production-ready</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
