import { useEffect, useRef, useState } from 'react'
import * as XLSX from 'xlsx'
import { useUnansweredAdmin } from '../../hooks/useUnanswered'
import type { UnansweredQuestion } from '../../hooks/useUnanswered'

type Status = UnansweredQuestion['status']

const STATUS_COLORS: Record<Status, string> = {
  pending:     'bg-yellow-100 text-yellow-700',
  in_review:   'bg-blue-100 text-blue-700',
  answered:    'bg-green-100 text-green-700',
  added_to_kb: 'bg-purple-100 text-purple-700',
}
const STATUS_LABELS: Record<Status, string> = {
  pending:     '⏳ Chưa xử lý',
  in_review:   '🔍 Đang xem',
  answered:    '✅ Đã có câu trả lời',
  added_to_kb: '🤖 Bot đã học',
}
const SOURCE_LABELS: Record<string, string> = {
  no_match:    '❓ Bot không biết',
  wrong_answer:'👎 User phản hồi sai',
}
const FLOW_LABEL: Record<string, string> = {
  internal: '📋 Nội bộ', corporate: '🏢 Doanh nghiệp', candidate: '👤 Tìm việc',
  honsha: '🏢 Honsha', haken: '🏭 Haken',
}
const FLOW_COLOR: Record<string, string> = {
  internal: 'bg-gray-100 text-gray-600', corporate: 'bg-red-50 text-red-700',
  candidate: 'bg-blue-50 text-blue-700', honsha: 'bg-red-50 text-red-700',
  haken: 'bg-blue-50 text-blue-700',
}

export function AdminUnanswered() {
  const { items, loading, teaching, fetch, updateStatus, teachBot, bulkTeach } = useUnansweredAdmin()
  const [filter, setFilter]       = useState<Status | 'all'>('pending')
  const [expanded, setExpanded]   = useState<string | null>(null)
  const [draft, setDraft]         = useState<Record<string, { note: string; answer: string }>>({})
  const [toast, setToast]         = useState<string | null>(null)
  const [importing, setImporting] = useState(false)
  const importRef                 = useRef<HTMLInputElement>(null)

  useEffect(() => { fetch() }, [fetch])

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  const getDraft = (item: UnansweredQuestion) =>
    draft[item.id] ?? { note: item.admin_note ?? '', answer: item.admin_answer ?? '' }

  const setDraftField = (id: string, field: 'note' | 'answer', val: string) =>
    setDraft(prev => ({ ...prev, [id]: { ...getDraft({ id } as any), ...prev[id], [field]: val } }))

  const handleSave = async (item: UnansweredQuestion, status: Status) => {
    const d = getDraft(item)
    await updateStatus(item.id, status, d.note, d.answer)
    showToast('Đã lưu')
  }

  const handleTeach = async (item: UnansweredQuestion) => {
    const d = getDraft(item)
    if (!d.answer.trim()) { showToast('⚠️ Hãy nhập câu trả lời trước'); return }
    // Save answer first, then teach
    await updateStatus(item.id, 'answered', d.note, d.answer)
    const result = await teachBot(item.id)
    showToast(result.ok ? `🤖 ${result.message}` : `❌ ${result.message}`)
  }

  // ── Export: tải Excel danh sách câu hỏi chưa xử lý ──
  const handleExport = () => {
    const rows = items
      .filter(i => i.status !== 'added_to_kb')
      .map(i => ({
        id:           i.id,
        câu_hỏi:     i.question,
        luồng:       i.flow,
        ngôn_ngữ:    i.language,
        số_lần_hỏi:  i.ask_count ?? 1,
        bot_đã_nói:  i.bot_answer ?? '',
        câu_trả_lời: i.admin_answer ?? '',   // admin điền vào cột này
        ghi_chú:     i.admin_note ?? '',
      }))
    if (rows.length === 0) { showToast('Không có câu hỏi nào cần xử lý'); return }
    const ws = XLSX.utils.json_to_sheet(rows)
    // Column widths
    ws['!cols'] = [
      { wch: 36 }, // id
      { wch: 60 }, // câu hỏi
      { wch: 12 }, // luồng
      { wch: 10 }, // ngôn ngữ
      { wch: 12 }, // số lần
      { wch: 60 }, // bot đã nói
      { wch: 70 }, // câu trả lời ← admin điền
      { wch: 40 }, // ghi chú
    ]
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Câu hỏi chờ')
    const date = new Date().toISOString().slice(0, 10)
    XLSX.writeFile(wb, `unanswered_${date}.xlsx`)
    showToast(`✅ Đã xuất ${rows.length} câu hỏi`)
  }

  // ── Import: đọc file Excel đã điền câu trả lời ──
  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    setImporting(true)
    try {
      const buf   = await file.arrayBuffer()
      const wb    = XLSX.read(buf)
      const ws    = wb.Sheets[wb.SheetNames[0]]
      const rows  = XLSX.utils.sheet_to_json<Record<string, string>>(ws)
      const toTeach = rows
        .filter(r => r['id'] && r['câu_trả_lời']?.trim())
        .map(r => ({ id: String(r['id']), admin_answer: String(r['câu_trả_lời']).trim() }))
      if (toTeach.length === 0) {
        showToast('⚠️ Không tìm thấy hàng nào có câu trả lời')
        return
      }
      showToast(`⏳ Đang dạy bot ${toTeach.length} câu hỏi...`)
      const { ok, fail } = await bulkTeach(toTeach)
      showToast(`🤖 Dạy xong: ${ok} thành công${fail > 0 ? `, ${fail} lỗi` : ''}`)
      fetch()
    } catch {
      showToast('❌ Lỗi đọc file — hãy dùng đúng file vừa xuất')
    } finally {
      setImporting(false)
    }
  }

  const filtered  = filter === 'all' ? items : items.filter(i => i.status === filter)
  const counts    = {
    pending: items.filter(i => i.status === 'pending').length,
    wrong:   items.filter(i => i.source_type === 'wrong_answer').length,
  }

  return (
    <div className="p-6 space-y-5 relative">
      {/* Toast */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 bg-gray-900 text-white text-sm px-4 py-2 rounded-xl shadow-lg">
          {toast}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Câu hỏi chưa có câu trả lời</h2>
          <p className="text-sm text-gray-400 mt-0.5">
            Xác nhận câu trả lời → nhấn <strong>"Dạy bot"</strong> → bot tự học và trả lời lần sau
          </p>
        </div>
        <div className="flex items-center gap-2">
          {counts.pending > 0 && (
            <span className="bg-yellow-100 text-yellow-700 text-sm px-3 py-1 rounded-full font-medium">
              {counts.pending} chờ xử lý
            </span>
          )}
          {counts.wrong > 0 && (
            <span className="bg-red-100 text-red-600 text-sm px-3 py-1 rounded-full font-medium">
              {counts.wrong} phản hồi sai
            </span>
          )}
          <button onClick={fetch}
            className="text-xs text-gray-400 hover:text-gray-600 border border-gray-200 px-3 py-1.5 rounded-lg">
            ↻ Làm mới
          </button>
          <button onClick={handleExport}
            className="text-xs text-white bg-blue-600 hover:bg-blue-700 px-3 py-1.5 rounded-lg font-medium flex items-center gap-1">
            ⬇ Xuất Excel
          </button>
          <label className={`text-xs px-3 py-1.5 rounded-lg font-medium cursor-pointer flex items-center gap-1 ${
            importing ? 'bg-gray-200 text-gray-400' : 'bg-green-600 hover:bg-green-700 text-white'
          }`}>
            {importing ? '⏳ Đang xử lý...' : '⬆ Import câu trả lời'}
            <input ref={importRef} type="file" accept=".xlsx,.xls" className="hidden"
              onChange={handleImport} disabled={importing} />
          </label>
        </div>
      </div>

      {/* Info banner */}
      <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 text-sm text-blue-700 flex gap-2">
        <span className="text-lg leading-none">💡</span>
        <div>
          <strong>Cách làm giàu dữ liệu cho bot:</strong> Câu hỏi bot không biết được tự động lưu tại đây.
          Nhập câu trả lời đúng → nhấn <strong>Dạy bot</strong> → bot học ngay lập tức, lần sau sẽ tự trả lời mà không cần research.
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-1.5 flex-wrap">
        {(['all', 'pending', 'in_review', 'answered', 'added_to_kb'] as const).map(s => (
          <button key={s} onClick={() => setFilter(s)}
            className={`text-xs px-3 py-1.5 rounded-full border transition-all ${
              filter === s
                ? 'bg-gray-800 text-white border-gray-800'
                : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
            }`}>
            {s === 'all' ? 'Tất cả' : STATUS_LABELS[s]}
            <span className="ml-1 opacity-60">
              ({s === 'all' ? items.length : items.filter(i => i.status === s).length})
            </span>
          </button>
        ))}
      </div>

      {/* List */}
      {loading ? (
        <div className="text-center py-12 text-gray-400">Đang tải...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-gray-400">Không có câu hỏi nào</div>
      ) : (
        <div className="space-y-2">
          {filtered.map(item => {
            const d = getDraft(item)
            const isExpanded = expanded === item.id
            const isTaught = item.status === 'added_to_kb'
            return (
              <div key={item.id}
                className={`bg-white border rounded-xl overflow-hidden transition-all ${
                  isTaught ? 'border-purple-200' : 'border-gray-200'
                }`}>

                {/* Row header */}
                <div className="flex items-start gap-3 px-4 py-3 cursor-pointer"
                  onClick={() => setExpanded(isExpanded ? null : item.id)}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[item.status]}`}>
                        {STATUS_LABELS[item.status]}
                      </span>
                      {item.source_type && SOURCE_LABELS[item.source_type] && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-red-50 text-red-500">
                          {SOURCE_LABELS[item.source_type]}
                        </span>
                      )}
                      <span className={`text-xs px-2 py-0.5 rounded-full ${FLOW_COLOR[item.flow] || 'bg-gray-100 text-gray-500'}`}>
                        {FLOW_LABEL[item.flow] || item.flow}
                      </span>
                      {(item.ask_count ?? 1) > 1 && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-orange-50 text-orange-600 font-medium">
                          🔥 Hỏi {item.ask_count} lần
                        </span>
                      )}
                      <span className="text-xs text-gray-400">
                        {new Date(item.created_at).toLocaleDateString('vi-VN', {
                          day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
                        })}
                      </span>
                    </div>
                    <p className="text-sm text-gray-800 font-medium leading-snug">"{item.question}"</p>
                    {item.bot_answer && item.source_type === 'no_match' && (
                      <p className="text-xs text-gray-400 mt-0.5 italic">Bot: {item.bot_answer.slice(0, 80)}...</p>
                    )}
                  </div>
                  <svg className={`w-4 h-4 text-gray-300 flex-shrink-0 mt-1 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                    fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>

                {/* Expanded */}
                {isExpanded && (
                  <div className="border-t border-gray-100 px-4 py-4 bg-gray-50 space-y-4">

                    {/* Bot's original answer (if wrong_answer feedback) */}
                    {item.bot_answer && item.source_type === 'wrong_answer' && (
                      <div className="bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                        <p className="text-xs font-medium text-red-600 mb-1">❌ Bot đã trả lời sai:</p>
                        <p className="text-sm text-gray-700">{item.bot_answer}</p>
                      </div>
                    )}

                    {/* Contact info */}
                    {(item.contact_name || item.phone) && (
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        {[
                          ['Người hỏi', item.contact_name],
                          ['Điện thoại', item.phone],
                          ['Email', item.email],
                          ['Facebook', item.facebook],
                          ['LINE', item.line_id],
                          ['Nhà máy', item.factory_name],
                          ['Ngôn ngữ', item.language?.toUpperCase()],
                        ].filter(([, v]) => v).map(([k, v]) => (
                          <div key={String(k)}>
                            <span className="text-xs text-gray-400">{k}: </span>
                            <span className="text-gray-700">{v}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* ★ Admin answer — this is what the bot will learn */}
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">
                        ✏️ Câu trả lời xác nhận <span className="text-red-500">*</span>
                        <span className="font-normal text-gray-400 ml-1">(bot sẽ học câu này)</span>
                      </label>
                      <textarea
                        value={d.answer}
                        onChange={e => setDraftField(item.id, 'answer', e.target.value)}
                        rows={4}
                        placeholder="Nhập câu trả lời chính xác đã được xác nhận..."
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white resize-none"
                      />
                    </div>

                    {/* Admin note (optional) */}
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">📝 Ghi chú nội bộ (không dạy bot)</label>
                      <textarea
                        value={d.note}
                        onChange={e => setDraftField(item.id, 'note', e.target.value)}
                        rows={2}
                        placeholder="Ghi chú bộ phận phụ trách, nguồn xác nhận..."
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-gray-300 bg-white resize-none"
                      />
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 flex-wrap items-center">
                      {/* ★ Main CTA: Teach bot */}
                      {!isTaught && (
                        <button
                          onClick={() => handleTeach(item)}
                          disabled={teaching === item.id || !d.answer.trim()}
                          className="flex items-center gap-1.5 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-300 text-white text-sm font-medium px-4 py-2 rounded-lg transition-all">
                          {teaching === item.id
                            ? <span className="animate-spin">⏳</span>
                            : '🤖'}
                          {teaching === item.id ? 'Đang dạy...' : 'Dạy bot ngay'}
                        </button>
                      )}

                      {isTaught && (
                        <span className="flex items-center gap-1.5 bg-purple-50 text-purple-700 border border-purple-200 text-sm px-4 py-2 rounded-lg">
                          ✓ Bot đã học câu hỏi này
                        </span>
                      )}

                      {/* Status shortcuts */}
                      {!isTaught && (
                        <>
                          <button onClick={() => handleSave(item, 'in_review')}
                            disabled={item.status === 'in_review'}
                            className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-gray-600 hover:border-blue-300 disabled:opacity-40">
                            🔍 Đang xem
                          </button>
                          <button onClick={() => handleSave(item, 'answered')}
                            className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-gray-600 hover:border-green-300 disabled:opacity-40">
                            ✅ Lưu không dạy bot
                          </button>
                        </>
                      )}
                    </div>

                    {/* Help text */}
                    {!isTaught && d.answer.trim() && (
                      <div className="bg-purple-50 border border-purple-100 rounded-lg px-3 py-2 text-xs text-purple-700">
                        🤖 Nhấn <strong>Dạy bot ngay</strong> để bot tự trả lời câu hỏi tương tự lần sau — không cần nạp lại tài liệu, không tốn thêm token research.
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
