import type { Language, FlowType } from '../../lib/supabase'

interface Props {
  language: Language
  onSelect: (flow: FlowType) => void
}

const WELCOME: Record<Language, string> = {
  vi: 'Xin chào! TH-GROUP có thể giúp gì cho bạn?',
  jp: 'こんにちは！TH-GROUPへようこそ。\nご用件をお選びください。',
}

const FLOWS: Record<Language, {
  corporate: { label: string; sub: string; icon: string }
  candidate: { label: string; sub: string; icon: string }
  internal: { label: string; sub: string; icon: string }
}> = {
  jp: {
    corporate: { label: '法人のお客様', sub: '外国人材の採用・派遣をご検討の企業様', icon: '🏢' },
    candidate: { label: 'お仕事を探している方', sub: '日本での就職・転職をお考えの方', icon: '👤' },
    internal: { label: '社内FAQ', sub: '社員向け・社内規定の確認', icon: '📋' },
  },
  vi: {
    corporate: { label: 'Doanh nghiệp Nhật', sub: 'Tuyển dụng & phái cử nhân lực nước ngoài', icon: '🏢' },
    candidate: { label: 'Tìm việc làm', sub: 'Tư vấn việc làm tại Nhật Bản', icon: '👤' },
    internal: { label: 'FAQ Nội bộ', sub: 'Dành cho nhân viên công ty', icon: '📋' },
  },
}

type ActiveFlow = 'corporate' | 'candidate' | 'internal'
const FLOW_KEYS: ActiveFlow[] = ['corporate', 'candidate', 'internal']
const FLOW_COLORS: Record<ActiveFlow, string> = {
  corporate: 'hover:border-red-400 hover:bg-red-50 group-hover:text-red-700',
  candidate: 'hover:border-red-400 hover:bg-red-50 group-hover:text-red-700',
  internal: 'hover:border-gray-400 hover:bg-gray-50 group-hover:text-gray-700',
}

export function FlowSelector({ language, onSelect }: Props) {
  const flows = FLOWS[language] || FLOWS.jp

  return (
    <div className="flex flex-col gap-4 p-4">
      {/* TH-GROUP Branding + Welcome */}
      <div className="flex gap-2.5">
        <div className="w-9 h-9 rounded-full overflow-hidden flex-shrink-0 mt-0.5 bg-white border border-gray-100">
          <img src="/th-logo.jpg" alt="TH-GROUP" className="w-full h-full object-contain" />
        </div>
        <div className="bg-white border border-gray-100 shadow-sm rounded-2xl rounded-tl-sm px-4 py-3 max-w-[85%]">
          <p className="text-sm text-gray-800 whitespace-pre-line">{WELCOME[language]}</p>
        </div>
      </div>

      {/* Flow buttons */}
      <div className="flex flex-col gap-2.5">
        {FLOW_KEYS.map(key => {
          const f = flows[key]
          return (
            <button
              key={key}
              onClick={() => onSelect(key)}
              className={`group flex items-center gap-3 bg-white border-2 border-gray-200 rounded-xl p-4 text-left transition-all active:scale-[0.98] ${FLOW_COLORS[key]}`}
            >
              <span className="text-2xl flex-shrink-0">{f.icon}</span>
              <div>
                <p className="text-sm font-semibold text-gray-900 group-hover:text-red-700 transition-colors">
                  {f.label}
                </p>
                <p className="text-xs text-gray-500 mt-0.5 leading-snug">{f.sub}</p>
              </div>
              <svg className="w-4 h-4 text-gray-300 ml-auto flex-shrink-0 group-hover:text-red-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          )
        })}
      </div>
    </div>
  )
}
