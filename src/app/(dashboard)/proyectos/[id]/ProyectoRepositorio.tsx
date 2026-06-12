'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  Folder, FolderOpen, FolderPlus, Upload, Download,
  Trash2, ChevronRight, Loader2, Home, X,
  Clock, CheckCircle2, XCircle, AlertTriangle, Eye,
  RotateCcw, FileText, FilePlus,
} from 'lucide-react'

const STATUS_CFG = {
  pendiente:   { label: 'Pendiente',       color: '#ffd93d', bg: 'rgba(255,217,61,0.12)',   Icon: Clock },
  en_revision: { label: 'En revisión',     color: '#40b5fa', bg: 'rgba(64,181,250,0.12)',   Icon: Eye },
  aprobado:    { label: 'Aprobado',        color: '#4ade80', bg: 'rgba(74,222,128,0.12)',   Icon: CheckCircle2 },
  rechazado:   { label: 'Rechazado',       color: '#ff6b6b', bg: 'rgba(255,107,107,0.12)', Icon: XCircle },
  vencido:     { label: 'Vencido',         color: '#fb923c', bg: 'rgba(251,146,60,0.12)',  Icon: AlertTriangle },
} as const

const FILE_EMOJI: Record<string, string> = {
  pdf: '📄', xlsx: '📊', xls: '📊', csv: '📊',
  doc: '📝', docx: '📝', txt: '📃',
  ppt: '📋', pptx: '📋',
  jpg: '🖼', jpeg: '🖼', png: '🖼', gif: '🖼', webp: '🖼',
  zip: '📦', rar: '📦', '7z': '📦',
  mp4: '🎬', mp3: '🎵',
}

function ext(name: string) { return name.split('.').pop()?.toLowerCase() ?? '' }
function emoji(name: string) { return FILE_EMOJI[ext(name)] ?? '📄' }
function safePath(name: string) { return name.replace(/[^a-zA-Z0-9._\-()\s]/g, '_') }

interface Crumb { id: string | null; name: string }
interface FolderRow { id: string; name: string; parent_id: string | null; created_at: string }
interface DocRow {
  id: string; name: string; status: string; file_url: string; version: string
  uploaded_by: string; created_at: string; folder_id: string | null
  profiles?: { full_name: string }
}

export default function ProyectoRepositorio({
  projectId, companyId, canEdit, userId,
}: {
  projectId: string; companyId: string; canEdit: boolean; userId: string
}) {
  const [crumb, setCrumb] = useState<Crumb[]>([{ id: null, name: 'Repositorio' }])
  const [folders, setFolders] = useState<FolderRow[]>([])
  const [docs, setDocs] = useState<DocRow[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [showNewFolder, setShowNewFolder] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')
  const [statusMenu, setStatusMenu] = useState<string | null>(null)

  const currentId = crumb[crumb.length - 1].id

  useEffect(() => { load() }, [crumb])

  async function load() {
    setLoading(true)
    const sb = createClient()

    const fQ = sb.from('folders').select('*').eq('project_id', projectId).order('name')
    const dQ = sb.from('documents').select('*, profiles(full_name)').eq('project_id', projectId).order('name')

    if (currentId === null) {
      fQ.is('parent_id', null)
      dQ.is('folder_id', null)
    } else {
      fQ.eq('parent_id', currentId)
      dQ.eq('folder_id', currentId)
    }

    const [{ data: f }, { data: d }] = await Promise.all([fQ, dQ])
    setFolders(f ?? [])
    setDocs(d ?? [])
    setLoading(false)
  }

  function into(f: FolderRow) { setCrumb(p => [...p, { id: f.id, name: f.name }]) }
  function goTo(i: number) { setCrumb(p => p.slice(0, i + 1)) }

  async function makeFolder() {
    if (!newFolderName.trim()) return
    const sb = createClient()
    const { data } = await sb.from('folders').insert([{
      project_id: projectId, name: newFolderName.trim(),
      parent_id: currentId, created_by: userId,
    }]).select().single()
    if (data) setFolders(p => [...p, data as FolderRow].sort((a, b) => a.name.localeCompare(b.name)))
    setNewFolderName('')
    setShowNewFolder(false)
  }

  async function uploadFile(file: File, folder_id: string | null): Promise<DocRow | null> {
    const sb = createClient()
    const path = `proyectos/${projectId}/${folder_id ?? 'root'}/${Date.now()}-${safePath(file.name)}`
    const { data: up } = await sb.storage.from('documents').upload(path, file)
    if (!up) return null
    const { data: doc } = await sb.from('documents').insert([{
      company_id: companyId, project_id: projectId, folder_id,
      name: file.name, type: ext(file.name) || 'documento',
      status: 'pendiente', file_url: path, version: '1.0', uploaded_by: userId,
    }]).select('*, profiles(full_name)').single()
    return (doc as DocRow) ?? null
  }

  async function handleFiles(files: FileList | File[]) {
    setUploading(true)
    for (const file of Array.from(files)) {
      const doc = await uploadFile(file, currentId)
      if (doc) setDocs(p => [doc, ...p])
    }
    setUploading(false)
  }

  async function handleFolderUpload(files: FileList) {
    setUploading(true)
    const sb = createClient()
    const arr = Array.from(files) as (File & { webkitRelativePath: string })[]
    const folderMap: Record<string, string> = {}

    // Unique folder paths sorted top-down
    const folderPaths = Array.from(new Set(
      arr.flatMap(f => {
        const parts = f.webkitRelativePath.split('/')
        return parts.slice(0, -1).map((_, i) => parts.slice(0, i + 1).join('/'))
      })
    )).sort((a, b) => a.split('/').length - b.split('/').length || a.localeCompare(b))

    for (const fp of folderPaths) {
      const parts = fp.split('/')
      const name = parts[parts.length - 1]
      const parentPath = parts.slice(0, -1).join('/')
      const parent_id = parentPath ? (folderMap[parentPath] ?? null) : currentId

      const { data } = await sb.from('folders').insert([{
        project_id: projectId, name, parent_id, created_by: userId,
      }]).select().single()
      if (data) folderMap[fp] = (data as any).id
    }

    for (const file of arr) {
      const parts = file.webkitRelativePath.split('/')
      const fp = parts.slice(0, -1).join('/')
      const folder_id = folderMap[fp] ?? currentId
      await uploadFile(file, folder_id ?? null)
    }

    await load()
    setUploading(false)
  }

  async function replaceDoc(doc: DocRow, file: File) {
    const sb = createClient()
    const path = `proyectos/${projectId}/${doc.folder_id ?? 'root'}/${Date.now()}-${safePath(file.name)}`
    const { data: up } = await sb.storage.from('documents').upload(path, file)
    if (!up) return
    await sb.storage.from('documents').remove([doc.file_url])
    const [maj] = (doc.version ?? '1.0').split('.').map(Number)
    const newVer = `${maj + 1}.0`
    await sb.from('documents').update({ file_url: path, name: file.name, version: newVer, updated_at: new Date().toISOString() }).eq('id', doc.id)
    setDocs(p => p.map(d => d.id === doc.id ? { ...d, file_url: path, name: file.name, version: newVer } : d))
  }

  async function setStatus(docId: string, status: string) {
    const sb = createClient()
    await sb.from('documents').update({ status }).eq('id', docId)
    setDocs(p => p.map(d => d.id === docId ? { ...d, status } : d))
    setStatusMenu(null)
  }

  async function download(doc: DocRow) {
    const sb = createClient()
    const { data } = await sb.storage.from('documents').createSignedUrl(doc.file_url, 3600)
    if (data?.signedUrl) window.open(data.signedUrl, '_blank')
  }

  async function removeDoc(doc: DocRow) {
    if (!confirm(`¿Eliminar "${doc.name}"?`)) return
    const sb = createClient()
    await sb.storage.from('documents').remove([doc.file_url])
    await sb.from('documents').delete().eq('id', doc.id)
    setDocs(p => p.filter(d => d.id !== doc.id))
  }

  async function removeFolder(f: FolderRow) {
    if (!confirm(`¿Eliminar la carpeta "${f.name}" y todo su contenido?`)) return
    const sb = createClient()
    await sb.from('folders').delete().eq('id', f.id)
    setFolders(p => p.filter(x => x.id !== f.id))
  }

  return (
    <div onClick={() => setStatusMenu(null)}>
      {/* Breadcrumb + toolbar */}
      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        {/* Breadcrumb */}
        <div className="flex items-center gap-0.5 flex-wrap">
          {crumb.map((c, i) => (
            <span key={i} className="flex items-center gap-0.5">
              {i > 0 && <ChevronRight className="w-3.5 h-3.5 mx-0.5" style={{ color: '#c5d5e0' }} />}
              <button onClick={() => goTo(i)}
                className="flex items-center gap-1 px-2 py-1 rounded-lg text-sm font-medium transition-all"
                style={{ color: i === crumb.length - 1 ? '#1a2e3b' : '#40b5fa' }}>
                {i === 0 ? <Home className="w-3.5 h-3.5" /> : null}
                {c.name}
              </button>
            </span>
          ))}
        </div>

        {/* Toolbar */}
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => { setShowNewFolder(true); setNewFolderName('') }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold"
            style={{ background: 'rgba(255,217,61,0.12)', color: '#b89c00', border: '1px solid rgba(255,217,61,0.3)' }}>
            <FolderPlus className="w-3.5 h-3.5" />Nueva carpeta
          </button>

          <label className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer"
            style={{ background: 'rgba(64,181,250,0.12)', color: '#40b5fa', border: '1px solid rgba(64,181,250,0.2)' }}>
            <FilePlus className="w-3.5 h-3.5" />Subir archivos
            <input type="file" multiple className="hidden"
              onChange={e => { if (e.target.files?.length) handleFiles(e.target.files); e.target.value = '' }} />
          </label>

          <label className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer"
            style={{ background: 'rgba(167,139,250,0.12)', color: '#a78bfa', border: '1px solid rgba(167,139,250,0.2)' }}>
            <FolderOpen className="w-3.5 h-3.5" />Subir carpeta
            <input type="file" multiple className="hidden"
              {...{ webkitdirectory: '', directory: '' }}
              onChange={e => { if (e.target.files?.length) handleFolderUpload(e.target.files!); e.target.value = '' }} />
          </label>
        </div>
      </div>

      {/* New folder input */}
      {showNewFolder && (
        <div className="flex gap-2 mb-4">
          <input
            autoFocus
            value={newFolderName}
            onChange={e => setNewFolderName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') makeFolder(); if (e.key === 'Escape') setShowNewFolder(false) }}
            placeholder="Nombre de la carpeta..."
            className="flex-1 px-4 py-2.5 rounded-xl text-sm outline-none"
            style={{ background: '#f4f7fa', border: '1px solid rgba(64,181,250,0.4)', color: '#1a2e3b' }} />
          <button onClick={makeFolder}
            className="px-4 py-2 rounded-xl text-xs font-semibold"
            style={{ background: '#40b5fa', color: '#fff' }}>Crear</button>
          <button onClick={() => setShowNewFolder(false)}
            className="px-3 py-2 rounded-xl text-xs font-semibold"
            style={{ background: '#f4f7fa', color: '#6b8fa0' }}>Cancelar</button>
        </div>
      )}

      {/* Upload banner */}
      {uploading && (
        <div className="flex items-center gap-2 mb-4 px-4 py-3 rounded-xl"
          style={{ background: 'rgba(64,181,250,0.08)', border: '1px solid rgba(64,181,250,0.2)' }}>
          <Loader2 className="w-4 h-4 animate-spin flex-shrink-0" style={{ color: '#40b5fa' }} />
          <span className="text-sm" style={{ color: '#40b5fa' }}>Subiendo archivos... no cierres esta página</span>
        </div>
      )}

      {/* Drop zone + content */}
      <div
        onDragOver={e => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={e => { e.preventDefault(); setDragOver(false); if (e.dataTransfer.files.length) handleFiles(e.dataTransfer.files) }}
        className="rounded-2xl transition-all min-h-48"
        style={{
          border: dragOver ? '2px dashed #40b5fa' : '1px solid rgba(0,40,80,0.08)',
          background: dragOver ? 'rgba(64,181,250,0.03)' : '#ffffff',
          padding: '16px',
        }}>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin" style={{ color: '#40b5fa' }} />
          </div>
        ) : folders.length === 0 && docs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-14">
            <Upload className="w-10 h-10 mb-3" style={{ color: '#c5d5e0' }} />
            <p className="text-sm font-medium mb-1" style={{ color: '#6b8fa0' }}>
              {dragOver ? 'Suelta aquí' : 'Carpeta vacía'}
            </p>
            <p className="text-xs" style={{ color: '#86a2b2' }}>Arrastra archivos o usa los botones de arriba</p>
          </div>
        ) : (
          <div>
            {/* Folders */}
            {folders.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 mb-4">
                {folders.map(f => (
                  <div key={f.id}
                    className="group flex items-center gap-2.5 rounded-xl px-3 py-2.5 cursor-pointer transition-all relative"
                    style={{ background: '#fafbfc', border: '1px solid rgba(0,40,80,0.07)' }}
                    onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(255,217,61,0.4)'}
                    onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(0,40,80,0.07)'}
                    onClick={() => into(f)}>
                    <Folder className="w-5 h-5 flex-shrink-0" style={{ color: '#ffd93d' }} />
                    <span className="text-sm font-medium truncate flex-1" style={{ color: '#1a2e3b' }}>{f.name}</span>
                    {canEdit && (
                      <button
                        onClick={ev => { ev.stopPropagation(); removeFolder(f) }}
                        className="opacity-0 group-hover:opacity-100 flex-shrink-0 p-0.5 rounded transition-opacity"
                        style={{ color: '#ff6b6b' }}>
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Docs */}
            {docs.length > 0 && (
              <div className="space-y-1.5">
                {docs.map(d => {
                  const st = STATUS_CFG[d.status as keyof typeof STATUS_CFG] ?? STATUS_CFG.pendiente
                  return (
                    <div key={d.id}
                      className="group flex items-center gap-3 rounded-xl px-4 py-3 transition-all"
                      style={{ background: '#fafbfc', border: '1px solid rgba(0,40,80,0.07)' }}
                      onMouseEnter={e => e.currentTarget.style.background = '#f4f8ff'}
                      onMouseLeave={e => e.currentTarget.style.background = '#fafbfc'}>

                      {/* Icon */}
                      <span className="text-xl flex-shrink-0 select-none">{emoji(d.name)}</span>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate" style={{ color: '#1a2e3b' }}>{d.name}</p>
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full font-mono"
                            style={{ background: 'rgba(0,40,80,0.06)', color: '#6b8fa0' }}>
                            v{d.version}
                          </span>
                          {(d as any).profiles?.full_name && (
                            <span className="text-[10px]" style={{ color: '#86a2b2' }}>
                              {(d as any).profiles.full_name}
                            </span>
                          )}
                          <span className="text-[10px]" style={{ color: '#86a2b2' }}>
                            {new Date(d.created_at).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: '2-digit' })}
                          </span>
                        </div>
                      </div>

                      {/* Status badge (clickable) */}
                      <div className="relative flex-shrink-0" onClick={e => e.stopPropagation()}>
                        <button
                          onClick={() => setStatusMenu(statusMenu === d.id ? null : d.id)}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold transition-all"
                          style={{ background: st.bg, color: st.color }}>
                          <st.Icon className="w-3 h-3" />
                          {st.label}
                        </button>
                        {statusMenu === d.id && (
                          <div className="absolute top-full right-0 mt-1 rounded-xl overflow-hidden shadow-xl z-30 min-w-44"
                            style={{ background: '#fff', border: '1px solid rgba(0,40,80,0.12)' }}>
                            <p className="px-3 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-widest"
                              style={{ color: '#86a2b2' }}>Cambiar estado</p>
                            {Object.entries(STATUS_CFG).map(([key, cfg]) => (
                              <button key={key}
                                onClick={() => setStatus(d.id, key)}
                                className="w-full flex items-center gap-2.5 px-3 py-2.5 text-xs font-medium text-left transition-all"
                                style={{ color: cfg.color, background: d.status === key ? cfg.bg : 'transparent' }}>
                                <cfg.Icon className="w-3.5 h-3.5" />{cfg.label}
                                {d.status === key && <span className="ml-auto text-[10px]">✓</span>}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-0.5 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => download(d)} title="Descargar"
                          className="p-1.5 rounded-lg" style={{ color: '#40b5fa' }}>
                          <Download className="w-3.5 h-3.5" />
                        </button>
                        <label title="Reemplazar versión" className="p-1.5 rounded-lg cursor-pointer" style={{ color: '#a78bfa' }}>
                          <RotateCcw className="w-3.5 h-3.5" />
                          <input type="file" className="hidden"
                            onChange={e => { const f = e.target.files?.[0]; if (f) replaceDoc(d, f); e.target.value = '' }} />
                        </label>
                        {canEdit && (
                          <button onClick={() => removeDoc(d)} title="Eliminar"
                            className="p-1.5 rounded-lg" style={{ color: '#ff6b6b' }}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
