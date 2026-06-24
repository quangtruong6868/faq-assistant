import { useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { ChatMessage, Language, FlowType } from '../lib/supabase'
import { NO_INFO_MESSAGE, PRIVATE_INFO_RESPONSE, isPrivateInfoQuery } from '../lib/utils'

export const SESSION_ID = crypto.randomUUID()

export function useChat(language: Language, flow: FlowType = 'internal', options?: { department?: string }) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [lastNoMatch, setLastNoMatch] = useState<string | null>(null) // stores question when no_match

  const addMessage = useCallback((msg: Omit<ChatMessage, 'id' | 'timestamp'>) => {
    const newMsg: ChatMessage = { ...msg, id: crypto.randomUUID(), timestamp: new Date() }
    setMessages(prev => [...prev, newMsg])
    return newMsg
  }, [])

  const sendMessage = useCallback(async (question: string) => {
    if (!question.trim() || isLoading) return
    setLastNoMatch(null)

    addMessage({ role: 'user', content: question, language })
    setIsLoading(true)

    try {
      if (isPrivateInfoQuery(question)) {
        addMessage({ role: 'assistant', content: PRIVATE_INFO_RESPONSE[language], language })
        return
      }

      const history = messages.slice(-4).map(m => ({ role: m.role, content: m.content }))

      const { data, error } = await supabase.functions.invoke('chat', {
        body: { question, language, session_id: SESSION_ID, flow, history, department: options?.department },
      })

      if (error) throw error

      addMessage({
        role: 'assistant',
        content: data.answer || NO_INFO_MESSAGE[language],
        language,
        source: data.source,
        suggestions: data.suggestions || [],
      })

      // Flag this question for contact collection
      if (data.no_match) setLastNoMatch(question)

    } catch {
      addMessage({ role: 'assistant', content: NO_INFO_MESSAGE[language], language })
    } finally {
      setIsLoading(false)
    }
  }, [addMessage, isLoading, language, flow, messages])

  const clearMessages = useCallback(() => { setMessages([]); setLastNoMatch(null) }, [])
  const clearNoMatch = useCallback(() => setLastNoMatch(null), [])

  return { messages, isLoading, sendMessage, clearMessages, lastNoMatch, clearNoMatch }
}
