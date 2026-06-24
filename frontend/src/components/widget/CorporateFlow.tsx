import { useState } from 'react'
import type { Language, CompanyLead } from '../../lib/supabase'
import { useLeads } from '../../hooks/useLeads'

interface Props {
  language: Language
  siteKey: string
}

const QUICK_BUTTONS = [
  { key: 'hiring', jp: '外国人材を採用したい', vi: 'Muốn tuyển nhân lực nước ngoài', en: 'Hire foreign workers' },
  { key: 'shortage', jp: '人手不足で困っている', vi: 'Đang thiếu nhân lực', en: 'Facing labor shortage' },
  { key: 'haken', jp: '派遣を検討している', vi: 'Đang cân nhắc phái cử', en: 'Considering staffing' },
  { key: 'shokai', jp: '紹介を検討している', vi: 'Đang cân nhắc giới thiệu', en: 'Considering placement' },
  { key: 'gijinkoku', jp: '技人国人材について知りたい', vi: 'Muốn biết về Gijinkoku', en: 'About Gijin-koku visa' },
  { key: 'tokutei', jp: '特定技能について知りたい', vi: 'Muốn biết về Tokutei Ginou', en: 'About Tokutei Ginou' },
  { key: 'vietnam', jp: 'ベトナム人材について知りたい', vi: 'Hỏi về nhân lực Việt Nam', en: 'About Vietnamese workers' },
  { key: 'cost', jp: '費用を知りたい', vi: 'Muốn biết chi phí', en: 'About costs' },
  { key: 'consult', jp: 'まずは相談したい', vi: 'Muốn tư vấn trước', en: 'General consultation' },
]

const FORM_LABELS: Record<Language, Record<string, string>> = {
  jp: {
    title: 'お問い合わせフォーム',
    sub: '担当者よりご連絡いたします',
    company: '会社名 *',
    contact: '担当者名 *',
    phone: '電話番号 *',
    email: 'メールアドレス',
    facebook: 'Facebook',
    location: '所在地（都道府県）',
    job_type: '募集職種',
    headcount: '必要人数',
    timing: '希望時期',
    content: '相談内容・ご質問',
    submit: '送信する',
    sending: '送信中...',
  },
  vi: {
    title: 'Form liên hệ',
    sub: 'Chúng tôi sẽ liên hệ lại với bạn sớm',
    company: 'Tên công ty *',
    contact: 'Người liên hệ *',
    phone: 'Số điện thoại *',
    email: 'Email',
    facebook: 'Facebook',
    location: 'Tỉnh/Thành phố',
    job_type: 'Ngành nghề cần tuyển',
    headcount: 'Số lượng cần tuyển',
    timing: 'Thời gian mong muốn',
    content: 'Nội dung tư vấn',
    submit: 'Gửi',
    sending: 'Đang gửi...',
  },
  en: {
    title: 'Contact Form',
    sub: 'Our team will get back to you shortly',
    company: 'Company Name *',
    contact: 'Contact Person *',
    phone: 'Phone Number *',
    email: 'Email',
    facebook: 'Facebook',
    location: 'Prefecture/Location',
    job_type: 'Job Type Needed',
    headcount: 'Number of Workers',
    timing: 'Desired Timeline',
    content: 'Inquiry Details',
    submit: 'Submit',
    sending: 'Sending...',
  },
  np: {
    title: 'सम्पर्क फारम',
    sub: 'हाम्रो टोली तपाईंलाई सम्पर्क गर्नेछ',
    company: 'कम्पनी नाम *',
    contact: 'सम्पर्क व्यक्ति *',
    phone: 'फोन नम्बर *',
    email: 'इमेल',
    facebook: 'Facebook',
    location: 'स्थान',
    job_type: 'काम को प्रकार',
    headcount: 'आवश्यक संख्या',
    timing: 'इच्छित समय',
    content: 'सोधपुछको विवरण',
    submit: 'पठाउनुहोस्',
    sending: 'पठाउँदै...',
  },
}

const THANK_YOU: Record<Language, { title: string; sub: string }> = {
  jp: { title: 'お問い合わせありがとうございます', sub: '担当者より2営業日以内にご連絡いたします。' },
  vi: { title: 'Cảm ơn bạn đã liên hệ!', sub: 'Chúng tôi sẽ liên hệ lại trong vòng 2 ngày làm việc.' },
  en: { title: 'Thank you for your inquiry!', sub: 'Our team will contact you within 2 business days.' },
  np: { title: 'सोधपुछको लागि धन्यवाद!', sub: 'हाम्रो टोली २ कार्य दिनभित्र सम्पर्क गर्नेछ।' },
}

const QUICK_LABEL: Record<Language, string> = {
  jp: 'ご相談内容をお選びください:',
  vi: 'Chọn nội dung tư vấn:',
  en: 'Select your inquiry:',
  np: 'आफ्नो सोधपुछ छान्नुहोस्:',
}

export function CorporateFlow({ language, siteKey }: Props) {
  const [step, setStep] = useState<'quick' | 'form'>('quick')
  const [form, setForm] = useState<CompanyLead>({})
  const { submitting, submitted, error, submitCompanyLead } = useLeads(siteKey)

  const l = FORM_LABELS[language] || FORM_LABELS.jp
  const ty = THANK_YOU[language] || THANK_YOU.jp

  const handleQuickSelect = (key: string) => {
    setForm(f => ({ ...f, inquiry_type: key, language }))
    setStep('form')
  }

  const handleSubmit = async () => {
    if (!form.company_name || !form.contact_name || !form.phone) return
    await submitCompanyLead(form)
  }

  const set = (key: keyof CompanyLead, val: string) => setForm(f => ({ ...f, [key]: val }))

  if (submitted) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 p-8 text-center min-h-[300px]">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center text-3xl">✅</div>
        <div>
          <p className="font-semibold text-gray-900">{ty.title}</p>
          <p className="text-sm text-gray-500 mt-1">{ty.sub}</p>
        </div>
      </div>
    )
  }

  if (step === 'quick') {
    return (
      <div className="flex flex-col gap-3 p-4">
        <div className="flex gap-2.5">
          <div className="w-8 h-8 rounded-full bg-red-600 flex items-center justify-center flex-shrink-0 mt-0.5">
            <span className="text-white text-xs font-bold">TH</span>
          </div>
          <div className="bg-white border border-gray-100 shadow-sm rounded-2xl rounded-tl-sm px-4 py-3 max-w-[85%]">
            <p className="text-sm text-gray-800">🏢 {QUICK_LABEL[language]}</p>
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          {QUICK_BUTTONS.map(btn => {
            const label = language === 'vi' ? btn.vi : language === 'en' ? btn.en : btn.jp
            return (
              <button key={btn.key} onClick={() => handleQuickSelect(btn.key)}
                className="text-left px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm text-gray-700 hover:border-red-400 hover:bg-red-50 hover:text-red-700 transition-all active:scale-[0.98]">
                {label}
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 space-y-3">
      <div className="text-center mb-2">
        <p className="text-sm font-semibold text-gray-800">{l.title}</p>
        <p className="text-xs text-gray-400">{l.sub}</p>
      </div>

      {[
        { key: 'company_name', label: l.company, placeholder: '例：株式会社〇〇' },
        { key: 'contact_name', label: l.contact, placeholder: '例：田中 太郎' },
        { key: 'phone', label: l.phone, placeholder: '例：03-0000-0000' },
        { key: 'email', label: l.email, placeholder: 'example@company.jp' },
        { key: 'facebook', label: l.facebook, placeholder: 'facebook.com/... hoặc tên Facebook' },
        { key: 'location', label: l.location, placeholder: '例：東京都' },
        { key: 'job_type', label: l.job_type, placeholder: '例：製造、介護、IT' },
        { key: 'headcount', label: l.headcount, placeholder: '例：3名' },
        { key: 'desired_timing', label: l.timing, placeholder: '例：3ヶ月以内' },
      ].map(field => (
        <div key={field.key}>
          <label className="block text-xs font-medium text-gray-600 mb-1">{field.label}</label>
          <input
            value={(form as any)[field.key] || ''}
            onChange={e => set(field.key as keyof CompanyLead, e.target.value)}
            placeholder={field.placeholder}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
          />
        </div>
      ))}

      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">{l.content}</label>
        <textarea
          value={form.inquiry_content || ''}
          onChange={e => set('inquiry_content', e.target.value)}
          rows={3}
          placeholder="ご自由にご記入ください"
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 resize-none"
        />
      </div>

      {error && <p className="text-xs text-red-500">{error}</p>}

      <button
        onClick={handleSubmit}
        disabled={submitting || !form.company_name || !form.contact_name || !form.phone}
        className="w-full bg-red-600 hover:bg-red-700 disabled:bg-gray-200 disabled:text-gray-400 text-white rounded-xl py-3 text-sm font-semibold transition-colors"
      >
        {submitting ? l.sending : l.submit}
      </button>
    </div>
  )
}
