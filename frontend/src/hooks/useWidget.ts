import { useState, useCallback } from 'react'
import type { Language, FlowType } from '../lib/supabase'
import { detectBrowserLanguage } from '../lib/utils'

export type WidgetView =
  | 'selector'
  | 'corporate'
  | 'candidate'
  | 'internal_selector'
  | 'honsha_login'
  | 'honsha_dept'
  | 'honsha_chat'
  | 'haken_chat'

export interface Department {
  jp: string
  vi: string
}

const HONSHA_SESSION_KEY = 'honsha_verified_at'
const SESSION_TTL_MS = 2 * 60 * 60 * 1000 // 2 hours

function isHonshaSessionValid(): boolean {
  const raw = localStorage.getItem(HONSHA_SESSION_KEY)
  if (!raw) return false
  const verifiedAt = parseInt(raw, 10)
  return Date.now() - verifiedAt < SESSION_TTL_MS
}

function saveHonshaSession() {
  localStorage.setItem(HONSHA_SESSION_KEY, String(Date.now()))
}

function clearHonshaSession() {
  localStorage.removeItem(HONSHA_SESSION_KEY)
}

export function useWidget(siteKey = 'th-group') {
  const [isOpen, setIsOpen] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)
  const [view, setView] = useState<WidgetView>('selector')
  const [flow, setFlow] = useState<FlowType>('selector')
  const [selectedDepartment, setSelectedDepartment] = useState<Department | null>(null)
  const [language, setLanguage] = useState<Language>(detectBrowserLanguage)
  const [honshaVerified, setHonshaVerified] = useState(isHonshaSessionValid)

  const open = useCallback(() => {
    setIsOpen(true); setIsMinimized(false)
    window.parent?.postMessage({ type: 'th-widget-open' }, '*')
  }, [])
  const close = useCallback(() => {
    setIsOpen(false)
    window.parent?.postMessage({ type: 'th-widget-close' }, '*')
  }, [])
  const minimize = useCallback(() => setIsMinimized(true), [])
  const restore = useCallback(() => setIsMinimized(false), [])

  const goSelector = useCallback(() => {
    setView('selector')
    setFlow('selector')
    setSelectedDepartment(null)
  }, [])

  const selectFlow = useCallback((f: FlowType) => {
    setFlow(f)
    if (f === 'corporate') setView('corporate')
    else if (f === 'candidate') setView('candidate')
    else if (f === 'internal') setView('internal_selector')
  }, [])

  const selectInternalSubFlow = useCallback((sub: 'honsha' | 'haken') => {
    setFlow(sub)
    if (sub === 'honsha') {
      if (isHonshaSessionValid()) setView('honsha_dept')
      else setView('honsha_login')
    } else {
      setView('haken_chat')
    }
  }, [])

  const onHonshaLoginSuccess = useCallback(() => {
    saveHonshaSession()
    setHonshaVerified(true)
    setView('honsha_dept')
  }, [])

  const selectDepartment = useCallback((dept: Department) => {
    setSelectedDepartment(dept)
    setView('honsha_chat')
  }, [])

  const goBack = useCallback(() => {
    if (view === 'honsha_chat') setView('honsha_dept')
    else if (view === 'honsha_dept') { setView('internal_selector'); setFlow('internal') }
    else if (view === 'honsha_login') { setView('internal_selector'); setFlow('internal') }
    else if (view === 'haken_chat') { setView('internal_selector'); setFlow('internal') }
    else if (view === 'internal_selector') goSelector()
    else goSelector()
  }, [view, goSelector])

  return {
    isOpen, isMinimized, view, flow, selectedDepartment, language, siteKey,
    honshaVerified,
    open, close, minimize, restore,
    goSelector, selectFlow, selectInternalSubFlow, selectDepartment, goBack,
    onHonshaLoginSuccess, clearHonshaSession, setLanguage,
  }
}
