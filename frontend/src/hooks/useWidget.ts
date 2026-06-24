import { useState, useCallback } from 'react'
import type { Language, FlowType } from '../lib/supabase'
import { detectBrowserLanguage } from '../lib/utils'

export type WidgetView =
  | 'selector'
  | 'corporate'
  | 'candidate'
  | 'internal_selector'
  | 'honsha_dept'
  | 'honsha_chat'
  | 'haken_chat'

export interface Department {
  jp: string
  vi: string
}

export function useWidget(siteKey = 'th-group') {
  const [isOpen, setIsOpen] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)
  const [view, setView] = useState<WidgetView>('selector')
  const [flow, setFlow] = useState<FlowType>('selector')
  const [selectedDepartment, setSelectedDepartment] = useState<Department | null>(null)
  const [language, setLanguage] = useState<Language>(detectBrowserLanguage)

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
    if (sub === 'honsha') setView('honsha_dept')
    else setView('haken_chat')
  }, [])

  const selectDepartment = useCallback((dept: Department) => {
    setSelectedDepartment(dept)
    setView('honsha_chat')
  }, [])

  const goBack = useCallback(() => {
    if (view === 'honsha_chat') setView('honsha_dept')
    else if (view === 'honsha_dept') { setView('internal_selector'); setFlow('internal') }
    else if (view === 'haken_chat') { setView('internal_selector'); setFlow('internal') }
    else if (view === 'internal_selector') goSelector()
    else goSelector()
  }, [view, goSelector])

  return {
    isOpen, isMinimized, view, flow, selectedDepartment, language, siteKey,
    open, close, minimize, restore,
    goSelector, selectFlow, selectInternalSubFlow, selectDepartment, goBack, setLanguage,
  }
}
