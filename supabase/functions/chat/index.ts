import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import OpenAI from 'https://esm.sh/openai@4'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Short persona lines — knowledge comes from DB, not system prompt
const PERSONA: Record<string, Record<string, string>> = {
  corporate: {
    vi: 'Bạn là tư vấn viên nhân lực TH-GROUP. Trả lời ngắn gọn, thực tế dựa trên tài liệu được cung cấp. Nếu tài liệu không đủ, hãy nói thật và đề nghị khách liên hệ trực tiếp.',
    jp: 'あなたはTH-GROUPの人材コンサルタントです。提供された資料に基づき、簡潔に回答してください。情報が不足の場合は直接連絡を勧めてください。',
    en: 'You are a TH-GROUP HR consultant. Answer concisely based on provided documents. If info is insufficient, say so and suggest direct contact.',
    np: 'तपाईं TH-GROUP का HR सल्लाहकार हुनुहुन्छ। दिइएका कागजातमा आधारित संक्षिप्त जवाफ दिनुहोस्।',
  },
  candidate: {
    vi: 'Bạn là tư vấn viên việc làm TH-GROUP. Trả lời thân thiện, ngắn gọn dựa trên tài liệu. Nếu không đủ thông tin, đề nghị để lại thông tin liên hệ.',
    jp: 'あなたはTH-GROUPのキャリアアドバイザーです。資料に基づき、親切・簡潔に回答してください。',
    en: 'You are a TH-GROUP career advisor. Answer warmly and concisely based on documents. If info is insufficient, ask them to leave contact details.',
    np: 'तपाईं TH-GROUP का क्यारियर सल्लाहकार हुनुहुन्छ। कागजातमा आधारित मित्रवत जवाफ दिनुहोस्।',
  },
  internal: {
    vi: 'Bạn là trợ lý FAQ nội bộ. Chỉ trả lời dựa trên tài liệu. KHÔNG bịa đặt.',
    jp: '社内FAQアシスタントです。資料のみに基づいて回答。推測しない。',
    en: 'You are the internal FAQ assistant. Answer only from provided documents. Do NOT fabricate.',
    np: 'तपाईं आन्तरिक FAQ सहायक हुनुहुन्छ। केवल कागजातमा आधारित जवाफ दिनुहोस्।',
  },
  // Honsha: always Japanese, department-aware
  honsha: {
    jp: 'あなたはTH-GROUP本社{department}担当のFAQアシスタントです。社内規定・手続きに関する質問に、提供された資料のみに基づいて正確・簡潔に回答してください。資料にない内容は推測せず、担当者に確認するよう案内してください。',
    vi: 'あなたはTH-GROUP本社{department}担当のFAQアシスタントです。社内規定・手続きに関する質問に、提供された資料のみに基づいて正確・簡潔に回答してください。資料にない内容は推測せず、担当者に確認するよう案内してください。',
    en: 'あなたはTH-GROUP本社{department}担当のFAQアシスタントです。社内規定・手続きに関する質問に、提供された資料のみに基づいて正確・簡潔に回答してください。資料にない内容は推測せず、担当者に確認するよう案内してください。',
    np: 'あなたはTH-GROUP本社{department}担当のFAQアシスタントです。社内規定・手続きに関する質問に、提供された資料のみに基づいて正確・簡潔に回答してください。資料にない内容は推測せず、担当者に確認するよう案内してください。',
  },
  // Haken: multilingual, dispatched worker focus
  haken: {
    vi: 'Bạn là trợ lý FAQ cho nhân viên haken (phái cử) của TH-GROUP. Trả lời ngắn gọn, dễ hiểu dựa trên tài liệu. KHÔNG bịa đặt. Nếu không có thông tin, thông báo sẽ có quản lý liên hệ lại.',
    jp: 'あなたはTH-GROUP派遣スタッフ向けFAQアシスタントです。資料に基づき、分かりやすく簡潔に回答してください。不明な場合は担当者が折り返し連絡する旨をお伝えください。',
    en: 'You are the TH-GROUP Haken staff FAQ assistant. Answer clearly and concisely from provided documents. If unknown, inform them a manager will follow up.',
    np: 'तपाईं TH-GROUP Haken कर्मचारीहरूको FAQ सहायक हुनुहुन्छ। कागजातमा आधारित स्पष्ट जवाफ दिनुहोस्। अज्ञात भएमा व्यवस्थापकले सम्पर्क गर्नेछन् भनी जानकारी दिनुहोस्।',
  },
}

const NO_INFO: Record<string, string> = {
  vi: 'Xin lỗi, tôi chưa có thông tin cụ thể về vấn đề này. Bạn có thể để lại số điện thoại để được tư vấn trực tiếp không?',
  jp: '申し訳ありませんが、この件についての詳細情報がありません。直接ご連絡いただけますか？',
  en: "I don't have specific info on this yet. Would you like to leave your contact for a direct consultation?",
  np: 'माफ गर्नुहोस्, यसबारे जानकारी छैन। सम्पर्क जानकारी छाड्नुहुन्छ?',
}

// Flows that use 'internal' tagged documents
const INTERNAL_FLOWS = new Set(['internal', 'honsha', 'haken'])

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const {
      question,
      language = 'vi',
      session_id,
      flow = 'internal',
      history = [],
      department,   // for honsha: department JP name e.g. '申請業務'
    } = await req.json()

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )
    const openai = new OpenAI({ apiKey: Deno.env.get('OPENAI_API_KEY') })

    // Build persona — for honsha, inject department name
    let persona = PERSONA[flow]?.[language] || PERSONA.internal[language] || PERSONA.internal.vi
    if (flow === 'honsha' && department) {
      persona = persona.replace('{department}', department)
    } else if (flow === 'honsha') {
      persona = persona.replace('{department}', '')
    }

    // ── Step 1: FAQ full-text search (zero token cost) ──
    const langA = language === 'jp' ? 'answer_jp' : language === 'en' ? 'answer_en' : language === 'np' ? 'answer_np' : 'answer_vi'

    const { data: faqResults } = await supabase
      .from('faq_items')
      .select(`id, question_vi, question_jp, question_en, ${langA}, faq_categories(name_vi)`)
      .eq('is_active', true)
      .textSearch('question_vi', question, { type: 'plain', config: 'simple' })
      .limit(3)

    // Exact FAQ hit (only for internal-type flows) — return directly without GPT
    if (INTERNAL_FLOWS.has(flow) && faqResults && faqResults.length > 0) {
      const best = faqResults[0]
      const answer = (best as any)[langA] || (best as any).answer_vi
      if (answer) {
        await logChat(supabase, session_id, question, answer, language, 'faq')
        await updatePopular(supabase, question, language)
        return respond({ answer, source: (best.faq_categories as any)?.name_vi || 'FAQ' })
      }
    }

    // ── Step 2: Vector search ──
    const embeddingRes = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: question,
    })
    const embedding = embeddingRes.data[0].embedding

    const { data: allChunks } = await supabase.rpc('match_document_chunks', {
      query_embedding: embedding,
      match_threshold: 0.60,
      match_count: 8,
    })

    // Filter: honsha/haken → use 'internal' tagged docs; others → match their own flow or untagged
    const docFlow = INTERNAL_FLOWS.has(flow) ? 'internal' : flow
    const chunks = (allChunks || [])
      .filter((c: any) => !c.flow || c.flow === docFlow)
      .slice(0, 3)

    // For corporate/candidate: also build FAQ context
    let faqContext = ''
    if (faqResults && faqResults.length > 0 && !INTERNAL_FLOWS.has(flow)) {
      faqContext = faqResults
        .map((f: any) => `Q: ${f.question_vi}\nA: ${f[langA] || f.answer_vi}`)
        .join('\n\n')
    }

    // ── Step 3: Build context ──
    const docContext = chunks && chunks.length > 0
      ? chunks.map((c: any) => c.content).join('\n---\n')
      : ''

    // For honsha: prepend department context
    const deptContext = (flow === 'honsha' && department)
      ? `【対象部署】${department}\n\n`
      : ''

    const context = [faqContext, deptContext + docContext].filter(Boolean).join('\n\n===\n\n')

    // ── Step 4: GPT with minimal history ──
    const recentHistory = history.slice(-4)

    if (context) {
      const messages: any[] = [
        {
          role: 'system',
          content: `${persona}\n\n【参考資料 / Tài liệu】\n${context}`,
        },
        ...recentHistory,
        { role: 'user', content: question },
      ]

      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages,
        temperature: 0.3,
        max_tokens: 400,
      })

      const answer = completion.choices[0].message.content || NO_INFO[language] || NO_INFO.vi
      await logChat(supabase, session_id, question, answer, language, 'rag')
      await updatePopular(supabase, question, language)

      return respond({ answer, source: chunks?.[0]?.document_title || null })
    }

    // ── Step 5: No context found ──
    // Corporate/candidate: GPT from general knowledge
    if (!INTERNAL_FLOWS.has(flow)) {
      const messages: any[] = [
        { role: 'system', content: persona },
        ...recentHistory,
        { role: 'user', content: question },
      ]

      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages,
        temperature: 0.4,
        max_tokens: 400,
      })

      const answer = completion.choices[0].message.content || NO_INFO[language] || NO_INFO.vi
      const isNoInfo = !answer || answer === NO_INFO[language]
      await logChat(supabase, session_id, question, answer, language, 'general')
      await updatePopular(supabase, question, language)

      return respond({ answer, source: null, no_match: isNoInfo, session_id })
    }

    // Internal/honsha/haken: no docs → no_match → contact form
    const noInfo = NO_INFO[language] || NO_INFO.vi
    await logChat(supabase, session_id, question, noInfo, language, 'no_match')
    await updatePopular(supabase, question, language)
    return respond({ answer: noInfo, source: null, no_match: true, session_id })

  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})

function respond(body: object) {
  return new Response(JSON.stringify(body), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

async function logChat(supabase: any, session_id: string, question: string, answer: string, language: string, source: string) {
  await supabase.from('chat_logs').insert({ session_id, question, answer, language, source }).catch(() => {})
}

async function updatePopular(supabase: any, question: string, language: string) {
  const { data } = await supabase.from('popular_questions').select('id, count').eq('question', question).eq('language', language).single()
  if (data) {
    await supabase.from('popular_questions').update({ count: data.count + 1, last_asked_at: new Date().toISOString() }).eq('id', data.id)
  } else {
    await supabase.from('popular_questions').insert({ question, language, count: 1 }).catch(() => {})
  }
}
