'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Lock, KeyRound, ArrowRight, ShieldCheck, ArrowLeft, Trash2, AlertTriangle } from 'lucide-react'

interface PinGateProps {
  matchId: string
  children: React.ReactNode
}

export function PinGate({ matchId, children }: PinGateProps) {
  const [authorized, setAuthorized] = useState(false)
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    // Check sessionStorage (per session) rather than permanent persistent auto-auth
    const stored = sessionStorage.getItem(`scorer-auth-${matchId}`)
    if (stored) {
      verifyStoredPin(stored)
    } else {
      setLoading(false)
    }
  }, [matchId])

  async function verifyStoredPin(storedPin: string) {
    try {
      const res = await fetch(`/api/matches/${matchId}/verify-pin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: storedPin }),
      })
      const { valid } = await res.json()
      if (valid) {
        setAuthorized(true)
      } else {
        sessionStorage.removeItem(`scorer-auth-${matchId}`)
      }
    } catch {
      // If error, prompt for PIN
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    try {
      const res = await fetch(`/api/matches/${matchId}/verify-pin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin }),
      })
      const { valid } = await res.json()
      if (valid) {
        sessionStorage.setItem(`scorer-auth-${matchId}`, pin)
        setAuthorized(true)
      } else {
        setError('Incorrect 6-digit match key. Access denied.')
      }
    } catch {
      setError('Connection failed. Please verify match ID.')
    }
  }

  function handleLockConsole() {
    sessionStorage.removeItem(`scorer-auth-${matchId}`)
    setAuthorized(false)
    setPin('')
  }

  async function handleDeleteMatch() {
    const currentPin = sessionStorage.getItem(`scorer-auth-${matchId}`) || pin
    setIsDeleting(true)
    try {
      const res = await fetch(`/api/matches/${matchId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'x-scorer-pin': currentPin,
        },
      })
      if (res.ok) {
        sessionStorage.removeItem(`scorer-auth-${matchId}`)
        window.location.href = '/'
      } else {
        const d = await res.json()
        alert(d.error || 'Failed to delete match')
        setIsDeleting(false)
      }
    } catch {
      alert('Network error while deleting match')
      setIsDeleting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center">
        <div className="text-slate-500 font-mono text-xs uppercase tracking-widest animate-pulse font-medium">
          Verifying Scorekeeper Security Gateway...
        </div>
      </div>
    )
  }

  if (authorized) {
    return (
      <div className="relative">
        {/* Scorer Admin Sub-Bar */}
        <div className="bg-[#000F24] border-b border-white/10 px-4 py-2 text-xs text-slate-300 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            <span className="font-mono text-white text-[11px]">SCORER CONSOLE ACTIVE (KEY: ••••••)</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowDeleteModal(true)}
              className="text-red-400 hover:text-red-300 flex items-center gap-1 text-[11px] font-medium transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete Match</span>
            </button>
            <button
              onClick={handleLockConsole}
              className="text-slate-400 hover:text-white flex items-center gap-1 text-[11px] font-medium transition-colors cursor-pointer bg-white/5 hover:bg-white/10 px-2.5 py-1 rounded-md border border-white/10"
            >
              <Lock className="w-3 h-3" />
              <span>Lock / Exit</span>
            </button>
          </div>
        </div>

        {/* Delete Confirmation Modal */}
        {showDeleteModal && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl p-6 max-w-sm w-full border border-slate-200 shadow-2xl space-y-4">
              <div className="flex items-center gap-3 text-red-600">
                <AlertTriangle className="w-6 h-6" />
                <h3 className="text-sm font-semibold text-slate-900">Delete Match Fixture?</h3>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed font-normal">
                This action is permanent and will completely remove this match, ball-by-ball telemetry, partnerships, and wagon-wheel data.
              </p>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowDeleteModal(false)}
                  className="flex-1 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDeleteMatch}
                  disabled={isDeleting}
                  className="flex-1 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-medium transition-colors disabled:opacity-50"
                >
                  {isDeleting ? 'Deleting...' : 'Confirm Delete'}
                </button>
              </div>
            </div>
          </div>
        )}

        {children}
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-8 w-full max-w-md border border-slate-200 shadow-xl space-y-6">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-[#001838] flex items-center justify-center mx-auto text-white shadow-md">
            <KeyRound className="w-5 h-5 stroke-[1.75]" />
          </div>
          <h2 className="font-editorial text-lg font-normal text-[#001838] uppercase tracking-wider">
            Scorekeeper Authentication
          </h2>
          <p className="text-slate-500 text-xs font-light leading-relaxed">
            Enter the 6-digit PIN code configured during match setup to access scoring controls and management permissions.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={6}
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3.5 text-center text-3xl font-mono tracking-[0.35em] text-[#001838] focus:border-[#0066CC] focus:bg-white focus:outline-none transition-colors"
            placeholder="••••••"
            autoFocus
          />

          {error && <p className="text-red-600 text-xs text-center font-medium">{error}</p>}

          <div className="flex flex-col gap-2 pt-2">
            <button
              type="submit"
              disabled={pin.length !== 6}
              className="w-full inline-flex items-center justify-center gap-2 bg-[#0066CC] hover:bg-[#0052A3] disabled:opacity-40 text-white font-medium text-xs uppercase tracking-wider py-3 rounded-xl transition-all cursor-pointer disabled:cursor-not-allowed shadow-md"
            >
              <span>Authenticate & Enter</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>

            <Link
              href={`/live/${matchId}`}
              className="w-full text-center py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium transition-colors"
            >
              Go to Public Live Feed (No PIN needed)
            </Link>
          </div>
        </form>
      </div>
    </div>
  )
}



