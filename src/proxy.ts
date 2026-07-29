import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function proxy(request: NextRequest) {
  // Si Supabase no está configurado aún, dejar pasar (modo preview)
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!supabaseUrl || supabaseUrl === 'your_supabase_url_here') {
    return NextResponse.next({ request })
  }

  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(supabaseUrl, supabaseKey!, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
        supabaseResponse = NextResponse.next({ request })
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        )
      },
    },
  })

  const { data: { user } } = await supabase.auth.getUser()

  const pathname = request.nextUrl.pathname

  // Todo es privado salvo lo que esté acá. La lista estaba al revés —se
  // enumeraban las rutas privadas— y así cada módulo nuevo nacía desprotegido:
  // pasó con /configuracion, y volvió a pasar con /cronograma y /equipo.
  //
  // `/api` queda por fuera porque cada ruta trae su propia autenticación
  // (sesión de Supabase o CRON_SECRET), y el manifiesto y el service worker
  // porque el navegador los pide ANTES de iniciar sesión: si se redirigen,
  // la PWA se instala como marcador, sin modo app ni notificaciones.
  const RUTAS_PUBLICAS = ['/login', '/api', '/manifest.json', '/sw.js']
  const esPublica = RUTAS_PUBLICAS.some(ruta => pathname.startsWith(ruta))

  if (!user && !esPublica) {
    return NextResponse.redirect(new URL('/login', request.url))
  }
  if (user && pathname.startsWith('/login')) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }
  if (user && pathname === '/') {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
