import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import OpenAI from 'https://esm.sh/openai@4'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const NO_INFO: Record<string, string> = {
  vi: 'Xin lỗi, tôi chưa có thông tin về câu hỏi này. Vui lòng liên hệ chúng tôi trực tiếp để được hỗ trợ.',
  jp: '申し訳ありませんが、この質問に関する情報がまだありません。直接お問い合わせください。',
  en: "Sorry, I don't have information about this. Please contact us directly for assistance.",
  np: 'माफ गर्नुहोस्, मसँग यस प्रश्नको जानकारी छैन। सिधै सम्पर्क गर्नुहोस्।',
}

// System prompts per flow
const SYSTEM_PROMPTS: Record<string, Record<string, string>> = {
  corporate: {
    vi: `Bạn là tư vấn viên nhân lực chuyên nghiệp của TH-GROUP — công ty chuyên cung cấp nhân lực nước ngoài (chủ yếu Việt Nam, Nepal) cho doanh nghiệp Nhật Bản.
Nhiệm vụ: Tư vấn cho doanh nghiệp Nhật về:
- Quy trình tuyển dụng người nước ngoài (kỹ thuật, phái cử, giới thiệu)
- Các loại visa: 技人国 (Gijin-koku), 特定技能 (Tokutei Ginou), 技能実習 (Kenshu)
- Chi phí, thời gian, điều kiện cần thiết
- Ưu/nhược điểm từng hình thức
- Các ngành nghề phù hợp: sản xuất, xây dựng, nông nghiệp, IT, điều dưỡng...
Phong cách: Thân thiện, chuyên nghiệp, trả lời ngắn gọn súc tích. Hỏi thêm nếu cần làm rõ nhu cầu.
Cuối mỗi câu trả lời nếu phù hợp, hãy hỏi thêm về nhu cầu cụ thể của doanh nghiệp.`,
    jp: `あなたはTH-GROUPの専門人材コンサルタントです。日本企業への外国人材（主にベトナム・ネパール）の提供を専門としています。
役割：日本企業に対して以下を案内します：
- 外国人材採用の流れ（技術、派遣、紹介）
- ビザ種別：技人国、特定技能1号/2号、技能実習
- 費用・期間・必要条件
- 各形態のメリット/デメリット
- 対応職種：製造業、建設、農業、IT、介護など
スタイル：親切でプロフェッショナル、簡潔に。必要に応じて詳細を確認する質問をする。`,
    en: `You are a professional HR consultant at TH-GROUP, specializing in providing foreign workers (mainly Vietnamese, Nepali) to Japanese companies.
Role: Advise Japanese companies on:
- Foreign worker recruitment process (technical, staffing, placement)
- Visa types: Gijin-koku, Tokutei Ginou (SSW), Ginou Jisshu
- Costs, timelines, requirements
- Pros/cons of each approach
- Industries: manufacturing, construction, agriculture, IT, nursing care
Style: Friendly, professional, concise answers. Ask follow-up questions to clarify needs.`,
  },
  candidate: {
    vi: `Bạn là tư vấn viên việc làm của TH-GROUP — chuyên hỗ trợ người Việt Nam, Nepal tìm việc làm tại Nhật Bản.
Nhiệm vụ: Tư vấn cho người tìm việc về:
- Các loại visa làm việc tại Nhật: 技人国, 特定技能 1号/2号, 派遣, アルバイト
- Điều kiện, quy trình xin visa từng loại
- Mức lương, điều kiện làm việc theo ngành
- Yêu cầu tiếng Nhật (JLPT N1-N5)
- Cuộc sống tại Nhật: chi phí sinh hoạt, bảo hiểm, quyền lợi
- TH-GROUP hỗ trợ gì: kết nối nhà tuyển dụng, hỗ trợ visa, ký túc xá
Phong cách: Gần gũi, nhiệt tình như người anh/chị đi trước. Trả lời thực tế, không hoa mỹ.
Hãy hỏi về tình trạng visa hiện tại, kinh nghiệm, ngành nghề để tư vấn chính xác hơn.`,
    jp: `あなたはTH-GROUPのキャリアアドバイザーです。ベトナム・ネパール人が日本で仕事を見つけるサポートをしています。
役割：求職者への案内：
- 就労ビザの種類：技人国、特定技能1号/2号、派遣、アルバイト
- 各ビザの条件・申請手順
- 業種別の給与・労働条件
- 日本語要件（JLPT N1-N5）
- 日本での生活：生活費、保険、福利厚生
スタイル：親切で熱心に。現実的なアドバイスを提供する。`,
    en: `You are a career advisor at TH-GROUP, helping Vietnamese and Nepali people find jobs in Japan.
Role: Advise job seekers on:
- Work visa types: Gijin-koku, Tokutei Ginou SSW 1/2, Haken, Part-time
- Visa requirements and application process
- Salary and working conditions by industry
- Japanese language requirements (JLPT N1-N5)
- Life in Japan: living costs, insurance, benefits
- What TH-GROUP offers: employer connections, visa support, dormitory
Style: Warm and enthusiastic like a mentor. Give practical, honest advice.`,
    np: `तपाईं TH-GROUP का क्यारियर सल्लाहकार हुनुहुन्छ। नेपाली र भियतनामी व्यक्तिहरूलाई जापानमा काम खोज्न मद्दत गर्नुहुन्छ।
भूमिका: कार्य भिसा, तलब, जीवन बारे व्यावहारिक सल्लाह दिनुहोस्।`,
  },
  internal: {
    vi: 'Trả lời bằng tiếng Việt. Ngắn gọn, rõ ràng. Bạn là trợ lý FAQ nội bộ công ty.',
    jp: '日本語で回答してください。簡潔に。社内FAQアシスタントです。',
    en: 'Answer in English. Be concise. You are the internal company FAQ assistant.',
    np: 'नेपालीमा जवाफ दिनुहोस्। संक्षिप्त। आन्तरिक FAQ सहायक।',
  },
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { question, language = 'vi', session_id, flow = 'internal', history = [] } = await req.json()

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )
    const openai = new OpenAI({ apiKey: Deno.env.get('OPENAI_API_KEY') })

    const systemPrompt = SYSTEM_PROMPTS[flow]?.[language] || SYSTEM_PROMPTS.internal[language] || SYSTEM_PROMPTS.internal.vi

    // Corporate & Candidate: pure GPT consultant chat (no FAQ/vector search needed)
    if (flow === 'corporate' || flow === 'candidate') {
      // Build conversation history
      const messages: any[] = [{ role: 'system', content: systemPrompt }]

      // Add previous turns
      for (const h of history) {
        messages.push({ role: h.role, content: h.content })
      }
      messages.push({ role: 'user', content: question })

      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages,
        temperature: 0.5,
        max_tokens: 600,
      })

      const answer = completion.choices[0].message.content || NO_INFO[language]
      await logChat(supabase, session_id, question, answer, language, flow)

      return new Response(JSON.stringify({ answer, source: null }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Internal FAQ: existing RAG flow
    // Step 1: FAQ full-text search
    const { data: faqResults } = await supabase
      .from('faq_items')
      .select(`id, question_vi, question_jp, question_en, question_np, answer_vi, answer_jp, answer_en, answer_np, faq_categories(name_vi)`)
      .eq('is_active', true)
      .textSearch('question_vi', question, { type: 'plain', config: 'simple' })
      .limit(3)

    if (faqResults && faqResults.length > 0) {
      const best = faqResults[0]
      const answerKey = `answer_${language}` as keyof typeof best
      const answer = (best[answerKey] as string) || best.answer_vi

      await logChat(supabase, session_id, question, answer, language, 'faq')
      await updatePopularQuestions(supabase, question, language)

      return new Response(JSON.stringify({
        answer,
        source: (best.faq_categories as any)?.name_vi || 'FAQ',
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // Step 2: Vector search
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
          { role: 'system', content: `${systemPrompt}\nChỉ trả lời dựa trên tài liệu được cung cấp. KHÔNG bịa đặt.` },
          { role: 'user', content: `Tài liệu:\n${context}\n\nCâu hỏi: ${question}` },
        ],
        temperature: 0.1,
        max_tokens: 500,
      })

      const answer = completion.choices[0].message.content || NO_INFO[language]
      await logChat(supabase, session_id, question, answer, language, 'document')
      await updatePopularQuestions(supabase, question, language)

      return new Response(JSON.stringify({ answer, source: topDoc }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Step 3: No match
    await logChat(supabase, session_id, question, NO_INFO[language], language, 'no_match')
    await updatePopularQuestions(supabase, question, language)

    return new Response(JSON.stringify({ answer: NO_INFO[language], source: null }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})

async function logChat(supabase: any, session_id: string, question: string, answer: string, language: string, source: string) {
  await supabase.from('chat_logs').insert({ session_id, question, answer, language, source }).catch(() => {})
}

async function updatePopularQuestions(supabase: any, question: string, language: string) {
  const { data } = await supabase.from('popular_questions').select('id, count').eq('question', question).eq('language', language).single()
  if (data) {
    await supabase.from('popular_questions').update({ count: data.count + 1, last_asked_at: new Date().toISOString() }).eq('id', data.id)
  } else {
    await supabase.from('popular_questions').insert({ question, language, count: 1 })
  }
}
