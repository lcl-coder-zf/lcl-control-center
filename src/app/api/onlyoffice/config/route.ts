import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import jwt from 'jsonwebtoken'

const OFFICE_TYPES: Record<string, string> = {
  docx: 'word', doc: 'word', odt: 'word', txt: 'word', rtf: 'word',
  xlsx: 'cell', xls: 'cell', ods: 'cell', csv: 'cell',
  pptx: 'slide', ppt: 'slide', odp: 'slide',
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { documentId } = await req.json()

  const { data: doc, error } = await supabase
    .from('documents')
    .select('id, name, file_url, version, updated_at, created_at')
    .eq('id', documentId)
    .single()

  if (error || !doc) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { data: signed } = await supabase.storage
    .from('documents')
    .createSignedUrl(doc.file_url, 3600)

  if (!signed?.signedUrl) return NextResponse.json({ error: 'Cannot generate URL' }, { status: 500 })

  const fileType = doc.name.split('.').pop()?.toLowerCase() ?? 'docx'
  const documentType = OFFICE_TYPES[fileType] ?? 'word'

  // Key must be unique per version (alphanumeric + _ -, max 128 chars)
  const ts = new Date(doc.updated_at ?? doc.created_at).getTime()
  const key = `${doc.id.replace(/-/g, '')}_${ts}`.slice(0, 128)

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? ''

  const config = {
    document: {
      fileType,
      key,
      title: doc.name,
      url: signed.signedUrl,
      permissions: {
        edit: true,
        download: true,
        print: true,
      },
    },
    documentType,
    editorConfig: {
      callbackUrl: `${appUrl}/api/onlyoffice/callback?documentId=${documentId}`,
      mode: 'edit',
      lang: 'es',
      user: {
        id: user.id,
        name: user.email ?? 'Usuario',
      },
      customization: {
        autosave: true,
        forcesave: false,
        chat: false,
        help: false,
        compactHeader: true,
        toolbar: true,
      },
    },
  }

  const secret = process.env.ONLYOFFICE_JWT_SECRET
  if (secret) {
    const token = jwt.sign(config, secret)
    return NextResponse.json({ config: { ...config, token } })
  }

  return NextResponse.json({ config })
}
