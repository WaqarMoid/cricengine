'use client'
import { useCallback } from 'react'
import { DeliveryInput } from '@/lib/engine/types'

export function useScoringActions(matchId: string) {
  const getPin = () => {
    if (typeof window === 'undefined') return ''
    return localStorage.getItem(`scorer-pin-${matchId}`) || ''
  }

  const submitDelivery = useCallback(async (delivery: Omit<DeliveryInput, 'matchId'>) => {
    const res = await fetch(`/api/matches/${matchId}/deliveries`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-scorer-pin': getPin(),
      },
      body: JSON.stringify(delivery),
    })
    if (!res.ok) {
      const err = await res.json()
      throw new Error(err.error || 'Failed to submit delivery')
    }
    return res.json()
  }, [matchId])

  const undoLastBall = useCallback(async () => {
    const res = await fetch(`/api/matches/${matchId}/deliveries`, {
      method: 'DELETE',
      headers: { 'x-scorer-pin': getPin() },
    })
    if (!res.ok) {
      const err = await res.json()
      throw new Error(err.error || 'Failed to undo')
    }
    return res.json()
  }, [matchId])

  const updateMatchStatus = useCallback(async (data: Record<string, any>) => {
    const res = await fetch(`/api/matches/${matchId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'x-scorer-pin': getPin(),
      },
      body: JSON.stringify(data),
    })
    if (!res.ok) {
      const err = await res.json()
      throw new Error(err.error || 'Failed to update match')
    }
    return res.json()
  }, [matchId])

  const verifyPin = useCallback(async (pin: string): Promise<boolean> => {
    const res = await fetch(`/api/matches/${matchId}/verify-pin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin }),
    })
    const { valid } = await res.json()
    if (valid) {
      localStorage.setItem(`scorer-pin-${matchId}`, pin)
    }
    return valid
  }, [matchId])

  return { submitDelivery, undoLastBall, updateMatchStatus, verifyPin }
}
