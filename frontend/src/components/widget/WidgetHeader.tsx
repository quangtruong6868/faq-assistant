import type { Language } from '../../lib/supabase'
import { LANGUAGE_LABELS, LANGUAGE_FULL_LABELS } from '../../lib/utils'

interface Props {
  language: Language
  onLanguageChange: (lang: Language) => void
  onMinimize: () => void
  onClose: () => void
  onBack?: () => void
  showBack?: boolean
  title?: string
}

const LANGUAGES: Language[] = ['vi', 'jp', 'en', 'np']

const SUBTITLE: Record<Language, string> = {
  vi: 'Tư vấn nhân lực & hỗ trợ nội bộ',
  jp: '人材紹介・採用・社内サポート',
  en: 'HR Consulting & Internal Support',
  np: 'एचआर परामर्श र आन्तरिक समर्थन',
}

export function WidgetHeader({ language, onLanguageChange, onMinimize, onClose, onBack, showBack, title }: Props) {
  return (
    <div className="bg-red-700 text-white rounded-t-2xl flex-shrink-0">
      {/* Main header row */}
      <div className="flex items-center gap-3 px-4 py-3">
        {showBack && onBack ? (
          <button
            onClick={onBack}
            className="w-8 h-8 rounded-full hover:bg-white/20 flex items-center justify-center transition-colors flex-shrink-0"
            aria-label="Back"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        ) : (
          <div className="w-9 h-9 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0 select-none">
            <span className="text-white text-sm font-bold">TH</span>
          </div>
        )}

        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold leading-tight truncate">
            {title || 'TH-GROUP'}
          </p>
          <p className="text-xs text-red-200 mt-0.5 leading-tight">{SUBTITLE[language]}</p>
        </div>

        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={onMinimize}
            className="w-7 h-7 rounded-full hover:bg-white/20 flex items-center justify-center transition-colors"
            aria-label="Minimize"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M18 12H6" />
            </svg>
          </button>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full hover:bg-white/20 flex items-center justify-center transition-colors"
            aria-label="Close"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Language selector row */}
      <div className="flex gap-1 px-4 pb-3 overflow-x-auto">
        {LANGUAGES.map(lang => (
          <button
            key={lang}
            onClick={() => onLanguageChange(lang)}
            className={`px-2.5 py-1 rounded-full text-xs font-medium transition-all whitespace-nowrap flex-shrink-0 ${
              language === lang
                ? 'bg-white text-red-700'
                : 'text-red-200 hover:bg-white/20'
            }`}
          >
            {language === lang ? LANGUAGE_FULL_LABELS[lang] : LANGUAGE_LABELS[lang]}
          </button>
        ))}
      </div>
    </div>
  )
}
