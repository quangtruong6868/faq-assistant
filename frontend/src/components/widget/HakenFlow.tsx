import { useState, useRef, useEffect } from 'react'
import type { Language } from '../../lib/supabase'
import { useChat } from '../../hooks/useChat'
import { useSubmitUnanswered } from '../../hooks/useUnanswered'
import { SESSION_ID } from '../../hooks/useChat'
import { WidgetInput } from './WidgetInput'

interface Props {
  language: Language
}

const WELCOME: Record<Language, string> = {
  jp: '派遣スタッフ向けFAQです。\nお困りのことをご自由にご質問ください。',
  vi: 'FAQ dành cho nhân viên Haken (派遣).\nBạn có thắc mắc gì cứ hỏi nhé!',
  en: 'FAQ for dispatched (Haken) staff.\nFeel free to ask any questions.',
  np: 'Haken कर्मचारीहरूको FAQ।\nजे प्रश्न छ सोध्नुहोस्।',
}

const QUICK: Record<Language, string[]> = {
  jp: ['給与の計算方法', '休憩・休日について', '通勤交通費の申請', '勤務シフトの変更', '緊急連絡先'],
  vi: ['Cách tính lương', 'Quy định nghỉ phép', 'Hoàn tiền đi lại', 'Đổi ca làm việc', 'Liên hệ khẩn cấp'],
  en: ['How is salary calculated?', 'Days off & holidays', 'Commuting reimbursement', 'Shift changes', 'Emergency contacts'],
  np: ['तलब कसरी गणना हुन्छ?', 'बिदाका नियमहरू', 'यातायात भत्ता', 'सिफ्ट परिवर्तन', 'आपतकालीन सम्पर्क'],
}

const FORM_LABELS: Record<Language, Record<string, string>> = {
  jp: {
    title: 'この件については確認が必要です。',
    sub: '担当者からご連絡します。以下をご記入ください。',
    factory: '派遣先工場・会社名 *',
    name: 'お名前 *',
    phone: '電話番号 *',
    facebook: 'Facebook',
    line: 'LINE ID',
    email: 'メール',
    submit: '送信する',
    sending: '送信中...',
    skip: 'スキップ',
    done_title: '✅ 受け付けました！',
    done_sub: '担当者より確認後、ご連絡いたします。',
  },
  vi: {
    title: 'Câu hỏi này cần được xác nhận thêm.',
    sub: 'Để lại thông tin để quản lý liên hệ lại cho bạn.',
    factory: 'Tên nhà máy / công ty đang làm *',
    name: 'Họ tên *',
    phone: 'Số điện thoại *',
    facebook: 'Facebook',
    line: 'LINE ID',
    email: 'Email',
    submit: 'Gửi',
    sending: 'Đang gửi...',
    skip: 'Bỏ qua',
    done_title: '✅ Đã nhận thông tin!',
    done_sub: 'Quản lý sẽ liên hệ lại với bạn sớm.',
  },
  en: {
    title: 'This question needs further confirmation.',
    sub: 'Leave your contact so the manager can follow up with you.',
    factory: 'Factory / Company name *',
    name: 'Full Name *',
    phone: 'Phone *',
    facebook: 'Facebook',
    line: 'LINE ID',
    email: 'Email',
    submit: 'Send',
    sending: 'Sending...',
    skip: 'Skip',
    done_title: '✅ Got it!',
    done_sub: 'Your manager will get back to you shortly.',
  },
  np: {
    title: 'यो प्रश्नको थप पुष्टि चाहिन्छ।',
    sub: 'सम्पर्क जानकारी छाड्नुहोस् — व्यवस्थापक सम्पर्क गर्नेछन्।',
    factory: 'कारखाना / कम्पनी नाम *',
    name: 'पूरा नाम *',
    phone: 'फोन *',
    facebook: 'Facebook',
    line: 'LINE ID',
    email: 'इमेल',
    submit: 'पठाउनुहोस्',
    sending: 'पठाउँदै...',
    skip: 'छोड्नुहोस्',
    done_title: '✅ प्राप्त भयो!',
    done_sub: 'व्यवस्थापकले चाँडै सम्पर्क गर्नेछन्।',
  },
}

function HakenNoMatchForm({ question, language, onDismiss }: {
  question: string
  language: Language
  onDismiss: () => void
}) {
  const l = FORM_LABELS[language] || FORM_LABELS.vi
  const { submitting, submitted, submit } = useSubmitUnanswered()
  const [form, setForm] = useState({ factory_name: '', contact_name: '', phone: '', facebook: '', line_id: '', email: '' })

  const set = (k: keyof typeof form, v: string) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async () => {
    if (!form.factory_name || !form.contact_name || !form.phone) return
    await submit({ session_id: SESSION_ID, question, language, flow: 'haken', ...form })
  }

  if (submitted) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-2xl p-4 text-center space-y-1">
        <p className="text-sm font-semibold text-green-700">{l.done_title}</p>
        <p className="text-xs text-green-600">{l.done_sub}</p>
      </div>
    )
  }

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 space-y-3">
      <div>
        <p className="text-xs font-semibold text-amber-800">⚠️ {l.title}</p>
        <p className="text-xs text-amber-700 mt-1">{l.sub}</p>
      </div>
      <div className="space-y-2">
        {([
          { key: 'factory_name', label: l.factory, placeholder: '〇〇工場 / Nhà máy...' },
          { key: 'contact_name', label: l.name, placeholder: 'Nguyen Van A' },
          { key: 'phone', label: l.phone, placeholder: '090-0000-0000' },
          { key: 'facebook', label: l.facebook, placeholder: 'facebook.com/...' },
          { key: 'line_id', label: l.line, placeholder: 'line_id' },
          { key: 'email', label: l.email, placeholder: 'email@...' },
        ] as const).map(f => (
          <div key={f.key}>
            <label className="block text-xs text-amber-700 mb-0.5">{f.label}</label>
            <input value={form[f.key]} onChange={e => set(f.key, e.target.value)}
              placeholder={f.placeholder}
              className="w-full border border-amber-200 bg-white rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <button onClick={handleSubmit}
          disabled={submitting || !form.factory_name || !form.contact_name || !form.phone}
          className="flex-1 bg-amber-500 hover:bg-amber-600 disabled:bg-gray-200 disabled:text-gray-400 text-white rounded-xl py-2 text-sm font-semibold transition-colors">
          {submitting ? l.sending : l.submit}
        </button>
        <button onClick={onDismiss}
          className="px-4 py-2 text-xs text-amber-600 hover:text-amber-800 border border-amber-200 rounded-xl transition-colors">
          {l.skip}
        </button>
      </div>
    </div>
  )
}

export function HakenFlow({ language }: Props) {
  const { messages, isLoading, sendMessage, lastNoMatch, clearNoMatch } = useChat(language, 'haken')
  const bottomRef = useRef<HTMLDivElement>(null)
  const [quickShown, setQuickShown] = useState(true)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, lastNoMatch])

  return (
    <div className="flex flex-col h-full">
      {/* Haken badge */}
      <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 border-b border-blue-100">
        <span className="text-xs font-semibold text-blue-700">🏭 派遣スタッフ / Nhân viên Haken</span>
      </div>

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
        {quickShown && messages.length === 0 && (
          <div className="flex flex-col gap-1.5 pl-10">
            {(QUICK[language] || QUICK.vi).map(t => (
              <button key={t} onClick={() => { sendMessage(t); setQuickShown(false) }}
                className="text-left px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs text-gray-600 hover:border-blue-400 hover:bg-blue-50 hover:text-blue-700 transition-all active:scale-[0.98]">
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
            <div className={`max-w-[80%] px-4 py-3 rounded-2xl text-sm whitespace-pre-line leading-relaxed ${
              msg.role === 'user'
                ? 'bg-blue-600 text-white rounded-tr-sm'
                : 'bg-white border border-gray-100 shadow-sm text-gray-800 rounded-tl-sm'
            }`}>
              {msg.content}
            </div>
          </div>
        ))}

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

        {lastNoMatch && (
          <HakenNoMatchForm
            question={lastNoMatch}
            language={language}
            onDismiss={clearNoMatch}
          />
        )}

        <div ref={bottomRef} />
      </div>

      <WidgetInput language={language} isLoading={isLoading} onSend={sendMessage} />
    </div>
  )
}
