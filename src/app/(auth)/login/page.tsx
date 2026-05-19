'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Eye, EyeOff, Lock, Mail, Loader2 } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError('Correo o contraseña incorrectos')
      setLoading(false)
      return
    }

    router.push('/dashboard')
    router.refresh()
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4"
      style={{ background: '#f4f7fa' }}>

      {/* Glow top right */}
      <div className="pointer-events-none fixed top-0 right-0 w-[500px] h-[500px] rounded-full"
        style={{ background: 'radial-gradient(circle, rgba(64,181,250,0.06) 0%, transparent 70%)' }} />

      <div className="w-full max-w-md">
        {/* Logo / Brand */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 mb-4 px-4 py-2 rounded-full border text-xs font-semibold tracking-widest uppercase"
            style={{ background: 'rgba(64,181,250,0.10)', borderColor: 'rgba(64,181,250,0.25)', color: '#40b5fa' }}>
            <span className="w-1.5 h-1.5 rounded-full bg-[#40b5fa] animate-pulse" />
            Sistema interno
          </div>
          <h1 className="text-4xl font-black tracking-tight" style={{ fontFamily: 'var(--font-poppins)', color: '#1a2e3b' }}>
            <span style={{ color: '#40b5fa' }}>LCL</span> Control
          </h1>
          <p className="text-sm mt-2" style={{ color: '#6b8fa0' }}>LCL Gestión Empresarial</p>
        </div>

        {/* Card */}
        <div className="rounded-2xl border p-8"
          style={{ background: '#ffffff', borderColor: 'rgba(0,40,80,0.08)', boxShadow: '0 4px 24px rgba(0,40,80,0.10)' }}>
          <h2 className="text-lg font-semibold mb-6" style={{ color: '#1a2e3b' }}>Iniciar sesión</h2>

          <form onSubmit={handleLogin} className="space-y-4">
            {/* Email */}
            <div>
              <label className="block text-xs font-medium mb-1.5 tracking-wide uppercase"
                style={{ color: '#6b8fa0' }}>Correo electrónico</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#6b8fa0' }} />
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  placeholder="tu@lcl.com"
                  className="w-full pl-10 pr-4 py-3 rounded-xl text-sm outline-none transition-all"
                  style={{
                    background: '#f4f7fa',
                    border: '1px solid rgba(0,40,80,0.10)',
                    color: '#1a2e3b',
                  }}
                  onFocus={e => e.target.style.borderColor = 'rgba(64,181,250,0.5)'}
                  onBlur={e => e.target.style.borderColor = 'rgba(0,40,80,0.10)'}
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-medium mb-1.5 tracking-wide uppercase"
                style={{ color: '#6b8fa0' }}>Contraseña</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#6b8fa0' }} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  className="w-full pl-10 pr-10 py-3 rounded-xl text-sm outline-none transition-all"
                  style={{
                    background: '#f4f7fa',
                    border: '1px solid rgba(0,40,80,0.10)',
                    color: '#1a2e3b',
                  }}
                  onFocus={e => e.target.style.borderColor = 'rgba(64,181,250,0.5)'}
                  onBlur={e => e.target.style.borderColor = 'rgba(0,40,80,0.10)'}
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5"
                  style={{ color: '#6b8fa0' }}>
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="rounded-xl px-4 py-3 text-sm"
                style={{ background: 'rgba(255,107,107,0.10)', border: '1px solid rgba(255,107,107,0.25)', color: '#ff6b6b' }}>
                {error}
              </div>
            )}

            {/* Submit */}
            <button type="submit" disabled={loading}
              className="w-full py-3 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2 mt-2"
              style={{ background: '#40b5fa', color: '#ffffff' }}>
              {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Ingresando...</> : 'Ingresar'}
            </button>
          </form>
        </div>

        <p className="text-center text-xs mt-6" style={{ color: '#6b8fa0' }}>
          Sistema de uso exclusivo interno · LCL Gestión Empresarial
        </p>
      </div>
    </div>
  )
}
