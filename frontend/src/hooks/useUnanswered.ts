import { useCallback, useState } from 'react'
import { supabase } from '../lib/supabase'

export interface UnansweredQuestion {
  id: string
  session_id?: string
  question: string
  language: string
  flow: string
  contact_name?: string
  phone?: string
  email?: string
  facebook?: string
  line_id?: string
  status: 'pending' | 'in_review' | 'answered' | 'added_to_kb'
  admin_note?: string
  created_at: string
}

export function useSubmitUnanswered() {
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const submit = useCallback(async (data: {
    session_id?: string
    question: string
    language: string
    flow: string
    contact_name: string
    phone: string
    email?: string
    facebook?: string
    line_id?: string
  }) => {
    setSubmitting(true)
    await supabase.from('unanswered_questions').insert(data)
    setSubmitted(true)
    setSubmitting(false)
  }, [])

  return { submitting, submitted, submit, reset: () => setSubmitted(false) }
}

export function useUnansweredAdmin() {
  const [items, setItems] = useState<UnansweredQuestion[]>([])
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('unanswered_questions')
      .select('*')
      .order('created_at', { ascending: false })
    setItems((data || []) as UnansweredQuestion[])
    setLoading(false)
  }, [])

  const updateStatus = useCallback(async (id: string, status: UnansweredQuestion['status'], note?: string) => {
    await supabase.from('unanswered_questions').update({ status, admin_note: note }).eq('id', id)
    setItems(prev => prev.map(i => i.id === id ? { ...i, status, admin_note: note ?? i.admin_note } : i))
  }, [])

  return { items, loading, fetch, updateStatus }
}
