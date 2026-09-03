import type { NextConfig } from "next";

// Headers de seguridad aplicados a toda respuesta. Deliberadamente NO se pone un
// Content-Security-Policy de recursos: la app carga Supabase + Web Push + PWA y
// un CSP mal calibrado rompe el service worker; se deja `frame-ancestors` (que
// no afecta la carga de recursos) para bloquear clickjacking. Nota: la app graba
// audio en Reuniones, por eso `microphone=(self)` queda permitido.
const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "Permissions-Policy", value: "camera=(), geolocation=(), microphone=(self)" },
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
];

const nextConfig: NextConfig = {
  devIndicators: false,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
