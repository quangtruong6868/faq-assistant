import { useState, useEffect, useRef } from 'react'
import type { Language, CompanyLead } from '../../lib/supabase'
import { useChat } from '../../hooks/useChat'
import { useLeads } from '../../hooks/useLeads'
import { WidgetInput } from './WidgetInput'
import { NoMatchContactForm } from './NoMatchContactForm'

interface Props {
  language: Language
  siteKey: string
}

const WELCOME: Record<Language, string> = {
  jp: 'はじめまして！TH-GROUPの人材コンサルタントです。\n外国人材の採用・派遣・紹介についてなんでもご相談ください。\n\nどのようなことでお困りですか？',
  vi: 'Xin chào! Tôi là tư vấn viên nhân lực của TH-GROUP.\nMọi thắc mắc về tuyển dụng, phái cử, visa nhân lực nước ngoài — cứ hỏi tôi nhé!\n\nBạn đang cần tư vấn về vấn đề gì?',
}

const QUICK_TOPICS: Record<Language, string[]> = {
  jp: ['外国人採用の流れを知りたい', 'ビザの種類と違いは？', '費用はどのくらい？', 'どんな職種に対応？', '採用までの期間は？'],
  vi: ['Quy trình tuyển dụng ngoại lao động', 'Phân biệt các loại visa', 'Chi phí khoảng bao nhiêu?', 'Ngành nghề nào phù hợp?', 'Mất bao lâu để có người?'],
}

const CONTACT_BTN: Record<Language, string> = {
  jp: '📞 担当者に直接相談する',
  vi: '📞 Để lại thông tin để được tư vấn trực tiếp',
}

const FORM_LABELS: Record<Language, Record<string, string>> = {
  jp: { title: '担当者よりご連絡します', company: '会社名 *', contact: '担当者名 *', phone: '電話番号 *', email: 'メール', facebook: 'Facebook', submit: '送信する', sending: '送信中...' },
  vi: { title: 'Chúng tôi sẽ liên hệ lại', company: 'Tên công ty *', contact: 'Người liên hệ *', phone: 'Số điện thoại *', email: 'Email', facebook: 'Facebook', submit: 'Gửi', sending: 'Đang gửi...' },
}

const THANK_YOU: Record<Language, string> = {
  jp: 'ありがとうございます！2営業日以内にご連絡いたします。',
  vi: 'Cảm ơn! Chúng tôi sẽ liên hệ trong 2 ngày làm việc.',
}

export function CorporateFlow({ language, siteKey }: Props) {
  const { messages, isLoading, sendMessage, lastNoMatch, clearNoMatch } = useChat(language, 'corporate')
  const { submitting, submitted, error, submitCompanyLead } = useLeads(siteKey)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<CompanyLead>({})
  const [started, setStarted] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  const l = FORM_LABELS[language] || FORM_LABELS.jp

  // Show welcome message
  useEffect(() => {
    if (!started) setStarted(true)
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, showForm])

  const handleQuick = (topic: string) => {
    sendMessage(topic)
  }

  const set = (key: keyof CompanyLead, val: string) => setForm(f => ({ ...f, [key]: val }))

  const handleSubmit = async () => {
    if (!form.company_name || !form.contact_name || !form.phone) return
    // Include chat summary in inquiry
    const chatSummary = messages.slice(0, 6).map(m => `${m.role === 'user' ? 'Q' : 'A'}: ${m.content}`).join('\n')
    await submitCompanyLead({ ...form, inquiry_content: chatSummary, language })
  }

  return (
    <div className="flex flex-col h-full">
      {/* Chat area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {/* Welcome bubble */}
        <div className="flex gap-2.5">
          <div className="w-8 h-8 rounded-full overflow-hidden bg-white border border-gray-100 flex-shrink-0 mt-0.5">
            <img src="/th-logo.jpg" alt="TH" className="w-full h-full object-contain" />
          </div>
          <div className="bg-white border border-gray-100 shadow-sm rounded-2xl rounded-tl-sm px-4 py-3 max-w-[85%]">
            <p className="text-sm text-gray-800 whitespace-pre-line">{WELCOME[language]}</p>
          </div>
        </div>

        {/* Quick topics — only before first message */}
        {messages.length === 0 && (
          <div className="flex flex-col gap-1.5 pl-10">
            {(QUICK_TOPICS[language] || QUICK_TOPICS.jp).map(t => (
              <button key={t} onClick={() => handleQuick(t)}
                className="text-left px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs text-gray-600 hover:border-red-400 hover:bg-red-50 hover:text-red-700 transition-all active:scale-[0.98]">
                {t}
              </button>
            ))}
          </div>
        )}

        {/* Chat messages */}
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

        {/* Typing indicator */}
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
            flow="corporate"
            onDismiss={clearNoMatch}
          />
        )}

        {/* Contact form button — show after 2 messages */}
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
          <div className="bg-white border border-gray-200 rounded-2xl p-4 space-y-2.5 mx-0">
            <p className="text-xs font-semibold text-gray-700">{l.title}</p>
            {([
              { key: 'company_name', label: l.company, placeholder: '株式会社〇〇 / Công ty...' },
              { key: 'contact_name', label: l.contact, placeholder: '田中 太郎 / Nguyễn Văn A' },
              { key: 'phone', label: l.phone, placeholder: '090-0000-0000' },
              { key: 'email', label: l.email, placeholder: 'email@company.com' },
              { key: 'facebook', label: l.facebook, placeholder: 'facebook.com/...' },
            ] as const).map(f => (
              <div key={f.key}>
                <label className="block text-xs text-gray-500 mb-0.5">{f.label}</label>
                <input value={(form as any)[f.key] || ''} onChange={e => set(f.key as keyof CompanyLead, e.target.value)}
                  placeholder={f.placeholder}
                  className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-400" />
              </div>
            ))}
            {error && <p className="text-xs text-red-500">{error}</p>}
            <button onClick={handleSubmit}
              disabled={submitting || !form.company_name || !form.contact_name || !form.phone}
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

      {/* Input */}
      <WidgetInput language={language} isLoading={isLoading} onSend={sendMessage} />
    </div>
  )
}
