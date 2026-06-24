import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { FaqCategory, FaqItem, Language, FlowType } from '../lib/supabase'
import { detectBrowserLanguage } from '../lib/utils'

export type WidgetView = 'selector' | 'corporate' | 'candidate' | 'internal_home' | 'internal_category' | 'chat'

export function useWidget(siteKey = 'th-group') {
  const [isOpen, setIsOpen] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)
  const [view, setView] = useState<WidgetView>('selector')
  const [flow, setFlow] = useState<FlowType>('selector')
  const [selectedCategory, setSelectedCategory] = useState<FaqCategory | null>(null)
  const [language, setLanguage] = useState<Language>(detectBrowserLanguage)

  const open = useCallback(() => { setIsOpen(true); setIsMinimized(false) }, [])
  const close = useCallback(() => { setIsOpen(false) }, [])
  const minimize = useCallback(() => setIsMinimized(true), [])
  const restore = useCallback(() => setIsMinimized(false), [])

  const goSelector = useCallback(() => {
    setView('selector')
    setFlow('selector')
    setSelectedCategory(null)
  }, [])

  const selectFlow = useCallback((f: FlowType) => {
    setFlow(f)
    if (f === 'corporate') setView('corporate')
    else if (f === 'candidate') setView('candidate')
    else if (f === 'internal') setView('internal_home')
  }, [])

  const selectCategory = useCallback((cat: FaqCategory) => {
    setSelectedCategory(cat)
    setView('internal_category')
  }, [])

  const goToChat = useCallback(() => setView('chat'), [])

  const goBack = useCallback(() => {
    if (view === 'internal_category') setView('internal_home')
    else if (view === 'chat' && flow === 'internal') setView('internal_home')
    else goSelector()
  }, [view, flow, goSelector])

  return {
    isOpen, isMinimized, view, flow, selectedCategory, language, siteKey,
    open, close, minimize, restore,
    goSelector, selectFlow, selectCategory, goToChat, goBack, setLanguage,
  }
}

export function useCategories() {
  const [categories, setCategories] = useState<FaqCategory[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.from('faq_categories').select('*').order('sort_order')
      .then(({ data }) => { setCategories(data || []); setLoading(false) })
  }, [])

  return { categories, loading }
}

export function useFaqByCategory(categoryId: string | null, language: Language) {
  const [items, setItems] = useState<FaqItem[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!categoryId) return
    setLoading(true)
    supabase.from('faq_items').select('*').eq('category_id', categoryId).eq('is_active', true)
      .then(({ data }) => { setItems(data || []); setLoading(false) })
  }, [categoryId, language])

  return { items, loading }
}
