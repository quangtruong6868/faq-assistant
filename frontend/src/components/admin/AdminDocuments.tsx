import { useState, useRef } from 'react'
import { useDocuments } from '../../hooks/useAdmin'
import type { Document } from '../../lib/supabase'

const STATUS_LABELS: Record<Document['status'], { label: string; color: string }> = {
  pending: { label: 'Chờ xử lý', color: 'bg-yellow-50 text-yellow-700' },
  processing: { label: 'Đang xử lý', color: 'bg-blue-50 text-blue-700' },
  ready: { label: 'Sẵn sàng', color: 'bg-green-50 text-green-700' },
  error: { label: 'Lỗi', color: 'bg-red-50 text-red-700' },
}

const FILE_ICONS: Record<string, string> = {
  pdf: '📕', docx: '📘', doc: '📘', xlsx: '📗', xls: '📗', txt: '📄',
}

export function AdminDocuments() {
  const { documents, loading, upload, remove } = useDocuments()
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    const error = await upload(file)
    if (error) alert('Upload thất bại: ' + error.message)
    setUploading(false)
    if (fileRef.current) fileRef.current.value = ''
  }

  const handleDelete = async (doc: Document) => {
    if (confirm(`Xóa tài liệu "${doc.title}"?`)) {
      await remove(doc)
    }
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Tài liệu quy định</h2>
          <p className="text-sm text-gray-500 mt-0.5">Upload PDF, Word, Excel, TXT để AI tìm kiếm</p>
        </div>
        <div>
          <input
            ref={fileRef}
            type="file"
            accept=".pdf,.docx,.doc,.xlsx,.xls,.txt"
            className="hidden"
            onChange={handleFileChange}
          />
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:bg-blue-400 transition-colors"
          >
            {uploading ? '⏳ Đang upload...' : '+ Upload tài liệu'}
          </button>
        </div>
      </div>

      {/* Upload zone */}
      <div
        className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center mb-6 hover:border-blue-300 transition-colors cursor-pointer"
        onClick={() => fileRef.current?.click()}
        onDragOver={e => e.preventDefault()}
        onDrop={async e => {
          e.preventDefault()
          const file = e.dataTransfer.files?.[0]
          if (file) {
            setUploading(true)
            await upload(file)
            setUploading(false)
          }
        }}
      >
        <div className="text-4xl mb-3">📁</div>
        <p className="text-sm text-gray-600 font-medium">Kéo thả file vào đây hoặc click để chọn</p>
        <p className="text-xs text-gray-400 mt-1">PDF, Word (.docx), Excel (.xlsx), TXT</p>
      </div>

      {/* Document list */}
      {loading ? (
        <div className="text-center py-8 text-gray-400">Đang tải...</div>
      ) : documents.length === 0 ? (
        <div className="text-center py-8 text-gray-400">Chưa có tài liệu nào</div>
      ) : (
        <div className="space-y-2">
          {documents.map(doc => {
            const ext = doc.file_type || 'txt'
            const status = STATUS_LABELS[doc.status]
            return (
              <div key={doc.id} className="bg-white border border-gray-200 rounded-xl p-4 flex items-center gap-4">
                <span className="text-2xl">{FILE_ICONS[ext] || '📄'}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{doc.title}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {doc.file_name} • {new Date(doc.created_at).toLocaleDateString('vi-VN')}
                  </p>
                </div>
                <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${status.color}`}>
                  {status.label}
                </span>
                <button
                  onClick={() => handleDelete(doc)}
                  className="text-sm text-red-500 hover:text-red-700 flex-shrink-0"
                >
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
