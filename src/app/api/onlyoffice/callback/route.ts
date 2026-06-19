import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import jwt from 'jsonwebtoken'

// Called by ONLYOFFICE Document Server when a document is saved
// Status 2 = last editor closed, file ready to save
// Status 6 = force save requested
export async function POST(req: NextRequest) {
  const secret = process.env.ONLYOFFICE_JWT_SECRET
  if (secret) {
    const authHeader = req.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '')
    if (!token) return NextResponse.json({ error: 1 })
    try { jwt.verify(token, secret) } catch { return NextResponse.json({ error: 1 }) }
  }

  const body = await req.json()
  const documentId = req.nextUrl.searchParams.get('documentId')

  // Acknowledge statuses that don't require saving
  if (body.status !== 2 && body.status !== 6) {
    return NextResponse.json({ error: 0 })
  }

  if (!body.url || !documentId) return NextResponse.json({ error: 1 })

  try {
    const fileRes = await fetch(body.url)
    if (!fileRes.ok) return NextResponse.json({ error: 1 })
    const fileBuffer = await fileRes.arrayBuffer()

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data: doc } = await supabase
      .from('documents')
      .select('id, file_url, name')
      .eq('id', documentId)
      .single()

    if (!doc) return NextResponse.json({ error: 1 })

    const { error: uploadError } = await supabase.storage
      .from('documents')
      .upload(doc.file_url, fileBuffer, {
        upsert: true,
        contentType: mimeType(doc.name),
      })

    if (uploadError) {
      console.error('ONLYOFFICE callback upload error:', uploadError)
      return NextResponse.json({ error: 1 })
    }

    await supabase
      .from('documents')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', documentId)

    return NextResponse.json({ error: 0 })
  } catch (e) {
    console.error('ONLYOFFICE callback error:', e)
    return NextResponse.json({ error: 1 })
  }
}

function mimeType(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase() ?? ''
  const map: Record<string, string> = {
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    doc:  'application/msword',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    xls:  'application/vnd.ms-excel',
    pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    ppt:  'application/vnd.ms-powerpoint',
    odt:  'application/vnd.oasis.opendocument.text',
    ods:  'application/vnd.oasis.opendocument.spreadsheet',
    odp:  'application/vnd.oasis.opendocument.presentation',
    txt:  'text/plain',
    rtf:  'application/rtf',
    csv:  'text/csv',
  }
  return map[ext] ?? 'application/octet-stream'
}
