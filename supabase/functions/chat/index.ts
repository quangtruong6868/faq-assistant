import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import OpenAI from 'https://esm.sh/openai@4'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const NO_INFO: Record<string, string> = {
  vi: 'Xin lỗi, tôi chưa có thông tin về câu hỏi này. Vui lòng liên hệ người phụ trách để được hỗ trợ.',
  jp: '申し訳ありませんが、この質問に関する情報がまだありません。担当者にお問い合わせください。',
  en: "Sorry, I don't have information about this question yet. Please contact the person in charge for assistance.",
  np: 'माफ गर्नुहोस्, मसँग यस प्रश्नको बारेमा जानकारी छैन। सहायताको लागि सम्बन्धित व्यक्तिलाई सम्पर्क गर्नुहोस्।',
}

const LANG_INSTRUCTIONS: Record<string, string> = {
  vi: 'Trả lời bằng tiếng Việt. Ngắn gọn, rõ ràng.',
  jp: '日本語で回答してください。簡潔に。',
  en: 'Answer in English. Be concise.',
  np: 'नेपालीमा जवाफ दिनुहोस्। संक्षिप्त।',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { question, language = 'vi', session_id } = await req.json()

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )
    const openai = new OpenAI({ apiKey: Deno.env.get('OPENAI_API_KEY') })

    // Step 1: Search FAQ with full-text search
    const { data: faqResults } = await supabase
      .from('faq_items')
      .select(`
        id, question_vi, question_jp, question_en, question_np,
        answer_vi, answer_jp, answer_en, answer_np,
        faq_categories(name)
      `)
      .eq('is_active', true)
      .textSearch('question_vi', question, { type: 'plain', config: 'simple' })
      .limit(3)

    if (faqResults && faqResults.length > 0) {
      const best = faqResults[0]
      const answerKey = `answer_${language}` as keyof typeof best
      const answer = (best[answerKey] as string) || best.answer_vi

      await logChat(supabase, session_id, question, answer, language, 'faq', best.id)
      await updatePopularQuestions(supabase, question, language)

      return new Response(JSON.stringify({
        answer,
        source: (best.faq_categories as any)?.name || 'FAQ',
        source_detail: null,
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // Step 2: Vector search in documents
    const embeddingRes = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: question,
    })
    const embedding = embeddingRes.data[0].embedding

    const { data: chunks } = await supabase.rpc('match_document_chunks', {
      query_embedding: embedding,
      match_threshold: 0.65,
      match_count: 4,
    })

    if (chunks && chunks.length > 0) {
      const context = chunks.map((c: any) => c.content).join('\n\n---\n\n')
      const topDoc = chunks[0].document_title

      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `${LANG_INSTRUCTIONS[language] || LANG_INSTRUCTIONS.vi}
Bạn là trợ lý FAQ nội bộ công ty. Chỉ trả lời dựa trên thông tin được cung cấp.
Nếu không tìm thấy câu trả lời trong tài liệu, hãy nói rõ không có thông tin.
KHÔNG bịa đặt, KHÔNG suy luận ngoài tài liệu.`,
          },
          {
            role: 'user',
            content: `Tài liệu tham khảo:\n${context}\n\nCâu hỏi: ${question}`,
          },
        ],
        temperature: 0.1,
        max_tokens: 500,
      })

      const answer = completion.choices[0].message.content || NO_INFO[language]
      await logChat(supabase, session_id, question, answer, language, 'document')
      await updatePopularQuestions(supabase, question, language)

      return new Response(JSON.stringify({
        answer,
        source: topDoc,
        source_detail: null,
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // Step 3: No match
    await logChat(supabase, session_id, question, NO_INFO[language], language, 'no_match')
    await updatePopularQuestions(supabase, question, language)

    return new Response(JSON.stringify({
      answer: NO_INFO[language],
      source: null,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})

async function logChat(supabase: any, session_id: string, question: string, answer: string, language: string, source: string, source_id?: string) {
  await supabase.from('chat_logs').insert({ session_id, question, answer, language, source, source_id })
}

async function updatePopularQuestions(supabase: any, question: string, language: string) {
  const { data } = await supabase.from('popular_questions').select('id, count').eq('question', question).eq('language', language).single()
  if (data) {
    await supabase.from('popular_questions').update({ count: data.count + 1, last_asked_at: new Date().toISOString() }).eq('id', data.id)
  } else {
    await supabase.from('popular_questions').insert({ question, language, count: 1 })
  }
}
