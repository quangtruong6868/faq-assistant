import { useEffect, useRef } from 'react'
import type { ChatMessage, Language } from '../../lib/supabase'
import ReactMarkdown from 'react-markdown'

interface Props {
  messages: ChatMessage[]
  isLoading: boolean
  language: Language
  onSuggestion?: (q: string) => void
}

const SOURCE_LABEL: Record<Language, string> = {
  vi: 'Nguồn', jp: '出典', en: 'Source', np: 'स्रोत',
}

const RELATED_LABEL: Record<Language, string> = {
  vi: 'Câu hỏi liên quan:', jp: '関連する質問:', en: 'Related questions:', np: 'सम्बन्धित प्रश्नहरू:',
}

function Bubble({ message, onSuggestion }: { message: ChatMessage; onSuggestion?: (q: string) => void }) {
  const isUser = message.role === 'user'
  return (
    <div className={`flex gap-2 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
      {!isUser && (
        <div className="w-7 h-7 bg-blue-600 rounded-full flex items-center justify-center text-xs flex-shrink-0 mt-1 select-none">
          🤖
        </div>
      )}
      <div className={`flex flex-col gap-1 max-w-[80%] ${isUser ? 'items-end' : 'items-start'}`}>
        <div
          className={`rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
            isUser
              ? 'bg-blue-600 text-white rounded-br-sm'
              : 'bg-white border border-gray-100 shadow-sm text-gray-800 rounded-bl-sm'
          }`}
        >
          {isUser ? (
            <p>{message.content}</p>
          ) : (
            <ReactMarkdown
              components={{
                p: ({ children }) => <p className="mb-1.5 last:mb-0">{children}</p>,
                ul: ({ children }) => <ul className="list-disc pl-4 mb-1.5 space-y-0.5">{children}</ul>,
                ol: ({ children }) => <ol className="list-decimal pl-4 mb-1.5 space-y-0.5">{children}</ol>,
                strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
              }}
            >
              {message.content}
            </ReactMarkdown>
          )}
        </div>
        {!isUser && message.source && (
          <p className="text-[10px] text-gray-400 px-1">
            {SOURCE_LABEL[message.language]}: {message.source}
            {message.source_detail && ` • ${message.source_detail}`}
          </p>
        )}
        {!isUser && message.suggestions && message.suggestions.length > 0 && onSuggestion && (
          <div className="mt-1 flex flex-col gap-1.5">
            <p className="text-[10px] text-gray-400 px-1">{RELATED_LABEL[message.language]}</p>
            {message.suggestions.map((s, i) => (
              <button
                key={i}
                onClick={() => onSuggestion(s)}
                className="text-left text-xs text-blue-600 border border-blue-200 bg-blue-50 hover:bg-blue-100 rounded-xl px-3 py-1.5 transition-colors"
              >
                {s}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function TypingDots() {
  return (
    <div className="flex gap-2">
      <div className="w-7 h-7 bg-blue-600 rounded-full flex items-center justify-center text-xs flex-shrink-0 select-none">
        🤖
      </div>
      <div className="bg-white border border-gray-100 shadow-sm rounded-2xl rounded-bl-sm px-3.5 py-2.5">
        <div className="flex gap-1 items-center h-4">
          {[0, 1, 2].map(i => (
            <div
              key={i}
              className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce"
              style={{ animationDelay: `${i * 0.15}s` }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

export function ChatView({ messages, isLoading, onSuggestion }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading])

  return (
    <div className="flex flex-col gap-3 p-4">
      {messages.map(msg => (
        <Bubble key={msg.id} message={msg} onSuggestion={onSuggestion} />
      ))}
      {isLoading && <TypingDots />}
      <div ref={bottomRef} />
    </div>
  )
}
