import { useState, useRef, type KeyboardEvent } from 'react'
import type { Language } from '../../lib/supabase'

interface Props {
  language: Language
  isLoading: boolean
  onSend: (text: string) => void
}

const PLACEHOLDER: Record<Language, string> = {
  vi: 'Nhập câu hỏi...',
  jp: '質問を入力...',
  en: 'Type your question...',
  np: 'प्रश्न टाइप गर्नुहोस्...',
}

export function WidgetInput({ language, isLoading, onSend }: Props) {
  const [value, setValue] = useState('')
  const ref = useRef<HTMLTextAreaElement>(null)

  const handleSend = () => {
    const q = value.trim()
    if (!q || isLoading) return
    setValue('')
    if (ref.current) {
      ref.current.style.height = 'auto'
    }
    onSend(q)
  }

  const handleKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="border-t border-gray-100 px-3 py-3 bg-white rounded-b-2xl flex-shrink-0">
      <div className="flex items-end gap-2">
        <textarea
          ref={ref}
          value={value}
          onChange={e => {
            setValue(e.target.value)
            e.target.style.height = 'auto'
            e.target.style.height = Math.min(e.target.scrollHeight, 96) + 'px'
          }}
          onKeyDown={handleKey}
          placeholder={PLACEHOLDER[language]}
          rows={1}
          disabled={isLoading}
          className="flex-1 resize-none rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50 overflow-hidden leading-snug"
          style={{ minHeight: '40px', maxHeight: '96px' }}
        />
        <button
          onClick={handleSend}
          disabled={!value.trim() || isLoading}
          className="w-9 h-9 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-200 text-white rounded-xl flex items-center justify-center transition-colors flex-shrink-0 active:scale-95"
          aria-label="Send"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
          </svg>
        </button>
      </div>
      <p className="text-[10px] text-gray-300 text-center mt-1.5">Enter để gửi • Shift+Enter xuống dòng</p>
    </div>
  )
}
