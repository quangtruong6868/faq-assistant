import { useEffect, useRef, useState } from 'react'
import type { ChatMessage, Language } from '../../lib/supabase'
import { submitFeedback } from '../../hooks/useUnanswered'
import ReactMarkdown from 'react-markdown'

interface Props {
  messages: ChatMessage[]
  isLoading: boolean
  language: Language
  flow?: string
  sessionId?: string
  onSendMessage?: (q: string) => void
}

const SOURCE_LABEL: Record<Language, string> = {
  vi: 'Nguồn', jp: '出典',
}

const FEEDBACK_LABEL: Record<Language, { good: string; bad: string; thanks: string; noted: string }> = {
  vi: { good: 'Hữu ích',    bad: 'Chưa đúng', thanks: '👍 Cảm ơn!',    noted: '👎 Ghi nhận, sẽ cải thiện' },
  jp: { good: '役に立った', bad: '間違い',     thanks: '👍 ありがとう！', noted: '👎 改善します'              },
}

function FeedbackRow({ message, flow, sessionId }: {
  message: ChatMessage; flow?: string; sessionId?: string
}) {
  const [voted, setVoted] = useState<1 | -1 | null>(null)

  if (!flow) return null

  const labels = FEEDBACK_LABEL[message.language] || FEEDBACK_LABEL.vi

  const vote = async (rating: 1 | -1) => {
    if (voted !== null) return
    setVoted(rating)
    await submitFeedback({
      session_id:  sessionId,
      question:    message.question || '',
      answer:      message.content,
      flow,
      language:    message.language,
      rating,
      learned_id:  message.learned_id,
    })
  }

  if (voted !== null) {
    return (
      <p className="text-[10px] text-gray-400 px-1 mt-0.5">
        {voted === 1 ? labels.thanks : labels.noted}
      </p>
    )
  }

  return (
    <div className="flex gap-1.5 px-1 mt-0.5">
      <button onClick={() => vote(1)}
        className="text-[10px] text-gray-400 hover:text-green-600 border border-gray-200 hover:border-green-300 rounded-full px-2 py-0.5 transition-all">
        👍 {labels.good}
      </button>
      <button onClick={() => vote(-1)}
        className="text-[10px] text-gray-400 hover:text-red-500 border border-gray-200 hover:border-red-300 rounded-full px-2 py-0.5 transition-all">
        👎 {labels.bad}
      </button>
    </div>
  )
}

function Bubble({ message, flow, sessionId, onSendMessage }: {
  message: ChatMessage; flow?: string; sessionId?: string; onSendMessage?: (q: string) => void
}) {
  const isUser = message.role === 'user'
  return (
    <div className={`flex gap-2 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
      {!isUser && (
        <div className="w-7 h-7 bg-blue-600 rounded-full flex items-center justify-center text-xs flex-shrink-0 mt-1 select-none">
          🤖
        </div>
      )}
      <div className={`flex flex-col gap-1 max-w-[80%] ${isUser ? 'items-end' : 'items-start'}`}>
        <div className={`rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
          isUser
            ? 'bg-blue-600 text-white rounded-br-sm'
            : 'bg-white border border-gray-100 shadow-sm text-gray-800 rounded-bl-sm'
        }`}>
          {isUser ? (
            <p>{message.content}</p>
          ) : (
            <ReactMarkdown components={{
              p:      ({ children }) => <p className="mb-1.5 last:mb-0">{children}</p>,
              ul:     ({ children }) => <ul className="list-disc pl-4 mb-1.5 space-y-0.5">{children}</ul>,
              ol:     ({ children }) => <ol className="list-decimal pl-4 mb-1.5 space-y-0.5">{children}</ol>,
              strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
            }}>
              {message.content}
            </ReactMarkdown>
          )}
        </div>

        {/* Source label */}
        {!isUser && message.source && (
          <p className="text-[10px] text-gray-400 px-1">
            {SOURCE_LABEL[message.language]}: {message.source}
            {message.source_detail && ` • ${message.source_detail}`}
          </p>
        )}

        {/* Suggested questions — clickable chips for clarification */}
        {!isUser && message.suggestions && message.suggestions.length > 0 && onSendMessage && (
          <div className="flex flex-col gap-1.5 mt-1 w-full">
            {message.suggestions.map((s, i) => (
              <button
                key={i}
                onClick={() => onSendMessage(s)}
                className="text-left text-xs text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 hover:border-blue-400 rounded-xl px-3 py-1.5 transition-all leading-snug"
              >
                {s}
              </button>
            ))}
          </div>
        )}

        {/* Feedback buttons — only for bot messages that have content */}
        {!isUser && message.content && !message.suggestions?.length && (
          <FeedbackRow message={message} flow={flow} sessionId={sessionId} />
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
            <div key={i}
              className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce"
              style={{ animationDelay: `${i * 0.15}s` }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

export function ChatView({ messages, isLoading, flow, sessionId, onSendMessage }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading])

  return (
    <div className="flex flex-col gap-3 p-4">
      {messages.map(msg => (
        <Bubble key={msg.id} message={msg} flow={flow} sessionId={sessionId} onSendMessage={onSendMessage} />
      ))}
      {isLoading && <TypingDots />}
      <div ref={bottomRef} />
    </div>
  )
}
