'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import dynamic from 'next/dynamic'
import { createClient } from '@/lib/supabase/client'

const DocEditor = dynamic(() => import('./DocEditor'), { ssr: false })
import {
  Folder, FolderOpen, FolderPlus, Upload, Download,
  Trash2, ChevronRight, Loader2, Home, X,
  Clock, CheckCircle2, XCircle, AlertTriangle, Eye,
  RotateCcw, FileText, FilePlus, ArrowLeft, Send,
  Shield, GitBranch, Users, BarChart3, CheckSquare,
  ChevronDown, Printer, PenLine, History, MessageSquare,
} from 'lucide-react'

/* ── Constants ──────────────────────────────────────────── */
const FILE_STATUS = {
  pendiente:   { label: 'Pendiente',   color: '#ffd93d', bg: 'rgba(255,217,61,0.12)',   Icon: Clock },
  en_revision: { label: 'En revisión', color: '#40b5fa', bg: 'rgba(64,181,250,0.12)',   Icon: Eye },
  aprobado:    { label: 'Aprobado',    color: '#4ade80', bg: 'rgba(74,222,128,0.12)',   Icon: CheckCircle2 },
  rechazado:   { label: 'Rechazado',   color: '#ff6b6b', bg: 'rgba(255,107,107,0.12)', Icon: XCircle },
  vencido:     { label: 'Vencido',     color: '#fb923c', bg: 'rgba(251,146,60,0.12)',  Icon: AlertTriangle },
} as const

const DOC_STATUS = {
  borrador:    { label: 'Borrador',    Icon: Clock,        color: '#6b8fa0', bg: 'rgba(107,143,160,0.12)' },
  en_revision: { label: 'En revisión', Icon: Eye,          color: '#ffd93d', bg: 'rgba(255,217,61,0.12)'  },
  aprobado:    { label: 'Aprobado',    Icon: CheckCircle2, color: '#4ade80', bg: 'rgba(74,222,128,0.12)'  },
  rechazado:   { label: 'Rechazado',   Icon: XCircle,      color: '#ff6b6b', bg: 'rgba(255,107,107,0.12)' },
} as const

const DOC_TYPES = {
  documento:          { label: 'Documento',             Icon: FileText,    color: '#40b5fa', bg: 'rgba(64,181,250,0.10)'   },
  politica:           { label: 'Política',              Icon: Shield,      color: '#a78bfa', bg: 'rgba(167,139,250,0.10)'  },
  procedimiento:      { label: 'Procedimiento',         Icon: GitBranch,   color: '#fb923c', bg: 'rgba(251,146,60,0.10)'   },
  acta:               { label: 'Acta de reunión',       Icon: Users,       color: '#4ade80', bg: 'rgba(74,222,128,0.10)'   },
  informe:            { label: 'Informe',               Icon: BarChart3,   color: '#ffd93d', bg: 'rgba(255,217,61,0.10)'   },
  lista_verificacion: { label: 'Lista de verificación', Icon: CheckSquare, color: '#2dd4bf', bg: 'rgba(45,212,191,0.10)'   },
} as const

type DocType    = keyof typeof DOC_TYPES
type DocStatus  = keyof typeof DOC_STATUS
type FileStatus = keyof typeof FILE_STATUS

const FILE_EMOJI: Record<string, string> = {
  pdf: '📄', xlsx: '📊', xls: '📊', csv: '📊',
  doc: '📝', docx: '📝', txt: '📃',
  ppt: '📋', pptx: '📋',
  jpg: '🖼', jpeg: '🖼', png: '🖼', gif: '🖼', webp: '🖼',
  zip: '📦', rar: '📦', '7z': '📦',
  mp4: '🎬', mp3: '🎵',
}

function ext(name: string)      { return name.split('.').pop()?.toLowerCase() ?? '' }
function emoji(name: string)    { return FILE_EMOJI[ext(name)] ?? '📄' }
function safePath(name: string) { return name.replace(/[^a-zA-Z0-9._\-()\s]/g, '_') }
function majorVer(ver: string)  { return parseInt((ver ?? '1.0').split('.')[0], 10) }

/* ── Types ──────────────────────────────────────────────── */
interface Crumb      { id: string | null; name: string }
interface FolderRow  { id: string; name: string; parent_id: string | null; created_at: string }
interface DocRow {
  id: string; name: string; status: string; file_url: string; version: string
  uploaded_by: string; created_at: string; folder_id: string | null
  profiles?: { full_name: string }
  rejection_note?: string | null
}
interface VersionRow { id: string; version_number: number; file_name: string; created_at: string }
interface EditableDoc {
  id: string; name: string; doc_type: DocType; content: any
  status: DocStatus; version: string; updated_at: string
  rejection_note?: string | null
}

/* ── Small helpers ──────────────────────────────────────── */
function ToolBtn({ active, onClick, title, children, disabled }: {
  active?: boolean; onClick: () => void; title: string
  children: React.ReactNode; disabled?: boolean
}) {
  return (
    <button onClick={onClick} title={title} disabled={disabled}
      className="p-1.5 rounded-lg transition-all flex-shrink-0"
      style={{
        background: active ? 'rgba(64,181,250,0.15)' : 'transparent',
        color: active ? '#40b5fa' : '#6b8fa0',
        opacity: disabled ? 0.3 : 1,
      }}>
      {children}
    </button>
  )
}

function TDiv() {
  return <div className="w-px h-5 flex-shrink-0" style={{ background: 'rgba(0,40,80,0.10)' }} />
}

/* ── Main component ─────────────────────────────────────── */
export default function ProyectoRepositorio({
  projectId, companyId, canEdit, userId,
}: {
  projectId: string; companyId: string; canEdit: boolean; userId: string
}) {
  /* browser state */
  const [crumb, setCrumb]               = useState<Crumb[]>([{ id: null, name: 'Documentos' }])
  const [folders, setFolders]           = useState<FolderRow[]>([])
  const [docs, setDocs]                 = useState<DocRow[]>([])
  const [editableDocs, setEditableDocs] = useState<EditableDoc[]>([])
  const [loading, setLoading]           = useState(true)
  const [uploading, setUploading]       = useState(false)
  const [dragOver, setDragOver]         = useState(false)
  const [showNewFolder, setShowNewFolder]   = useState(false)
  const [newFolderName, setNewFolderName]   = useState('')
  const [showNewDocMenu, setShowNewDocMenu] = useState(false)
  const [creatingDoc, setCreatingDoc]       = useState(false)

  /* admin status menus */
  const [fileStatusMenu, setFileStatusMenu] = useState<string | null>(null)
  const [docStatusMenu, setDocStatusMenu]   = useState(false)

  /* reject modal */
  const [rejectTarget, setRejectTarget] = useState<{ id: string; kind: 'file' | 'doc' } | null>(null)
  const [rejectNote, setRejectNote]     = useState('')

  /* version history */
  const [versionHistories, setVersionHistories] = useState<Record<string, VersionRow[]>>({})
  const [loadingVersions, setLoadingVersions]   = useState<string | null>(null)

  /* editor state */
  const [viewMode, setViewMode]         = useState<'browser' | 'editor'>('browser')
  const [docName, setDocName]           = useState('')
  const [docType, setDocType]           = useState<DocType>('documento')
  const [docStatus, setDocStatus]       = useState<DocStatus>('borrador')
  const [docRejectionNote, setDocRejectionNote] = useState('')
  const [saveState, setSaveState]       = useState<'idle' | 'saving' | 'saved'>('idle')
  const [wordCount, setWordCount]       = useState(0)
  const [activeDocId, setActiveDocId]   = useState<string | null>(null)
  const [currentContent, setCurrentContent] = useState<any>(null)

  const currentId = crumb[crumb.length - 1].id
  const supabase  = createClient()

  async function persistContent(content: any) {
    if (!activeDocId) return
    await supabase
      .from('workspace_docs')
      .update({ content, updated_at: new Date().toISOString(), updated_by: userId })
      .eq('id', activeDocId)
  }

  /* ── Load ───────────────────────────────────────────── */
  useEffect(() => { load() }, [crumb])

  async function load() {
    setLoading(true)
    const fQ = supabase.from('folders').select('*').eq('project_id', projectId).order('name')
    const dQ = supabase.from('documents').select('*, profiles(full_name)').eq('project_id', projectId).order('name')
    const eQ = supabase.from('workspace_docs')
      .select('id, name, doc_type, content, status, version, updated_at, rejection_note')
      .eq('project_id', projectId)
      .order('updated_at', { ascending: false })

    if (currentId === null) { fQ.is('parent_id', null); dQ.is('folder_id', null) }
    else                    { fQ.eq('parent_id', currentId); dQ.eq('folder_id', currentId) }

    const [{ data: f }, { data: d }, { data: e }] = await Promise.all([fQ, dQ, eQ])
    setFolders(f ?? [])
    setDocs(d ?? [])
    setEditableDocs((e ?? []) as EditableDoc[])
    setLoading(false)
  }

  /* ── Browser navigation ─────────────────────────────── */
  function into(f: FolderRow) { setCrumb(p => [...p, { id: f.id, name: f.name }]) }
  function goTo(i: number)    { setCrumb(p => p.slice(0, i + 1)) }

  /* ── Folder CRUD ────────────────────────────────────── */
  async function makeFolder() {
    if (!newFolderName.trim()) return
    const { data } = await supabase.from('folders').insert([{
      project_id: projectId, name: newFolderName.trim(), parent_id: currentId, created_by: userId,
    }]).select().single()
    if (data) setFolders(p => [...p, data as FolderRow].sort((a, b) => a.name.localeCompare(b.name)))
    setNewFolderName(''); setShowNewFolder(false)
  }

  async function removeFolder(f: FolderRow) {
    if (!confirm(`¿Eliminar la carpeta "${f.name}" y todo su contenido?`)) return
    await supabase.from('folders').delete().eq('id', f.id)
    setFolders(p => p.filter(x => x.id !== f.id))
  }

  /* ── File upload ────────────────────────────────────── */
  async function uploadFile(file: File, folder_id: string | null): Promise<DocRow | null> {
    const path = `proyectos/${projectId}/${folder_id ?? 'root'}/${Date.now()}-${safePath(file.name)}`
    const { data: up } = await supabase.storage.from('documents').upload(path, file)
    if (!up) return null
    const { data: doc } = await supabase.from('documents').insert([{
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
    const arr      = Array.from(files) as (File & { webkitRelativePath: string })[]
    const folderMap: Record<string, string> = {}

    const folderPaths = Array.from(new Set(
      arr.flatMap(f => {
        const parts = f.webkitRelativePath.split('/')
        return parts.slice(0, -1).map((_, i) => parts.slice(0, i + 1).join('/'))
      })
    )).sort((a, b) => a.split('/').length - b.split('/').length || a.localeCompare(b))

    for (const fp of folderPaths) {
      const parts = fp.split('/')
      const name  = parts[parts.length - 1]
      const parentPath = parts.slice(0, -1).join('/')
      const parent_id  = parentPath ? (folderMap[parentPath] ?? null) : currentId
      const { data } = await supabase.from('folders').insert([{
        project_id: projectId, name, parent_id, created_by: userId,
      }]).select().single()
      if (data) folderMap[fp] = (data as any).id
    }

    for (const file of arr) {
      const parts = file.webkitRelativePath.split('/')
      const fp    = parts.slice(0, -1).join('/')
      const folder_id = folderMap[fp] ?? currentId
      await uploadFile(file, folder_id ?? null)
    }

    await load(); setUploading(false)
  }

  async function replaceDoc(doc: DocRow, file: File) {
    setUploading(true)
    const path = `proyectos/${projectId}/${doc.folder_id ?? 'root'}/${Date.now()}-${safePath(file.name)}`
    const { data: up } = await supabase.storage.from('documents').upload(path, file)
    if (!up) { setUploading(false); return }
    const maj = majorVer(doc.version)
    await supabase.from('document_versions').insert([{
      document_id: doc.id, version_number: maj,
      file_url: doc.file_url, file_name: doc.name, uploaded_by: userId,
    }])
    const newVer = `${maj + 1}.0`
    await supabase.from('documents').update({
      file_url: path, name: file.name, version: newVer,
      status: 'pendiente', rejection_note: null,
      updated_at: new Date().toISOString(),
    }).eq('id', doc.id)
    setDocs(p => p.map(d => d.id === doc.id
      ? { ...d, file_url: path, name: file.name, version: newVer, status: 'pendiente', rejection_note: null }
      : d))
    // collapse version history so it reloads next time
    setVersionHistories(p => { const n = { ...p }; delete n[doc.id]; return n })
    setUploading(false)
  }

  /* ── Workflow actions ───────────────────────────────── */
  async function submitDoc(docId: string) {
    await supabase.from('documents').update({ status: 'en_revision', rejection_note: null }).eq('id', docId)
    await supabase.from('document_approvals').insert([{ document_id: docId, action: 'submitted', performed_by: userId }])
    setDocs(p => p.map(d => d.id === docId ? { ...d, status: 'en_revision', rejection_note: null } : d))
  }

  async function approveDoc(docId: string) {
    await supabase.from('documents').update({ status: 'aprobado', rejection_note: null }).eq('id', docId)
    await supabase.from('document_approvals').insert([{ document_id: docId, action: 'approved', performed_by: userId }])
    setDocs(p => p.map(d => d.id === docId ? { ...d, status: 'aprobado', rejection_note: null } : d))
  }

  async function adminSetFileStatus(docId: string, status: string) {
    setFileStatusMenu(null)
    if (status === 'rechazado') { openRejectModal('file', docId); return }
    await supabase.from('documents').update({ status, rejection_note: null }).eq('id', docId)
    setDocs(p => p.map(d => d.id === docId ? { ...d, status, rejection_note: null } : d))
  }

  function openRejectModal(kind: 'file' | 'doc', id: string) {
    setRejectTarget({ kind, id })
    setRejectNote('')
  }

  async function confirmReject() {
    if (!rejectTarget) return
    const { kind, id } = rejectTarget
    const note = rejectNote.trim() || null

    if (kind === 'file') {
      await supabase.from('documents').update({ status: 'rechazado', rejection_note: note }).eq('id', id)
      await supabase.from('document_approvals').insert([{
        document_id: id, action: 'rejected', performed_by: userId, notes: note,
      }])
      setDocs(p => p.map(d => d.id === id ? { ...d, status: 'rechazado', rejection_note: note } : d))
    } else {
      await supabase.from('workspace_docs').update({
        status: 'rechazado', rejection_note: note, updated_at: new Date().toISOString(),
      }).eq('id', id)
      if (activeDocId === id) {
        setDocStatus('rechazado')
        setDocRejectionNote(note ?? '')
      }
      setEditableDocs(p => p.map(d => d.id === id ? { ...d, status: 'rechazado', rejection_note: note } : d))
    }
    setRejectTarget(null); setRejectNote('')
  }

  /* ── Version history ────────────────────────────────── */
  async function toggleVersionHistory(docId: string) {
    if (versionHistories[docId]) {
      setVersionHistories(p => { const n = { ...p }; delete n[docId]; return n })
      return
    }
    setLoadingVersions(docId)
    const { data } = await supabase.from('document_versions')
      .select('id, version_number, file_name, created_at')
      .eq('document_id', docId)
      .order('version_number', { ascending: false })
    setVersionHistories(p => ({ ...p, [docId]: (data ?? []) as VersionRow[] }))
    setLoadingVersions(null)
  }

  /* ── File helpers ───────────────────────────────────── */
  async function download(doc: DocRow) {
    const { data } = await supabase.storage.from('documents').createSignedUrl(doc.file_url, 3600)
    if (data?.signedUrl) window.open(data.signedUrl, '_blank')
  }

  async function removeDoc(doc: DocRow) {
    if (!confirm(`¿Eliminar "${doc.name}"?`)) return
    await supabase.storage.from('documents').remove([doc.file_url])
    await supabase.from('documents').delete().eq('id', doc.id)
    setDocs(p => p.filter(d => d.id !== doc.id))
  }

  /* ── Editable docs ──────────────────────────────────── */
  async function createEditableDoc(type: DocType) {
    setCreatingDoc(true); setShowNewDocMenu(false)
    const { data } = await supabase.from('workspace_docs').insert([{
      project_id: projectId, name: 'Sin título', doc_type: type,
      content: { type: 'doc', content: [{ type: 'paragraph' }] },
      status: 'borrador', version: '1.0', created_by: userId, updated_by: userId,
    }]).select('id, name, doc_type, content, status, version, updated_at, rejection_note').single()
    setCreatingDoc(false)
    if (data) {
      const nd = data as EditableDoc
      setEditableDocs(p => [nd, ...p])
      openEditableDoc(nd)
    }
  }

  function openEditableDoc(doc: EditableDoc) {
    setActiveDocId(doc.id)
    setDocName(doc.name)
    setDocType(doc.doc_type)
    setDocStatus(doc.status)
    setDocRejectionNote(doc.rejection_note ?? '')
    setCurrentContent(doc.content)
    setViewMode('editor')
  }

  function goBackToBrowser() {
    setActiveDocId(null)
    setViewMode('browser')
    load()
  }

  async function saveEditableName(name: string) {
    if (!activeDocId || !name.trim()) return
    await supabase.from('workspace_docs').update({ name: name.trim(), updated_at: new Date().toISOString() }).eq('id', activeDocId)
    setEditableDocs(p => p.map(d => d.id === activeDocId ? { ...d, name: name.trim() } : d))
  }

  async function changeEditableStatus(status: DocStatus) {
    if (!activeDocId) return
    if (status === 'rechazado') {
      openRejectModal('doc', activeDocId)
      return
    }
    setDocStatus(status)
    setDocRejectionNote('')
    await supabase.from('workspace_docs').update({
      status, rejection_note: null,
      updated_at: new Date().toISOString(),
    }).eq('id', activeDocId)
    setEditableDocs(p => p.map(d => d.id === activeDocId
      ? { ...d, status, rejection_note: null }
      : d))
  }

  async function deleteEditableDoc(id: string, e: React.MouseEvent) {
    e.stopPropagation()
    if (!confirm('¿Eliminar este documento?')) return
    await supabase.from('workspace_docs').delete().eq('id', id)
    setEditableDocs(p => p.filter(d => d.id !== id))
  }

  const RejectModal = rejectTarget ? (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(10,20,40,0.45)' }}
      onClick={e => { if (e.target === e.currentTarget) { setRejectTarget(null); setRejectNote('') } }}>
      <div className="w-full max-w-md rounded-2xl p-6 shadow-2xl"
        style={{ background: '#fff', border: '1px solid rgba(255,107,107,0.2)' }}>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'rgba(255,107,107,0.10)' }}>
            <XCircle className="w-4.5 h-4.5" style={{ color: '#ff6b6b' }} />
          </div>
          <div>
            <p className="font-bold text-sm" style={{ color: '#1a2e3b' }}>Rechazar documento</p>
            <p className="text-[11px]" style={{ color: '#6b8fa0' }}>La razón le aparecerá a quien lo subió.</p>
          </div>
        </div>
        <textarea
          autoFocus
          value={rejectNote}
          onChange={e => setRejectNote(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && e.metaKey) confirmReject() }}
          placeholder="Ej: Falta la firma del representante legal en la página 3..."
          rows={3}
          className="w-full px-4 py-3 rounded-xl text-sm outline-none resize-none"
          style={{ background: '#f4f7fa', border: '1px solid rgba(0,40,80,0.10)', color: '#1a2e3b' }} />
        <p className="text-[10px] mt-1.5 mb-4" style={{ color: '#86a2b2' }}>Opcional · Cmd+Enter para confirmar</p>
        <div className="flex gap-2">
          <button onClick={() => { setRejectTarget(null); setRejectNote('') }}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold"
            style={{ background: '#f4f7fa', color: '#6b8fa0' }}>Cancelar</button>
          <button onClick={confirmReject}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold"
            style={{ background: 'rgba(255,107,107,0.12)', color: '#ff6b6b', border: '1px solid rgba(255,107,107,0.25)' }}>
            Rechazar
          </button>
        </div>
      </div>
    </div>
  ) : null

  /* ══════════════════════════════════════════════════════
     EDITOR VIEW
  ══════════════════════════════════════════════════════ */
  if (viewMode === 'editor') {
    const tc = DOC_TYPES[docType]    ?? DOC_TYPES.documento
    const sc = DOC_STATUS[docStatus] ?? DOC_STATUS.borrador

    return (
      <>
        {RejectModal}
        <style>{`
          @media print {
            body > *:not(#lcl-print-area) { display: none !important; }
            #lcl-print-area { display: block !important; position: fixed; top: 0; left: 0; width: 100%; }
            #lcl-print-area * { visibility: visible; }
          }
          /* BlockNote overrides */
          .bn-container { font-family: inherit; }
          .bn-editor { padding: 0 !important; }
        `}</style>
        <div className="rounded-2xl overflow-visible"
          style={{ background: '#fff', border: '1px solid rgba(0,40,80,0.08)' }}>

          {/* Toolbar — simplified (BlockNote handles formatting inline) */}
          <div className="flex items-center gap-2 px-3 py-2.5 flex-wrap"
            style={{ borderBottom: '1px solid rgba(0,40,80,0.08)' }}>

            <button onClick={goBackToBrowser}
              className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl flex-shrink-0"
              style={{ background: '#f4f7fa', color: '#6b8fa0' }}>
              <ArrowLeft className="w-3.5 h-3.5" />Documentos
            </button>
            <TDiv />

            <div className="flex-1 min-w-2" />
            <span className="text-[10px] flex-shrink-0" style={{ color: '#c8dae4' }}>{wordCount} palabras</span>
            <TDiv />

            {/* Workflow status */}
            <div className="flex items-center gap-1.5 flex-shrink-0" onClick={e => e.stopPropagation()}>
              {/* Status badge — admin gets dropdown, consultant sees badge only */}
              <div className="relative">
                <button
                  onClick={() => canEdit && setDocStatusMenu(!docStatusMenu)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-semibold"
                  style={{ background: sc.bg, color: sc.color, border: `1px solid ${sc.color}40` }}>
                  <sc.Icon className="w-3 h-3" />{sc.label}
                  {canEdit && <ChevronDown className="w-2.5 h-2.5" />}
                </button>
                {canEdit && docStatusMenu && (
                  <div className="absolute top-full right-0 mt-1 rounded-xl shadow-xl z-50 overflow-hidden min-w-44"
                    style={{ background: '#fff', border: '1px solid rgba(0,40,80,0.10)' }}>
                    <p className="px-3 pt-2.5 pb-1 text-[10px] font-semibold uppercase tracking-widest" style={{ color: '#86a2b2' }}>Cambiar estado</p>
                    {(Object.entries(DOC_STATUS) as [DocStatus, typeof DOC_STATUS[DocStatus]][]).map(([k, cfg]) => (
                      <button key={k}
                        onClick={() => { setDocStatusMenu(false); changeEditableStatus(k) }}
                        className="w-full flex items-center gap-2.5 px-3 py-2.5 text-xs font-medium text-left"
                        style={{ color: cfg.color, background: docStatus === k ? cfg.bg : 'transparent' }}>
                        <cfg.Icon className="w-3.5 h-3.5" />{cfg.label}
                        {docStatus === k && <span className="ml-auto text-[10px]">✓</span>}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {!canEdit && docStatus === 'borrador' && (
                <button onClick={() => changeEditableStatus('en_revision')}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-semibold"
                  style={{ background: 'rgba(64,181,250,0.12)', color: '#40b5fa', border: '1px solid rgba(64,181,250,0.2)' }}>
                  <Send className="w-3 h-3" />Enviar
                </button>
              )}
              {!canEdit && docStatus === 'rechazado' && (
                <button onClick={() => changeEditableStatus('borrador')}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-semibold"
                  style={{ background: 'rgba(107,143,160,0.12)', color: '#6b8fa0', border: '1px solid rgba(107,143,160,0.2)' }}>
                  <RotateCcw className="w-3 h-3" />Corregir
                </button>
              )}
              {canEdit && docStatus === 'en_revision' && (
                <>
                  <button onClick={() => changeEditableStatus('aprobado')}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-semibold"
                    style={{ background: 'rgba(74,222,128,0.12)', color: '#4ade80', border: '1px solid rgba(74,222,128,0.2)' }}>
                    <CheckCircle2 className="w-3 h-3" />Aprobar
                  </button>
                  <button onClick={() => changeEditableStatus('rechazado')}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-semibold"
                    style={{ background: 'rgba(255,107,107,0.12)', color: '#ff6b6b', border: '1px solid rgba(255,107,107,0.2)' }}>
                    <XCircle className="w-3 h-3" />Rechazar
                  </button>
                </>
              )}
            </div>

            <button onClick={() => window.print()} title="Exportar PDF"
              className="p-1.5 rounded-xl flex-shrink-0" style={{ background: '#f4f7fa', color: '#6b8fa0' }}>
              <Printer className="w-3.5 h-3.5" />
            </button>

            <span className="text-[10px] min-w-[80px] text-right flex-shrink-0"
              style={{ color: saveState === 'saving' ? '#ffd93d' : saveState === 'saved' ? '#4ade80' : '#c8dae4' }}>
              {saveState === 'saving' ? 'Guardando...' : saveState === 'saved' ? '✓ Guardado' : 'Auto-guardado'}
            </span>
          </div>

          {/* Rejection banner (visible when doc was rejected) */}
          {docStatus === 'rechazado' && docRejectionNote && (
            <div className="mx-8 mt-5 px-4 py-3 rounded-xl flex items-start gap-3"
              style={{ background: 'rgba(255,107,107,0.06)', border: '1px solid rgba(255,107,107,0.18)' }}>
              <MessageSquare className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: '#ff6b6b' }} />
              <div>
                <p className="text-[11px] font-semibold mb-0.5" style={{ color: '#ff6b6b' }}>Motivo del rechazo</p>
                <p className="text-xs" style={{ color: '#1a2e3b' }}>{docRejectionNote}</p>
              </div>
            </div>
          )}

          {/* Title area */}
          <div className="px-8 pt-7 pb-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-semibold mb-4"
              style={{ background: tc.bg, color: tc.color }}>
              <tc.Icon className="w-3.5 h-3.5" />{tc.label}
            </span>
            <input value={docName}
              onChange={e => setDocName(e.target.value)}
              onBlur={e => saveEditableName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
              placeholder="Sin título" disabled={!canEdit}
              className="w-full text-[2rem] font-black outline-none bg-transparent placeholder-gray-300 leading-tight"
              style={{ color: '#1a2e3b' }} />
            <div className="h-px mt-5" style={{ background: 'rgba(0,40,80,0.06)' }} />
          </div>

          {/* BlockNote Editor */}
          <div id="lcl-print-area" className="px-4 pb-8 min-h-[400px]">
            {activeDocId && (
              <DocEditor
                key={activeDocId}
                initialContent={currentContent}
                canEdit={canEdit}
                onSave={persistContent}
                onStateChange={({ wordCount: wc, saveState: ss }) => {
                  setWordCount(wc)
                  setSaveState(ss)
                }}
              />
            )}
          </div>
        </div>
      </>
    )
  }

  /* ══════════════════════════════════════════════════════
     BROWSER VIEW
  ══════════════════════════════════════════════════════ */
  const typeEntries = Object.entries(DOC_TYPES) as [DocType, typeof DOC_TYPES[DocType]][]

  return (
    <>
      {RejectModal}
      <div onClick={() => { setShowNewDocMenu(false); setFileStatusMenu(null); setDocStatusMenu(false) }}>

        {/* Breadcrumb + toolbar */}
        <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
          <div className="flex items-center gap-0.5 flex-wrap">
            {crumb.map((c, i) => (
              <span key={i} className="flex items-center gap-0.5">
                {i > 0 && <ChevronRight className="w-3.5 h-3.5 mx-0.5" style={{ color: '#c5d5e0' }} />}
                <button onClick={() => goTo(i)}
                  className="flex items-center gap-1 px-2 py-1 rounded-lg text-sm font-medium transition-all"
                  style={{ color: i === crumb.length - 1 ? '#1a2e3b' : '#40b5fa' }}>
                  {i === 0 && <Home className="w-3.5 h-3.5" />}
                  {c.name}
                </button>
              </span>
            ))}
          </div>

          <div className="flex gap-2 flex-wrap">
            {canEdit && (
              <button onClick={() => { setShowNewFolder(true); setNewFolderName('') }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold"
                style={{ background: 'rgba(255,217,61,0.12)', color: '#b89c00', border: '1px solid rgba(255,217,61,0.3)' }}>
                <FolderPlus className="w-3.5 h-3.5" />Nueva carpeta
              </button>
            )}

            {canEdit && (
              <div className="relative" onClick={e => e.stopPropagation()}>
                <button onClick={() => setShowNewDocMenu(!showNewDocMenu)} disabled={creatingDoc}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold"
                  style={{ background: 'rgba(167,139,250,0.12)', color: '#a78bfa', border: '1px solid rgba(167,139,250,0.2)' }}>
                  {creatingDoc ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <PenLine className="w-3.5 h-3.5" />}
                  Nuevo doc
                  <ChevronDown className="w-3 h-3" />
                </button>
                {showNewDocMenu && (
                  <div className="absolute top-full right-0 mt-1.5 rounded-2xl shadow-xl z-40 w-52 overflow-hidden"
                    style={{ background: '#fff', border: '1px solid rgba(0,40,80,0.10)' }}>
                    <p className="px-4 pt-3 pb-1.5 text-[10px] font-semibold uppercase tracking-widest" style={{ color: '#86a2b2' }}>Tipo</p>
                    {typeEntries.map(([key, cfg]) => (
                      <button key={key} onClick={() => createEditableDoc(key)}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-xs font-medium text-left transition-all"
                        style={{ color: '#1a2e3b' }}
                        onMouseEnter={e => (e.currentTarget.style.background = cfg.bg)}
                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                        <cfg.Icon className="w-4 h-4 flex-shrink-0" style={{ color: cfg.color }} />
                        {cfg.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            <label className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer"
              style={{ background: 'rgba(64,181,250,0.12)', color: '#40b5fa', border: '1px solid rgba(64,181,250,0.2)' }}>
              <FilePlus className="w-3.5 h-3.5" />Subir archivos
              <input type="file" multiple className="hidden"
                onChange={e => { if (e.target.files?.length) handleFiles(e.target.files); e.target.value = '' }} />
            </label>

            <label className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer"
              style={{ background: 'rgba(74,222,128,0.12)', color: '#4ade80', border: '1px solid rgba(74,222,128,0.2)' }}>
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
            <input autoFocus value={newFolderName}
              onChange={e => setNewFolderName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') makeFolder(); if (e.key === 'Escape') setShowNewFolder(false) }}
              placeholder="Nombre de la carpeta..."
              className="flex-1 px-4 py-2.5 rounded-xl text-sm outline-none"
              style={{ background: '#f4f7fa', border: '1px solid rgba(64,181,250,0.4)', color: '#1a2e3b' }} />
            <button onClick={makeFolder} className="px-4 py-2 rounded-xl text-xs font-semibold" style={{ background: '#40b5fa', color: '#fff' }}>Crear</button>
            <button onClick={() => setShowNewFolder(false)} className="px-3 py-2 rounded-xl text-xs font-semibold" style={{ background: '#f4f7fa', color: '#6b8fa0' }}>Cancelar</button>
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

        {/* Drop zone */}
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
            <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin" style={{ color: '#40b5fa' }} /></div>
          ) : (
            <div>
              {/* ── Editable docs ── */}
              {editableDocs.length > 0 && (
                <div className="mb-4">
                  <p className="text-[10px] font-semibold uppercase tracking-widest mb-2 flex items-center gap-1.5"
                    style={{ color: '#a78bfa' }}>
                    <PenLine className="w-3 h-3" />Editables
                  </p>
                  <div className="space-y-1.5">
                    {editableDocs.map(doc => {
                      const tc = DOC_TYPES[doc.doc_type] ?? DOC_TYPES.documento
                      const sc = DOC_STATUS[doc.status]  ?? DOC_STATUS.borrador
                      return (
                        <div key={doc.id}>
                          <div
                            onClick={() => openEditableDoc(doc)}
                            className="group flex items-center gap-3 rounded-xl px-4 py-3 cursor-pointer transition-all"
                            style={{ background: '#fafbfc', border: `1px solid ${doc.status === 'rechazado' ? 'rgba(255,107,107,0.2)' : 'rgba(0,40,80,0.07)'}` }}
                            onMouseEnter={e => { e.currentTarget.style.borderColor = doc.status === 'rechazado' ? 'rgba(255,107,107,0.35)' : 'rgba(167,139,250,0.35)'; e.currentTarget.style.background = '#faf8ff' }}
                            onMouseLeave={e => { e.currentTarget.style.borderColor = doc.status === 'rechazado' ? 'rgba(255,107,107,0.2)' : 'rgba(0,40,80,0.07)'; e.currentTarget.style.background = '#fafbfc' }}>
                            <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: tc.bg }}>
                              <tc.Icon className="w-4 h-4" style={{ color: tc.color }} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold truncate" style={{ color: '#1a2e3b' }}>{doc.name}</p>
                              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold" style={{ background: tc.bg, color: tc.color }}>{tc.label}</span>
                                <span className="text-[10px]" style={{ color: '#86a2b2' }}>
                                  {new Date(doc.updated_at).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: '2-digit' })}
                                </span>
                              </div>
                            </div>
                            <span className="flex items-center gap-1 text-[10px] px-2.5 py-1 rounded-full font-semibold flex-shrink-0"
                              style={{ background: sc.bg, color: sc.color }}>
                              <sc.Icon className="w-3 h-3" />{sc.label}
                            </span>
                            {canEdit && (
                              <button onClick={e => deleteEditableDoc(doc.id, e)}
                                className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg flex-shrink-0"
                                style={{ color: '#ff6b6b' }}>
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                          {/* Rejection note for editable doc */}
                          {doc.status === 'rechazado' && doc.rejection_note && (
                            <div className="mt-1 ml-11 mr-2 px-3 py-2 rounded-xl flex items-start gap-2"
                              style={{ background: 'rgba(255,107,107,0.06)', border: '1px solid rgba(255,107,107,0.14)' }}>
                              <MessageSquare className="w-3 h-3 flex-shrink-0 mt-0.5" style={{ color: '#ff6b6b' }} />
                              <p className="text-[11px]" style={{ color: '#ff6b6b' }}>{doc.rejection_note}</p>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                  {(folders.length > 0 || docs.length > 0) && (
                    <div className="mt-4" style={{ borderTop: '1px solid rgba(0,40,80,0.06)' }} />
                  )}
                </div>
              )}

              {/* ── Folders ── */}
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
                        <button onClick={ev => { ev.stopPropagation(); removeFolder(f) }}
                          className="opacity-0 group-hover:opacity-100 flex-shrink-0 p-0.5 rounded"
                          style={{ color: '#ff6b6b' }}>
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* ── Uploaded files ── */}
              {docs.length > 0 && (
                <div className="space-y-2">
                  {docs.map(d => {
                    const st       = FILE_STATUS[d.status as FileStatus] ?? FILE_STATUS.pendiente
                    const verMaj   = majorVer(d.version)
                    const hasHist  = verMaj > 1
                    const histOpen = !!versionHistories[d.id]

                    return (
                      <div key={d.id}>
                        {/* File row */}
                        <div
                          className="group flex items-center gap-3 rounded-xl px-4 py-3 transition-all"
                          style={{
                            background: '#fafbfc',
                            border: `1px solid ${d.status === 'rechazado' ? 'rgba(255,107,107,0.18)' : 'rgba(0,40,80,0.07)'}`,
                          }}
                          onMouseEnter={e => e.currentTarget.style.background = '#f4f8ff'}
                          onMouseLeave={e => e.currentTarget.style.background = '#fafbfc'}>

                          <span className="text-xl flex-shrink-0 select-none">{emoji(d.name)}</span>

                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate" style={{ color: '#1a2e3b' }}>{d.name}</p>
                            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                              <span className="text-[10px] px-1.5 py-0.5 rounded-full font-mono"
                                style={{ background: 'rgba(0,40,80,0.06)', color: '#6b8fa0' }}>v{d.version}</span>
                              {hasHist && (
                                <button
                                  onClick={() => toggleVersionHistory(d.id)}
                                  className="flex items-center gap-1 text-[10px] transition-all"
                                  style={{ color: histOpen ? '#40b5fa' : '#86a2b2' }}>
                                  {loadingVersions === d.id
                                    ? <Loader2 className="w-3 h-3 animate-spin" />
                                    : <History className="w-3 h-3" />}
                                  {verMaj - 1} anterior{verMaj - 1 !== 1 ? 'es' : ''}
                                </button>
                              )}
                              {d.profiles?.full_name && (
                                <span className="text-[10px]" style={{ color: '#86a2b2' }}>{d.profiles.full_name}</span>
                              )}
                              <span className="text-[10px]" style={{ color: '#86a2b2' }}>
                                {new Date(d.created_at).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: '2-digit' })}
                              </span>
                            </div>
                          </div>

                          {/* Workflow actions */}
                          <div className="flex items-center gap-1 flex-shrink-0" onClick={e => e.stopPropagation()}>
                            {/* Status badge — admin gets dropdown */}
                            <div className="relative">
                              <button
                                onClick={() => canEdit
                                  ? setFileStatusMenu(fileStatusMenu === d.id ? null : d.id)
                                  : undefined}
                                className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold"
                                style={{ background: st.bg, color: st.color }}>
                                <st.Icon className="w-3 h-3" />{st.label}
                                {canEdit && <ChevronDown className="w-2.5 h-2.5 ml-0.5" />}
                              </button>
                              {canEdit && fileStatusMenu === d.id && (
                                <div className="absolute top-full right-0 mt-1 rounded-xl overflow-hidden shadow-xl z-30 min-w-44"
                                  style={{ background: '#fff', border: '1px solid rgba(0,40,80,0.12)' }}>
                                  <p className="px-3 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-widest" style={{ color: '#86a2b2' }}>Cambiar estado</p>
                                  {(Object.entries(FILE_STATUS) as [FileStatus, typeof FILE_STATUS[FileStatus]][]).map(([key, cfg]) => (
                                    <button key={key}
                                      onClick={() => adminSetFileStatus(d.id, key)}
                                      className="w-full flex items-center gap-2.5 px-3 py-2.5 text-xs font-medium text-left"
                                      style={{ color: cfg.color, background: d.status === key ? cfg.bg : 'transparent' }}>
                                      <cfg.Icon className="w-3.5 h-3.5" />{cfg.label}
                                      {d.status === key && <span className="ml-auto text-[10px]">✓</span>}
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                            {/* Consultant: submit */}
                            {!canEdit && d.status === 'pendiente' && (
                              <button onClick={() => submitDoc(d.id)}
                                className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold"
                                style={{ background: 'rgba(64,181,250,0.12)', color: '#40b5fa', border: '1px solid rgba(64,181,250,0.2)' }}>
                                <Send className="w-3 h-3" />Enviar
                              </button>
                            )}
                            {/* Admin quick approve/reject when en_revision */}
                            {canEdit && d.status === 'en_revision' && (
                              <>
                                <button onClick={() => approveDoc(d.id)} title="Aprobar"
                                  className="p-1.5 rounded-lg" style={{ color: '#4ade80' }}>
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                </button>
                                <button onClick={() => openRejectModal('file', d.id)} title="Rechazar"
                                  className="p-1.5 rounded-lg" style={{ color: '#ff6b6b' }}>
                                  <XCircle className="w-3.5 h-3.5" />
                                </button>
                              </>
                            )}
                          </div>

                          {/* Hover actions */}
                          <div className="flex items-center gap-0.5 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => download(d)} title="Descargar" className="p-1.5 rounded-lg" style={{ color: '#40b5fa' }}>
                              <Download className="w-3.5 h-3.5" />
                            </button>
                            <label title="Reemplazar versión" className="p-1.5 rounded-lg cursor-pointer" style={{ color: '#a78bfa' }}>
                              <RotateCcw className="w-3.5 h-3.5" />
                              <input type="file" className="hidden"
                                onChange={e => { const f = e.target.files?.[0]; if (f) replaceDoc(d, f); e.target.value = '' }} />
                            </label>
                            {canEdit && (
                              <button onClick={() => removeDoc(d)} title="Eliminar" className="p-1.5 rounded-lg" style={{ color: '#ff6b6b' }}>
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Rejection note */}
                        {d.status === 'rechazado' && d.rejection_note && (
                          <div className="mt-1 ml-12 mr-2 px-3 py-2 rounded-xl flex items-start gap-2"
                            style={{ background: 'rgba(255,107,107,0.06)', border: '1px solid rgba(255,107,107,0.14)' }}>
                            <MessageSquare className="w-3 h-3 flex-shrink-0 mt-0.5" style={{ color: '#ff6b6b' }} />
                            <p className="text-[11px]" style={{ color: '#ff6b6b' }}>{d.rejection_note}</p>
                          </div>
                        )}

                        {/* Version history */}
                        {histOpen && (
                          <div className="mt-1 ml-12 mr-2 rounded-xl overflow-hidden"
                            style={{ border: '1px solid rgba(0,40,80,0.07)', background: '#f8fafc' }}>
                            {versionHistories[d.id].length === 0 ? (
                              <p className="px-4 py-2.5 text-xs" style={{ color: '#86a2b2' }}>Sin versiones anteriores registradas</p>
                            ) : (
                              versionHistories[d.id].map((v, i) => (
                                <div key={v.id} className="flex items-center gap-3 px-4 py-2.5"
                                  style={{ borderTop: i > 0 ? '1px solid rgba(0,40,80,0.05)' : undefined }}>
                                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full flex-shrink-0"
                                    style={{ background: 'rgba(0,40,80,0.06)', color: '#6b8fa0' }}>
                                    v{v.version_number}.0
                                  </span>
                                  <span className="text-xs flex-1 truncate" style={{ color: '#1a2e3b' }}>{v.file_name}</span>
                                  <span className="text-[10px] flex-shrink-0" style={{ color: '#86a2b2' }}>
                                    {new Date(v.created_at).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: '2-digit' })}
                                  </span>
                                </div>
                              ))
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Empty state */}
              {editableDocs.length === 0 && folders.length === 0 && docs.length === 0 && (
                <div className="flex flex-col items-center justify-center py-14">
                  <Upload className="w-10 h-10 mb-3" style={{ color: '#c5d5e0' }} />
                  <p className="text-sm font-medium mb-1" style={{ color: '#6b8fa0' }}>
                    {dragOver ? 'Suelta aquí' : 'Sin documentos aún'}
                  </p>
                  <p className="text-xs" style={{ color: '#86a2b2' }}>Arrastra archivos o usa los botones de arriba</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
