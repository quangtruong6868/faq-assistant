import { useState, useEffect, useCallback } from 'react'
import * as XLSX from 'xlsx'
import { supabase } from '../lib/supabase'
import type { FaqItem, FaqCategory, Document } from '../lib/supabase'

export function useAdmin() {
  const [session, setSession] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, s) => setSession(s))
    return () => subscription.unsubscribe()
  }, [])

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return error
  }, [])

  const signOut = useCallback(() => supabase.auth.signOut(), [])

  return { session, loading, signIn, signOut }
}

export function useFaqItems() {
  const [items, setItems] = useState<FaqItem[]>([])
  const [categories, setCategories] = useState<FaqCategory[]>([])
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    setLoading(true)
    const [{ data: cats }, { data: faqs }] = await Promise.all([
      supabase.from('faq_categories').select('*').order('sort_order'),
      supabase.from('faq_items').select('*, faq_categories(name_vi, name_jp, name_en, name_np, slug, icon, sort_order)').order('created_at', { ascending: false }),
    ])
    setCategories(cats || [])
    setItems(faqs || [])
    setLoading(false)
  }, [])

  useEffect(() => { fetch() }, [fetch])

  const create = useCallback(async (item: Partial<FaqItem>) => {
    const { error } = await supabase.from('faq_items').insert(item)
    if (!error) await fetch()
    return error
  }, [fetch])

  const update = useCallback(async (id: string, item: Partial<FaqItem>) => {
    const { error } = await supabase.from('faq_items').update(item).eq('id', id)
    if (!error) await fetch()
    return error
  }, [fetch])

  const remove = useCallback(async (id: string) => {
    const { error } = await supabase.from('faq_items').delete().eq('id', id)
    if (!error) await fetch()
    return error
  }, [fetch])

  const toggle = useCallback(async (id: string, is_active: boolean) => {
    return update(id, { is_active })
  }, [update])

  return { items, categories, loading, refetch: fetch, create, update, remove, toggle }
}

// ── Client-side text extraction helpers ───────────────────────────────────

async function extractTextClientSide(file: File, ext: string): Promise<string> {
  if (ext === 'xlsx' || ext === 'xls') {
    const buf = await file.arrayBuffer()
    const wb = XLSX.read(buf, { type: 'array' })
    const lines: string[] = []
    for (const sheetName of wb.SheetNames) {
      const ws = wb.Sheets[sheetName]
      const csv = XLSX.utils.sheet_to_csv(ws, { blankrows: false })
      if (csv.trim()) { lines.push(`=== ${sheetName} ===`); lines.push(csv.trim()) }
    }
    return lines.join('\n\n')
  }
  if (ext === 'txt' || ext === 'csv') return file.text()
  // DOCX/PDF: server will handle (smaller files, usually OK)
  return ''
}

function chunkText(text: string, size = 1200, overlap = 150): string[] {
  if (!text || text.length < 20) return []
  const chunks: string[] = []
  let start = 0
  while (start < text.length) {
    const end = Math.min(start + size, text.length)
    let breakAt = end
    if (end < text.length) {
      const b = Math.max(text.lastIndexOf('.', end), text.lastIndexOf('\n', end))
      if (b > start + size * 0.5) breakAt = b + 1
    }
    const chunk = text.slice(start, breakAt).trim()
    if (chunk.length > 30) chunks.push(chunk)
    start = breakAt - overlap
  }
  return chunks
}

export function useDocuments() {
  const [documents, setDocuments] = useState<Document[]>([])
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase.from('documents').select('*').order('created_at', { ascending: false })
    setDocuments(data || [])
    setLoading(false)
  }, [])

  useEffect(() => { fetch() }, [fetch])

  const upload = useCallback(async (file: File, flow = 'internal') => {
    const ext = (file.name.split('.').pop() || 'bin').toLowerCase()
    const safeName = file.name
      .replace(/\.\w+$/, '')
      .replace(/[^\w\-]/g, '_')
      .replace(/_+/g, '_')
      .slice(0, 60)

    const path = `documents/${Date.now()}_${safeName}.${ext}`

    // Upload original file to storage
    const { error: storageError } = await supabase.storage.from('documents').upload(path, file)
    if (storageError) return storageError

    const { error: dbError, data: docData } = await supabase.from('documents').insert({
      title: file.name.replace(/\.\w+$/, ''),
      file_name: file.name,
      file_path: path,
      file_type: ext,
      flow,
      status: 'pending',
    }).select('id').single()
    if (dbError) return dbError

    // Extract text & chunk CLIENT-SIDE for all formats (avoids server OOM)
    const text = await extractTextClientSide(file, ext)
    const chunks = chunkText(text)

    // Send pre-chunked text to edge function — it only needs to call OpenAI embed
    await supabase.functions.invoke('embed-document', {
      body: { document_id: docData.id, chunks, flow },
    })

    await fetch()
    return null
  }, [fetch])

  const remove = useCallback(async (doc: Document) => {
    await supabase.storage.from('documents').remove([doc.file_path])
    await supabase.from('documents').delete().eq('id', doc.id)
    await fetch()
  }, [fetch])

  return { documents, loading, upload, remove, refetch: fetch }
}

export function useDashboard() {
  const [stats, setStats] = useState({
    totalFaq: 0,
    totalDocuments: 0,
    totalChats: 0,
    topQuestions: [] as { question: string; count: number; language: string }[],
    unanswered: [] as { question: string; language: string; asked_at: string }[],
  })

  useEffect(() => {
    async function load() {
      const [
        { count: faqCount },
        { count: docCount },
        { count: chatCount },
        { data: topQ },
        { data: unansweredQ },
      ] = await Promise.all([
        supabase.from('faq_items').select('*', { count: 'exact', head: true }),
        supabase.from('documents').select('*', { count: 'exact', head: true }),
        supabase.from('chat_logs').select('*', { count: 'exact', head: true }),
        supabase.from('popular_questions').select('*').order('count', { ascending: false }).limit(10),
        supabase.from('chat_logs').select('question, language, created_at').eq('source', 'no_match').order('created_at', { ascending: false }).limit(20),
      ])

      setStats({
        totalFaq: faqCount || 0,
        totalDocuments: docCount || 0,
        totalChats: chatCount || 0,
        topQuestions: (topQ || []).map(q => ({ question: q.question, count: q.count, language: q.language })),
        unanswered: (unansweredQ || []).map(q => ({ question: q.question, language: q.language, asked_at: q.created_at })),
      })
    }
    load()
  }, [])

  return stats
}
