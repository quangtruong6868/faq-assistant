import { useEffect, useState } from 'react'
import { useUnansweredAdmin } from '../../hooks/useUnanswered'
import type { UnansweredQuestion } from '../../hooks/useUnanswered'

type Status = UnansweredQuestion['status']

const STATUS_COLORS: Record<Status, string> = {
  pending:    'bg-yellow-100 text-yellow-700',
  in_review:  'bg-blue-100 text-blue-700',
  answered:   'bg-green-100 text-green-700',
  added_to_kb:'bg-purple-100 text-purple-700',
}

const STATUS_LABELS: Record<Status, string> = {
  pending:    '⏳ Chưa xử lý',
  in_review:  '🔍 Đang xác nhận',
  answered:   '✅ Đã trả lời',
  added_to_kb:'📚 Đã thêm vào KB',
}

const FLOW_LABEL: Record<string, string> = {
  internal: '📋 Nội bộ', corporate: '🏢 Doanh nghiệp', candidate: '👤 Tìm việc',
}

const FLOW_COLOR: Record<string, string> = {
  internal: 'bg-gray-100 text-gray-600',
  corporate: 'bg-red-50 text-red-700',
  candidate: 'bg-blue-50 text-blue-700',
}

export function AdminUnanswered() {
  const { items, loading, fetch, updateStatus } = useUnansweredAdmin()
  const [filter, setFilter] = useState<Status | 'all'>('pending')
  const [expanded, setExpanded] = useState<string | null>(null)
  const [noteInput, setNoteInput] = useState<Record<string, string>>({})

  useEffect(() => { fetch() }, [fetch])

  const filtered = filter === 'all' ? items : items.filter(i => i.status === filter)

  const pendingCount = items.filter(i => i.status === 'pending').length

  const handleStatusChange = async (item: UnansweredQuestion, status: Status) => {
    await updateStatus(item.id, status, noteInput[item.id] ?? item.admin_note)
  }

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Câu hỏi chưa có câu trả lời</h2>
          <p className="text-sm text-gray-400 mt-0.5">Xác nhận với bộ phận liên quan → bổ sung vào knowledge base</p>
        </div>
        <div className="flex items-center gap-2">
          {pendingCount > 0 && (
            <span className="bg-yellow-100 text-yellow-700 text-sm px-3 py-1 rounded-full font-medium">
              {pendingCount} chưa xử lý
            </span>
          )}
          <button onClick={fetch} className="text-xs text-gray-400 hover:text-gray-600 border border-gray-200 px-3 py-1.5 rounded-lg">
            ↻ Làm mới
          </button>
        </div>
      </div>

      {/* Filter */}
      <div className="flex gap-1.5 flex-wrap">
        {(['all', 'pending', 'in_review', 'answered', 'added_to_kb'] as const).map(s => (
          <button key={s} onClick={() => setFilter(s)}
            className={`text-xs px-3 py-1.5 rounded-full border transition-all ${
              filter === s ? 'bg-gray-800 text-white border-gray-800' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
            }`}>
            {s === 'all' ? 'Tất cả' : STATUS_LABELS[s]}
            <span className="ml-1 opacity-60">
              ({s === 'all' ? items.length : items.filter(i => i.status === s).length})
            </span>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400">Đang tải...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-gray-400">Không có câu hỏi nào</div>
      ) : (
        <div className="space-y-2">
          {filtered.map(item => (
            <div key={item.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              {/* Header row */}
              <div className="flex items-start gap-3 px-4 py-3 cursor-pointer"
                onClick={() => setExpanded(expanded === item.id ? null : item.id)}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[item.status]}`}>
                      {STATUS_LABELS[item.status]}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${FLOW_COLOR[item.flow] || 'bg-gray-100 text-gray-500'}`}>
                      {FLOW_LABEL[item.flow] || item.flow}
                    </span>
                    <span className="text-xs text-gray-400">
                      {new Date(item.created_at).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-sm text-gray-800 font-medium leading-snug">"{item.question}"</p>
                  {item.contact_name && (
                    <p className="text-xs text-gray-400 mt-1">
                      👤 {item.contact_name}
                      {item.phone && <span className="ml-2">📞 {item.phone}</span>}
                    </p>
                  )}
                </div>
                <svg className={`w-4 h-4 text-gray-300 flex-shrink-0 mt-1 transition-transform ${expanded === item.id ? 'rotate-180' : ''}`}
                  fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>

              {/* Expanded detail */}
              {expanded === item.id && (
                <div className="border-t border-gray-100 px-4 py-4 bg-gray-50 space-y-4">
                  {/* Contact info */}
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    {[
                      ['Người hỏi', item.contact_name],
                      ['Điện thoại', item.phone],
                      ['Facebook', item.facebook],
                      ['LINE', item.line_id],
                      ['Email', item.email],
                      ['Ngôn ngữ', item.language?.toUpperCase()],
                    ].filter(([, v]) => v).map(([k, v]) => (
                      <div key={k}>
                        <span className="text-xs text-gray-400">{k}: </span>
                        <span className="text-gray-700">{v}</span>
                      </div>
                    ))}
                  </div>

                  {/* Admin note */}
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Ghi chú / Câu trả lời xác nhận:</label>
                    <textarea
                      value={noteInput[item.id] ?? item.admin_note ?? ''}
                      onChange={e => setNoteInput(prev => ({ ...prev, [item.id]: e.target.value }))}
                      rows={3}
                      placeholder="Ghi lại câu trả lời đã xác nhận hoặc bộ phận nào xử lý..."
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white resize-none"
                    />
                  </div>

                  {/* Action buttons */}
                  <div className="flex gap-2 flex-wrap">
                    {(['in_review', 'answered', 'added_to_kb'] as Status[]).map(s => (
                      <button key={s} onClick={() => handleStatusChange(item, s)}
                        disabled={item.status === s}
                        className={`text-xs px-3 py-1.5 rounded-lg border transition-all disabled:opacity-40 ${
                          item.status === s
                            ? 'bg-gray-100 text-gray-400 border-gray-200'
                            : 'bg-white text-gray-700 border-gray-300 hover:border-blue-400 hover:text-blue-600'
                        }`}>
                        {STATUS_LABELS[s]}
                      </button>
                    ))}
                  </div>

                  {/* Tip for adding to KB */}
                  {item.status === 'answered' && (
                    <div className="bg-blue-50 border border-blue-100 rounded-lg px-3 py-2 text-xs text-blue-700">
                      💡 Đã có câu trả lời? Thêm vào <strong>Tài liệu</strong> hoặc <strong>FAQ</strong> để bot tự trả lời lần sau, rồi đánh dấu <em>Đã thêm vào KB</em>.
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
