'use client'
import { useState, useEffect, useCallback } from 'react'

export interface MatchStateResponse {
  match: {
    id: string
    teamAName: string
    teamBName: string
    oversLimit: number
    status: 'SCHEDULED' | 'IN_PROGRESS' | 'INNINGS_BREAK' | 'COMPLETED' | 'ABANDONED'
    currentInnings: number
    tossWinner: string | null
    tossDecision: 'BAT' | 'BOWL' | null
    teamAPlayerIds: string[]
    teamBPlayerIds: string[]
    createdAt: string
    tournament?: { id: string; name: string; shortName: string | null } | null
    stage?: string | null
    groupName?: string | null
    matchLabel?: string | null
    venue?: string | null
    scheduledAt?: string | null
  }
  summary?: {
    battingFirst: 'A' | 'B'
    innings: Array<{ side: 'A' | 'B'; teamName: string; runs: number; wickets: number; overs: string }>
    result: { winner: 'A' | 'B' | null; text: string } | null
    isComplete: boolean
  }
  players: Record<string, {
    id: string
    name: string
    battingStyle: string | null
    bowlingStyle: string | null
  }>
  innings1: any
  innings2: any | null
  rawEvents?: any[]
}

export function useMatchState(matchId: string, pollingInterval = 3000) {
  const [data, setData] = useState<MatchStateResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchState = useCallback(async () => {
    try {
      const res = await fetch(`/api/matches/${matchId}`, { cache: 'no-store' })
      if (!res.ok) throw new Error('Failed to fetch match state')
      const json = await res.json()
      setData(json)
      setError(null)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [matchId])

  useEffect(() => {
    fetchState()
    const interval = setInterval(fetchState, pollingInterval)
    return () => clearInterval(interval)
  }, [fetchState, pollingInterval])

  return { data, loading, error, refetch: fetchState }
}
