import { useState, useEffect, useRef } from 'react'
import type { Language, CandidateLead } from '../../lib/supabase'
import { useChat } from '../../hooks/useChat'
import { useLeads } from '../../hooks/useLeads'
import { WidgetInput } from './WidgetInput'
import { NoMatchContactForm } from './NoMatchContactForm'

interface Props {
  language: Language
  siteKey: string
}

const WELCOME: Record<Language, string> = {
  vi: 'Xin chào! Tôi là tư vấn viên việc làm của TH-GROUP.\nTôi sẽ giúp bạn tìm việc phù hợp tại Nhật Bản — từ visa, lương, điều kiện đến thủ tục.\n\nBạn đang quan tâm đến loại công việc nào?',
  jp: 'こんにちは！TH-GROUPのキャリアアドバイザーです。\n日本でのお仕事探しをサポートします。ビザ・給与・仕事内容など何でも聞いてください。\n\nどのようなお仕事に興味がありますか？',
}

const QUICK_TOPICS: Record<Language, string[]> = {
  vi: ['Điều kiện visa 特定技能 là gì?', 'Lương công nhân nhà máy bao nhiêu?', 'Tiếng Nhật cần trình độ gì?', 'Không có visa có làm được không?', 'TH-GROUP hỗ trợ những gì?', 'Kỹ sư IT sang Nhật cần gì?'],
  jp: ['特定技能ビザの条件は？', '工場の給与は？', '日本語レベルは必要？', 'TH-GROUPのサポート内容は？', 'ITエンジニアの就職は？'],
}

const CONTACT_BTN: Record<Language, string> = {
  vi: '📋 Để lại thông tin — tư vấn viên sẽ liên hệ bạn',
  jp: '📋 情報を残す — アドバイザーよりご連絡します',
}

const FORM_LABELS: Record<Language, Record<string, string>> = {
  vi: { title: 'Thông tin liên hệ', name: 'Họ tên *', phone: 'Số điện thoại *', line_id: 'LINE ID', email: 'Email', facebook: 'Facebook', submit: 'Gửi', sending: 'Đang gửi...' },
  jp: { title: '連絡先情報', name: 'お名前 *', phone: '電話番号 *', line_id: 'LINE ID', email: 'メール', facebook: 'Facebook', submit: '送信する', sending: '送信中...' },
}

const THANK_YOU: Record<Language, string> = {
  vi: 'Cảm ơn bạn! Tư vấn viên sẽ liên hệ trong 2 ngày làm việc.',
  jp: 'ありがとうございます！2営業日以内にご連絡いたします。',
}

export function CandidateFlow({ language, siteKey }: Props) {
  const { messages, isLoading, sendMessage, lastNoMatch, clearNoMatch } = useChat(language, 'candidate')
  const { submitting, submitted, error, submitCandidateLead } = useLeads(siteKey)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<CandidateLead>({ language })
  const bottomRef = useRef<HTMLDivElement>(null)

  const l = FORM_LABELS[language] || FORM_LABELS.vi

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, showForm])

  const set = (key: keyof CandidateLead, val: string) => setForm(f => ({ ...f, [key]: val }))

  const handleSubmit = async () => {
    if (!form.full_name || !form.phone) return
    const chatSummary = messages.slice(0, 6).map(m => `${m.role === 'user' ? 'Q' : 'A'}: ${m.content}`).join('\n')
    await submitCandidateLead({ ...form, inquiry_content: chatSummary } as any)
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {/* Welcome */}
        <div className="flex gap-2.5">
          <div className="w-8 h-8 rounded-full overflow-hidden bg-white border border-gray-100 flex-shrink-0 mt-0.5">
            <img src="/th-logo.jpg" alt="TH" className="w-full h-full object-contain" />
          </div>
          <div className="bg-white border border-gray-100 shadow-sm rounded-2xl rounded-tl-sm px-4 py-3 max-w-[85%]">
            <p className="text-sm text-gray-800 whitespace-pre-line">{WELCOME[language]}</p>
          </div>
        </div>

        {/* Quick topics */}
        {messages.length === 0 && (
          <div className="flex flex-col gap-1.5 pl-10">
            {(QUICK_TOPICS[language] || QUICK_TOPICS.vi).map(t => (
              <button key={t} onClick={() => sendMessage(t)}
                className="text-left px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs text-gray-600 hover:border-red-400 hover:bg-red-50 hover:text-red-700 transition-all active:scale-[0.98]">
                {t}
              </button>
            ))}
          </div>
        )}

        {/* Messages */}
        {messages.map(msg => (
          <div key={msg.id} className={`flex gap-2.5 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
            {msg.role === 'assistant' && (
              <div className="w-8 h-8 rounded-full overflow-hidden bg-white border border-gray-100 flex-shrink-0 mt-0.5">
                <img src="/th-logo.jpg" alt="TH" className="w-full h-full object-contain" />
              </div>
            )}
            <div className={`flex flex-col gap-1.5 max-w-[80%] ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
              <div className={`px-4 py-3 rounded-2xl text-sm whitespace-pre-line leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-red-600 text-white rounded-tr-sm'
                  : 'bg-white border border-gray-100 shadow-sm text-gray-800 rounded-tl-sm'
              }`}>
                {msg.content}
              </div>
            </div>
          </div>
        ))}

        {/* Typing */}
        {isLoading && (
          <div className="flex gap-2.5">
            <div className="w-8 h-8 rounded-full overflow-hidden bg-white border border-gray-100 flex-shrink-0">
              <img src="/th-logo.jpg" alt="TH" className="w-full h-full object-contain" />
            </div>
            <div className="bg-white border border-gray-100 shadow-sm rounded-2xl rounded-tl-sm px-4 py-3">
              <div className="flex gap-1 items-center h-4">
                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:0ms]" />
                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:150ms]" />
                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:300ms]" />
              </div>
            </div>
          </div>
        )}

        {/* No-match contact form */}
        {lastNoMatch && (
          <NoMatchContactForm
            question={lastNoMatch}
            language={language}
            flow="candidate"
            onDismiss={clearNoMatch}
          />
        )}

        {/* Contact button */}
        {messages.length >= 2 && !showForm && !submitted && !lastNoMatch && (
          <div className="pl-10">
            <button onClick={() => setShowForm(true)}
              className="text-xs px-4 py-2 bg-red-50 border border-red-200 text-red-700 rounded-xl hover:bg-red-100 transition-colors">
              {CONTACT_BTN[language]}
            </button>
          </div>
        )}

        {/* Inline contact form */}
        {showForm && !submitted && (
          <div className="bg-white border border-gray-200 rounded-2xl p-4 space-y-2.5">
            <p className="text-xs font-semibold text-gray-700">{l.title}</p>
            {([
              { key: 'full_name', label: l.name, placeholder: 'Nguyen Van A / グエン バン エー' },
              { key: 'phone', label: l.phone, placeholder: '090-0000-0000 / 0909000000' },
              { key: 'line_id', label: l.line_id, placeholder: 'line_id' },
              { key: 'email', label: l.email, placeholder: 'email@...' },
              { key: 'facebook', label: l.facebook, placeholder: 'facebook.com/...' },
            ] as const).map(f => (
              <div key={f.key}>
                <label className="block text-xs text-gray-500 mb-0.5">{f.label}</label>
                <input value={(form as any)[f.key] || ''} onChange={e => set(f.key as keyof CandidateLead, e.target.value)}
                  placeholder={f.placeholder}
                  className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-400" />
              </div>
            ))}
            {error && <p className="text-xs text-red-500">{error}</p>}
            <button onClick={handleSubmit}
              disabled={submitting || !form.full_name || !form.phone}
              className="w-full bg-red-600 hover:bg-red-700 disabled:bg-gray-200 disabled:text-gray-400 text-white rounded-xl py-2 text-sm font-semibold transition-colors">
              {submitting ? l.sending : l.submit}
            </button>
          </div>
        )}

        {submitted && (
          <div className="bg-green-50 border border-green-200 rounded-2xl p-4 text-center">
            <p className="text-sm text-green-700 font-medium">✅ {THANK_YOU[language]}</p>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      <WidgetInput language={language} isLoading={isLoading} onSend={sendMessage} />
    </div>
  )
}
