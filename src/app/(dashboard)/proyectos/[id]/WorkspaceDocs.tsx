'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import TextAlign from '@tiptap/extension-text-align'
import Highlight from '@tiptap/extension-highlight'
import Placeholder from '@tiptap/extension-placeholder'
import CharacterCount from '@tiptap/extension-character-count'
import { TextStyle } from '@tiptap/extension-text-style'
import { Color } from '@tiptap/extension-color'
import { Table } from '@tiptap/extension-table'
import TableRow from '@tiptap/extension-table-row'
import TableHeader from '@tiptap/extension-table-header'
import TableCell from '@tiptap/extension-table-cell'
import TaskList from '@tiptap/extension-task-list'
import TaskItem from '@tiptap/extension-task-item'
import { createClient } from '@/lib/supabase/client'
import {
  Plus, ArrowLeft, Loader2, Trash2, Search, ChevronDown,
  Bold, Italic, UnderlineIcon, Strikethrough,
  AlignLeft, AlignCenter, AlignRight,
  List, ListOrdered, ListChecks,
  Heading1, Heading2, Heading3,
  Table as TableIcon, Minus, Highlighter,
  FileText, Shield, GitBranch, Users, BarChart3, CheckSquare,
  Clock, Eye, CheckCircle2, XCircle, Printer,
  MoreVertical, ChevronRight,
} from 'lucide-react'

/* ── Types ─────────────────────────────────────────────── */
const DOC_TYPES = {
  documento:          { label: 'Documento',           Icon: FileText,    color: '#40b5fa', bg: 'rgba(64,181,250,0.10)' },
  politica:           { label: 'Política',             Icon: Shield,      color: '#a78bfa', bg: 'rgba(167,139,250,0.10)' },
  procedimiento:      { label: 'Procedimiento',        Icon: GitBranch,   color: '#fb923c', bg: 'rgba(251,146,60,0.10)' },
  acta:               { label: 'Acta de reunión',      Icon: Users,       color: '#4ade80', bg: 'rgba(74,222,128,0.10)' },
  informe:            { label: 'Informe',               Icon: BarChart3,   color: '#ffd93d', bg: 'rgba(255,217,61,0.10)' },
  lista_verificacion: { label: 'Lista de verificación', Icon: CheckSquare, color: '#2dd4bf', bg: 'rgba(45,212,191,0.10)' },
} as const

const STATUS_CFG = {
  borrador:    { label: 'Borrador',    Icon: Clock,         color: '#6b8fa0', bg: 'rgba(107,143,160,0.12)' },
  en_revision: { label: 'En revisión', Icon: Eye,           color: '#ffd93d', bg: 'rgba(255,217,61,0.12)' },
  aprobado:    { label: 'Aprobado',    Icon: CheckCircle2,  color: '#4ade80', bg: 'rgba(74,222,128,0.12)' },
  rechazado:   { label: 'Rechazado',   Icon: XCircle,       color: '#ff6b6b', bg: 'rgba(255,107,107,0.12)' },
} as const

type DocType   = keyof typeof DOC_TYPES
type DocStatus = keyof typeof STATUS_CFG

interface Doc {
  id: string
  name: string
  doc_type: DocType
  content: any
  status: DocStatus
  version: string
  updated_at: string
  profiles?: { full_name: string }
}

/* ── ToolBtn ────────────────────────────────────────────── */
function ToolBtn({
  active, onClick, title, children, disabled,
}: {
  active?: boolean; onClick: () => void; title: string
  children: React.ReactNode; disabled?: boolean
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      disabled={disabled}
      className="p-1.5 rounded-lg transition-all flex-shrink-0"
      style={{
        background: active ? 'rgba(64,181,250,0.15)' : 'transparent',
        color: active ? '#40b5fa' : '#6b8fa0',
        opacity: disabled ? 0.3 : 1,
      }}
    >
      {children}
    </button>
  )
}

/* ── Divider ─────────────────────────────────────────────── */
function TDiv() {
  return <div className="w-px h-5 flex-shrink-0" style={{ background: 'rgba(0,40,80,0.10)' }} />
}

/* ── Main ────────────────────────────────────────────────── */
export default function WorkspaceDocs({
  projectId, canEdit, userId,
}: {
  projectId: string; canEdit: boolean; userId: string
}) {
  const [view, setView]           = useState<'list' | 'editor'>('list')
  const [docs, setDocs]           = useState<Doc[]>([])
  const [loading, setLoading]     = useState(true)
  const [creating, setCreating]   = useState(false)
  const [q, setQ]                 = useState('')
  const [typeFilter, setTypeFilter] = useState<DocType | 'todos'>('todos')
  const [showTypeMenu, setShowTypeMenu] = useState(false)
  const [showNewMenu, setShowNewMenu]   = useState(false)

  // Editor state
  const [docName,   setDocName]   = useState('')
  const [docType,   setDocType]   = useState<DocType>('documento')
  const [docStatus, setDocStatus] = useState<DocStatus>('borrador')
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved'>('idle')
  const [showStatusMenu, setShowStatusMenu] = useState(false)

  const activeDocId  = useRef<string | null>(null)
  const saveTimer    = useRef<ReturnType<typeof setTimeout> | null>(null)
  const supabase     = createClient()

  /* ── Load docs ───────────────────────────────────────── */
  async function loadDocs() {
    setLoading(true)
    const { data } = await supabase
      .from('workspace_docs')
      .select('id, name, doc_type, content, status, version, updated_at, profiles(full_name)')
      .eq('project_id', projectId)
      .order('updated_at', { ascending: false })
    setDocs((data as Doc[]) ?? [])
    setLoading(false)
  }

  useEffect(() => { loadDocs() }, [projectId])

  /* ── Filtered ────────────────────────────────────────── */
  const filtered = docs.filter(d => {
    const matchQ    = !q || d.name.toLowerCase().includes(q.toLowerCase())
    const matchType = typeFilter === 'todos' || d.doc_type === typeFilter
    return matchQ && matchType
  })

  /* ── Persist ─────────────────────────────────────────── */
  const persistContent = useCallback(async (content: any) => {
    if (!activeDocId.current) return
    setSaveState('saving')
    await supabase
      .from('workspace_docs')
      .update({ content, updated_at: new Date().toISOString(), updated_by: userId })
      .eq('id', activeDocId.current)
    setSaveState('saved')
    setTimeout(() => setSaveState('idle'), 2500)
  }, [userId])

  /* ── Editor ──────────────────────────────────────────── */
  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      TextStyle,
      Color,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Highlight.configure({ multicolor: true }),
      Placeholder.configure({ placeholder: 'Empieza a escribir tu documento...' }),
      CharacterCount,
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
      TaskList,
      TaskItem.configure({ nested: true }),
    ],
    content: '',
    editable: canEdit,
    onUpdate: ({ editor }) => {
      if (!activeDocId.current) return
      setSaveState('idle')
      if (saveTimer.current) clearTimeout(saveTimer.current)
      saveTimer.current = setTimeout(() => persistContent(editor.getJSON()), 1500)
    },
  })

  /* ── Create doc ───────────────────────────────────────── */
  async function createDoc(type: DocType) {
    setCreating(true)
    setShowNewMenu(false)
    const { data } = await supabase
      .from('workspace_docs')
      .insert([{
        project_id: projectId,
        name: 'Sin título',
        doc_type: type,
        content: { type: 'doc', content: [{ type: 'paragraph' }] },
        status: 'borrador',
        version: '1.0',
        created_by: userId,
        updated_by: userId,
      }])
      .select('id, name, doc_type, content, status, version, updated_at, profiles(full_name)')
      .single()
    setCreating(false)
    if (data) {
      setDocs(prev => [data as Doc, ...prev])
      openDoc(data as Doc)
    }
  }

  /* ── Open / close ─────────────────────────────────────── */
  function openDoc(doc: Doc) {
    activeDocId.current = doc.id
    setDocName(doc.name)
    setDocType(doc.doc_type)
    setDocStatus(doc.status)
    editor?.commands.setContent(
      doc.content ?? { type: 'doc', content: [{ type: 'paragraph' }] }
    )
    setView('editor')
  }

  function goBack() {
    if (saveTimer.current) {
      clearTimeout(saveTimer.current)
      if (editor) persistContent(editor.getJSON())
    }
    activeDocId.current = null
    setView('list')
    loadDocs()
  }

  /* ── Mutations ────────────────────────────────────────── */
  async function saveName(name: string) {
    if (!activeDocId.current || !name.trim()) return
    await supabase
      .from('workspace_docs')
      .update({ name: name.trim(), updated_at: new Date().toISOString() })
      .eq('id', activeDocId.current)
    setDocs(prev => prev.map(d => d.id === activeDocId.current ? { ...d, name: name.trim() } : d))
  }

  async function changeStatus(status: DocStatus) {
    if (!activeDocId.current) return
    setDocStatus(status)
    setShowStatusMenu(false)
    await supabase
      .from('workspace_docs')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', activeDocId.current)
    setDocs(prev => prev.map(d => d.id === activeDocId.current ? { ...d, status } : d))
  }

  async function deleteDoc(id: string, e: React.MouseEvent) {
    e.stopPropagation()
    if (!confirm('¿Eliminar este documento?')) return
    await supabase.from('workspace_docs').delete().eq('id', id)
    setDocs(prev => prev.filter(d => d.id !== id))
  }

  /* ── PDF export ───────────────────────────────────────── */
  function printDoc() {
    window.print()
  }

  /* ── Toolbar helpers ─────────────────────────────────── */
  const A = (name: string, attrs?: any) => editor?.isActive(name, attrs) ?? false

  /* ─────────────────────────────────────────────────────── */
  /* LIST VIEW                                              */
  /* ─────────────────────────────────────────────────────── */
  if (view === 'list') {
    const typeEntries = Object.entries(DOC_TYPES) as [DocType, typeof DOC_TYPES[DocType]][]
    const statusCounts = {
      borrador:    docs.filter(d => d.status === 'borrador').length,
      en_revision: docs.filter(d => d.status === 'en_revision').length,
      aprobado:    docs.filter(d => d.status === 'aprobado').length,
      rechazado:   docs.filter(d => d.status === 'rechazado').length,
    }

    return (
      <div className="rounded-2xl p-5" style={{ background: '#ffffff', border: '1px solid rgba(0,40,80,0.08)' }}
        onClick={() => { setShowTypeMenu(false); setShowNewMenu(false) }}>

        {/* Header */}
        <div className="flex items-center justify-between mb-5 gap-3 flex-wrap">
          <div>
            <p className="text-xs font-semibold tracking-widest uppercase" style={{ color: '#40b5fa' }}>
              Documentos editables
            </p>
            <p className="text-xs mt-0.5" style={{ color: '#86a2b2' }}>
              {docs.length} documento{docs.length !== 1 ? 's' : ''}
            </p>
          </div>

          {canEdit && (
            <div className="relative" onClick={e => e.stopPropagation()}>
              <button
                onClick={() => setShowNewMenu(!showNewMenu)}
                disabled={creating}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition-all"
                style={{ background: 'rgba(64,181,250,0.12)', color: '#40b5fa', border: '1px solid rgba(64,181,250,0.2)' }}
              >
                {creating
                  ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  : <Plus className="w-3.5 h-3.5" />}
                Nuevo documento
                <ChevronDown className="w-3 h-3" />
              </button>

              {showNewMenu && (
                <div className="absolute top-full right-0 mt-1.5 rounded-2xl shadow-xl z-40 w-52 overflow-hidden"
                  style={{ background: '#fff', border: '1px solid rgba(0,40,80,0.10)' }}>
                  <p className="px-4 pt-3 pb-1.5 text-[10px] font-semibold uppercase tracking-widest"
                    style={{ color: '#86a2b2' }}>Tipo de documento</p>
                  {typeEntries.map(([key, cfg]) => (
                    <button key={key} onClick={() => createDoc(key)}
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
        </div>

        {/* Status pills */}
        <div className="flex gap-2 mb-5 flex-wrap">
          {(Object.entries(STATUS_CFG) as [DocStatus, typeof STATUS_CFG[DocStatus]][]).map(([k, cfg]) => (
            <div key={k} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-semibold"
              style={{ background: cfg.bg, color: cfg.color }}>
              <cfg.Icon className="w-3 h-3" />
              {cfg.label}: {statusCounts[k]}
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex gap-2 mb-4 flex-wrap" onClick={e => e.stopPropagation()}>
          <div className="relative flex items-center rounded-xl flex-1 max-w-xs"
            style={{ background: '#f4f7fa', border: '1px solid rgba(0,40,80,0.08)' }}>
            <Search className="absolute left-3 w-3.5 h-3.5" style={{ color: '#86a2b2' }} />
            <input
              value={q}
              onChange={e => setQ(e.target.value)}
              placeholder="Buscar documento..."
              className="w-full pl-9 pr-3 py-2 text-xs outline-none bg-transparent"
              style={{ color: '#1a2e3b' }}
            />
          </div>

          {/* Type filter */}
          <div className="relative">
            <button
              onClick={() => setShowTypeMenu(!showTypeMenu)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold"
              style={{ background: '#f4f7fa', color: '#6b8fa0', border: '1px solid rgba(0,40,80,0.08)' }}>
              {typeFilter === 'todos' ? 'Todos los tipos' : DOC_TYPES[typeFilter].label}
              <ChevronDown className="w-3 h-3" />
            </button>
            {showTypeMenu && (
              <div className="absolute top-full left-0 mt-1 rounded-xl shadow-xl z-30 w-44 overflow-hidden"
                style={{ background: '#fff', border: '1px solid rgba(0,40,80,0.10)' }}>
                <button
                  onClick={() => { setTypeFilter('todos'); setShowTypeMenu(false) }}
                  className="w-full text-left px-3 py-2 text-xs font-medium transition-all"
                  style={{ color: typeFilter === 'todos' ? '#40b5fa' : '#1a2e3b',
                           background: typeFilter === 'todos' ? 'rgba(64,181,250,0.08)' : 'transparent' }}>
                  Todos los tipos
                </button>
                {typeEntries.map(([key, cfg]) => (
                  <button key={key}
                    onClick={() => { setTypeFilter(key); setShowTypeMenu(false) }}
                    className="w-full flex items-center gap-2 text-left px-3 py-2 text-xs font-medium transition-all"
                    style={{ color: typeFilter === key ? cfg.color : '#1a2e3b',
                             background: typeFilter === key ? cfg.bg : 'transparent' }}>
                    <cfg.Icon className="w-3.5 h-3.5" style={{ color: cfg.color }} />
                    {cfg.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* List */}
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-5 h-5 animate-spin" style={{ color: '#40b5fa' }} />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-3"
              style={{ background: 'rgba(64,181,250,0.08)' }}>
              <FileText className="w-6 h-6" style={{ color: '#40b5fa' }} />
            </div>
            <p className="text-sm font-semibold mb-1" style={{ color: '#1a2e3b' }}>
              {q || typeFilter !== 'todos' ? 'Sin resultados' : 'Sin documentos aún'}
            </p>
            <p className="text-xs" style={{ color: '#86a2b2' }}>
              {canEdit ? 'Crea el primero con el botón de arriba.' : 'No hay documentos en este proyecto.'}
            </p>
          </div>
        ) : (
          <div className="space-y-1.5">
            {filtered.map(doc => {
              const tc = DOC_TYPES[doc.doc_type] ?? DOC_TYPES.documento
              const sc = STATUS_CFG[doc.status] ?? STATUS_CFG.borrador
              return (
                <div key={doc.id}
                  onClick={() => openDoc(doc)}
                  className="group flex items-center gap-3 rounded-xl px-4 py-3 cursor-pointer transition-all"
                  style={{ background: '#fafbfc', border: '1px solid rgba(0,40,80,0.07)' }}
                  onMouseEnter={e => {
                    e.currentTarget.style.borderColor = 'rgba(64,181,250,0.30)'
                    e.currentTarget.style.background = '#f0f8ff'
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.borderColor = 'rgba(0,40,80,0.07)'
                    e.currentTarget.style.background = '#fafbfc'
                  }}>

                  {/* Icon */}
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: tc.bg }}>
                    <tc.Icon className="w-4 h-4" style={{ color: tc.color }} />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate" style={{ color: '#1a2e3b' }}>{doc.name}</p>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold"
                        style={{ background: tc.bg, color: tc.color }}>{tc.label}</span>
                      <span className="text-[10px]" style={{ color: '#86a2b2' }}>
                        v{doc.version} · {new Date(doc.updated_at).toLocaleDateString('es-CO', {
                          day: '2-digit', month: 'short', year: 'numeric',
                        })}
                      </span>
                    </div>
                  </div>

                  {/* Status */}
                  <span className="flex items-center gap-1 text-[10px] px-2.5 py-1 rounded-full font-semibold flex-shrink-0"
                    style={{ background: sc.bg, color: sc.color }}>
                    <sc.Icon className="w-3 h-3" />
                    {sc.label}
                  </span>

                  {/* Delete */}
                  {canEdit && (
                    <button onClick={e => deleteDoc(doc.id, e)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg flex-shrink-0"
                      style={{ color: '#ff6b6b' }}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  /* ─────────────────────────────────────────────────────── */
  /* EDITOR VIEW                                            */
  /* ─────────────────────────────────────────────────────── */
  const tc = DOC_TYPES[docType] ?? DOC_TYPES.documento
  const sc = STATUS_CFG[docStatus] ?? STATUS_CFG.borrador
  const wordCount = editor?.storage.characterCount?.words() ?? 0

  return (
    <>
      {/* Print styles */}
      <style>{`
        @media print {
          body > *:not(#lcl-print-area) { display: none !important; }
          #lcl-print-area { display: block !important; position: fixed; top: 0; left: 0; width: 100%; }
          #lcl-print-area * { visibility: visible; }
          .tiptap { padding: 0 !important; }
          .tiptap table { border-collapse: collapse; width: 100%; }
          .tiptap td, .tiptap th { border: 1px solid #ccc; padding: 6px; }
        }
      `}</style>

      <div className="rounded-2xl overflow-visible" style={{ background: '#ffffff', border: '1px solid rgba(0,40,80,0.08)' }}
        onClick={() => setShowStatusMenu(false)}>

        {/* ── Top bar ── */}
        <div className="flex items-center gap-1.5 px-3 py-2.5 flex-wrap gap-y-2"
          style={{ borderBottom: '1px solid rgba(0,40,80,0.08)' }}>

          {/* Back */}
          <button onClick={goBack}
            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl transition-all flex-shrink-0"
            style={{ background: '#f4f7fa', color: '#6b8fa0' }}>
            <ArrowLeft className="w-3.5 h-3.5" />Documentos
          </button>

          <TDiv />

          {/* Format: Text style */}
          <ToolBtn active={A('bold')} onClick={() => editor?.chain().focus().toggleBold().run()} title="Negrita (Ctrl+B)" disabled={!canEdit}>
            <Bold className="w-3.5 h-3.5" />
          </ToolBtn>
          <ToolBtn active={A('italic')} onClick={() => editor?.chain().focus().toggleItalic().run()} title="Cursiva (Ctrl+I)" disabled={!canEdit}>
            <Italic className="w-3.5 h-3.5" />
          </ToolBtn>
          <ToolBtn active={A('underline')} onClick={() => editor?.chain().focus().toggleUnderline().run()} title="Subrayado (Ctrl+U)" disabled={!canEdit}>
            <UnderlineIcon className="w-3.5 h-3.5" />
          </ToolBtn>
          <ToolBtn active={A('strike')} onClick={() => editor?.chain().focus().toggleStrike().run()} title="Tachado" disabled={!canEdit}>
            <Strikethrough className="w-3.5 h-3.5" />
          </ToolBtn>
          <ToolBtn active={A('highlight')} onClick={() => editor?.chain().focus().toggleHighlight({ color: '#ffd93d' }).run()} title="Resaltar" disabled={!canEdit}>
            <Highlighter className="w-3.5 h-3.5" />
          </ToolBtn>

          <TDiv />

          {/* Headings */}
          <ToolBtn active={A('heading', { level: 1 })} onClick={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()} title="Título 1" disabled={!canEdit}>
            <Heading1 className="w-3.5 h-3.5" />
          </ToolBtn>
          <ToolBtn active={A('heading', { level: 2 })} onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()} title="Título 2" disabled={!canEdit}>
            <Heading2 className="w-3.5 h-3.5" />
          </ToolBtn>
          <ToolBtn active={A('heading', { level: 3 })} onClick={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()} title="Título 3" disabled={!canEdit}>
            <Heading3 className="w-3.5 h-3.5" />
          </ToolBtn>

          <TDiv />

          {/* Lists */}
          <ToolBtn active={A('bulletList')} onClick={() => editor?.chain().focus().toggleBulletList().run()} title="Lista" disabled={!canEdit}>
            <List className="w-3.5 h-3.5" />
          </ToolBtn>
          <ToolBtn active={A('orderedList')} onClick={() => editor?.chain().focus().toggleOrderedList().run()} title="Lista numerada" disabled={!canEdit}>
            <ListOrdered className="w-3.5 h-3.5" />
          </ToolBtn>
          <ToolBtn active={A('taskList')} onClick={() => editor?.chain().focus().toggleTaskList().run()} title="Lista de verificación (checkboxes)" disabled={!canEdit}>
            <ListChecks className="w-3.5 h-3.5" />
          </ToolBtn>

          <TDiv />

          {/* Alignment */}
          <ToolBtn active={A('paragraph', { textAlign: 'left' })} onClick={() => editor?.chain().focus().setTextAlign('left').run()} title="Izquierda" disabled={!canEdit}>
            <AlignLeft className="w-3.5 h-3.5" />
          </ToolBtn>
          <ToolBtn active={A('paragraph', { textAlign: 'center' })} onClick={() => editor?.chain().focus().setTextAlign('center').run()} title="Centrar" disabled={!canEdit}>
            <AlignCenter className="w-3.5 h-3.5" />
          </ToolBtn>
          <ToolBtn active={A('paragraph', { textAlign: 'right' })} onClick={() => editor?.chain().focus().setTextAlign('right').run()} title="Derecha" disabled={!canEdit}>
            <AlignRight className="w-3.5 h-3.5" />
          </ToolBtn>

          <TDiv />

          {/* Table */}
          <ToolBtn active={A('table')} onClick={() => editor?.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()} title="Insertar tabla" disabled={!canEdit}>
            <TableIcon className="w-3.5 h-3.5" />
          </ToolBtn>
          <ToolBtn active={false} onClick={() => editor?.chain().focus().setHorizontalRule().run()} title="Línea divisoria" disabled={!canEdit}>
            <Minus className="w-3.5 h-3.5" />
          </ToolBtn>

          {/* Spacer */}
          <div className="flex-1 min-w-2" />

          {/* Word count */}
          <span className="text-[10px] flex-shrink-0" style={{ color: '#c8dae4' }}>
            {wordCount} palabras
          </span>

          <TDiv />

          {/* Status selector */}
          <div className="relative flex-shrink-0" onClick={e => e.stopPropagation()}>
            <button
              onClick={() => canEdit && setShowStatusMenu(!showStatusMenu)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-semibold"
              style={{ background: sc.bg, color: sc.color, border: `1px solid ${sc.color}40` }}>
              <sc.Icon className="w-3 h-3" />
              {sc.label}
              {canEdit && <ChevronDown className="w-3 h-3" />}
            </button>

            {showStatusMenu && (
              <div className="absolute top-full right-0 mt-1 rounded-xl shadow-xl z-50 overflow-hidden min-w-44"
                style={{ background: '#fff', border: '1px solid rgba(0,40,80,0.10)' }}>
                <p className="px-3 pt-2.5 pb-1 text-[10px] font-semibold uppercase tracking-widest"
                  style={{ color: '#86a2b2' }}>Cambiar estado</p>
                {(Object.entries(STATUS_CFG) as [DocStatus, typeof STATUS_CFG[DocStatus]][]).map(([k, cfg]) => (
                  <button key={k} onClick={() => changeStatus(k)}
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 text-xs font-medium text-left transition-all"
                    style={{ color: cfg.color, background: docStatus === k ? cfg.bg : 'transparent' }}>
                    <cfg.Icon className="w-3.5 h-3.5" />
                    {cfg.label}
                    {docStatus === k && <span className="ml-auto text-[10px]">✓</span>}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Print */}
          <button onClick={printDoc} title="Exportar PDF (Imprimir)"
            className="p-1.5 rounded-xl flex-shrink-0 transition-all"
            style={{ background: '#f4f7fa', color: '#6b8fa0' }}>
            <Printer className="w-3.5 h-3.5" />
          </button>

          {/* Save indicator */}
          <span className="text-[10px] min-w-[80px] text-right flex-shrink-0"
            style={{
              color: saveState === 'saving' ? '#ffd93d'
                   : saveState === 'saved'  ? '#4ade80'
                   :                          '#c8dae4',
            }}>
            {saveState === 'saving' ? 'Guardando...'
           : saveState === 'saved'  ? '✓ Guardado'
           :                          'Auto-guardado'}
          </span>
        </div>

        {/* ── Document meta ── */}
        <div className="px-8 pt-7 pb-2">
          {/* Type badge */}
          <div className="flex items-center gap-2 mb-4">
            <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-semibold"
              style={{ background: tc.bg, color: tc.color }}>
              <tc.Icon className="w-3.5 h-3.5" />
              {tc.label}
            </span>
          </div>

          {/* Title */}
          <input
            value={docName}
            onChange={e => setDocName(e.target.value)}
            onBlur={e => saveName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
            placeholder="Sin título"
            disabled={!canEdit}
            className="w-full text-[2rem] font-black outline-none bg-transparent placeholder-gray-300 leading-tight"
            style={{ color: '#1a2e3b' }}
          />
          <div className="h-px mt-5" style={{ background: 'rgba(0,40,80,0.06)' }} />
        </div>

        {/* ── TipTap editor ── */}
        <div id="lcl-print-area" className="px-8 pb-12">
          <EditorContent editor={editor} className="tiptap-lcl" />
        </div>
      </div>
    </>
  )
}
