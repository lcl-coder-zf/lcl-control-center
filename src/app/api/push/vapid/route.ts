import { NextResponse } from 'next/server'

export function GET() {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? null
  return NextResponse.json({ publicKey })
}
