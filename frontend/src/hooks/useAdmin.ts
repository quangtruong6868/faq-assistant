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

// For xlsx: returns array of row-level chunks (one chunk per data row)
export async function extractXlsxChunks(file: File): Promise<string[]> {
  try {
    const buf = await file.arrayBuffer()
    const wb = XLSX.read(buf, { type: 'array', sheetRows: 500, dense: true })
    const chunks: string[] = []
    for (const sheetName of wb.SheetNames) {
      // Skip instruction/template sheets
      if (/huong.dan|instruction|readme|template/i.test(sheetName)) continue
      try {
        const ws = wb.Sheets[sheetName]
        if (!ws) continue
        const rows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '', blankrows: false })
        if (!rows || rows.length < 2) continue
        const headers = rows[0].map((h: any) => String(h ?? '').trim())
        for (let i = 1; i < Math.min(rows.length, 500); i++) {
          const row = rows[i]
          if (!Array.isArray(row)) continue
          const parts = headers.map((h, j) => {
            const val = String(row[j] ?? '').replace(/[\n\r]/g, ' ').trim()
            return val ? `${h}: ${val}` : ''
          }).filter(Boolean)
          const chunk = parts.join('\n')
          if (chunk.length > 10) chunks.push(chunk)
        }
      } catch (e) {
        console.warn(`[extract] sheet "${sheetName}" skipped:`, e)
      }
    }
    return chunks
  } catch (e) {
    console.error('[extract] XLSX parse failed:', e)
    return []
  }
}

async function extractTextClientSide(file: File, ext: string): Promise<string> {
  if (ext === 'txt' || ext === 'csv') {
    const text = await file.text()
    return text.slice(0, 200000)
  }
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
    if (breakAt >= text.length) break  // reached end, stop
    start = breakAt - overlap
    if (start <= 0) break  // safety guard
  }
  return chunks
}

// Re-embed an existing document by downloading from storage and re-parsing
export async function reEmbedDocument(doc: { id: string; file_path: string; file_name: string; file_type?: string; flow?: string }) {
  const ext = (doc.file_type || doc.file_name.split('.').pop() || 'bin').toLowerCase()
  const flow = (doc as any).flow || 'internal'

  await supabase.from('documents').update({ status: 'pending', chunk_count: 0 }).eq('id', doc.id)

  const { data: fileData, error: dlError } = await supabase.storage.from('documents').download(doc.file_path)
  if (dlError || !fileData) throw new Error('Không tải được file: ' + dlError?.message)

  const file = new File([fileData], doc.file_name, { type: fileData.type })
  let chunks: string[]
  if (ext === 'xlsx' || ext === 'xls') {
    chunks = await extractXlsxChunks(file)
  } else {
    const text = await extractTextClientSide(file, ext)
    chunks = chunkText(text)
  }

  if (chunks.length === 0) throw new Error('Không extract được text từ file này')

  supabase.functions.invoke('embed-document', {
    body: { document_id: doc.id, chunks, flow },
  }).then(({ error }) => {
    if (error) console.error('[retry] embed-document error:', error)
  })
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

    const docId = crypto.randomUUID()
    const path = `documents/${Date.now()}_${safeName}.${ext}`

    // Phase 1: upload to storage (spinner shows during this)
    console.log('[upload] 1. uploading to storage...')
    const { error: storageError } = await supabase.storage.from('documents').upload(path, file)
    if (storageError) { console.error('[upload] storage error:', storageError); return storageError }

    console.log('[upload] 2. inserting to db...')
    const { error: dbError } = await supabase.from('documents').insert({
      id: docId,
      title: file.name.replace(/\.\w+$/, ''),
      file_name: file.name,
      file_path: path,
      file_type: ext,
      flow,
      status: 'pending',
    })
    if (dbError) { console.error('[upload] db error:', dbError); return dbError }

    console.log('[upload] 3. done — spinner stops here. embed runs in background.')
    await fetch()

    // Phase 2: parse + embed runs fully in background
    setTimeout(async () => {
      try {
        let chunks: string[]
        if (ext === 'xlsx' || ext === 'xls') {
          console.log('[embed-bg] extracting xlsx rows...')
          chunks = await extractXlsxChunks(file)
        } else {
          console.log('[embed-bg] extracting text...')
          const text = await extractTextClientSide(file, ext)
          console.log('[embed-bg] text length:', text.length)
          chunks = chunkText(text)
        }
        console.log('[embed-bg] chunks:', chunks.length, '— calling edge function...')
        const { error } = await supabase.functions.invoke('embed-document', {
          body: { document_id: docId, chunks, flow },
        })
        console.log('[embed-bg] done. error:', error)
      } catch (e) {
        console.error('[embed-bg] error:', e)
      }
    }, 100)

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
