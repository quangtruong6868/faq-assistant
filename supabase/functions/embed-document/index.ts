import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
// Minimal edge function: receives pre-chunked text from browser, calls OpenAI, inserts to DB
// All heavy parsing (XLSX, DOCX, PDF) done client-side to avoid Deno 150MB RAM limit

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const SB_URL = Deno.env.get('SUPABASE_URL')!
  const SB_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const OA_KEY = Deno.env.get('OPENAI_API_KEY')!

  const sbH = {
    'apikey': SB_KEY,
    'Authorization': `Bearer ${SB_KEY}`,
    'Content-Type': 'application/json',
    'Prefer': 'return=minimal',
  }

  let document_id = ''
  try {
    const body = await req.json()
    document_id = body.document_id
    const chunks: string[] = body.chunks || []
    const flow: string = body.flow || 'internal'

    if (!document_id) throw new Error('document_id required')
    if (chunks.length === 0) throw new Error('No chunks provided')

    console.log(`[embed] doc=${document_id} chunks=${chunks.length} flow=${flow}`)

    // Mark processing
    await fetch(`${SB_URL}/rest/v1/documents?id=eq.${document_id}`, {
      method: 'PATCH', headers: sbH, body: JSON.stringify({ status: 'processing' }),
    })

    // Delete old chunks
    await fetch(`${SB_URL}/rest/v1/document_chunks?document_id=eq.${document_id}`, {
      method: 'DELETE', headers: sbH,
    })

    // Embed in batches of 20
    const BATCH = 20
    let inserted = 0
    for (let i = 0; i < chunks.length; i += BATCH) {
      const batch = chunks.slice(i, i + BATCH)

      const embRes = await fetch('https://api.openai.com/v1/embeddings', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${OA_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: 'text-embedding-3-small', input: batch }),
      })
      if (!embRes.ok) throw new Error(`OpenAI: ${await embRes.text()}`)
      const embJson = await embRes.json()

      const rows = batch.map((content, j) => ({
        document_id,
        chunk_index: i + j,
        content,
        embedding: embJson.data[j].embedding,
        flow,
      }))

      await fetch(`${SB_URL}/rest/v1/document_chunks`, {
        method: 'POST', headers: sbH, body: JSON.stringify(rows),
      })
      inserted += batch.length
    }

    await fetch(`${SB_URL}/rest/v1/documents?id=eq.${document_id}`, {
      method: 'PATCH', headers: sbH,
      body: JSON.stringify({ status: 'ready', chunk_count: inserted }),
    })
    console.log(`[embed] Done: ${inserted} chunks`)

    return new Response(JSON.stringify({ success: true, chunks: inserted }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (err) {
    console.error(`[embed] ERROR doc=${document_id}:`, String(err))
    if (document_id) {
      await fetch(`${Deno.env.get('SUPABASE_URL')}/rest/v1/documents?id=eq.${document_id}`, {
        method: 'PATCH',
        headers: {
          'apikey': Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
          'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: 'error' }),
      }).catch(() => {})
    }
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
