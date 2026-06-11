'use client'

import { useState } from 'react'

export function CompanyAvatar({ name, logoUrl, size = 40 }: { name: string; logoUrl?: string | null; size?: number }) {
  const [error, setError] = useState(false)
  const initials = name.slice(0, 2).toUpperCase()
  const fontSize = size <= 40 ? 'text-sm' : 'text-lg'

  return (
    <div
      className={`rounded-xl overflow-hidden flex items-center justify-center font-black flex-shrink-0 ${fontSize}`}
      style={{ width: size, height: size, minWidth: size, background: 'rgba(64,181,250,0.12)', color: '#40b5fa' }}>
      {logoUrl && !error
        ? <img src={logoUrl} alt={name} width={size} height={size}
            className="w-full h-full object-contain p-0.5"
            onError={() => setError(true)} />
        : initials}
    </div>
  )
}
