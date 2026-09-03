import { NextRequest } from 'next/server'

// Verifica que la llamada a un cron traiga el secreto correcto.
// FAIL-CLOSED a propósito: si CRON_SECRET no está configurado, se rechaza
// (nunca se ejecuta sin protección). Vercel Cron manda este header solo (Bearer
// con el valor de CRON_SECRET) cuando la env var existe en el proyecto.
export function assertCron(req: NextRequest): boolean {
  const expected = process.env.CRON_SECRET
  if (!expected) return false
  return req.headers.get('authorization') === `Bearer ${expected}`
}
