import { useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { ChatMessage, Language, FlowType } from '../lib/supabase'
import { NO_INFO_MESSAGE, PRIVATE_INFO_RESPONSE, isPrivateInfoQuery } from '../lib/utils'

const SESSION_ID = crypto.randomUUID()

export function useChat(language: Language, flow: FlowType = 'internal') {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const addMessage = useCallback((msg: Omit<ChatMessage, 'id' | 'timestamp'>) => {
    const newMsg: ChatMessage = { ...msg, id: crypto.randomUUID(), timestamp: new Date() }
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
        return
      }

      // Build history for context (last 6 turns max)
      const history = messages.slice(-6).map(m => ({ role: m.role, content: m.content }))

      const { data, error } = await supabase.functions.invoke('chat', {
        body: { question, language, session_id: SESSION_ID, flow, history },
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
  }, [addMessage, isLoading, language, flow, messages])

  const clearMessages = useCallback(() => setMessages([]), [])

  return { messages, isLoading, sendMessage, clearMessages }
}

