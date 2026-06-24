import { useCallback, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { CompanyLead, CandidateLead } from '../lib/supabase'

const SESSION_ID = crypto.randomUUID()

export function useLeads(siteKey: string) {
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')

  const submitCompanyLead = useCallback(async (data: CompanyLead) => {
    setSubmitting(true)
    setError('')
    const { error } = await supabase.from('company_leads').insert({
      ...data,
      site_key: siteKey,
      session_id: SESSION_ID,
    })
    if (error) setError(error.message)
    else setSubmitted(true)
    setSubmitting(false)
    return !error
  }, [siteKey])

  const submitCandidateLead = useCallback(async (data: CandidateLead) => {
    setSubmitting(true)
    setError('')
    const { error } = await supabase.from('candidate_leads').insert({
      ...data,
      site_key: siteKey,
      session_id: SESSION_ID,
    })
    if (error) setError(error.message)
    else setSubmitted(true)
    setSubmitting(false)
    return !error
  }, [siteKey])

  const reset = useCallback(() => { setSubmitted(false); setError('') }, [])

  return { submitting, submitted, error, submitCompanyLead, submitCandidateLead, reset }
}
