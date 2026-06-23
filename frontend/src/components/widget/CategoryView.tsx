import type { Language, FaqCategory, FaqItem } from '../../lib/supabase'
import { getCategoryName } from '../../lib/supabase'

interface Props {
  category: FaqCategory
  items: FaqItem[]
  loading: boolean
  language: Language
  onSelectQuestion: (question: string) => void
  onOpenChat: () => void
}

const SELECT_QUESTION: Record<Language, string> = {
  vi: 'Chọn câu hỏi bạn muốn hỏi:',
  jp: '質問を選んでください:',
  en: 'Select a question:',
  np: 'प्रश्न छान्नुहोस्:',
}

const NO_ITEMS: Record<Language, string> = {
  vi: 'Chưa có câu hỏi nào trong danh mục này.',
  jp: 'このカテゴリにはまだ質問がありません。',
  en: 'No questions in this category yet.',
  np: 'यस श्रेणीमा अहिलेसम्म कुनै प्रश्न छैन।',
}

const OTHER_QUESTION: Record<Language, string> = {
  vi: 'Tự nhập câu hỏi khác →',
  jp: '別の質問を入力する →',
  en: 'Type a different question →',
  np: 'अर्को प्रश्न टाइप गर्नुहोस् →',
}

export function CategoryView({ category, items, loading, language, onSelectQuestion, onOpenChat }: Props) {
  const getQuestion = (item: FaqItem): string => {
    const key = `question_${language}` as keyof FaqItem
    return (item[key] as string) || item.question_vi
  }

  return (
    <div className="flex flex-col gap-3 p-4">
      {/* Category header bubble */}
      <div className="flex gap-2.5">
        <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-sm flex-shrink-0 mt-0.5 select-none">
          🤖
        </div>
        <div className="bg-white border border-gray-100 shadow-sm rounded-2xl rounded-tl-sm px-4 py-3 max-w-[85%]">
          <p className="text-sm text-gray-800">
            <span className="mr-1">{category.icon}</span>
            <strong>{getCategoryName(category, language)}</strong>
          </p>
          <p className="text-xs text-gray-500 mt-1">{SELECT_QUESTION[language]}</p>
        </div>
      </div>

      {/* FAQ list */}
      {loading ? (
        <div className="space-y-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-12 bg-gray-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-6">
          <p className="text-sm text-gray-400">{NO_ITEMS[language]}</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {items.map(item => (
            <button
              key={item.id}
              onClick={() => onSelectQuestion(getQuestion(item))}
              className="text-left px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm text-gray-700 hover:border-blue-400 hover:bg-blue-50 hover:text-blue-700 transition-all active:scale-[0.98] leading-snug"
            >
              {getQuestion(item)}
            </button>
          ))}
        </div>
      )}

      {/* Type own question */}
      <button
        onClick={onOpenChat}
        className="flex items-center justify-center gap-1.5 px-4 py-2.5 border border-dashed border-gray-300 rounded-xl text-sm text-gray-500 hover:border-blue-400 hover:text-blue-600 transition-all"
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
        {OTHER_QUESTION[language]}
      </button>
    </div>
  )
}
