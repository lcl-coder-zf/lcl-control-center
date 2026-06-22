'use client'

import { useEffect, useState } from 'react'
import { ArrowLeft, Loader2, Download } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

const GOOGLE_DOCS_EXTS = new Set(['csv', 'txt'])

export default function OfficeViewer({
  doc,
  onBack,
}: {
  doc: { id: string; name: string; file_url: string }
  onBack: () => void
}) {
  const [embedUrl, setEmbedUrl] = useState<string | null>(null)
  const [loading, setLoading]   = useState(true)
  const supabase = createClient()

  useEffect(() => {
    async function init() {
      const { data } = await supabase.storage
        .from('documents')
        .createSignedUrl(doc.file_url, 3600)
      if (!data?.signedUrl) { setLoading(false); return }

      const fileExt = doc.name.split('.').pop()?.toLowerCase() ?? ''
      const encoded = encodeURIComponent(data.signedUrl)

      if (GOOGLE_DOCS_EXTS.has(fileExt)) {
        setEmbedUrl(`https://docs.google.com/viewer?url=${encoded}&embedded=true`)
      } else {
        setEmbedUrl(`https://view.officeapps.live.com/op/embed.aspx?src=${encoded}`)
      }
    }
    init()
  }, [doc.file_url])

  async function download() {
    const { data } = await supabase.storage.from('documents').createSignedUrl(doc.file_url, 3600)
    if (data?.signedUrl) window.open(data.signedUrl, '_blank')
  }

  return (
    <div className="flex flex-col rounded-2xl overflow-hidden"
      style={{ height: 'calc(100vh - 160px)', border: '1px solid rgba(0,40,80,0.08)', background: '#fff' }}>

      <div className="flex items-center gap-3 px-3 py-2.5 flex-shrink-0"
        style={{ borderBottom: '1px solid rgba(0,40,80,0.08)' }}>
        <button onClick={onBack}
          className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl flex-shrink-0"
          style={{ background: '#f4f7fa', color: '#6b8fa0' }}>
          <ArrowLeft className="w-3.5 h-3.5" />Documentos
        </button>
        <span className="text-sm font-semibold truncate flex-1" style={{ color: '#1a2e3b' }}>{doc.name}</span>
        <button onClick={download}
          className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl flex-shrink-0"
          style={{ background: 'rgba(64,181,250,0.12)', color: '#40b5fa', border: '1px solid rgba(64,181,250,0.2)' }}>
          <Download className="w-3.5 h-3.5" />Descargar
        </button>
      </div>

      <div className="flex-1 relative overflow-hidden">
        {loading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-white z-10">
            <Loader2 className="w-8 h-8 animate-spin" style={{ color: '#40b5fa' }} />
            <p className="text-sm" style={{ color: '#6b8fa0' }}>Cargando documento...</p>
          </div>
        )}
        {embedUrl && (
          <iframe
            src={embedUrl}
            className="w-full h-full border-0"
            title={doc.name}
            onLoad={() => setLoading(false)}
          />
        )}
      </div>
    </div>
  )
}
