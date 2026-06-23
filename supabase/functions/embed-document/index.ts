import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import OpenAI from 'https://esm.sh/openai@4'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const CHUNK_SIZE = 1500  // characters per chunk
const CHUNK_OVERLAP = 200

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
      .select('id')
      .eq('file_path', file_path)
      .single()

    if (!doc) throw new Error('Document not found in database')

    // Update status to processing
    await supabase.from('documents').update({ status: 'processing' }).eq('id', doc.id)

    // Download file from storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('documents')
      .download(file_path)

    if (downloadError) throw downloadError

    // Extract text based on file type
    const ext = file_name.split('.').pop()?.toLowerCase()
    let text = ''

    if (ext === 'txt') {
      text = await fileData.text()
    } else if (ext === 'pdf') {
      // For PDF, use basic text extraction
      // In production, consider using pdf-parse or a dedicated service
      const buffer = await fileData.arrayBuffer()
      const bytes = new Uint8Array(buffer)
      // Extract readable ASCII text as fallback
      text = new TextDecoder('utf-8', { fatal: false }).decode(bytes)
        .replace(/[^\x20-\x7EÀ-ɏ　-鿿가-힯ऀ-ॿ]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
    } else {
      // For docx/xlsx, extract as text with fallback
      text = await fileData.text()
    }

    if (!text || text.length < 10) throw new Error('Could not extract text from document')

    // Chunk the text
    const chunks: string[] = []
    let start = 0
    while (start < text.length) {
      const end = Math.min(start + CHUNK_SIZE, text.length)
      const chunk = text.slice(start, end).trim()
      if (chunk.length > 50) chunks.push(chunk)
      start += CHUNK_SIZE - CHUNK_OVERLAP
    }

    // Delete existing chunks
    await supabase.from('document_chunks').delete().eq('document_id', doc.id)

    // Embed and insert chunks in batches
    const BATCH_SIZE = 20
    for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
      const batch = chunks.slice(i, i + BATCH_SIZE)
      const embeddings = await openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: batch,
      })

      const rows = batch.map((content, j) => ({
        document_id: doc.id,
        chunk_index: i + j,
        content,
        embedding: embeddings.data[j].embedding,
      }))

      await supabase.from('document_chunks').insert(rows)
    }

    // Mark as ready
    await supabase.from('documents').update({ status: 'ready' }).eq('id', doc.id)

    return new Response(JSON.stringify({ success: true, chunks: chunks.length }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (err) {
    // Try to update document status to error
    try {
      const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
      const { file_path } = await (req.clone().json().catch(() => ({})))
      if (file_path) {
        await supabase.from('documents').update({ status: 'error', error_message: String(err) }).eq('file_path', file_path)
      }
    } catch {}

    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
