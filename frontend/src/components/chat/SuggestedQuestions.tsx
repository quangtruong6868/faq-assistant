import type { Language } from '../../lib/supabase'

interface Props {
  language: Language
  onSelect: (q: string) => void
}

const SUGGESTIONS: Record<Language, string[]> = {
  vi: [
    'Xin nghỉ phép như thế nào?',
    'Khi nào trả lương?',
    'Quên chấm công phải làm sao?',
    'Liên hệ ai khi có vấn đề?',
    'Cách xin nghỉ việc?',
  ],
  jp: [
    '休暇の申請方法は？',
    '給与の支払い日はいつですか？',
    '出勤記録を忘れた場合は？',
    '問題がある場合は誰に連絡しますか？',
    '退職の申請方法は？',
  ],
}

export function SuggestedQuestions({ language, onSelect }: Props) {
  return (
    <div className="flex flex-wrap gap-2 justify-center">
      {SUGGESTIONS[language].map((q) => (
        <button
          key={q}
          onClick={() => onSelect(q)}
          className="text-sm px-3 py-2 bg-white border border-gray-200 rounded-full text-gray-600 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50 transition-all"
        >
          {q}
        </button>
      ))}
    </div>
  )
}
