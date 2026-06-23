import { useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { ChatMessage, Language } from '../lib/supabase'
import { NO_INFO_MESSAGE, PRIVATE_INFO_RESPONSE, isPrivateInfoQuery } from '../lib/utils'

const SESSION_ID = crypto.randomUUID()

// language is controlled externally by the widget
export function useChat(language: Language) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const addMessage = useCallback((msg: Omit<ChatMessage, 'id' | 'timestamp'>) => {
    const newMsg: ChatMessage = {
      ...msg,
      id: crypto.randomUUID(),
      timestamp: new Date(),
    }
    setMessages(prev => [...prev, newMsg])
    return newMsg
  }, [])

  const sendMessage = useCallback(async (question: string) => {
    if (!question.trim() || isLoading) return

    addMessage({ role: 'user', content: question, language })
    setIsLoading(true)

    try {
      if (isPrivateInfoQuery(question)) {
        addMessage({ role: 'assistant', content: PRIVATE_INFO_RESPONSE[language], language })
        await logChat(question, PRIVATE_INFO_RESPONSE[language], language, 'blocked')
        return
      }

      const { data, error } = await supabase.functions.invoke('chat', {
        body: { question, language, session_id: SESSION_ID },
      })

      if (error) throw error

      addMessage({
        role: 'assistant',
        content: data.answer || NO_INFO_MESSAGE[language],
        language,
        source: data.source,
        source_detail: data.source_detail,
      })

    } catch {
      addMessage({ role: 'assistant', content: NO_INFO_MESSAGE[language], language })
    } finally {
      setIsLoading(false)
    }
  }, [addMessage, isLoading, language])

  return { messages, isLoading, sendMessage }
}

async function logChat(question: string, answer: string, language: Language, source: string) {
  try {
    await supabase.from('chat_logs').insert({ session_id: SESSION_ID, question, answer, language, source })
  } catch {
    // non-critical
  }
}
