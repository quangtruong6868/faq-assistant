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
    vi: 'Bạn là tư vấn viên nhân lực TH-GROUP. Tài liệu tham khảo có thể chứa các cặp Câu hỏi/Trả lời. Hãy phân tích ý định của người hỏi, tìm nội dung liên quan trong tài liệu (dù cách hỏi khác nhau) và trả lời ngắn gọn, thực tế. Chỉ đề nghị liên hệ trực tiếp khi tài liệu hoàn toàn không có thông tin liên quan.',
    jp: 'あなたはTH-GROUPの人材コンサルタントです。資料にはQ&Aペアが含まれる場合があります。ユーザーの意図を理解し、言い回しが違っても意味が近い内容があれば資料を参考に簡潔に回答してください。全く情報がない場合のみ直接連絡を勧めてください。',
    en: 'You are a TH-GROUP HR consultant. Documents may contain Q&A pairs. Analyze the user\'s intent, find related content (even if phrased differently), and answer concisely. Only suggest direct contact if the document has no relevant info at all.',
    np: 'तपाईं TH-GROUP का HR सल्लाहकार हुनुहुन्छ। कागजातमा Q&A जोडी हुन सक्छन्। प्रयोगकर्ताको उद्देश्य बुझेर सम्बन्धित उत्तर दिनुहोस्।',
  },
  candidate: {
    vi: 'Bạn là tư vấn viên việc làm TH-GROUP. Tài liệu tham khảo có thể chứa các cặp Câu hỏi/Trả lời. Hãy phân tích ý định của người hỏi, tìm nội dung liên quan trong tài liệu (dù cách hỏi khác nhau) và trả lời thân thiện, ngắn gọn. Chỉ đề nghị để lại thông tin liên hệ khi tài liệu hoàn toàn không có thông tin liên quan.',
    jp: 'あなたはTH-GROUPのキャリアアドバイザーです。資料にはQ&Aペアが含まれる場合があります。ユーザーの意図を理解し、言い回しが違っても関連する内容があれば資料を参考に親切・簡潔に回答してください。',
    en: 'You are a TH-GROUP career advisor. Documents may contain Q&A pairs. Analyze the user\'s intent, find related content (even if phrased differently), and answer warmly and concisely. Only ask for contact details if the document has no relevant info at all.',
    np: 'तपाईं TH-GROUP का क्यारियर सल्लाहकार हुनुहुन्छ। कागजातमा Q&A जोडी हुन सक्छन्। प्रयोगकर्ताको उद्देश्य बुझेर मित्रवत जवाफ दिनुहोस्।',
  },
  internal: {
    vi: 'Bạn là trợ lý FAQ nội bộ TH-GROUP. Tài liệu tham khảo có thể chứa các cặp Câu hỏi/Trả lời. Hãy phân tích ý định của người hỏi, tìm nội dung liên quan trong tài liệu (dù cách hỏi khác nhau) và trả lời ngắn gọn. Chỉ từ chối nếu tài liệu hoàn toàn không có thông tin liên quan.',
    jp: '社内FAQアシスタントです。資料にQ&Aペアが含まれる場合、ユーザーの意図を理解し、言い回しが違っても意味が近ければ資料の内容を参考に簡潔に答えてください。全く無関係な場合のみ担当者に案内してください。',
    en: 'You are the TH-GROUP internal FAQ assistant. Documents may contain Q&A pairs. Analyze the user\'s intent and find related content (even if phrased differently). Only decline if the document has no relevant info at all.',
    np: 'तपाईं TH-GROUP आन्तरिक FAQ सहायक हुनुहुन्छ। कागजातमा Q&A जोडी हुन सक्छन्। प्रयोगकर्ताको उद्देश्य बुझेर सम्बन्धित उत्तर दिनुहोस्।',
  },
  // Honsha: always Japanese, department-aware
  honsha: {
    jp: 'あなたはTH-GROUP本社{department}担当のFAQアシスタントです。【参考資料】には「質問/回答」または「Cau hoi/Tra loi」形式のQ&Aが含まれています。ユーザーの質問が資料内のQ&Aと関連している場合、その回答内容を参考にして簡潔に答えてください。質問の言い回しが違っても、意味が近ければ資料の回答を使ってください。資料に全く関係ない場合のみ「担当者にお問い合わせください」と案内してください。',
    vi: 'あなたはTH-GROUP本社{department}担当のFAQアシスタントです。【参考資料】には「質問/回答」または「Cau hoi/Tra loi」形式のQ&Aが含まれています。ユーザーの質問が資料内のQ&Aと関連している場合、その回答内容を参考にして簡潔に答えてください。質問の言い回しが違っても、意味が近ければ資料の回答を使ってください。資料に全く関係ない場合のみ「担当者にお問い合わせください」と案内してください。',
    en: 'あなたはTH-GROUP本社{department}担当のFAQアシスタントです。【参考資料】には「質問/回答」または「Cau hoi/Tra loi」形式のQ&Aが含まれています。ユーザーの質問が資料内のQ&Aと関連している場合、その回答内容を参考にして簡潔に答えてください。質問の言い回しが違っても、意味が近ければ資料の回答を使ってください。資料に全く関係ない場合のみ「担当者にお問い合わせください」と案内してください。',
    np: 'あなたはTH-GROUP本社{department}担当のFAQアシスタントです。【参考資料】には「質問/回答」または「Cau hoi/Tra loi」形式のQ&Aが含まれています。ユーザーの質問が資料内のQ&Aと関連している場合、その回答内容を参考にして簡潔に答えてください。質問の言い回しが違っても、意味が近ければ資料の回答を使ってください。資料に全く関係ない場合のみ「担当者にお問い合わせください」と案内してください。',
  },
  // Haken: multilingual, dispatched worker focus
  haken: {
    vi: 'Bạn là trợ lý FAQ cho nhân viên haken (phái cử) của TH-GROUP. Tài liệu tham khảo có thể chứa các cặp Câu hỏi/Trả lời. Hãy phân tích ý định của người hỏi, tìm nội dung liên quan trong tài liệu (dù cách hỏi khác nhau) và trả lời ngắn gọn, dễ hiểu. Chỉ thông báo sẽ có quản lý liên hệ lại khi tài liệu hoàn toàn không có thông tin liên quan.',
    jp: 'あなたはTH-GROUP派遣スタッフ向けFAQアシスタントです。資料にはQ&Aペアが含まれる場合があります。ユーザーの意図を理解し、言い回しが違っても関連する内容があれば資料を参考に分かりやすく簡潔に回答してください。全く情報がない場合のみ担当者が折り返し連絡する旨をお伝えください。',
    en: 'You are the TH-GROUP Haken staff FAQ assistant. Documents may contain Q&A pairs. Analyze the user\'s intent and find related content (even if phrased differently). Only inform them a manager will follow up if the document has no relevant info at all.',
    np: 'तपाईं TH-GROUP Haken कर्मचारीहरूको FAQ सहायक हुनुहुन्छ। कागजातमा Q&A जोडी हुन सक्छन्। प्रयोगकर्ताको उद्देश्य बुझेर स्पष्ट जवाफ दिनुहोस्।',
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

    console.log(`[chat] q="${question.slice(0,60)}" flow=${flow}`)
    const { data: allChunks } = await supabase.rpc('match_document_chunks', {
      query_embedding: embedding,
      match_threshold: 0.30,
      match_count: 8,
    })

    console.log(`[chat] allChunks=${allChunks?.length} scores=${JSON.stringify(allChunks?.map((c:any)=>c.similarity?.toFixed(3)))}`)
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
    // Path A: Q&A extraction → GPT humanize + hedging + related suggestions
    if (chunks && chunks.length > 0) {
      for (let ci = 0; ci < chunks.length; ci++) {
        const chunk = chunks[ci]
        const content: string = chunk.content || ''
        const aMatch = content.match(/(?:回答|Tra loi|Trả lời)[:：]\s*([\s\S]+)/i)
        if (aMatch) {
          const rawAnswer = aMatch[1].trim()
          if (rawAnswer.length > 3) {
            const similarity: number = chunk.similarity || 0

            // Hedging prefix based on confidence
            const hedgePrefix: Record<string, Record<string, string>> = {
              high: { jp: '', vi: '', en: '', np: '' },
              mid:  {
                jp: '確認が必要な場合もありますが、',
                vi: 'Thông tin có thể chưa đầy đủ, nhưng theo dữ liệu hiện có: ',
                en: 'Based on available info (please verify if needed): ',
                np: 'उपलब्ध जानकारी अनुसार: ',
              },
              low:  {
                jp: '詳細は担当者にご確認ください。参考情報として：',
                vi: 'Vui lòng xác nhận lại với người phụ trách, nhưng theo thông tin hiện có: ',
                en: 'Please verify with the person in charge, but based on our info: ',
                np: 'कृपया सम्बन्धित व्यक्तिसँग पुष्टि गर्नुहोस्, तर उपलब्ध जानकारी: ',
              },
            }
            const tier = similarity >= 0.7 ? 'high' : similarity >= 0.5 ? 'mid' : 'low'
            const prefix = hedgePrefix[tier][language] || hedgePrefix[tier].vi

            // Humanize
            const humanizePrompts: Record<string, string> = {
              jp: `以下の回答内容を、事実や数字を一切変えずに、チャットで話しかけるような自然な口調に書き直してください。1〜3文で簡潔に。\n\n回答内容：${rawAnswer}`,
              vi: `Viết lại theo phong cách chat tự nhiên, giữ nguyên nội dung và số liệu, 1-3 câu ngắn gọn.\n\nNội dung: ${rawAnswer}`,
              en: `Rewrite in natural conversational chat tone, keep all facts, 1-3 sentences.\n\nAnswer: ${rawAnswer}`,
              np: `प्राकृतिक च्याट शैलीमा पुनः लेख्नुहोस्, तथ्य नबदल्नुहोस्।\n\nउत्तर: ${rawAnswer}`,
            }
            const completion = await openai.chat.completions.create({
              model: 'gpt-4o-mini',
              messages: [{ role: 'user', content: humanizePrompts[language] || humanizePrompts.vi }],
              temperature: 0.4,
              max_tokens: 300,
            })
            const humanized = completion.choices[0].message.content?.trim() || rawAnswer
            const answer = prefix + humanized

            // Collect related questions from other chunks (excluding this one)
            const suggestions: string[] = []
            for (const other of chunks) {
              if (other === chunk) continue
              const qMatch = (other.content || '').match(/(?:Cau hoi|質問|Câu hỏi)[:：]\s*(.+)/i)
              if (qMatch) {
                const q = qMatch[1].replace(/[\n\r]/g, ' ').trim()
                if (q.length > 5) suggestions.push(q)
              }
              if (suggestions.length >= 2) break
            }

            await logChat(supabase, session_id, question, answer, language, 'rag_direct').catch(() => {})
            await updatePopular(supabase, question, language)
            return respond({ answer, source: chunk.document_title || null, suggestions })
          }
        }
      }
    }

    // Path B: GPT with full context — for non-Q&A docs or when no direct match
    const docContext = chunks && chunks.length > 0
      ? chunks.map((c: any) => (c.content || '')).join('\n---\n')
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
    console.error('[chat] UNHANDLED ERROR:', String(err))
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
  try {
    const { data } = await supabase.from('popular_questions').select('id, count').eq('question', question).eq('language', language).single()
    if (data) {
      await supabase.from('popular_questions').update({ count: data.count + 1, last_asked_at: new Date().toISOString() }).eq('id', data.id).catch(() => {})
    } else {
      await supabase.from('popular_questions').insert({ question, language, count: 1 }).catch(() => {})
    }
  } catch { /* ignore */ }
}
