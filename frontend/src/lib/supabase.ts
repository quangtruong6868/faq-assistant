import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type Language = 'vi' | 'jp' | 'en' | 'np'

export interface FaqCategory {
  id: string
  name_vi: string
  name_jp: string
  name_en: string
  name_np: string
  slug: string
  icon?: string
  sort_order: number
}

export interface FaqItem {
  id: string
  category_id: string
  question_vi: string
  question_jp?: string
  question_en?: string
  question_np?: string
  answer_vi: string
  answer_jp?: string
  answer_en?: string
  answer_np?: string
  is_active: boolean
  created_at: string
  updated_at: string
  faq_categories?: FaqCategory
}

export interface Document {
  id: string
  title: string
  file_name: string
  file_path: string
  file_type: string
  status: 'pending' | 'processing' | 'ready' | 'error'
  created_at: string
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  language: Language
  source?: string
  source_detail?: string
  timestamp: Date
}

// Helper: lấy tên category theo ngôn ngữ
export function getCategoryName(cat: FaqCategory, lang: Language): string {
  return cat[`name_${lang}` as keyof FaqCategory] as string || cat.name_vi
}
