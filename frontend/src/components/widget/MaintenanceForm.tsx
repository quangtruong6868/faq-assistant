import { useState } from 'react'
import type { Language } from '../../lib/supabase'
import { useLeads } from '../../hooks/useLeads'

interface Props {
  language: Language
  siteKey: string
  flow: 'corporate' | 'candidate' | 'haken'
}

const NOTICE: Record<Language, string> = {
  jp: 'このチャット機能は現在アップグレード中です。\nご不便をおかけして申し訳ございません。\n\n以下に連絡先をご記入いただければ、担当者よりご連絡いたします。',
  vi: 'Tính năng chat này đang được nâng cấp.\nXin lỗi vì sự bất tiện này.\n\nVui lòng để lại thông tin bên dưới, chúng tôi sẽ liên hệ lại với bạn sớm nhất.',
}

const THANK_YOU: Record<Language, string> = {
  jp: 'ありがとうございます！担当者より2営業日以内にご連絡いたします。',
  vi: 'Cảm ơn bạn! Chúng tôi sẽ liên hệ lại trong 2 ngày làm việc.',
}

const LABELS_CORPORATE: Record<Language, Record<string, string>> = {
  jp: { title: '担当者へのお問い合わせ', company: '会社名 *', contact: '担当者名 *', phone: '電話番号 *', email: 'メール', submit: '送信する', sending: '送信中...' },
  vi: { title: 'Liên hệ tư vấn viên', company: 'Tên công ty *', contact: 'Người liên hệ *', phone: 'Số điện thoại *', email: 'Email', submit: 'Gửi thông tin', sending: 'Đang gửi...' },
}

const LABELS_CANDIDATE: Record<Language, Record<string, string>> = {
  vi: { title: 'Để lại thông tin liên hệ', name: 'Họ tên *', phone: 'Số điện thoại *', line: 'LINE ID', email: 'Email', submit: 'Gửi thông tin', sending: 'Đang gửi...' },
  jp: { title: '連絡先情報を残す', name: 'お名前 *', phone: '電話番号 *', line: 'LINE ID', email: 'メール', submit: '送信する', sending: '送信中...' },
}

const LABELS_HAKEN: Record<Language, Record<string, string>> = {
  jp: { title: '担当者へのお問い合わせ', factory: '派遣先工場・会社名 *', name: 'お名前 *', phone: '電話番号 *', line: 'LINE ID', email: 'メール', submit: '送信する', sending: '送信中...' },
  vi: { title: 'Liên hệ quản lý', factory: 'Tên nhà máy / công ty *', name: 'Họ tên *', phone: 'Số điện thoại *', line: 'LINE ID', email: 'Email', submit: 'Gửi thông tin', sending: 'Đang gửi...' },
}

export function MaintenanceForm({ language, siteKey, flow }: Props) {
  const { submitting, submitted, error, submitCompanyLead, submitCandidateLead } = useLeads(siteKey)
  const [form, setForm] = useState<Record<string, string>>({})
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async () => {
    if (flow === 'corporate') {
      if (!form.company_name || !form.contact_name || !form.phone) return
      await submitCompanyLead({
        company_name: form.company_name,
        contact_name: form.contact_name,
        phone: form.phone,
        email: form.email,
        language,
        inquiry_content: '[Maintenance contact form]',
      })
    } else {
      // candidate or haken — both go to candidate_leads
      if (!form.full_name || !form.phone) return
      await submitCandidateLead({
        full_name: form.full_name,
        phone: form.phone,
        line_id: form.line_id,
        email: form.email,
        language,
        inquiry_content: flow === 'haken'
          ? `[Haken maintenance] Factory: ${form.factory_name || ''}`
          : '[Candidate maintenance contact form]',
      } as any)
    }
  }

  const isCorporate = flow === 'corporate'
  const isHaken = flow === 'haken'

  const lCorp = LABELS_CORPORATE[language] || LABELS_CORPORATE.jp
  const lCand = LABELS_CANDIDATE[language] || LABELS_CANDIDATE.vi
  const lHaken = LABELS_HAKEN[language] || LABELS_HAKEN.jp

  const canSubmit = isCorporate
    ? !!(form.company_name && form.contact_name && form.phone)
    : !!(form.full_name && form.phone)

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      {/* Bot notice bubble */}
      <div className="flex gap-2.5">
        <div className="w-8 h-8 rounded-full overflow-hidden bg-white border border-gray-100 flex-shrink-0 mt-0.5">
          <img src="/th-logo.jpg" alt="TH" className="w-full h-full object-contain" />
        </div>
        <div className="bg-white border border-gray-100 shadow-sm rounded-2xl rounded-tl-sm px-4 py-3 max-w-[85%]">
          <p className="text-sm text-gray-800 whitespace-pre-line">{NOTICE[language]}</p>
        </div>
      </div>

      {/* Form */}
      {!submitted ? (
        <div className="bg-white border border-gray-200 rounded-2xl p-4 space-y-2.5">
          <p className="text-xs font-semibold text-gray-700">
            {isCorporate ? lCorp.title : isHaken ? lHaken.title : lCand.title}
          </p>

          {isCorporate && (
            <>
              <Field label={lCorp.company} value={form.company_name || ''} onChange={v => set('company_name', v)} placeholder="株式会社〇〇 / Công ty..." />
              <Field label={lCorp.contact} value={form.contact_name || ''} onChange={v => set('contact_name', v)} placeholder="田中 太郎 / Nguyễn Văn A" />
              <Field label={lCorp.phone} value={form.phone || ''} onChange={v => set('phone', v)} placeholder="090-0000-0000" />
              <Field label={lCorp.email} value={form.email || ''} onChange={v => set('email', v)} placeholder="email@company.com" />
            </>
          )}

          {isHaken && (
            <>
              <Field label={lHaken.factory} value={form.factory_name || ''} onChange={v => set('factory_name', v)} placeholder="〇〇工場 / Nhà máy..." />
              <Field label={lHaken.name} value={form.full_name || ''} onChange={v => set('full_name', v)} placeholder="Nguyen Van A" />
              <Field label={lHaken.phone} value={form.phone || ''} onChange={v => set('phone', v)} placeholder="090-0000-0000" />
              <Field label={lHaken.line} value={form.line_id || ''} onChange={v => set('line_id', v)} placeholder="line_id" />
              <Field label={lHaken.email} value={form.email || ''} onChange={v => set('email', v)} placeholder="email@..." />
            </>
          )}

          {!isCorporate && !isHaken && (
            <>
              <Field label={lCand.name} value={form.full_name || ''} onChange={v => set('full_name', v)} placeholder="Nguyen Van A / グエン バン エー" />
              <Field label={lCand.phone} value={form.phone || ''} onChange={v => set('phone', v)} placeholder="090-0000-0000" />
              <Field label={lCand.line} value={form.line_id || ''} onChange={v => set('line_id', v)} placeholder="line_id" />
              <Field label={lCand.email} value={form.email || ''} onChange={v => set('email', v)} placeholder="email@..." />
            </>
          )}

          {error && <p className="text-xs text-red-500">{error}</p>}

          <button
            onClick={handleSubmit}
            disabled={submitting || !canSubmit}
            className="w-full bg-red-600 hover:bg-red-700 disabled:bg-gray-200 disabled:text-gray-400 text-white rounded-xl py-2 text-sm font-semibold transition-colors"
          >
            {submitting
              ? (isCorporate ? lCorp.sending : isHaken ? lHaken.sending : lCand.sending)
              : (isCorporate ? lCorp.submit : isHaken ? lHaken.submit : lCand.submit)}
          </button>
        </div>
      ) : (
        <div className="bg-green-50 border border-green-200 rounded-2xl p-4 text-center">
          <p className="text-sm text-green-700 font-medium">✅ {THANK_YOU[language]}</p>
        </div>
      )}
    </div>
  )
}

function Field({ label, value, onChange, placeholder }: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder: string
}) {
  return (
    <div>
      <label className="block text-xs text-gray-500 mb-0.5">{label}</label>
      <input
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
      />
    </div>
  )
}
