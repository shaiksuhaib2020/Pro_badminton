'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError('Invalid email or password.')
      setLoading(false)
      return
    }

    router.push('/dashboard')
    router.refresh()
  }

  const inputBase = "w-full bg-so-surface text-sm text-so-text placeholder:text-so-grey px-3 py-2.5 transition-colors duration-150 focus:outline-none focus:ring-1 focus:ring-so-accent focus:border-so-accent border border-so-border rounded-lg"
  const labelClass = "text-xs font-medium text-so-muted mb-1.5 block uppercase tracking-wide"

  return (
    <div className="min-h-screen bg-so-bg flex items-center justify-center px-4">
      <div className="w-full max-w-md">

        {/* Brand Block */}
        <div className="flex flex-col items-center text-center">
          <div className="flex items-center justify-center w-12 h-12 bg-so-accent rounded-xl mb-4 shadow-sm shadow-so-accent/20">
            <svg className="w-6 h-6 text-so-text" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-so-text tracking-tight">Pro Badminton</h1>
          <p className="text-sm text-so-muted mt-1 font-medium">Staff Management Portal</p>
        </div>

        {/* Login Card */}
        <div className="bg-so-card border border-so-border rounded-2xl p-8 mt-8 shadow-sm">
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-so-text">Welcome back</h2>
            <p className="text-sm text-so-muted mt-1">Sign in to your account</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label htmlFor="email" className={labelClass}>Email Address</label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={inputBase}
                placeholder="staff@flyinggravity.in"
              />
            </div>

            <div>
              <label htmlFor="password" className={labelClass}>Password</label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={inputBase}
                placeholder="••••••••"
              />
            </div>

            {error && (
              <p className="text-sm text-red-600 bg-so-red-subtle border border-red-500/20 rounded-lg px-4 py-3 text-center">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-so-accent hover:bg-so-accent-hover text-white text-sm font-semibold rounded-lg transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed mt-2"
            >
              {loading ? (
                <svg className="animate-spin h-5 w-5 text-so-text" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  SIGN IN
                </>
              )}
            </button>
          </form>
        </div>

        {/* Footer */}
        <p className="text-xs text-so-grey text-center mt-6">
          Staff access only. Contact your manager for login details.
        </p>
        
      </div>
    </div>
  )
}
