import { useState } from 'react'
import { useFaqItems } from '../../hooks/useAdmin'
import type { FaqItem } from '../../lib/supabase'

interface FaqFormData {
  category_id: string
  question_vi: string
  question_jp: string
  question_en: string
  question_np: string
  answer_vi: string
  answer_jp: string
  answer_en: string
  answer_np: string
}

const EMPTY_FORM: FaqFormData = {
  category_id: '',
  question_vi: '', question_jp: '', question_en: '', question_np: '',
  answer_vi: '', answer_jp: '', answer_en: '', answer_np: '',
}

export function AdminFaqManager() {
  const { items, categories, loading, create, update, remove, toggle } = useFaqItems()
  const [showForm, setShowForm] = useState(false)
  const [editItem, setEditItem] = useState<FaqItem | null>(null)
  const [form, setForm] = useState<FaqFormData>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [filterCategory, setFilterCategory] = useState('')
  const [search, setSearch] = useState('')
  const [activeLang, setActiveLang] = useState<'vi' | 'jp' | 'en' | 'np'>('vi')

  const openCreate = () => {
    setEditItem(null)
    setForm(EMPTY_FORM)
    setShowForm(true)
  }

  const openEdit = (item: FaqItem) => {
    setEditItem(item)
    setForm({
      category_id: item.category_id,
      question_vi: item.question_vi,
      question_jp: item.question_jp || '',
      question_en: item.question_en || '',
      question_np: item.question_np || '',
      answer_vi: item.answer_vi,
      answer_jp: item.answer_jp || '',
      answer_en: item.answer_en || '',
      answer_np: item.answer_np || '',
    })
    setShowForm(true)
  }

  const handleSave = async () => {
    if (!form.question_vi || !form.answer_vi || !form.category_id) {
      alert('Vui lòng điền câu hỏi và câu trả lời tiếng Việt')
      return
    }
    setSaving(true)
    if (editItem) {
      await update(editItem.id, form)
    } else {
      await create({ ...form, is_active: true })
    }
    setSaving(false)
    setShowForm(false)
  }

  const handleDelete = async (item: FaqItem) => {
    if (confirm(`Xóa FAQ: "${item.question_vi}"?`)) {
      await remove(item.id)
    }
  }

  const filtered = items.filter(item => {
    const matchCat = !filterCategory || item.category_id === filterCategory
    const matchSearch = !search || item.question_vi.toLowerCase().includes(search.toLowerCase())
    return matchCat && matchSearch
  })

  const LANGS = ['vi', 'jp', 'en', 'np'] as const
  const LANG_LABELS = { vi: 'VI', jp: 'JP', en: 'EN', np: 'NP' }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Quản lý FAQ</h2>
        <button onClick={openCreate} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
          + Thêm FAQ
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-4">
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Tìm kiếm FAQ..."
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm flex-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <select
          value={filterCategory}
          onChange={e => setFilterCategory(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Tất cả danh mục</option>
          {categories.map(cat => (
            <option key={cat.id} value={cat.id}>{cat.name_vi} / {cat.name_jp}</option>
          ))}
        </select>
      </div>

      {/* FAQ List */}
      {loading ? (
        <div className="text-center py-12 text-gray-400">Đang tải...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-gray-400">Chưa có FAQ nào</div>
      ) : (
        <div className="space-y-2">
          {filtered.map(item => (
            <div key={item.id} className="bg-white border border-gray-200 rounded-xl p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">
                      {item.faq_categories?.name_vi || '—'}
                      {item.faq_categories?.name_jp && (
                        <span className="text-blue-400 ml-1">/ {item.faq_categories.name_jp}</span>
                      )}
                    </span>
                    {!item.is_active && (
                      <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">Tắt</span>
                    )}
                  </div>
                  <p className="text-sm font-medium text-gray-900 truncate">{item.question_vi}</p>
                  <p className="text-sm text-gray-500 truncate mt-0.5">{item.answer_vi}</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => toggle(item.id, !item.is_active)}
                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${item.is_active ? 'bg-blue-600' : 'bg-gray-200'}`}
                  >
                    <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${item.is_active ? 'translate-x-5' : 'translate-x-1'}`} />
                  </button>
                  <button onClick={() => openEdit(item)} className="text-sm text-blue-600 hover:text-blue-800">Sửa</button>
                  <button onClick={() => handleDelete(item)} className="text-sm text-red-500 hover:text-red-700">Xóa</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Form */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold">{editItem ? 'Sửa FAQ' : 'Thêm FAQ mới'}</h3>
                <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600">✕</button>
              </div>

              {/* Category */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Danh mục *</label>
                <select
                  value={form.category_id}
                  onChange={e => setForm(f => ({ ...f, category_id: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Chọn danh mục</option>
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>
                      {cat.icon} {cat.name_vi} / {cat.name_jp}
                    </option>
                  ))}
                </select>
              </div>

              {/* Language tabs */}
              <div className="flex gap-1 mb-4">
                {LANGS.map(lang => (
                  <button
                    key={lang}
                    onClick={() => setActiveLang(lang)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium ${activeLang === lang ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                  >
                    {LANG_LABELS[lang]}
                  </button>
                ))}
              </div>

              {/* Q&A fields */}
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Câu hỏi ({LANG_LABELS[activeLang]}){activeLang === 'vi' && ' *'}
                  </label>
                  <input
                    value={form[`question_${activeLang}` as keyof FaqFormData]}
                    onChange={e => setForm(f => ({ ...f, [`question_${activeLang}`]: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder={`Nhập câu hỏi bằng ${LANG_LABELS[activeLang]}...`}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Câu trả lời ({LANG_LABELS[activeLang]}){activeLang === 'vi' && ' *'}
                  </label>
                  <textarea
                    value={form[`answer_${activeLang}` as keyof FaqFormData]}
                    onChange={e => setForm(f => ({ ...f, [`answer_${activeLang}`]: e.target.value }))}
                    rows={5}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder={`Nhập câu trả lời bằng ${LANG_LABELS[activeLang]}...`}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50">
                  Hủy
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-400"
                >
                  {saving ? 'Đang lưu...' : 'Lưu'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
