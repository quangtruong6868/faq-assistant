import { useState, useRef } from 'react'
import { useDocuments, reEmbedDocument } from '../../hooks/useAdmin'
import type { Document } from '../../lib/supabase'

type Flow = 'internal' | 'corporate' | 'candidate'

const FLOW_OPTIONS: { value: Flow; label: string; desc: string }[] = [
  { value: 'internal', label: '📋 Nội bộ', desc: 'Quy định, chính sách công ty cho nhân viên' },
  { value: 'corporate', label: '🏢 Doanh nghiệp', desc: 'Kiến thức tuyển dụng ngoại lao động, visa, quy trình' },
  { value: 'candidate', label: '👤 Người tìm việc', desc: 'Thông tin visa, lương, điều kiện làm việc tại Nhật' },
]

const STATUS_LABELS: Record<Document['status'], { label: string; color: string }> = {
  pending:    { label: 'Chờ xử lý', color: 'bg-yellow-50 text-yellow-700' },
  processing: { label: 'Đang xử lý', color: 'bg-blue-50 text-blue-700' },
  ready:      { label: 'Sẵn sàng', color: 'bg-green-50 text-green-700' },
  error:      { label: 'Lỗi', color: 'bg-red-50 text-red-700' },
}

const FILE_ICONS: Record<string, string> = {
  pdf: '📕', docx: '📘', doc: '📘', xlsx: '📗', xls: '📗', txt: '📄',
}

const FLOW_BADGE: Record<string, string> = {
  internal:  'bg-gray-100 text-gray-600',
  corporate: 'bg-red-50 text-red-700',
  candidate: 'bg-blue-50 text-blue-700',
}

const FLOW_LABEL: Record<string, string> = {
  internal: 'Nội bộ', corporate: 'Doanh nghiệp', candidate: 'Người tìm việc',
}

export function AdminDocuments() {
  const { documents, loading, upload, remove, refetch } = useDocuments()
  const [uploading, setUploading] = useState(false)
  const [selectedFlow, setSelectedFlow] = useState<Flow>('internal')
  const [filterFlow, setFilterFlow] = useState<Flow | 'all'>('all')
  const [retrying, setRetrying] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const handleRetry = async (doc: Document) => {
    setRetrying(doc.id)
    try {
      await reEmbedDocument(doc)
    } catch (e: any) {
      alert('Retry thất bại: ' + (e?.message || String(e)))
    } finally {
      await refetch()
      setRetrying(null)
    }
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    await doUpload(file)
    if (fileRef.current) fileRef.current.value = ''
  }

  const doUpload = async (file: File) => {
    setUploading(true)
    // Hard timeout: spinner always stops after 10s regardless
    const timer = setTimeout(() => setUploading(false), 10000)
    try {
      const error = await upload(file, selectedFlow)
      if (error) alert('Upload thất bại: ' + error.message)
    } catch (e: any) {
      alert('Upload thất bại: ' + (e?.message || String(e)))
    } finally {
      clearTimeout(timer)
      setUploading(false)
    }
  }

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files?.[0]
    if (file) await doUpload(file)
  }

  const handleDelete = async (doc: Document) => {
    if (confirm(`Xóa tài liệu "${doc.title}"?`)) await remove(doc)
  }

  const filtered = filterFlow === 'all' ? documents : documents.filter(d => (d as any).flow === filterFlow)

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Tài liệu knowledge base</h2>
          <p className="text-sm text-gray-500 mt-0.5">Upload PDF, Word, Excel → AI tự học và trả lời câu hỏi</p>
        </div>
        <button onClick={refetch} className="text-xs text-gray-400 hover:text-gray-600 border border-gray-200 px-3 py-1.5 rounded-lg transition-colors">
          ↻ Làm mới
        </button>
      </div>

      {/* Flow selector */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
        <p className="text-sm font-medium text-gray-700">1. Chọn luồng cho tài liệu này:</p>
        <div className="grid grid-cols-3 gap-2">
          {FLOW_OPTIONS.map(opt => (
            <button key={opt.value} onClick={() => setSelectedFlow(opt.value)}
              className={`text-left p-3 rounded-xl border-2 transition-all ${
                selectedFlow === opt.value
                  ? 'border-red-500 bg-red-50'
                  : 'border-gray-200 bg-white hover:border-gray-300'
              }`}>
              <p className="text-sm font-medium text-gray-800">{opt.label}</p>
              <p className="text-xs text-gray-400 mt-0.5 leading-snug">{opt.desc}</p>
            </button>
          ))}
        </div>

        {/* Upload zone */}
        <p className="text-sm font-medium text-gray-700 pt-1">2. Upload file:</p>
        <div
          className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${
            uploading ? 'border-blue-300 bg-blue-50' : 'border-gray-200 hover:border-red-300 hover:bg-red-50'
          }`}
          onClick={() => !uploading && fileRef.current?.click()}
          onDragOver={e => e.preventDefault()}
          onDrop={handleDrop}
        >
          <input ref={fileRef} type="file" accept=".pdf,.docx,.doc,.xlsx,.xls,.txt" className="hidden" onChange={handleFileChange} />
          {uploading ? (
            <div className="space-y-2">
              <div className="text-3xl animate-spin inline-block">⚙️</div>
              <p className="text-sm text-blue-600 font-medium">Đang upload và xử lý...</p>
              <p className="text-xs text-gray-400">Đang tạo vector embeddings, vui lòng chờ</p>
            </div>
          ) : (
            <div className="space-y-1">
              <div className="text-3xl">📁</div>
              <p className="text-sm text-gray-600 font-medium">Kéo thả file vào đây hoặc click để chọn</p>
              <p className="text-xs text-gray-400">PDF, Word (.docx), Excel (.xlsx), TXT — tối đa 50MB</p>
            </div>
          )}
        </div>
      </div>

      {/* Filter */}
      <div className="flex gap-2">
        {(['all', 'internal', 'corporate', 'candidate'] as const).map(f => (
          <button key={f} onClick={() => setFilterFlow(f)}
            className={`text-xs px-3 py-1.5 rounded-full border transition-all ${
              filterFlow === f ? 'bg-gray-800 text-white border-gray-800' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
            }`}>
            {f === 'all' ? 'Tất cả' : FLOW_LABEL[f]}
            <span className="ml-1 opacity-60">
              ({f === 'all' ? documents.length : documents.filter(d => (d as any).flow === f).length})
            </span>
          </button>
        ))}
      </div>

      {/* Document list */}
      {loading ? (
        <div className="text-center py-8 text-gray-400">Đang tải...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-8 text-gray-400">Chưa có tài liệu nào</div>
      ) : (
        <div className="space-y-2">
          {filtered.map(doc => {
            const ext = doc.file_type || 'txt'
            const status = STATUS_LABELS[doc.status]
            const flow = (doc as any).flow || 'internal'
            const chunkCount = (doc as any).chunk_count || 0
            return (
              <div key={doc.id} className="bg-white border border-gray-200 rounded-xl p-4 flex items-center gap-3">
                <span className="text-2xl flex-shrink-0">{FILE_ICONS[ext] || '📄'}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-medium text-gray-900 truncate">{doc.title}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${FLOW_BADGE[flow]}`}>
                      {FLOW_LABEL[flow]}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {doc.file_name}
                    {chunkCount > 0 && <span className="ml-2">· {chunkCount} đoạn</span>}
                    <span className="ml-2">· {new Date(doc.created_at).toLocaleDateString('vi-VN')}</span>
                  </p>
                </div>
                <span className={`text-xs px-2.5 py-1 rounded-full font-medium flex-shrink-0 ${status.color}`}>
                  {retrying === doc.id ? '⚙️ Đang xử lý...' : status.label}
                </span>
                {(doc.status === 'error' || doc.status === 'pending') && retrying !== doc.id && (
                  <button onClick={() => handleRetry(doc)}
                    className="text-xs text-blue-500 hover:text-blue-700 flex-shrink-0 border border-blue-200 px-2 py-1 rounded-lg transition-colors">
                    ↻ Retry
                  </button>
                )}
                <button onClick={() => handleDelete(doc)}
                  className="text-sm text-red-400 hover:text-red-600 flex-shrink-0 transition-colors">
                  Xóa
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
