import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import OpenAI from 'https://esm.sh/openai@4'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// ── Thresholds ────────────────────────────────────────────────
const LEARNED_HIT_THRESHOLD  = 0.88  // similarity to serve from learned KB directly
const LEARNED_STORE_THRESHOLD = 0.50 // minimum answer confidence to store in learned KB
const LEARNED_UPDATE_THRESHOLD = 0.92 // similarity to consider "same question" for upsert

// ── Persona ───────────────────────────────────────────────────
const PERSONA: Record<string, Record<string, string>> = {
  corporate: {
    vi: 'Bạn là tư vấn viên nhân lực TH-GROUP. Trả lời ngắn gọn, thực tế. Chỉ đề nghị liên hệ trực tiếp khi không có thông tin.',
    jp: 'あなたはTH-GROUPの人材コンサルタントです。簡潔に回答してください。全く情報がない場合のみ直接連絡を勧めてください。',
    en: 'You are a TH-GROUP HR consultant. Answer concisely. Only suggest direct contact if no info available.',
    np: 'तपाईं TH-GROUP का HR सल्लाहकार हुनुहुन्छ। संक्षिप्त उत्तर दिनुहोस्।',
  },
  candidate: {
    vi: 'Bạn là tư vấn viên việc làm TH-GROUP. Trả lời thân thiện, ngắn gọn.',
    jp: 'あなたはTH-GROUPのキャリアアドバイザーです。親切・簡潔に回答してください。',
    en: 'You are a TH-GROUP career advisor. Answer warmly and concisely.',
    np: 'तपाईं TH-GROUP का क्यारियर सल्लाहकार हुनुहुन्छ। मित्रवत जवाफ दिनुहोस्।',
  },
  internal: {
    vi: 'Bạn là trợ lý FAQ nội bộ TH-GROUP. Trả lời ngắn gọn, chính xác.',
    jp: '社内FAQアシスタントです。簡潔・正確に答えてください。',
    en: 'You are the TH-GROUP internal FAQ assistant. Answer concisely and accurately.',
    np: 'तपाईं TH-GROUP आन्तरिक FAQ सहायक हुनुहुन्छ। सटीक उत्तर दिनुहोस्।',
  },
  honsha: {
    jp: 'あなたはTH-GROUP本社{department}のFAQアシスタントです。質問の意図を正確に把握し、資料をもとに簡潔・正確に回答してください。複数トピックはまとめて整理して答えてください。資料に情報がない場合のみ「担当者にお問い合わせください」と案内してください。',
    vi: 'あなたはTH-GROUP本社{department}のFAQアシスタントです。質問の意図を正確に把握し、資料をもとに簡潔・正確に回答してください。複数トピックはまとめて整理して答えてください。資料に情報がない場合のみ「担当者にお問い合わせください」と案内してください。',
    en: 'あなたはTH-GROUP本社{department}のFAQアシスタントです。質問の意図を正確に把握し、資料をもとに簡潔・正確に回答してください。複数トピックはまとめて整理して答えてください。資料に情報がない場合のみ「担当者にお問い合わせください」と案内してください。',
    np: 'あなたはTH-GROUP本社{department}のFAQアシスタントです。質問の意図を正確に把握し、資料をもとに簡潔・正確に回答してください。複数トピックはまとめて整理して答えてください。資料に情報がない場合のみ「担当者にお問い合わせください」と案内してください。',
  },
  haken: {
    vi: 'Bạn là trợ lý FAQ cho nhân viên haken TH-GROUP. Trả lời ngắn gọn, dễ hiểu.',
    jp: 'あなたはTH-GROUP派遣スタッフ向けFAQアシスタントです。意図を正確に把握し、分かりやすく簡潔に回答してください。複数トピックはまとめて答えてください。全く情報がない場合のみ担当者が折り返し連絡する旨をお伝えください。',
    en: 'You are the TH-GROUP Haken FAQ assistant. Answer clearly and concisely.',
    np: 'तपाईं TH-GROUP Haken FAQ सहायक हुनुहुन्छ। स्पष्ट जवाफ दिनुहोस्।',
  },
}

const NO_INFO: Record<string, string> = {
  vi: 'Xin lỗi, tôi chưa có thông tin cụ thể về vấn đề này. Bạn có thể để lại số điện thoại để được tư vấn trực tiếp không?',
  jp: '申し訳ありませんが、この件についての詳細情報がありません。直接ご連絡いただけますか？',
  en: "I don't have specific info on this yet. Would you like to leave your contact for a direct consultation?",
  np: 'माफ गर्नुहोस्, यसबारे जानकारी छैन। सम्पर्क जानकारी छाड्नुहुन्छ?',
}

const INTERNAL_FLOWS = new Set(['internal', 'honsha', 'haken'])

// ── Prompts ───────────────────────────────────────────────────
function analysisPrompt(question: string, language: string, history: Array<{ role: string; content: string }>): string {
  const langHint: Record<string, string> = { jp: '日本語', vi: 'tiếng Việt' }
  const recentHistory = history.slice(-6).map(m => `${m.role === 'user' ? 'User' : 'Bot'}: ${m.content}`).join('\n')
  return `You are a conversation analyst for an HR FAQ chatbot (${langHint[language] || language}).

## Recent conversation
${recentHistory || '(no history)'}

## Current user message
"${question}"

## Your task
1. Check if the current message is a rephrasing, clarification, or follow-up to a PREVIOUS unanswered/wrong question.
   - If yes: SYNTHESIZE the current message + relevant prior context into one clear complete question.
   - If no: use the current message as-is.
2. Generate search topics from the synthesized question.

Return ONLY valid JSON:
{
  "synthesized_question": "the full clear question to search for",
  "is_followup": false,
  "topics": [
    {
      "intent": "core intent in 1 short phrase",
      "variants": ["search phrase 1", "search phrase 2", "search phrase 3"]
    }
  ]
}

Rules:
- synthesized_question: complete, self-contained question in the user's language
- is_followup: true only when current message is a rephrasing/adding context to a previous question
- Split compound questions into separate topics (max 4)
- Each topic: 3 short keyword-rich search variants (5-15 words), same language as user
- JSON only, nothing else`
}

function humanizePrompt(answer: string, language: string): string {
  const p: Record<string, string> = {
    jp: `以下の回答を自然なチャット口調に書き直してください。ただし、日数・人数・条件・固有名詞・箇条書き項目など、すべての具体的な情報を一字一句省略せずにそのまま含めてください。要約・言い換え・情報の追加は禁止です。最後に「他にご不明な点があればお気軽に！」を添えてください。\n\n${answer}`,
    vi: `Viết lại theo giọng nhắn tin tự nhiên, nhưng phải truyền đạt ĐẦY ĐỦ toàn bộ nội dung — không được cắt bỏ bất kỳ ý nào, không rút gọn, không tóm tắt. Giữ nguyên số liệu, danh sách, điều kiện. Cuối câu thêm 1 câu mời hỏi thêm.\n\n${answer}`,
    en: `Rewrite in natural conversational tone. Keep ALL content — do not omit, shorten, or summarize any point. Preserve all numbers, lists, and conditions. End with an invitation to ask more.\n\n${answer}`,
    np: `प्राकृतिक शैलीमा, सबै सामग्री राख्नुहोस्।\n\n${answer}`,
  }
  return p[language] || p.jp
}

function synthesisPrompt(question: string, answers: string[], language: string): string {
  const block = answers.map((a, i) => `[${i + 1}] ${a}`).join('\n\n')
  const p: Record<string, string> = {
    jp: `ユーザーの質問：「${question}」\n\n参考情報：\n${block}\n\n質問のすべてのポイントに答えてください。重複は省き、論理的に整理して自然な日本語でまとめてください。数字・日数・条件は正確に。`,
    vi: `Câu hỏi: "${question}"\n\nThông tin:\n${block}\n\nTrả lời đầy đủ. Loại bỏ trùng lặp, sắp xếp logic, viết tự nhiên. Giữ nguyên số liệu.`,
    en: `Question: "${question}"\n\nInfo:\n${block}\n\nAnswer all points fully. Remove duplicates, organize logically. Keep all numbers and conditions.`,
    np: `प्रश्न: "${question}"\n\nजानकारी:\n${block}\n\nसबै बिन्दुको पूर्ण उत्तर दिनुहोस्।`,
  }
  return p[language] || p.jp
}

// ── Main handler ─────────────────────────────────────────────
serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const {
      question,
      language = 'vi',
      session_id,
      flow = 'internal',
      history = [],
      department,
    } = await req.json()

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )
    const openai = new OpenAI({ apiKey: Deno.env.get('OPENAI_API_KEY') })

    let persona = PERSONA[flow]?.[language] || PERSONA.internal[language] || PERSONA.internal.vi
    if (flow === 'honsha') persona = persona.replace('{department}', department || '')

    const langA = language === 'jp' ? 'answer_jp' : language === 'en' ? 'answer_en' : language === 'np' ? 'answer_np' : 'answer_vi'
    // honsha/haken have separate document sets; 'internal' is shared
    const docFlow = (flow === 'honsha' || flow === 'haken') ? flow : 'internal'

    // ════════════════════════════════════════════════════════
    // LAYER 0: FAQ full-text search (zero token cost)
    // ════════════════════════════════════════════════════════
    const { data: faqResults } = await supabase
      .from('faq_items')
      .select(`id, question_vi, question_jp, question_en, ${langA}, faq_categories(name_vi)`)
      .eq('is_active', true)
      .textSearch('question_vi', question, { type: 'plain', config: 'simple' })
      .limit(3)

    if (INTERNAL_FLOWS.has(flow) && faqResults && faqResults.length > 0) {
      const best = faqResults[0]
      const answer = (best as any)[langA] || (best as any).answer_vi
      if (answer) {
        await logChat(supabase, session_id, question, answer, language, 'faq')
        await updatePopular(supabase, question, language)
        return respond({ answer, source: (best.faq_categories as any)?.name_vi || 'FAQ', learned: false })
      }
    }

    // ════════════════════════════════════════════════════════
    // LAYER 1: Embed question (needed for layers 2 & 3)
    // ════════════════════════════════════════════════════════
    const questionEmbedding = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: question,
    }).then(r => r.data[0].embedding)

    // ════════════════════════════════════════════════════════
    // LAYER 2: Search learned knowledge base (AI memory)
    // ════════════════════════════════════════════════════════
    console.log(`[chat] searching learned KB: "${question.slice(0, 50)}"`)

    const { data: learnedHits } = await supabase.rpc('match_learned_knowledge', {
      query_embedding:  questionEmbedding,
      match_threshold:  LEARNED_HIT_THRESHOLD,
      match_count:      3,
      filter_flow:      flow,
      filter_language:  language,
    })

    if (learnedHits && learnedHits.length > 0) {
      const best = learnedHits[0]
      console.log(`[chat] learned KB HIT sim=${best.similarity?.toFixed(3)} usage=${best.usage_count}`)

      // Increment usage counter (fire-and-forget)
      supabase.rpc('increment_learned_usage', { p_id: best.id }).then(() => {}, () => {})

      await logChat(supabase, session_id, question, best.answer, language, 'learned')
      await updatePopular(supabase, question, language)
      // Return learned_id so client can submit feedback tied to this entry
      return respond({ answer: best.answer, source: null, learned: true, learned_id: best.id })
    }

    console.log(`[chat] learned KB MISS — starting full research`)

    // ════════════════════════════════════════════════════════
    // LAYER 3: Full research pipeline
    // ════════════════════════════════════════════════════════

    // Step 3a: Conversation analysis — synthesize intent from history, generate search variants
    const analysisRes = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: analysisPrompt(question, language, history) }],
      temperature: 0,
      max_tokens: 400,
      response_format: { type: 'json_object' },
    })

    let topics: Array<{ intent: string; variants: string[] }> = []
    let searchQuestion = question
    try {
      const parsed = JSON.parse(analysisRes.choices[0].message.content || '{}')
      searchQuestion = parsed.synthesized_question || question
      topics = parsed.topics || []
    } catch {
      topics = [{ intent: question, variants: [question] }]
    }

    if (topics.length === 0) topics = [{ intent: searchQuestion, variants: [searchQuestion] }]

    // Always include original question as first search
    const allVariants: string[] = [question]
    for (const t of topics) {
      for (const v of (t.variants || [])) {
        if (v && !allVariants.includes(v)) allVariants.push(v)
      }
    }

    console.log(`[chat] flow=${flow} docFlow=${docFlow} topics=${topics.length} variants=${allVariants.length}: ${topics.map(t => t.intent).join(' | ')}`)
    console.log(`[chat] variants list: ${JSON.stringify(allVariants)}`)

    // Step 3b: Embed all variants + search in parallel
    const variantEmbeddings = await Promise.all(
      allVariants.map(v =>
        openai.embeddings.create({ model: 'text-embedding-3-small', input: v })
          .then(r => r.data[0].embedding)
      )
    )

    const searchResults = await Promise.all(
      variantEmbeddings.map(async emb => {
        const { data, error } = await supabase.rpc('match_document_chunks', {
          query_embedding: emb,
          match_threshold: 0.25,
          match_count: 8,
          filter_flow: docFlow,
        })
        if (error) console.error('[chat] RPC error:', JSON.stringify(error))
        console.log(`[chat] RPC result count=${data?.length ?? 0} for variant idx`)
        return data || []
      })
    )

    // Step 3c: Collect ALL unique chunks across all variants
    interface AnswerEntry { rawAnswer: string; similarity: number; source: string | null; topicIdx: number }
    const seenFp = new Set<string>()
    const allEntries: AnswerEntry[] = []

    // Flatten all search results and collect unique chunks
    for (let vi = 0; vi < searchResults.length; vi++) {
      const ti = (() => {
        let acc = 0
        for (let t = 0; t < topics.length; t++) {
          acc += topics[t].variants?.length || 1
          if (vi < acc) return t
        }
        return topics.length - 1
      })()
      for (const chunk of searchResults[vi]) {
        const content = chunk.content || ''
        const aMatch = content.match(/(?:回答|Trả lời|Tra loi|Answer|Câu trả lời|答え)[:：]\s*([\s\S]+)/i)
        const rawAnswer = aMatch
          ? aMatch[1].trim()
          : content.includes('\n') ? content.split('\n').slice(1).join('\n').trim() : content.trim()
        if (!rawAnswer || rawAnswer.length < 4) continue
        const fp = rawAnswer.slice(0, 100).toLowerCase().replace(/\s+/g, '')
        if (seenFp.has(fp)) continue
        seenFp.add(fp)
        allEntries.push({ rawAnswer, similarity: chunk.similarity || 0, source: chunk.document_title || null, topicIdx: ti })
      }
    }

    // Sort by similarity descending
    allEntries.sort((a, b) => b.similarity - a.similarity)
    console.log(`[chat] total unique chunks=${allEntries.length} top sim=${allEntries[0]?.similarity?.toFixed(3)} preview=${allEntries[0]?.rawAnswer?.slice(0, 80)}`)

    // Best answer = top chunk overall
    const finalAnswers = allEntries.length > 0 ? [allEntries[0]] : []

    console.log(`[chat] allEntries=${allEntries.length} finalAnswers=${finalAnswers.length}`)

    // Step 3d: Generate response + store in learned KB
    let answer = ''
    let sourceType = 'rag_single'
    let confidence = 0.7

    if (finalAnswers.length === 1) {
      const { rawAnswer, similarity, source: src } = finalAnswers[0]
      confidence = similarity

      // Always humanize the top chunk directly — synthesis loses specific numbers
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: humanizePrompt(rawAnswer, language) }],
        temperature: 0.3,
        max_tokens: 1000,
      })
      answer = completion.choices[0].message.content?.trim() || rawAnswer
      sourceType = 'rag_single'

      await logChat(supabase, session_id, question, answer, language, 'rag_single')
      await updatePopular(supabase, question, language)

    } else if (finalAnswers.length > 1) {
      // Multiple topics → synthesize
      confidence = Math.min(...finalAnswers.map(a => a.similarity))

      const completion = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [{ role: 'user', content: synthesisPrompt(searchQuestion, finalAnswers.map(a => a.rawAnswer), language) }],
        temperature: 0.2,
        max_tokens: 700,
      })
      answer = completion.choices[0].message.content?.trim() || NO_INFO[language]
      sourceType = 'rag_synthesized'

      await logChat(supabase, session_id, question, answer, language, 'rag_synthesized')
      await updatePopular(supabase, question, language)

    } else {
      // No Q&A chunks found → GPT with raw context
      const allChunks = searchResults.flat()
      const seenCtx = new Set<string>()
      const uniqueChunks = allChunks.filter((c: any) => {
        const fp = (c.content || '').slice(0, 80)
        if (seenCtx.has(fp)) return false
        seenCtx.add(fp)
        return true
      }).slice(0, 4)

      let faqContext = ''
      if (faqResults && faqResults.length > 0 && !INTERNAL_FLOWS.has(flow)) {
        faqContext = faqResults.map((f: any) => `Q: ${f.question_vi}\nA: ${f[langA] || f.answer_vi}`).join('\n\n')
      }
      const deptCtx = (flow === 'honsha' && department) ? `【対象部署】${department}\n\n` : ''
      const docCtx = uniqueChunks.map((c: any) => c.content || '').join('\n---\n')
      const context = [faqContext, deptCtx + docCtx].filter(Boolean).join('\n\n===\n\n')

      if (context) {
        const messages: any[] = [
          { role: 'system', content: `${persona}\n\n【参考資料】\n${context}` },
          ...history.slice(-4),
          { role: 'user', content: question },
        ]
        const completion = await openai.chat.completions.create({
          model: 'gpt-4o',
          messages,
          temperature: 0.2,
          max_tokens: 600,
        })
        answer = completion.choices[0].message.content || NO_INFO[language]
        sourceType = 'rag_context'
        confidence = 0.55

        await logChat(supabase, session_id, question, answer, language, 'rag_context')
        await updatePopular(supabase, question, language)

      } else if (!INTERNAL_FLOWS.has(flow)) {
        const messages: any[] = [
          { role: 'system', content: persona },
          ...history.slice(-4),
          { role: 'user', content: question },
        ]
        const completion = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages,
          temperature: 0.4,
          max_tokens: 400,
        })
        answer = completion.choices[0].message.content || NO_INFO[language]
        sourceType = 'general'
        confidence = 0.4

        await logChat(supabase, session_id, question, answer, language, 'general')
        await updatePopular(supabase, question, language)

      } else {
        // Internal flow, no context → no_match → auto-capture for admin review
        const noInfo = NO_INFO[language] || NO_INFO.vi
        await logChat(supabase, session_id, question, noInfo, language, 'no_match')
        await updatePopular(supabase, question, language)

        // Auto-save to unanswered_questions (fire-and-forget)
        supabase.rpc('upsert_unanswered_question', {
          p_flow:        flow,
          p_language:    language,
          p_question:    question,
          p_bot_answer:  noInfo,
          p_source_type: 'no_match',
          p_session_id:  session_id || null,
        }).then(() => {}, () => {})

        return respond({ answer: noInfo, source: null, no_match: true, learned: false, session_id })
      }
    }

    // ════════════════════════════════════════════════════════
    // LAYER 4: Store result in learned knowledge (fire-and-forget)
    // Only store if answer is meaningful and confidence is sufficient
    // ════════════════════════════════════════════════════════
    if (answer && answer !== NO_INFO[language] && confidence >= LEARNED_STORE_THRESHOLD) {
      supabase.rpc('upsert_learned_knowledge', {
        p_flow:        flow,
        p_language:    language,
        p_question:    question,
        p_answer:      answer,
        p_embedding:   questionEmbedding,
        p_confidence:  confidence,
        p_source_type: sourceType,
        p_topics:      topics.map(t => t.intent),
      }).then(() => {
        console.log(`[chat] stored in learned KB: confidence=${confidence.toFixed(2)} type=${sourceType}`)
      }).catch((err: any) => {
        console.warn(`[chat] failed to store in learned KB:`, err)
      })
    }

    return respond({
      answer,
      source: finalAnswers[0]?.source || null,
      learned: false,
      suggestions: [],
    })

  } catch (err) {
    console.error('[chat] ERROR:', String(err))
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
  await supabase.from('chat_logs').insert({ session_id, question, answer, language, source }).then(() => {}, () => {})
}

async function updatePopular(supabase: any, question: string, language: string) {
  try {
    const { data } = await supabase.from('popular_questions').select('id, count').eq('question', question).eq('language', language).single()
    if (data) {
      await supabase.from('popular_questions').update({ count: data.count + 1, last_asked_at: new Date().toISOString() }).eq('id', data.id)
    } else {
      await supabase.from('popular_questions').insert({ question, language, count: 1 })
    }
  } catch { /* ignore */ }
}
