import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import OpenAI from 'https://esm.sh/openai@4'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )
    const openai = new OpenAI({ apiKey: Deno.env.get('OPENAI_API_KEY') })

    const body = await req.json()
    const { action } = body

    // ── Action 1: Teach bot from unanswered question ──────────
    // Admin writes answer → embed question → store in learned_knowledge
    if (action === 'teach_from_unanswered') {
      const { unanswered_id } = body
      if (!unanswered_id) return err('unanswered_id required')

      // Get the unanswered question
      const { data: rec, error } = await supabase
        .from('unanswered_questions')
        .select('*')
        .eq('id', unanswered_id)
        .single()
      if (error || !rec) return err('Question not found')
      if (!rec.admin_answer?.trim()) return err('admin_answer is empty — please write an answer first')

      // Embed the question
      const embedding = await openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: rec.question,
      }).then(r => r.data[0].embedding)

      // Push to learned_knowledge via DB function
      const { data: learnedId } = await supabase.rpc('teach_bot_from_unanswered', {
        p_unanswered_id: unanswered_id,
        p_embedding:     embedding,
      })

      return ok({ learned_id: learnedId, message: 'Bot đã học câu trả lời này!' })
    }

    // ── Action 2: Teach bot directly (admin writes Q+A freely) ─
    if (action === 'teach_direct') {
      const { flow, language, question, answer } = body
      if (!flow || !language || !question || !answer) return err('flow, language, question, answer required')

      const embedding = await openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: question,
      }).then(r => r.data[0].embedding)

      const { data: result } = await supabase.rpc('upsert_learned_knowledge', {
        p_flow:        flow,
        p_language:    language,
        p_question:    question,
        p_answer:      answer,
        p_embedding:   embedding,
        p_confidence:  0.95,
        p_source_type: 'admin_direct',
        p_topics:      ['admin'],
      })

      return ok({ learned_id: result, message: 'Đã thêm vào knowledge base!' })
    }

    // ── Action 3: Submit feedback (thumbs up / down) ──────────
    if (action === 'feedback') {
      const { session_id, question, answer, flow, language, rating, learned_id } = body
      if (!question || !answer || !flow || !rating) return err('question, answer, flow, rating required')
      if (rating !== 1 && rating !== -1) return err('rating must be 1 or -1')

      await supabase.from('answer_feedback').insert({
        session_id, question, answer, flow, language, rating, learned_id: learned_id || null,
      })

      // If thumbs down AND answer came from learned KB → also save to unanswered for admin review
      if (rating === -1) {
        await supabase.rpc('upsert_unanswered_question', {
          p_flow:        flow,
          p_language:    language,
          p_question:    question,
          p_bot_answer:  answer,
          p_source_type: 'wrong_answer',
          p_session_id:  session_id || null,
        })
      }

      return ok({ message: rating === 1 ? 'Cảm ơn phản hồi!' : 'Ghi nhận — câu hỏi này sẽ được xem xét lại' })
    }

    // ── Action 4: List learned knowledge (for admin) ──────────
    if (action === 'list_learned') {
      const { flow, language, page = 0, limit = 20 } = body
      let query = supabase
        .from('learned_knowledge')
        .select('id, flow, language, question, answer, confidence, usage_count, source_type, created_at, updated_at')
        .order('usage_count', { ascending: false })
        .range(page * limit, (page + 1) * limit - 1)

      if (flow) query = query.eq('flow', flow)
      if (language) query = query.eq('language', language)

      const { data, count } = await query
      return ok({ items: data || [], total: count })
    }

    // ── Action 5: Delete from learned knowledge ───────────────
    if (action === 'delete_learned') {
      const { id } = body
      if (!id) return err('id required')
      await supabase.from('learned_knowledge').delete().eq('id', id)
      return ok({ message: 'Đã xóa' })
    }

    return err('Unknown action')

  } catch (e) {
    console.error('[teach-bot]', e)
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})

function ok(body: object) {
  return new Response(JSON.stringify({ ok: true, ...body }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
function err(msg: string) {
  return new Response(JSON.stringify({ ok: false, error: msg }), {
    status: 400,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
