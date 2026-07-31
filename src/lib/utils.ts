import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

// Parsea una fecha de forma segura. Una fecha "sola" ("YYYY-MM-DD") se ancla al
// MEDIODÍA local para que no se corra un día hacia atrás en zonas con offset
// negativo (Colombia es UTC-5: `new Date("2026-07-30")` cae el 29 a las 7pm).
// Los timestamps completos (con hora) se dejan tal cual.
export function toLocalDate(date: string): Date {
  return /^\d{4}-\d{2}-\d{2}$/.test(date) ? new Date(date + 'T12:00:00') : new Date(date)
}

export function formatDate(date: string): string {
  return new Intl.DateTimeFormat('es-CO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(toLocalDate(date))
}

export function daysUntil(date: string): number {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const target = toLocalDate(date)
  target.setHours(0, 0, 0, 0)
  return Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
}

export function priorityColor(priority: string): string {
  const map: Record<string, string> = {
    baja: 'text-green-400 bg-green-400/10',
    media: 'text-yellow-400 bg-yellow-400/10',
    alta: 'text-orange-400 bg-orange-400/10',
    critica: 'text-red-400 bg-red-400/10',
  }
  return map[priority] || 'text-gray-400 bg-gray-400/10'
}

export function statusColor(status: string): string {
  const map: Record<string, string> = {
    activo: 'text-green-400 bg-green-400/10',
    completado: 'text-blue-400 bg-blue-400/10',
    pausado: 'text-yellow-400 bg-yellow-400/10',
    cancelado: 'text-red-400 bg-red-400/10',
    pendiente: 'text-yellow-400 bg-yellow-400/10',
    en_progreso: 'text-blue-400 bg-blue-400/10',
    completada: 'text-green-400 bg-green-400/10',
    vencida: 'text-red-400 bg-red-400/10',
    aprobado: 'text-green-400 bg-green-400/10',
    vencido: 'text-red-400 bg-red-400/10',
  }
  return map[status] || 'text-gray-400 bg-gray-400/10'
}
