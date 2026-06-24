import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import OpenAI from 'https://esm.sh/openai@4'
// @deno-types="https://esm.sh/v135/@types/jszip@3.4.4/index.d.ts"
import JSZip from 'https://esm.sh/jszip@3.10.1'
import * as XLSX from 'https://esm.sh/xlsx@0.18.5'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const CHUNK_SIZE = 1200      // smaller → more precise retrieval
const CHUNK_OVERLAP = 150

// ── Text extractors ────────────────────────────────────────────────────────

async function extractTxt(blob: Blob): Promise<string> {
  return await blob.text()
}

async function extractDocx(blob: Blob): Promise<string> {
  const buf = await blob.arrayBuffer()
  const zip = await JSZip.loadAsync(buf)

  // word/document.xml holds the main body text
  const xmlFile = zip.file('word/document.xml')
  if (!xmlFile) throw new Error('Invalid DOCX: word/document.xml not found')

  const xml = await xmlFile.async('string')

  // Strip XML tags, decode entities, collapse whitespace
  const text = xml
    .replace(/<w:p[ >]/g, '\n<w:p>')           // paragraph → newline
    .replace(/<[^>]+>/g, '')                    // remove all tags
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#x[0-9A-F]+;/gi, ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()

  return text
}

async function extractXlsx(blob: Blob): Promise<string> {
  const buf = await blob.arrayBuffer()
  const wb = XLSX.read(new Uint8Array(buf), { type: 'array' })

  const lines: string[] = []
  for (const sheetName of wb.SheetNames) {
    const ws = wb.Sheets[sheetName]
    const csv = XLSX.utils.sheet_to_csv(ws, { blankrows: false })
    if (csv.trim()) {
      lines.push(`=== ${sheetName} ===`)
      lines.push(csv.trim())
    }
  }
  return lines.join('\n\n')
}

async function extractPdf(blob: Blob): Promise<string> {
  // Deno-compatible PDF text extraction via regex on raw bytes
  // Works for most text-layer PDFs; scanned images won't work (need OCR)
  const buf = await blob.arrayBuffer()
  const raw = new TextDecoder('latin1').decode(buf)

  // Extract text between BT (Begin Text) and ET (End Text) markers
  const segments: string[] = []

  // Method 1: Tj and TJ operators
  const tjRegex = /\(([^)\\]*(?:\\.[^)\\]*)*)\)\s*Tj/g
  let m: RegExpExecArray | null
  while ((m = tjRegex.exec(raw)) !== null) {
    const s = m[1]
      .replace(/\\n/g, '\n').replace(/\\r/g, ' ').replace(/\\t/g, ' ')
      .replace(/\\\(/g, '(').replace(/\\\)/g, ')').replace(/\\\\/g, '\\')
    if (s.trim()) segments.push(s)
  }

  // Method 2: TJ arrays
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

  try {
    const { file_path, file_name } = await req.json()

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )
    const openai = new OpenAI({ apiKey: Deno.env.get('OPENAI_API_KEY') })

    // Get document record
    const { data: doc } = await supabase
      .from('documents')
      .select('id, flow')
      .eq('file_path', file_path)
      .single()

    if (!doc) throw new Error('Document not found in database')

    await supabase.from('documents').update({ status: 'processing' }).eq('id', doc.id)

    // Download from storage
    const { data: fileBlob, error: dlErr } = await supabase.storage
      .from('documents')
      .download(file_path)

    if (dlErr || !fileBlob) throw dlErr || new Error('Download failed')

    // Extract text based on extension
    const ext = file_name.split('.').pop()?.toLowerCase() || ''
    let text = ''

    if (ext === 'txt') {
      text = await extractTxt(fileBlob)
    } else if (ext === 'docx') {
      text = await extractDocx(fileBlob)
    } else if (ext === 'doc') {
      // Old .doc format — extract readable text heuristically
      text = await extractTxt(fileBlob)
      text = text.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, ' ').replace(/\s+/g, ' ').trim()
    } else if (ext === 'xlsx' || ext === 'xls') {
      text = await extractXlsx(fileBlob)
    } else if (ext === 'pdf') {
      text = await extractPdf(fileBlob)
    } else {
      text = await extractTxt(fileBlob)
    }

    if (!text || text.length < 20) {
      throw new Error(`Không thể đọc nội dung file .${ext}. Kiểm tra lại file hoặc convert sang .txt/.docx`)
    }

    // Chunk with overlap
    const chunks: string[] = []
    let start = 0
    while (start < text.length) {
      const end = Math.min(start + CHUNK_SIZE, text.length)
      // Try to break at sentence boundary
      let breakAt = end
      if (end < text.length) {
        const lastDot = text.lastIndexOf('.', end)
        const lastNewline = text.lastIndexOf('\n', end)
        const boundary = Math.max(lastDot, lastNewline)
        if (boundary > start + CHUNK_SIZE * 0.5) breakAt = boundary + 1
      }
      const chunk = text.slice(start, breakAt).trim()
      if (chunk.length > 30) chunks.push(chunk)
      start = breakAt - CHUNK_OVERLAP
    }

    if (chunks.length === 0) throw new Error('File quá ngắn hoặc không có nội dung')

    // Delete old chunks
    await supabase.from('document_chunks').delete().eq('document_id', doc.id)

    // Batch embed — 20 chunks per API call
    const BATCH = 20
    let inserted = 0
    for (let i = 0; i < chunks.length; i += BATCH) {
      const batch = chunks.slice(i, i + BATCH)
      const res = await openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: batch,
      })

      const rows = batch.map((content, j) => ({
        document_id: doc.id,
        chunk_index: i + j,
        content,
        embedding: res.data[j].embedding,
        flow: doc.flow || 'internal',    // tag chunk with flow for filtered search
      }))

      await supabase.from('document_chunks').insert(rows)
      inserted += batch.length
    }

    await supabase.from('documents').update({ status: 'ready', chunk_count: inserted }).eq('id', doc.id)

    return new Response(JSON.stringify({ success: true, chunks: inserted }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (err) {
    const body = await req.clone().json().catch(() => ({}))
    if (body.file_path) {
      const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
      await sb.from('documents').update({ status: 'error' }).eq('file_path', body.file_path).catch(() => {})
    }
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
