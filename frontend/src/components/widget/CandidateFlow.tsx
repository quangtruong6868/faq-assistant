import { useState } from 'react'
import type { Language, CandidateLead } from '../../lib/supabase'
import { useLeads } from '../../hooks/useLeads'

interface Props {
  language: Language
  siteKey: string
}

const JOB_TYPES = [
  { key: 'gijinkoku', jp: '技人国（専門職・IT・通訳）', vi: 'Kỹ thuật/Phiên dịch (Gijinkoku)', en: 'Engineer/Interpreter (Gijin-koku)' },
  { key: 'tokutei', jp: '特定技能（製造・農業・介護等）', vi: 'Đặc định kỹ năng (Tokutei)', en: 'Specified Skilled Worker' },
  { key: 'haken', jp: 'アルバイト・派遣', vi: 'Part-time / Phái cử', en: 'Part-time / Staffing' },
  { key: 'consult', jp: 'まず相談したい', vi: 'Muốn tư vấn trước', en: 'General consultation' },
]

const VISAS = ['留学', '技人国', '特定技能1号', '特定技能2号', '技能実習', '永住', '日本人配偶者', '未定', 'その他']
const JP_LEVELS = ['N1', 'N2', 'N3', 'N4', 'N5以下', 'なし']
const PREFECTURES = ['北海道','青森','岩手','宮城','秋田','山形','福島','茨城','栃木','群馬','埼玉','千葉','東京','神奈川','新潟','富山','石川','福井','山梨','長野','岐阜','静岡','愛知','三重','滋賀','京都','大阪','兵庫','奈良','和歌山','鳥取','島根','岡山','広島','山口','徳島','香川','愛媛','高知','福岡','佐賀','長崎','熊本','大分','宮崎','鹿児島','沖縄']

const LABELS: Record<Language, Record<string, string>> = {
  jp: {
    title: 'お仕事に関する情報',
    sub: 'ご状況をお聞かせください',
    q_select: 'ご希望の仕事の種類は？',
    full_name: 'お名前 *',
    nationality: '国籍',
    current_visa: '現在のビザ',
    visa_expiry: 'ビザ期限',
    current_prefecture: '在住都道府県',
    japanese_level: '日本語レベル',
    job_type: '希望職種',
    can_relocate: '転居可能ですか？',
    has_license: '運転免許お持ちですか？',
    desired_shift: '希望シフト',
    available_from: 'いつから働けますか？',
    phone: '電話番号 *',
    line_id: 'LINE ID',
    email: 'メール',
    submit: '送信する',
    sending: '送信中...',
    yes: 'はい',
    no: 'いいえ',
  },
  vi: {
    title: 'Thông tin tìm việc',
    sub: 'Cho chúng tôi biết tình trạng của bạn',
    q_select: 'Bạn muốn làm loại công việc nào?',
    full_name: 'Họ và tên *',
    nationality: 'Quốc tịch',
    current_visa: 'Visa hiện tại',
    visa_expiry: 'Hạn visa',
    current_prefecture: 'Tỉnh đang ở',
    japanese_level: 'Trình độ tiếng Nhật',
    job_type: 'Ngành nghề mong muốn',
    can_relocate: 'Có thể chuyển tỉnh không?',
    has_license: 'Có bằng lái xe không?',
    desired_shift: 'Ca làm việc mong muốn',
    available_from: 'Có thể bắt đầu từ khi nào?',
    phone: 'Số điện thoại *',
    line_id: 'LINE ID',
    email: 'Email',
    submit: 'Gửi',
    sending: 'Đang gửi...',
    yes: 'Có',
    no: 'Không',
  },
  en: {
    title: 'Job Information',
    sub: 'Tell us about your situation',
    q_select: 'What type of work are you looking for?',
    full_name: 'Full Name *',
    nationality: 'Nationality',
    current_visa: 'Current Visa',
    visa_expiry: 'Visa Expiry',
    current_prefecture: 'Current Prefecture',
    japanese_level: 'Japanese Level',
    job_type: 'Desired Job Type',
    can_relocate: 'Can you relocate?',
    has_license: 'Do you have a driver\'s license?',
    desired_shift: 'Preferred Shift',
    available_from: 'Available from?',
    phone: 'Phone Number *',
    line_id: 'LINE ID',
    email: 'Email',
    submit: 'Submit',
    sending: 'Sending...',
    yes: 'Yes',
    no: 'No',
  },
  np: {
    title: 'रोजगार जानकारी',
    sub: 'आफ्नो अवस्था बताउनुहोस्',
    q_select: 'कस्तो काम खोज्दै हुनुहुन्छ?',
    full_name: 'पूरा नाम *',
    nationality: 'राष्ट्रियता',
    current_visa: 'हालको भिसा',
    visa_expiry: 'भिसा म्याद',
    current_prefecture: 'हालको प्रिफेक्चर',
    japanese_level: 'जापानी स्तर',
    job_type: 'इच्छित काम',
    can_relocate: 'सार्न सकिन्छ?',
    has_license: 'ड्राइभिङ लाइसेन्स छ?',
    desired_shift: 'मनपर्ने शिफ्ट',
    available_from: 'कहिलेदेखि काम गर्न सकिन्छ?',
    phone: 'फोन नम्बर *',
    line_id: 'LINE ID',
    email: 'इमेल',
    submit: 'पठाउनुहोस्',
    sending: 'पठाउँदै...',
    yes: 'हो',
    no: 'होइन',
  },
}

const THANK_YOU: Record<Language, { title: string; sub: string }> = {
  jp: { title: 'ありがとうございます！', sub: '担当のキャリアアドバイザーより2営業日以内にご連絡します。' },
  vi: { title: 'Cảm ơn bạn!', sub: 'Tư vấn viên sẽ liên hệ với bạn trong vòng 2 ngày làm việc.' },
  en: { title: 'Thank you!', sub: 'Our career advisor will contact you within 2 business days.' },
  np: { title: 'धन्यवाद!', sub: 'हाम्रो करियर सल्लाहकार २ कार्य दिनभित्र सम्पर्क गर्नेछ।' },
}

export function CandidateFlow({ language, siteKey }: Props) {
  const [step, setStep] = useState<'type' | 'form'>('type')
  const [form, setForm] = useState<CandidateLead>({ language })
  const { submitting, submitted, error, submitCandidateLead } = useLeads(siteKey)

  const l = LABELS[language] || LABELS.jp
  const ty = THANK_YOU[language] || THANK_YOU.jp

  const handleTypeSelect = (key: string) => {
    setForm(f => ({ ...f, job_type: key }))
    setStep('form')
  }

  const handleSubmit = async () => {
    if (!form.full_name || !form.phone) return
    await submitCandidateLead(form)
  }

  const set = (key: keyof CandidateLead, val: string | boolean) =>
    setForm(f => ({ ...f, [key]: val }))

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

  if (step === 'type') {
    return (
      <div className="flex flex-col gap-3 p-4">
        <div className="flex gap-2.5">
          <div className="w-8 h-8 rounded-full bg-red-600 flex items-center justify-center flex-shrink-0 mt-0.5">
            <span className="text-white text-xs font-bold">TH</span>
          </div>
          <div className="bg-white border border-gray-100 shadow-sm rounded-2xl rounded-tl-sm px-4 py-3 max-w-[85%]">
            <p className="text-sm text-gray-800">👤 {l.q_select}</p>
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          {JOB_TYPES.map(jt => {
            const label = language === 'vi' ? jt.vi : language === 'en' ? jt.en : jt.jp
            return (
              <button key={jt.key} onClick={() => handleTypeSelect(jt.key)}
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

      {/* Basic info */}
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">{l.full_name}</label>
        <input value={form.full_name || ''} onChange={e => set('full_name', e.target.value)}
          placeholder="Nguyen Van A / グエン バン エー"
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400" />
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">{l.nationality}</label>
        <input value={form.nationality || ''} onChange={e => set('nationality', e.target.value)}
          placeholder="ベトナム / Việt Nam"
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400" />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">{l.current_visa}</label>
          <select value={form.current_visa || ''} onChange={e => set('current_visa', e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 bg-white">
            <option value="">-</option>
            {VISAS.map(v => <option key={v} value={v}>{v}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">{l.visa_expiry}</label>
          <input type="month" value={form.visa_expiry || ''} onChange={e => set('visa_expiry', e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">{l.current_prefecture}</label>
          <select value={form.current_prefecture || ''} onChange={e => set('current_prefecture', e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 bg-white">
            <option value="">-</option>
            {PREFECTURES.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">{l.japanese_level}</label>
          <select value={form.japanese_level || ''} onChange={e => set('japanese_level', e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 bg-white">
            <option value="">-</option>
            {JP_LEVELS.map(jl => <option key={jl} value={jl}>{jl}</option>)}
          </select>
        </div>
      </div>

      {/* Boolean fields */}
      <div className="grid grid-cols-2 gap-2">
        {([
          { key: 'can_relocate', label: l.can_relocate },
          { key: 'has_license', label: l.has_license },
        ] as const).map(field => (
          <div key={field.key}>
            <label className="block text-xs font-medium text-gray-600 mb-1">{field.label}</label>
            <div className="flex gap-1.5">
              {[true, false].map(val => (
                <button key={String(val)} onClick={() => set(field.key, val)}
                  className={`flex-1 py-2 rounded-lg text-xs font-medium border transition-all ${
                    form[field.key] === val
                      ? 'bg-red-600 text-white border-red-600'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-red-300'
                  }`}>
                  {val ? l.yes : l.no}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">{l.desired_shift}</label>
          <input value={form.desired_shift || ''} onChange={e => set('desired_shift', e.target.value)}
            placeholder="日勤/夜勤/フル"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">{l.available_from}</label>
          <input type="month" value={form.available_from || ''} onChange={e => set('available_from', e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400" />
        </div>
      </div>

      {/* Contact */}
      <div className="border-t border-gray-100 pt-3 space-y-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">{l.phone}</label>
          <input value={form.phone || ''} onChange={e => set('phone', e.target.value)}
            placeholder="090-0000-0000 / 0909000000"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400" />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">{l.line_id}</label>
            <input value={form.line_id || ''} onChange={e => set('line_id', e.target.value)}
              placeholder="line_id"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">{l.email}</label>
            <input type="email" value={form.email || ''} onChange={e => set('email', e.target.value)}
              placeholder="email@..."
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400" />
          </div>
        </div>
      </div>

      {error && <p className="text-xs text-red-500">{error}</p>}

      <button onClick={handleSubmit}
        disabled={submitting || !form.full_name || !form.phone}
        className="w-full bg-red-600 hover:bg-red-700 disabled:bg-gray-200 disabled:text-gray-400 text-white rounded-xl py-3 text-sm font-semibold transition-colors">
        {submitting ? l.sending : l.submit}
      </button>
    </div>
  )
}
