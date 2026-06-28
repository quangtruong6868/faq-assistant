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
  factory_name?: string
  bot_answer?: string
  admin_answer?: string
  admin_note?: string
  ask_count?: number
  source_type?: string
  status: 'pending' | 'in_review' | 'answered' | 'added_to_kb'
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
    factory_name?: string
  }) => {
    setSubmitting(true)
    await supabase.from('unanswered_questions').insert(data)
    setSubmitted(true)
    setSubmitting(false)
  }, [])

  return { submitting, submitted, submit, reset: () => setSubmitted(false) }
}

export function useUnansweredAdmin() {
  const [items, setItems]   = useState<UnansweredQuestion[]>([])
  const [loading, setLoading] = useState(true)
  const [teaching, setTeaching] = useState<string | null>(null)

  const fetchItems = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('unanswered_questions')
      .select('*')
      .order('ask_count', { ascending: false })   // most-asked first
      .order('created_at', { ascending: false })
    setItems((data || []) as UnansweredQuestion[])
    setLoading(false)
  }, [])

  const updateStatus = useCallback(async (
    id: string,
    status: UnansweredQuestion['status'],
    note?: string,
    adminAnswer?: string,
  ) => {
    const updates: any = { status }
    if (note !== undefined)        updates.admin_note   = note
    if (adminAnswer !== undefined) updates.admin_answer = adminAnswer
    await supabase.from('unanswered_questions').update(updates).eq('id', id)
    setItems(prev => prev.map(i =>
      i.id === id ? { ...i, status, admin_note: note ?? i.admin_note, admin_answer: adminAnswer ?? i.admin_answer } : i
    ))
  }, [])

  // Push admin_answer to learned_knowledge via teach-bot edge function
  const teachBot = useCallback(async (id: string): Promise<{ ok: boolean; message: string }> => {
    setTeaching(id)
    try {
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/teach-bot`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({ action: 'teach_from_unanswered', unanswered_id: id }),
      })
      const data = await res.json()
      if (data.ok) {
        setItems(prev => prev.map(i => i.id === id ? { ...i, status: 'added_to_kb' } : i))
      }
      return { ok: !!data.ok, message: data.message || data.error || 'Error' }
    } finally {
      setTeaching(null)
    }
  }, [])

  // Bulk teach: update admin_answer then call teach-bot for each row
  const bulkTeach = useCallback(async (
    rows: { id: string; admin_answer: string }[]
  ): Promise<{ ok: number; fail: number }> => {
    let ok = 0, fail = 0
    for (const row of rows) {
      try {
        await supabase
          .from('unanswered_questions')
          .update({ admin_answer: row.admin_answer, status: 'answered' })
          .eq('id', row.id)
        const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/teach-bot`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({ action: 'teach_from_unanswered', unanswered_id: row.id }),
        })
        const data = await res.json()
        if (data.ok) {
          ok++
          setItems(prev => prev.map(i =>
            i.id === row.id ? { ...i, status: 'added_to_kb', admin_answer: row.admin_answer } : i
          ))
        } else fail++
      } catch { fail++ }
    }
    return { ok, fail }
  }, [])

  return { items, loading, teaching, fetch: fetchItems, updateStatus, teachBot, bulkTeach }
}

// Submit feedback (thumbs up/down) from chat
export async function submitFeedback(params: {
  session_id?: string
  question: string
  answer: string
  flow: string
  language: string
  rating: 1 | -1
  learned_id?: string
}) {
  await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/teach-bot`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify({ action: 'feedback', ...params }),
  })
}
