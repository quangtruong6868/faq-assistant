import type { Language } from '../../lib/supabase'

interface Props {
  onClick: () => void
  language: Language
  hasUnread?: boolean
}

const LABEL: Record<Language, string> = {
  vi: 'Hỏi quy định công ty',
  jp: '社内規定を質問する',
  en: 'Ask Company Rules',
  np: 'कम्पनी नियम सोध्नुहोस्',
}

export function WidgetButton({ onClick, language, hasUnread }: Props) {
  return (
    <button
      onClick={onClick}
      className="group flex items-center gap-3 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-200 pl-4 pr-5 py-3 active:scale-95"
      aria-label="Open FAQ Chat"
    >
      {/* Robot icon */}
      <div className="relative flex-shrink-0">
        <div className="w-9 h-9 bg-white/20 rounded-full flex items-center justify-center text-xl leading-none select-none">
          🤖
        </div>
        {hasUnread && (
          <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-red-500 rounded-full border-2 border-blue-600" />
        )}
      </div>
      {/* Label */}
      <span className="text-sm font-semibold whitespace-nowrap">
        {LABEL[language]}
      </span>
    </button>
  )
}
