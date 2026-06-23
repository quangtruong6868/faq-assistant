import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { FaqCategory, FaqItem, Language } from '../lib/supabase'
import { detectBrowserLanguage } from '../lib/utils'

export type WidgetView = 'home' | 'category' | 'chat'

export function useWidget() {
  const [isOpen, setIsOpen] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)
  const [view, setView] = useState<WidgetView>('home')
  const [selectedCategory, setSelectedCategory] = useState<FaqCategory | null>(null)
  const [language, setLanguage] = useState<Language>(detectBrowserLanguage)

  const open = useCallback(() => {
    setIsOpen(true)
    setIsMinimized(false)
  }, [])

  const close = useCallback(() => {
    setIsOpen(false)
    setIsMinimized(false)
  }, [])

  const minimize = useCallback(() => {
    setIsMinimized(true)
  }, [])

  const restore = useCallback(() => {
    setIsMinimized(false)
  }, [])

  const goHome = useCallback(() => {
    setView('home')
    setSelectedCategory(null)
  }, [])

  const selectCategory = useCallback((cat: FaqCategory) => {
    setSelectedCategory(cat)
    setView('category')
  }, [])

  const goToChat = useCallback(() => {
    setView('chat')
  }, [])

  return {
    isOpen, isMinimized, view, selectedCategory, language,
    open, close, minimize, restore, goHome, selectCategory, goToChat, setLanguage,
  }
}

export function useCategories() {
  const [categories, setCategories] = useState<FaqCategory[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase
      .from('faq_categories')
      .select('*')
      .order('sort_order')
      .then(({ data }) => {
        setCategories(data || [])
        setLoading(false)
      })
  }, [])

  return { categories, loading }
}

export function useFaqByCategory(categoryId: string | null, language: Language) {
  const [items, setItems] = useState<FaqItem[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!categoryId) return
    setLoading(true)
    supabase
      .from('faq_items')
      .select('*')
      .eq('category_id', categoryId)
      .eq('is_active', true)
      .then(({ data }) => {
        setItems(data || [])
        setLoading(false)
      })
  }, [categoryId, language])

  return { items, loading }
}
