import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
// No heavy libraries — all parsing done with native Deno APIs to stay within 150MB RAM limit

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const CHUNK_SIZE = 1200
const CHUNK_OVERLAP = 150

// ── Minimal ZIP reader (replaces JSZip — much lower memory footprint) ──────

function readUint16LE(buf: Uint8Array, offset: number): number {
  return buf[offset] | (buf[offset + 1] << 8)
}
function readUint32LE(buf: Uint8Array, offset: number): number {
  return (buf[offset] | (buf[offset + 1] << 8) | (buf[offset + 2] << 16) | (buf[offset + 3] << 24)) >>> 0
}

interface ZipEntry { offset: number; compSize: number; method: number }

function indexZip(data: Uint8Array): Map<string, ZipEntry> {
  const entries = new Map<string, ZipEntry>()
  let i = 0
  while (i < data.length - 30) {
    if (data[i] === 0x50 && data[i+1] === 0x4B && data[i+2] === 0x03 && data[i+3] === 0x04) {
      const method = readUint16LE(data, i + 8)
      const compSize = readUint32LE(data, i + 18)
      const fnLen = readUint16LE(data, i + 26)
      const extraLen = readUint16LE(data, i + 28)
      const fileName = new TextDecoder().decode(data.slice(i + 30, i + 30 + fnLen))
      const dataOffset = i + 30 + fnLen + extraLen
      entries.set(fileName, { offset: dataOffset, compSize, method })
      i = dataOffset + (compSize > 0 ? compSize : 1)
    } else {
      i++
    }
  }
  return entries
}

async function inflateRaw(compressed: Uint8Array): Promise<Uint8Array> {
  const ds = new DecompressionStream('deflate-raw')
  const writer = ds.writable.getWriter()
  const reader = ds.readable.getReader()
  writer.write(compressed)
  writer.close()
  const parts: Uint8Array[] = []
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    parts.push(value)
  }
  const total = parts.reduce((n, p) => n + p.length, 0)
  const out = new Uint8Array(total)
  let off = 0
  for (const p of parts) { out.set(p, off); off += p.length }
  return out
}

async function extractZipEntry(data: Uint8Array, entry: ZipEntry): Promise<string> {
  const raw = data.slice(entry.offset, entry.offset + entry.compSize)
  const bytes = entry.method === 0 ? raw : await inflateRaw(raw)
  return new TextDecoder('utf-8', { fatal: false }).decode(bytes)
}

// ── Text extractors ────────────────────────────────────────────────────────

function stripXml(xml: string): string {
  return xml
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#x[0-9A-Fa-f]+;/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ').trim()
}

async function extractTxt(blob: Blob): Promise<string> {
  return await blob.text()
}

async function extractDocx(blob: Blob): Promise<string> {
  const buf = new Uint8Array(await blob.arrayBuffer())
  const entries = indexZip(buf)
  const entry = entries.get('word/document.xml')
  if (!entry) throw new Error('Invalid DOCX: word/document.xml not found')
  const xml = await extractZipEntry(buf, entry)
  return xml
    .replace(/<w:p[ >]/g, '\n<w:p>')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#x[0-9A-Fa-f]+;/g, ' ')
    .replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim()
}

async function extractXlsx(blob: Blob): Promise<string> {
  const buf = new Uint8Array(await blob.arrayBuffer())
  const entries = indexZip(buf)

  // 1. Load shared strings
  const sharedStrings: string[] = []
  const ssEntry = entries.get('xl/sharedStrings.xml')
  if (ssEntry) {
    const ssXml = await extractZipEntry(buf, ssEntry)
    const tMatches = ssXml.match(/<t[^>]*>([^<]*)<\/t>/g) || []
    for (const m of tMatches) sharedStrings.push(stripXml(m))
  }

  // 2. Get sheet name → file mapping from rels
  const relMap = new Map<string, string>()
  const relsEntry = entries.get('xl/_rels/workbook.xml.rels')
  if (relsEntry) {
    const relsXml = await extractZipEntry(buf, relsEntry)
    for (const m of relsXml.matchAll(/Id="([^"]*)"[^>]*Target="([^"]*)"/g)) relMap.set(m[1], `xl/${m[2]}`)
  }

  const sheetNames = new Map<string, string>() // rId → displayName
  const wbEntry = entries.get('xl/workbook.xml')
  if (wbEntry) {
    const wbXml = await extractZipEntry(buf, wbEntry)
    for (const m of wbXml.matchAll(/<sheet[^>]+name="([^"]*)"[^>]+r:id="([^"]*)"/g)) sheetNames.set(m[2], m[1])
  }

  // 3. Parse each sheet
  const lines: string[] = []
  for (const [rId, displayName] of sheetNames) {
    const sheetFile = relMap.get(rId)
    if (!sheetFile) continue
    const sheetEntry = entries.get(sheetFile)
    if (!sheetEntry) continue

    const wsXml = await extractZipEntry(buf, sheetEntry)
    const rows: string[] = []

    for (const rowXml of (wsXml.match(/<row[^>]*>[\s\S]*?<\/row>/g) || [])) {
      const cells: string[] = []
      for (const cellXml of (rowXml.match(/<c[^>]*>[\s\S]*?<\/c>/g) || [])) {
        const typeMatch = cellXml.match(/t="([^"]*)"/)?.[1]
        const vMatch = cellXml.match(/<v>([^<]*)<\/v>/)?.[1] || ''
        const isMatch = cellXml.match(/<is><t>([^<]*)<\/t><\/is>/)?.[1]

        let val = ''
        if (isMatch !== undefined) val = isMatch
        else if (typeMatch === 's') val = sharedStrings[parseInt(vMatch)] ?? ''
        else val = vMatch

        if (val.trim()) cells.push(val.replace(/\n/g, ' ').trim())
      }
      if (cells.length > 0) rows.push(cells.join('\t'))
    }

    if (rows.length > 0) {
      lines.push(`=== ${displayName} ===`)
      lines.push(rows.join('\n'))
    }
  }

  return lines.join('\n\n')
}

async function extractPdf(blob: Blob): Promise<string> {
  const buf = await blob.arrayBuffer()
  const raw = new TextDecoder('latin1').decode(buf)
  const segments: string[] = []

  const tjRegex = /\(([^)\\]*(?:\\.[^)\\]*)*)\)\s*Tj/g
  let m: RegExpExecArray | null
  while ((m = tjRegex.exec(raw)) !== null) {
    const s = m[1].replace(/\\n/g, '\n').replace(/\\r/g, ' ').replace(/\\t/g, ' ')
      .replace(/\\\(/g, '(').replace(/\\\)/g, ')').replace(/\\\\/g, '\\')
    if (s.trim()) segments.push(s)
  }

  const tjArrRegex = /\[([^\]]+)\]\s*TJ/g
  while ((m = tjArrRegex.exec(raw)) !== null) {
    const parts = m[1].match(/\(([^)\\]*(?:\\.[^)\\]*)*)\)/g) || []
    const joined = parts.map(p => p.slice(1, -1)
      .replace(/\\n/g, '\n').replace(/\\r/g, ' ').replace(/\\\(/g, '(').replace(/\\\)/g, ')').replace(/\\\\/g, '\\')
    ).join('')
    if (joined.trim()) segments.push(joined)
  }

  if (segments.length === 0) throw new Error('PDF có thể là ảnh scan — không đọc được text. Hãy dùng PDF có text layer hoặc convert sang DOCX.')
  return segments.join(' ').replace(/\s+/g, ' ').trim()
}

// ── Main ───────────────────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  let file_path = ''
  try {
    const body = await req.json()
    file_path = body.file_path
    const file_name = body.file_name

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )
    const openaiKey = Deno.env.get('OPENAI_API_KEY')!

    const { data: doc } = await supabase
      .from('documents')
      .select('id, flow')
      .eq('file_path', file_path)
      .single()

    if (!doc) throw new Error('Document not found in database')

    console.log(`[embed] Start: ${file_path} (${file_name})`)
    await supabase.from('documents').update({ status: 'processing' }).eq('id', doc.id)

    const { data: fileBlob, error: dlErr } = await supabase.storage.from('documents').download(file_path)
    if (dlErr || !fileBlob) throw dlErr || new Error('Download failed')

    const ext = file_name.split('.').pop()?.toLowerCase() || ''
    let text = ''

    if (ext === 'txt') text = await extractTxt(fileBlob)
    else if (ext === 'docx') text = await extractDocx(fileBlob)
    else if (ext === 'doc') {
      text = await extractTxt(fileBlob)
      text = text.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, ' ').replace(/\s+/g, ' ').trim()
    }
    else if (ext === 'xlsx' || ext === 'xls') text = await extractXlsx(fileBlob)
    else if (ext === 'pdf') text = await extractPdf(fileBlob)
    else text = await extractTxt(fileBlob)

    console.log(`[embed] Text: ${text.length} chars`)
    if (!text || text.length < 20) throw new Error(`Không đọc được nội dung .${ext}`)

    // Chunk
    const chunks: string[] = []
    let start = 0
    while (start < text.length) {
      const end = Math.min(start + CHUNK_SIZE, text.length)
      let breakAt = end
      if (end < text.length) {
        const b = Math.max(text.lastIndexOf('.', end), text.lastIndexOf('\n', end))
        if (b > start + CHUNK_SIZE * 0.5) breakAt = b + 1
      }
      const chunk = text.slice(start, breakAt).trim()
      if (chunk.length > 30) chunks.push(chunk)
      start = breakAt - CHUNK_OVERLAP
    }

    if (chunks.length === 0) throw new Error('File quá ngắn')
    console.log(`[embed] Chunks: ${chunks.length}`)

    await supabase.from('document_chunks').delete().eq('document_id', doc.id)

    // Embed via fetch (no OpenAI SDK — saves ~50MB RAM)
    const BATCH = 20
    let inserted = 0
    for (let i = 0; i < chunks.length; i += BATCH) {
      const batch = chunks.slice(i, i + BATCH)
      const embRes = await fetch('https://api.openai.com/v1/embeddings', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${openaiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: 'text-embedding-3-small', input: batch }),
      })
      if (!embRes.ok) throw new Error(`OpenAI error: ${await embRes.text()}`)
      const embJson = await embRes.json()

      const rows = batch.map((content, j) => ({
        document_id: doc.id,
        chunk_index: i + j,
        content,
        embedding: embJson.data[j].embedding,
        flow: doc.flow || 'internal',
      }))
      await supabase.from('document_chunks').insert(rows)
      inserted += batch.length
    }

    await supabase.from('documents').update({ status: 'ready', chunk_count: inserted }).eq('id', doc.id)
    console.log(`[embed] Done: ${inserted} chunks`)

    return new Response(JSON.stringify({ success: true, chunks: inserted }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (err) {
    console.error(`[embed] ERROR ${file_path}:`, String(err))
    if (file_path) {
      const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
      await sb.from('documents').update({ status: 'error' }).eq('file_path', file_path).catch(() => {})
    }
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
