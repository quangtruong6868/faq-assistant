import type { Language, FaqCategory } from '../../lib/supabase'
import { getCategoryName } from '../../lib/supabase'

interface Props {
  language: Language
  categories: FaqCategory[]
  loading: boolean
  onSelectCategory: (cat: FaqCategory) => void
}

const WELCOME: Record<Language, string> = {
  vi: 'Xin chào! 👋 Tôi có thể giúp gì cho bạn?',
  jp: 'こんにちは！👋 何かお手伝いできますか？',
}

const CHOOSE_TOPIC: Record<Language, string> = {
  vi: 'Chọn chủ đề để xem câu hỏi thường gặp:',
  jp: 'トピックを選んでください:',
}

const OR_TYPE: Record<Language, string> = {
  vi: 'Hoặc nhập câu hỏi của bạn bên dưới',
  jp: 'または下に質問を入力してください',
}

export function HomeView({ language, categories, loading, onSelectCategory }: Props) {
  return (
    <div className="flex flex-col gap-4 p-4">
      {/* Welcome bubble */}
      <div className="flex gap-2.5">
        <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-sm flex-shrink-0 mt-0.5 select-none">
          🤖
        </div>
        <div className="bg-white border border-gray-100 shadow-sm rounded-2xl rounded-tl-sm px-4 py-3 max-w-[85%]">
          <p className="text-sm text-gray-800">{WELCOME[language]}</p>
        </div>
      </div>

      {/* Topic label */}
      <p className="text-xs text-gray-400 text-center">{CHOOSE_TOPIC[language]}</p>

      {/* Category grid */}
      {loading ? (
        <div className="grid grid-cols-2 gap-2">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="h-12 bg-gray-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => onSelectCategory(cat)}
              className="flex items-center gap-2 px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-left hover:border-blue-400 hover:bg-blue-50 transition-all active:scale-95 group"
            >
              <span className="text-lg leading-none flex-shrink-0">{cat.icon || '❓'}</span>
              <span className="text-xs font-medium text-gray-700 group-hover:text-blue-700 leading-tight">
                {getCategoryName(cat, language)}
              </span>
            </button>
          ))}
        </div>
      )}

      <p className="text-xs text-gray-400 text-center">{OR_TYPE[language]}</p>
    </div>
  )
}
