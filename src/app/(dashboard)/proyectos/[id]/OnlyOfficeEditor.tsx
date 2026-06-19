'use client'

import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import { ArrowLeft, Loader2, AlertCircle } from 'lucide-react'

const DocumentEditor = dynamic(
  () => import('@onlyoffice/document-editor-react').then(m => m.DocumentEditor),
  { ssr: false }
)

export default function OnlyOfficeEditor({
  documentId,
  documentName,
  onBack,
}: {
  documentId: string
  documentName: string
  onBack: () => void
}) {
  const [config, setConfig]   = useState<any>(null)
  const [error, setError]     = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const serverUrl = process.env.NEXT_PUBLIC_ONLYOFFICE_SERVER_URL

  useEffect(() => {
    if (!serverUrl) { setLoading(false); return }

    fetch('/api/onlyoffice/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ documentId }),
    })
      .then(r => r.ok ? r.json() : Promise.reject(r.statusText))
      .then(({ config }) => setConfig(config))
      .catch(() => setError('No se pudo iniciar el editor. Verifica la configuración.'))
      .finally(() => setLoading(false))
  }, [documentId, serverUrl])

  return (
    <div className="flex flex-col rounded-2xl overflow-hidden"
      style={{ height: 'calc(100vh - 160px)', border: '1px solid rgba(0,40,80,0.08)', background: '#fff' }}>

      {/* Toolbar */}
      <div className="flex items-center gap-3 px-3 py-2.5 flex-shrink-0"
        style={{ borderBottom: '1px solid rgba(0,40,80,0.08)' }}>
        <button onClick={onBack}
          className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl flex-shrink-0"
          style={{ background: '#f4f7fa', color: '#6b8fa0' }}>
          <ArrowLeft className="w-3.5 h-3.5" />Documentos
        </button>
        <span className="text-sm font-semibold truncate flex-1" style={{ color: '#1a2e3b' }}>{documentName}</span>
        {loading && <Loader2 className="w-4 h-4 animate-spin flex-shrink-0" style={{ color: '#40b5fa' }} />}
        {!loading && !error && (
          <span className="text-[10px] flex-shrink-0" style={{ color: '#86a2b2' }}>
            Los cambios se guardan automáticamente al cerrar
          </span>
        )}
      </div>

      {/* Editor area */}
      <div className="flex-1 relative overflow-hidden">
        {!serverUrl && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
            <AlertCircle className="w-8 h-8" style={{ color: '#ff6b6b' }} />
            <p className="text-sm font-semibold" style={{ color: '#1a2e3b' }}>ONLYOFFICE no configurado</p>
            <p className="text-xs text-center max-w-xs" style={{ color: '#6b8fa0' }}>
              Agrega <code className="px-1.5 py-0.5 rounded" style={{ background: '#f4f7fa' }}>NEXT_PUBLIC_ONLYOFFICE_SERVER_URL</code> en Railway.
            </p>
            <button onClick={onBack} className="mt-2 px-4 py-2 rounded-xl text-sm font-semibold"
              style={{ background: '#f4f7fa', color: '#6b8fa0' }}>Volver</button>
          </div>
        )}

        {serverUrl && loading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-white z-10">
            <Loader2 className="w-8 h-8 animate-spin" style={{ color: '#40b5fa' }} />
            <p className="text-sm" style={{ color: '#6b8fa0' }}>Cargando editor...</p>
          </div>
        )}

        {serverUrl && error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
            <AlertCircle className="w-8 h-8" style={{ color: '#ff6b6b' }} />
            <p className="text-sm" style={{ color: '#ff6b6b' }}>{error}</p>
            <button onClick={onBack} className="px-4 py-2 rounded-xl text-sm font-semibold"
              style={{ background: '#f4f7fa', color: '#6b8fa0' }}>Volver</button>
          </div>
        )}

        {serverUrl && !loading && !error && config && (
          <DocumentEditor
            id={`oo-${documentId}`}
            documentServerUrl={serverUrl}
            config={config}
            height="100%"
            width="100%"
          />
        )}
      </div>
    </div>
  )
}
