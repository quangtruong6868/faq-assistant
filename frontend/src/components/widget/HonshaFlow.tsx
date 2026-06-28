import { useRef, useEffect } from 'react'
import type { Language } from '../../lib/supabase'
import type { Department } from '../../hooks/useWidget'
import { useChat } from '../../hooks/useChat'
import { WidgetInput } from './WidgetInput'
import { NoMatchContactForm } from './NoMatchContactForm'

interface Props {
  language: Language
  selectedDepartment: Department | null
  onSelectDepartment: (dept: Department) => void
}

const DEPARTMENTS: Department[] = [
  { jp: '申請業務',  vi: 'Nghiệp vụ thủ tục visa' },
  { jp: '営業事務',  vi: 'Nghiệp vụ kinh doanh' },
  { jp: '勤怠事務',  vi: 'Nghiệp vụ chấm công' },
  { jp: '経理事務',  vi: 'Nghiệp vụ kế toán' },
  { jp: '総務事務',  vi: 'Nghiệp vụ tổng hợp' },
  { jp: '労務管理',  vi: 'Quản lý lao động' },
  { jp: '営業部',   vi: 'Phòng kinh doanh' },
  { jp: '求人チーム', vi: 'Team tuyển dụng' },
  { jp: '就業規則',  vi: 'Nội quy công ty' },
]

const WELCOME_DEPT: Record<Language, string> = {
  jp: 'ようこそ！TH-GROUP本社FAQへ。\n担当部署を選択してください。',
  vi: 'Chào mừng đến FAQ Honsha TH-GROUP!\nChọn bộ phận bạn muốn hỏi.',
}

const WELCOME_CHAT: Record<Language, (dept: string, deptVi: string) => string> = {
  jp: (dept) => `${dept}についてのご質問をどうぞ。\n資料に基づいてお答えします。`,
  vi: (_, deptVi) => `Bạn có câu hỏi gì về **${deptVi}**?\nMình sẽ trả lời dựa trên tài liệu có sẵn.`,
}

export function HonshaFlow({ language, selectedDepartment, onSelectDepartment }: Props) {
  const { messages, isLoading, sendMessage, lastNoMatch, clearNoMatch } =
    useChat(language, 'honsha', { department: selectedDepartment?.jp })
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, lastNoMatch])

  // Department picker view
  if (!selectedDepartment) {
    return (
      <div className="flex flex-col gap-4 p-4">
        <div className="flex gap-2.5">
          <div className="w-9 h-9 rounded-full overflow-hidden flex-shrink-0 mt-0.5 bg-white border border-gray-100">
            <img src="/th-logo.jpg" alt="TH" className="w-full h-full object-contain" />
          </div>
          <div className="bg-white border border-gray-100 shadow-sm rounded-2xl rounded-tl-sm px-4 py-3 max-w-[85%]">
            <p className="text-sm text-gray-800 whitespace-pre-line">{WELCOME_DEPT[language]}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {DEPARTMENTS.map(dept => (
            <button
              key={dept.jp}
              onClick={() => onSelectDepartment(dept)}
              className="flex flex-col items-start bg-white border-2 border-gray-200 rounded-xl p-3 text-left hover:border-red-400 hover:bg-red-50 transition-all active:scale-[0.98] group"
            >
              <span className="text-sm font-bold text-gray-900 group-hover:text-red-700 transition-colors leading-tight">
                {dept.jp}
              </span>
              <span className="text-[10px] text-gray-400 mt-0.5 leading-tight">{dept.vi}</span>
            </button>
          ))}
        </div>
      </div>
    )
  }

  // Chat view (department selected)
  return (
    <div className="flex flex-col h-full">
      {/* Department badge */}
      <div className="flex items-center gap-2 px-4 py-2 bg-red-50 border-b border-red-100">
        <span className="text-xs font-semibold text-red-700">{selectedDepartment.jp}</span>
        <span className="text-xs text-red-400">·</span>
        <span className="text-xs text-red-500">{selectedDepartment.vi}</span>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {/* Welcome bubble */}
        <div className="flex gap-2.5">
          <div className="w-8 h-8 rounded-full overflow-hidden bg-white border border-gray-100 flex-shrink-0 mt-0.5">
            <img src="/th-logo.jpg" alt="TH" className="w-full h-full object-contain" />
          </div>
          <div className="bg-white border border-gray-100 shadow-sm rounded-2xl rounded-tl-sm px-4 py-3 max-w-[85%]">
            <p className="text-sm text-gray-800 whitespace-pre-line">{WELCOME_CHAT[language](selectedDepartment.jp, selectedDepartment.vi)}</p>
          </div>
        </div>

        {/* Chat messages */}
        {messages.map(msg => (
          <div key={msg.id} className={`flex gap-2.5 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
            {msg.role === 'assistant' && (
              <div className="w-8 h-8 rounded-full overflow-hidden bg-white border border-gray-100 flex-shrink-0 mt-0.5">
                <img src="/th-logo.jpg" alt="TH" className="w-full h-full object-contain" />
              </div>
            )}
            <div className="flex flex-col gap-1.5 max-w-[80%]">
              <div className={`px-4 py-3 rounded-2xl text-sm whitespace-pre-line leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-red-600 text-white rounded-tr-sm'
                  : 'bg-white border border-gray-100 shadow-sm text-gray-800 rounded-tl-sm'
              }`}>
                {msg.content}
              </div>
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex gap-2.5">
            <div className="w-8 h-8 rounded-full overflow-hidden bg-white border border-gray-100 flex-shrink-0">
              <img src="/th-logo.jpg" alt="TH" className="w-full h-full object-contain" />
            </div>
            <div className="bg-white border border-gray-100 shadow-sm rounded-2xl rounded-tl-sm px-4 py-3">
              <div className="flex gap-1 items-center h-4">
                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:0ms]" />
                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:150ms]" />
                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:300ms]" />
              </div>
            </div>
          </div>
        )}

        {lastNoMatch && (
          <NoMatchContactForm
            question={lastNoMatch}
            language={language}
            flow="honsha"
            onDismiss={clearNoMatch}
          />
        )}

        <div ref={bottomRef} />
      </div>

      <WidgetInput language={language} isLoading={isLoading} onSend={sendMessage} />
    </div>
  )
}
