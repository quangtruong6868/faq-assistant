import type { Language } from '../../lib/supabase'

interface Props {
  onClick: () => void
  language: Language
  hasUnread?: boolean
}

const LABEL: Record<Language, string> = {
  vi: 'Tư vấn TH-GROUP',
  jp: 'TH-GROUPに相談する',
}

export function WidgetButton({ onClick, language, hasUnread }: Props) {
  return (
    <button
      onClick={onClick}
      className="group flex items-center gap-3 bg-red-700 hover:bg-red-800 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-200 pl-4 pr-5 py-3 active:scale-95"
      aria-label="Open TH-GROUP Chat"
    >
      <div className="relative flex-shrink-0">
        <div className="w-9 h-9 rounded-full overflow-hidden bg-white flex items-center justify-center">
          <img src="/th-logo.jpg" alt="TH-GROUP" className="w-full h-full object-contain" />
        </div>
        {hasUnread && (
          <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-yellow-400 rounded-full border-2 border-red-700" />
        )}
      </div>
      <span className="text-sm font-semibold whitespace-nowrap">
        {LABEL[language]}
      </span>
    </button>
  )
}
