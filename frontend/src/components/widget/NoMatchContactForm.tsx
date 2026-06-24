import { useState } from 'react'
import type { Language } from '../../lib/supabase'
import { useSubmitUnanswered } from '../../hooks/useUnanswered'
import { SESSION_ID } from '../../hooks/useChat'

interface Props {
  question: string
  language: string
  flow: string
  onDismiss: () => void
}

const LABELS: Record<Language, Record<string, string>> = {
  vi: {
    title: 'Chúng tôi chưa có câu trả lời chính xác cho câu hỏi này.',
    sub: 'Để lại thông tin — chúng tôi sẽ xác nhận với bộ phận liên quan và phản hồi bạn.',
    name: 'Họ tên *',
    phone: 'Số điện thoại *',
    facebook: 'Facebook',
    line: 'LINE ID',
    email: 'Email',
    submit: 'Gửi yêu cầu',
    sending: 'Đang gửi...',
    skip: 'Bỏ qua',
    done_title: '✅ Đã nhận câu hỏi của bạn!',
    done_sub: 'Chúng tôi sẽ xác nhận và phản hồi qua thông tin bạn để lại.',
  },
  jp: {
    title: 'この質問に対する正確な回答がまだありません。',
    sub: '連絡先をお知らせください。担当部署に確認後、ご連絡いたします。',
    name: 'お名前 *',
    phone: '電話番号 *',
    facebook: 'Facebook',
    line: 'LINE ID',
    email: 'メール',
    submit: '送信する',
    sending: '送信中...',
    skip: 'スキップ',
    done_title: '✅ ご質問を受け付けました！',
    done_sub: '担当者より確認後、ご連絡いたします。',
  },
  en: {
    title: "We don't have a precise answer for this yet.",
    sub: 'Leave your contact — we\'ll confirm with the relevant team and get back to you.',
    name: 'Full Name *',
    phone: 'Phone *',
    facebook: 'Facebook',
    line: 'LINE ID',
    email: 'Email',
    submit: 'Send Request',
    sending: 'Sending...',
    skip: 'Skip',
    done_title: '✅ Question received!',
    done_sub: "We'll confirm and contact you via the info you provided.",
  },
  np: {
    title: 'यस प्रश्नको सटीक उत्तर हामीसँग अझै छैन।',
    sub: 'सम्पर्क जानकारी छाड्नुहोस् — हामी सम्बन्धित टोलीसँग पुष्टि गरेर सम्पर्क गर्नेछौं।',
    name: 'पूरा नाम *',
    phone: 'फोन *',
    facebook: 'Facebook',
    line: 'LINE ID',
    email: 'इमेल',
    submit: 'अनुरोध पठाउनुहोस्',
    sending: 'पठाउँदै...',
    skip: 'छोड्नुहोस्',
    done_title: '✅ प्रश्न प्राप्त भयो!',
    done_sub: 'हामी पुष्टि गरेर सम्पर्क गर्नेछौं।',
  },
}

export function NoMatchContactForm({ question, language, flow, onDismiss }: Props) {
  const lang = (language as Language) in LABELS ? (language as Language) : 'vi'
  const l = LABELS[lang]
  const { submitting, submitted, submit } = useSubmitUnanswered()
  const [form, setForm] = useState({ contact_name: '', phone: '', facebook: '', line_id: '', email: '' })

  const set = (k: keyof typeof form, v: string) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async () => {
    if (!form.contact_name || !form.phone) return
    await submit({
      session_id: SESSION_ID,
      question,
      language,
      flow,
      ...form,
    })
  }

  if (submitted) {
    return (
      <div className="mx-0 bg-green-50 border border-green-200 rounded-2xl p-4 text-center space-y-1">
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
          disabled={submitting || !form.contact_name || !form.phone}
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
