"use client"

import { signIn } from "next-auth/react"
import { useState, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Loader2, AlertCircle } from "lucide-react"

function SignInForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const callbackUrl = searchParams.get("callbackUrl") || "/"

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const handleCredentialsSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
        callbackUrl,
      })

      if (typeof result === "string") {
        router.push(result)
        return
      }

      if (result && typeof result === "object") {
        if ((result as any).error) {
          setError("Invalid credentials")
          setLoading(false)
          return
        }
        if ((result as any).url) {
          router.push((result as any).url)
          return
        }
      }

      router.push(callbackUrl)
    } catch (err: any) {
      setError("Invalid credentials")
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-foreground text-background text-lg font-bold mb-4">
            OC
          </div>
          <h1 className="text-xl font-semibold text-foreground">Sign in to OpenClaw</h1>
          <p className="text-sm text-muted-foreground mt-1">Agent Management Dashboard</p>
        </div>

        {/* Card */}
        <div className="border rounded-xl p-6 bg-background" data-testid="signin-card">
          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm" data-testid="signin-error">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          {/* Credentials Form */}
          <form onSubmit={handleCredentialsSignIn} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-foreground mb-1.5">
                Username
              </label>
              <input
                id="email"
                type="text"
                placeholder="admin"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                disabled={loading}
                autoComplete="username"
                autoFocus
                className="w-full h-10 px-3 text-sm border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-foreground/10 focus:border-foreground/30 transition-colors disabled:opacity-50"
                data-testid="signin-username"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-foreground mb-1.5">
                Password
              </label>
              <input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                disabled={loading}
                autoComplete="current-password"
                className="w-full h-10 px-3 text-sm border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-foreground/10 focus:border-foreground/30 transition-colors disabled:opacity-50"
                data-testid="signin-password"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-10 bg-foreground text-background text-sm font-medium rounded-lg hover:bg-foreground/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              data-testid="signin-submit"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                "Sign in"
              )}
            </button>
          </form>

          {/* Divider + Google */}
          <div className="relative flex items-center my-5">
            <div className="flex-1 border-t" />
            <span className="px-3 text-xs text-muted-foreground">or</span>
            <div className="flex-1 border-t" />
          </div>

          <button
            onClick={() => signIn("google", { callbackUrl })}
            disabled={loading}
            className="w-full h-10 border rounded-lg text-sm font-medium text-foreground hover:bg-muted/50 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            data-testid="signin-google"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            Continue with Google
          </button>
        </div>

        {/* Footer */}
        <p className="text-center text-[11px] text-muted-foreground mt-6">
          OpenClaw Dashboard · Sapira AI
        </p>
      </div>
    </div>
  )
}

export default function SignInPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    }>
      <SignInForm />
    </Suspense>
  )
}
