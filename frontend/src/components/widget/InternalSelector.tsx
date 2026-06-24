import type { Language } from '../../lib/supabase'

interface Props {
  language: Language
  onSelect: (sub: 'honsha' | 'haken') => void
}

const TITLE: Record<Language, string> = {
  jp: '社内FAQへようこそ。\nご所属をお選びください。',
  vi: 'Chào mừng đến FAQ Nội bộ.\nVui lòng chọn nhóm của bạn:',
  en: 'Welcome to Internal FAQ.\nPlease select your group:',
  np: 'आन्तरिक FAQ मा स्वागत छ।\nआफ्नो समूह छान्नुहोस्:',
}

const OPTIONS: Record<Language, {
  honsha: { label: string; sub: string }
  haken: { label: string; sub: string }
}> = {
  jp: {
    honsha: { label: '本社スタッフ', sub: '本社勤務の管理・事務スタッフ向け' },
    haken: { label: '派遣スタッフ', sub: '工場・現場に派遣中の方向け' },
  },
  vi: {
    honsha: { label: 'Nhân viên Honsha (本社)', sub: 'Nhân viên văn phòng tại công ty' },
    haken: { label: 'Nhân viên Haken (派遣)', sub: 'Nhân viên đang phái cử tại xưởng/nhà máy' },
  },
  en: {
    honsha: { label: 'Honsha Staff (本社)', sub: 'Office staff at headquarters' },
    haken: { label: 'Haken Staff (派遣)', sub: 'Dispatched workers at factories' },
  },
  np: {
    honsha: { label: 'Honsha कर्मचारी (本社)', sub: 'मुख्यालयका कार्यालय कर्मचारी' },
    haken: { label: 'Haken कर्मचारी (派遣)', sub: 'कारखानामा खटाइएका कर्मचारी' },
  },
}

export function InternalSelector({ language, onSelect }: Props) {
  const opts = OPTIONS[language] || OPTIONS.jp
  const title = TITLE[language] || TITLE.jp

  return (
    <div className="flex flex-col gap-4 p-4">
      {/* Bot bubble */}
      <div className="flex gap-2.5">
        <div className="w-9 h-9 rounded-full overflow-hidden flex-shrink-0 mt-0.5 bg-white border border-gray-100">
          <img src="/th-logo.jpg" alt="TH-GROUP" className="w-full h-full object-contain" />
        </div>
        <div className="bg-white border border-gray-100 shadow-sm rounded-2xl rounded-tl-sm px-4 py-3 max-w-[85%]">
          <p className="text-sm text-gray-800 whitespace-pre-line">{title}</p>
        </div>
      </div>

      {/* Sub-flow buttons */}
      <div className="flex flex-col gap-3 pl-1">
        {/* Honsha */}
        <button
          onClick={() => onSelect('honsha')}
          className="group flex items-center gap-3 bg-white border-2 border-gray-200 rounded-xl p-4 text-left hover:border-red-400 hover:bg-red-50 transition-all active:scale-[0.98]"
        >
          <span className="text-2xl flex-shrink-0">🏢</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-900 group-hover:text-red-700 transition-colors">
              {opts.honsha.label}
            </p>
            <p className="text-xs text-gray-500 mt-0.5">{opts.honsha.sub}</p>
          </div>
          <svg className="w-4 h-4 text-gray-300 flex-shrink-0 group-hover:text-red-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>

        {/* Haken */}
        <button
          onClick={() => onSelect('haken')}
          className="group flex items-center gap-3 bg-white border-2 border-gray-200 rounded-xl p-4 text-left hover:border-blue-400 hover:bg-blue-50 transition-all active:scale-[0.98]"
        >
          <span className="text-2xl flex-shrink-0">🏭</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-900 group-hover:text-blue-700 transition-colors">
              {opts.haken.label}
            </p>
            <p className="text-xs text-gray-500 mt-0.5">{opts.haken.sub}</p>
          </div>
          <svg className="w-4 h-4 text-gray-300 flex-shrink-0 group-hover:text-blue-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </div>
  )
}
