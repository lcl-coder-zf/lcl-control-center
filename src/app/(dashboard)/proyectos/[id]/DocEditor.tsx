'use client'

import { useEffect, useRef } from 'react'
import { useCreateBlockNote } from '@blocknote/react'
import { BlockNoteView } from '@blocknote/mantine'
import '@blocknote/core/fonts/inter.css'
import '@blocknote/mantine/style.css'

function countWords(blocks: any[]): number {
  let n = 0
  const walk = (bs: any[]) => bs.forEach(b => {
    if (Array.isArray(b.content)) b.content.forEach((c: any) => {
      if (c.text) n += c.text.split(/\s+/).filter(Boolean).length
    })
    if (Array.isArray(b.children)) walk(b.children)
  })
  walk(blocks)
  return n
}

export default function DocEditor({
  initialContent,
  canEdit,
  onSave,
  onStateChange,
}: {
  initialContent: any
  canEdit: boolean
  onSave: (content: any) => Promise<void>
  onStateChange: (state: { wordCount: number; saveState: 'idle' | 'saving' | 'saved' }) => void
}) {
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const editor = useCreateBlockNote({
    initialContent: Array.isArray(initialContent) ? initialContent : undefined,
  })

  useEffect(() => {
    onStateChange({ wordCount: countWords(editor.document), saveState: 'idle' })
  }, [])

  async function triggerSave() {
    onStateChange({ wordCount: countWords(editor.document), saveState: 'saving' })
    await onSave(editor.document)
    onStateChange({ wordCount: countWords(editor.document), saveState: 'saved' })
    setTimeout(() => onStateChange({ wordCount: countWords(editor.document), saveState: 'idle' }), 2500)
  }

  return (
    <BlockNoteView
      editor={editor}
      editable={canEdit}
      theme="light"
      onChange={() => {
        onStateChange({ wordCount: countWords(editor.document), saveState: 'idle' })
        if (saveTimer.current) clearTimeout(saveTimer.current)
        saveTimer.current = setTimeout(triggerSave, 1500)
      }}
    />
  )
}
