// ============================================================
// Troceo de audio en el navegador para transcripción con Whisper (Groq).
//
// El problema: Groq rechaza archivos por encima de ~25 MB (413 "request too
// large"). Una reunión de 50 min en m4a pesa ~48 MB → falla.
//
// La solución (sin infra ni ffmpeg): decodificar el audio con la Web Audio API,
// bajarlo a mono 16 kHz (lo que le basta a Whisper para voz, ~10x más liviano) y
// partirlo en segmentos de pocos minutos. Cada trozo se transcribe por separado
// y se concatena. Así soporta reuniones largas sin tocar el límite de Groq.
//
// Todo corre en el cliente: solo usa APIs del navegador.
// ============================================================

const TARGET_RATE = 16000        // Whisper trabaja a 16 kHz; más no aporta.
const CHUNK_SECONDS = 8 * 60     // 8 min → ~15 MB por WAV, cómodo bajo el tope.

type Win = typeof window & { webkitAudioContext?: typeof AudioContext }

// Convierte cualquier audio (webm/opus, m4a/aac, mp3, wav…) en una lista de
// trozos WAV mono 16 kHz listos para transcribir. `onProgress` reporta el paso.
export async function toTranscriptionChunks(
  src: Blob,
  onProgress?: (msg: string) => void,
): Promise<Blob[]> {
  onProgress?.('Preparando el audio…')
  const arrayBuf = await src.arrayBuffer()

  const w = window as Win
  const AC = w.AudioContext || w.webkitAudioContext
  if (!AC) throw new Error('Tu navegador no soporta procesar audio (Web Audio API).')

  // 1) Decodificar. slice(0) porque decodeAudioData consume el ArrayBuffer.
  const decodeCtx = new AC()
  let decoded: AudioBuffer
  try {
    decoded = await decodeCtx.decodeAudioData(arrayBuf.slice(0))
  } catch {
    throw new Error('No se pudo leer el audio (formato no soportado por el navegador).')
  } finally {
    decodeCtx.close()
  }

  // 2) Downmix a mono + resample a 16 kHz con un contexto offline.
  onProgress?.('Optimizando el audio…')
  const length = Math.ceil(decoded.duration * TARGET_RATE)
  const offline = new OfflineAudioContext(1, length, TARGET_RATE)
  const node = offline.createBufferSource()
  node.buffer = decoded
  node.connect(offline.destination)
  node.start()
  const rendered = await offline.startRendering()
  const pcm = rendered.getChannelData(0)  // Float32 mono @ 16 kHz

  // 3) Partir por tiempo y encodear cada segmento como WAV.
  const samplesPerChunk = CHUNK_SECONDS * TARGET_RATE
  const chunks: Blob[] = []
  for (let start = 0; start < pcm.length; start += samplesPerChunk) {
    const slice = pcm.subarray(start, Math.min(start + samplesPerChunk, pcm.length))
    chunks.push(encodeWav(slice, TARGET_RATE))
  }
  return chunks.length ? chunks : [encodeWav(pcm, TARGET_RATE)]
}

// PCM Float32 → WAV PCM 16-bit mono. WAV es simple de encodear sin librerías y
// Whisper lo acepta directo.
function encodeWav(samples: Float32Array, rate: number): Blob {
  const buffer = new ArrayBuffer(44 + samples.length * 2)
  const view = new DataView(buffer)
  const writeStr = (off: number, s: string) => {
    for (let i = 0; i < s.length; i++) view.setUint8(off + i, s.charCodeAt(i))
  }
  writeStr(0, 'RIFF')
  view.setUint32(4, 36 + samples.length * 2, true)
  writeStr(8, 'WAVE')
  writeStr(12, 'fmt ')
  view.setUint32(16, 16, true)        // tamaño del sub-chunk fmt
  view.setUint16(20, 1, true)         // PCM
  view.setUint16(22, 1, true)         // mono
  view.setUint32(24, rate, true)
  view.setUint32(28, rate * 2, true)  // byte rate (rate * canales * bytesPorMuestra)
  view.setUint16(32, 2, true)         // block align
  view.setUint16(34, 16, true)        // bits por muestra
  writeStr(36, 'data')
  view.setUint32(40, samples.length * 2, true)
  let off = 44
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]))
    view.setInt16(off, s < 0 ? s * 0x8000 : s * 0x7fff, true)
    off += 2
  }
  return new Blob([view], { type: 'audio/wav' })
}
