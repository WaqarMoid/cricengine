import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { deliveryInputSchema } from '@/lib/engine/validators'

// POST /api/matches/[id]/deliveries - Submit a delivery
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params

    // Verify scorer PIN
    const pin = req.headers.get('x-scorer-pin')
    const match = await prisma.match.findUnique({ where: { id } })
    if (!match) return NextResponse.json({ error: 'Match not found' }, { status: 404 })
    if (match.scorerPin && pin !== match.scorerPin) {
      return NextResponse.json({ error: 'Invalid scorer PIN' }, { status: 403 })
    }

    const body = await req.json()
    const parsed = deliveryInputSchema.safeParse({ ...body, matchId: id })
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
    }

    const data = parsed.data

    // Get current events to compute over/ball position and validation
    const existingEvents = await prisma.ballEvent.findMany({
      where: { matchId: id, inningsNo: data.inningsNo, isUndone: false },
      orderBy: { sequenceNo: 'asc' },
    })

    // 1. Check if striker or non-striker is already out (Cricket Law 25)
    const alreadyOutPlayerIds = new Set(
      existingEvents.filter(e => e.isWicket && e.dismissedPlayerId).map(e => e.dismissedPlayerId!)
    )
    if (alreadyOutPlayerIds.has(data.strikerId)) {
      return NextResponse.json(
        { error: 'Cricket Law 25: The selected striker is already dismissed and cannot bat again.' },
        { status: 400 }
      )
    }
    if (alreadyOutPlayerIds.has(data.nonStrikerId)) {
      return NextResponse.json(
        { error: 'Cricket Law 25: The selected non-striker is already dismissed and cannot bat again.' },
        { status: 400 }
      )
    }

    // 2. Calculate current position
    const legalBalls = existingEvents.filter(
      e => e.extraType !== 'WIDE' && e.extraType !== 'NO_BALL'
    ).length
    const completedOvers = Math.floor(legalBalls / 6)
    const ballsInCurrentOver = legalBalls % 6

    // 3. Consecutive over check (Cricket Law 21.7)
    if (completedOvers > 0 && ballsInCurrentOver === 0 && existingEvents.length > 0) {
      const prevOverEvents = existingEvents.filter(e => e.overNumber === completedOvers - 1)
      if (prevOverEvents.length > 0) {
        const lastBowlerId = prevOverEvents[prevOverEvents.length - 1].bowlerId
        if (data.bowlerId === lastBowlerId) {
          return NextResponse.json(
            { error: 'Cricket Law 21.7: A bowler cannot bowl two consecutive overs. Please select a different bowler.' },
            { status: 400 }
          )
        }
      }
    }

    const isLegal = data.extraType !== 'WIDE' && data.extraType !== 'NO_BALL'
    const newBallInOver = isLegal ? ballsInCurrentOver + 1 : ballsInCurrentOver

    // Insert the delivery
    const event = await prisma.ballEvent.create({
      data: {
        matchId: id,
        inningsNo: data.inningsNo,
        overNumber: completedOvers,
        ballInOver: newBallInOver,
        strikerId: data.strikerId,
        nonStrikerId: data.nonStrikerId,
        bowlerId: data.bowlerId,
        runsOffBat: data.runsOffBat,
        extras: data.extras,
        extraType: data.extraType,
        isLegalDelivery: isLegal,
        isWicket: data.isWicket,
        wicketType: data.wicketType,
        dismissedPlayerId: data.dismissedPlayerId,
        fielderId: data.fielderId,
        shotX: data.shotX,
        shotY: data.shotY,
        shotZone: data.shotZone,
      },
    })

    // Update match status if needed
    if (match.status === 'SCHEDULED') {
      await prisma.match.update({ where: { id }, data: { status: 'IN_PROGRESS' } })
    }

    return NextResponse.json({ event, success: true }, { status: 201 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to submit delivery' }, { status: 500 })
  }
}

// DELETE /api/matches/[id]/deliveries - Undo last ball
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params

    // Verify scorer PIN
    const pin = req.headers.get('x-scorer-pin')
    const match = await prisma.match.findUnique({ where: { id } })
    if (!match) return NextResponse.json({ error: 'Match not found' }, { status: 404 })
    if (match.scorerPin && pin !== match.scorerPin) {
      return NextResponse.json({ error: 'Invalid scorer PIN' }, { status: 403 })
    }

    // Find last active event
    const lastEvent = await prisma.ballEvent.findFirst({
      where: { matchId: id, isUndone: false },
      orderBy: { sequenceNo: 'desc' },
    })

    if (!lastEvent) {
      return NextResponse.json({ error: 'No deliveries to undo' }, { status: 400 })
    }

    // Mark as undone (event-sourced undo)
    await prisma.ballEvent.update({
      where: { id: lastEvent.id },
      data: { isUndone: true },
    })

    return NextResponse.json({ success: true, undoneEventId: lastEvent.id })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to undo delivery' }, { status: 500 })
  }
}
