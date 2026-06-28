import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import type { Language } from './supabase'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const LANGUAGE_LABELS: Record<Language, string> = {
  vi: '🇻🇳 VI',
  jp: '🇯🇵 JP',
}

export const LANGUAGE_FULL_LABELS: Record<Language, string> = {
  vi: '🇻🇳 Tiếng Việt',
  jp: '🇯🇵 日本語',
}

// Tự động detect ngôn ngữ từ trình duyệt
export function detectBrowserLanguage(): Language {
  const lang = navigator.language?.toLowerCase() || ''
  if (lang.startsWith('ja')) return 'jp'
  return 'vi' // default
}

export const NO_INFO_MESSAGE: Record<Language, string> = {
  vi: 'Hệ thống đang được nâng cấp. Vui lòng để lại thông tin để được hỗ trợ.',
  jp: 'システムはアップグレード中です。以下から情報をお残しください。',
}

export const PRIVATE_INFO_TOPICS = [
  'lương cá nhân', 'hợp đồng cá nhân', 'visa cá nhân', 'thông tin cá nhân',
  '個人の給与', '個人の契約', '個人のビザ',
]

export const PRIVATE_INFO_RESPONSE: Record<Language, string> = {
  vi: 'Vui lòng liên hệ người phụ trách để được hỗ trợ về thông tin cá nhân.',
  jp: '個人情報については、担当者にお問い合わせください。',
}

export function isPrivateInfoQuery(question: string): boolean {
  const q = question.toLowerCase()
  return PRIVATE_INFO_TOPICS.some(topic => q.includes(topic.toLowerCase()))
}
