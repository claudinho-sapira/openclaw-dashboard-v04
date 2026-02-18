"use client"

import { signIn } from "next-auth/react"
import { useState, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { AuroraBackground } from "@/components/ui/aurora-background"
import { motion } from "framer-motion"

function SignInForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const callbackUrl = searchParams.get("callbackUrl") || "/"
  
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const handleGoogleSignIn = async () => {
    setLoading(true)
    setError("")
    try {
      await signIn("google", { callbackUrl })
    } catch (err) {
      setError("Failed to sign in with Google")
      setLoading(false)
    }
  }

  const handleCredentialsSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      })

      if (result?.error) {
        setError("Invalid email or password")
        setLoading(false)
      } else {
        router.push(callbackUrl)
      }
    } catch (err) {
      setError("An error occurred during sign in")
      setLoading(false)
    }
  }

  return (
    <AuroraBackground>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative z-10"
      >
        {/* Glassmorphism Card */}
        <div className="w-full max-w-md mx-auto px-4">
          <div className="relative backdrop-blur-xl bg-white/10 dark:bg-black/10 border border-white/20 dark:border-white/10 rounded-2xl shadow-2xl p-8">
            {/* Header */}
            <div className="text-center mb-8">
              <h1 className="text-4xl font-bold mb-2 bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-violet-600 dark:from-blue-400 dark:to-violet-400">
                Sapira Team
              </h1>
              <p className="text-lg text-slate-700 dark:text-slate-300">
                Agent Management Tower
              </p>
            </div>

            {/* Error Message */}
            {error && (
              <div className="mb-6 p-3 rounded-lg bg-red-500/20 border border-red-500/50 text-red-700 dark:text-red-300 text-sm">
                {error}
              </div>
            )}

            {/* Google Sign In Button */}
            <Button
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="w-full bg-white hover:bg-gray-50 text-slate-900 font-semibold py-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 mb-6"
            >
              <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Sign in with Google
            </Button>

            {/* Separator */}
            <div className="relative flex items-center justify-center my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-white/20"></div>
              </div>
              <div className="relative px-4 bg-white/20 dark:bg-black/20 backdrop-blur-sm rounded-full">
                <span className="text-sm text-slate-600 dark:text-slate-400">Or continue with</span>
              </div>
            </div>

            {/* Credentials Form */}
            <form onSubmit={handleCredentialsSignIn} className="space-y-4">
              <div>
                <Label htmlFor="email" className="text-slate-700 dark:text-slate-300 font-medium">
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={loading}
                  className="mt-1 bg-white/50 dark:bg-black/50 border-white/20 backdrop-blur-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>

              <div>
                <Label htmlFor="password" className="text-slate-700 dark:text-slate-300 font-medium">
                  Password
                </Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loading}
                  className="mt-1 bg-white/50 dark:bg-black/50 border-white/20 backdrop-blur-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-700 hover:to-violet-700 text-white font-semibold py-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 mt-6"
              >
                {loading ? "Signing in..." : "Let's go"}
              </Button>
            </form>
          </div>
        </div>
      </motion.div>
    </AuroraBackground>
  )
}

export default function SignInPage() {
  return (
    <Suspense fallback={
      <AuroraBackground>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative z-10"
        >
          <div className="w-full max-w-md mx-auto px-4">
            <div className="relative backdrop-blur-xl bg-white/10 dark:bg-black/10 border border-white/20 dark:border-white/10 rounded-2xl shadow-2xl p-8">
              <div className="text-center">
                <div className="animate-pulse">Loading...</div>
              </div>
            </div>
          </div>
        </motion.div>
      </AuroraBackground>
    }>
      <SignInForm />
    </Suspense>
  )
}
