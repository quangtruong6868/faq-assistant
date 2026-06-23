import type { Language } from '../../lib/supabase'
import { LANGUAGE_LABELS } from '../../lib/utils'

interface Props {
  value: Language
  onChange: (lang: Language) => void
}

const LANGUAGES: Language[] = ['vi', 'jp', 'en', 'np']

export function LanguageSelector({ value, onChange }: Props) {
  return (
    <div className="flex gap-1 flex-wrap justify-center">
      {LANGUAGES.map(lang => (
        <button
          key={lang}
          onClick={() => onChange(lang)}
          className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
            value === lang
              ? 'bg-blue-600 text-white shadow-sm'
              : 'bg-white text-gray-600 border border-gray-200 hover:border-blue-300 hover:text-blue-600'
          }`}
        >
          {LANGUAGE_LABELS[lang]}
        </button>
      ))}
    </div>
  )
}
