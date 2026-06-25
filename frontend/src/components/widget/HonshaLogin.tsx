import { useState } from 'react'
import type { Language } from '../../lib/supabase'
import { supabase } from '../../lib/supabase'

interface Props {
  language: Language
  onSuccess: () => void
}

const TITLE: Record<Language, string> = {
  jp: '本社スタッフ専用',
  vi: 'Dành cho nhân viên Honsha',
  en: 'Honsha Staff Only',
  np: 'Honsha कर्मचारीहरूको लागि',
}

const SUBTITLE: Record<Language, string> = {
  jp: 'アクセスコードを入力してください',
  vi: 'Nhập mã truy cập của bạn',
  en: 'Enter your access code',
  np: 'पहुँच कोड प्रविष्ट गर्नुहोस्',
}

const PLACEHOLDER: Record<Language, string> = {
  jp: 'アクセスコード',
  vi: 'Mã truy cập',
  en: 'Access code',
  np: 'पहुँच कोड',
}

const BTN: Record<Language, string> = {
  jp: '入力する',
  vi: 'Xác nhận',
  en: 'Confirm',
  np: 'पुष्टि गर्नुहोस्',
}

const ERR_WRONG: Record<Language, string> = {
  jp: 'コードが正しくありません。もう一度お試しください。',
  vi: 'Mã không đúng. Vui lòng thử lại.',
  en: 'Incorrect code. Please try again.',
  np: 'कोड गलत छ। फेरि प्रयास गर्नुहोस्।',
}

const ERR_NET: Record<Language, string> = {
  jp: '接続エラーが発生しました。もう一度お試しください。',
  vi: 'Lỗi kết nối. Vui lòng thử lại.',
  en: 'Connection error. Please try again.',
  np: 'जडान त्रुटि। फेरि प्रयास गर्नुहोस्।',
}

export function HonshaLogin({ language, onSuccess }: Props) {
  const [pin, setPin] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const lang = language

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!pin.trim() || loading) return
    setLoading(true)
    setError('')

    try {
      const { data, error: fnError } = await supabase.functions.invoke('verify-pin', {
        body: { pin: pin.trim() },
      })

      if (fnError) throw fnError

      if (data?.ok) {
        sessionStorage.setItem('honsha_verified', '1')
        onSuccess()
      } else {
        setError(ERR_WRONG[lang])
        setPin('')
      }
    } catch {
      setError(ERR_NET[lang])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 gap-6">
      {/* Logo */}
      <div className="w-16 h-16 rounded-2xl overflow-hidden bg-white border border-gray-100 shadow-sm">
        <img src="/th-logo.jpg" alt="TH" className="w-full h-full object-contain" />
      </div>

      {/* Title */}
      <div className="text-center space-y-1">
        <p className="text-sm font-bold text-gray-800">{TITLE[lang]}</p>
        <p className="text-xs text-gray-500">{SUBTITLE[lang]}</p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="w-full space-y-3">
        <input
          type="password"
          value={pin}
          onChange={e => setPin(e.target.value)}
          placeholder={PLACEHOLDER[lang]}
          autoFocus
          className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-center tracking-widest focus:outline-none focus:ring-2 focus:ring-red-400"
        />
        {error && <p className="text-xs text-red-500 text-center">{error}</p>}
        <button
          type="submit"
          disabled={!pin.trim() || loading}
          className="w-full bg-red-600 hover:bg-red-700 disabled:bg-gray-200 disabled:text-gray-400 text-white rounded-xl py-2.5 text-sm font-semibold transition-colors"
        >
          {loading ? '...' : BTN[lang]}
        </button>
      </form>
    </div>
  )
}
