import { useState } from 'react'
import { useAdmin, useDashboard } from '../hooks/useAdmin'
import { AdminFaqManager } from '../components/admin/AdminFaqManager'
import { AdminDocuments } from '../components/admin/AdminDocuments'

type Tab = 'dashboard' | 'faq' | 'documents'

const STAT_CARDS = [
  { key: 'totalFaq', label: 'Tổng FAQ', icon: '📋', color: 'bg-blue-50 text-blue-700' },
  { key: 'totalDocuments', label: 'Tài liệu', icon: '📄', color: 'bg-green-50 text-green-700' },
  { key: 'totalChats', label: 'Câu hỏi', icon: '💬', color: 'bg-purple-50 text-purple-700' },
]

export function AdminDashboard() {
  const { signOut } = useAdmin()
  const stats = useDashboard()
  const [tab, setTab] = useState<Tab>('dashboard')

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar + Main layout */}
      <div className="flex h-screen">
        {/* Sidebar */}
        <aside className="w-56 bg-white border-r border-gray-200 flex flex-col">
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white text-xs font-bold">FA</span>
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">FAQ Admin</p>
                <p className="text-xs text-gray-500">Dashboard</p>
              </div>
            </div>
          </div>

          <nav className="flex-1 p-3 space-y-1">
            {([
              { id: 'dashboard', label: 'Dashboard', icon: '📊' },
              { id: 'faq', label: 'Quản lý FAQ', icon: '📋' },
              { id: 'documents', label: 'Tài liệu', icon: '📄' },
            ] as { id: Tab; label: string; icon: string }[]).map(item => (
              <button
                key={item.id}
                onClick={() => setTab(item.id)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${
                  tab === item.id
                    ? 'bg-blue-50 text-blue-700 font-medium'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <span>{item.icon}</span>
                {item.label}
              </button>
            ))}
          </nav>

          <div className="p-3 border-t border-gray-200">
            <button
              onClick={() => signOut()}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Đăng xuất
            </button>
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto">
          {tab === 'dashboard' && (
            <div className="p-6 space-y-6">
              <h2 className="text-xl font-semibold text-gray-900">Dashboard</h2>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-4">
                {STAT_CARDS.map(card => (
                  <div key={card.key} className="bg-white rounded-xl border border-gray-200 p-5">
                    <div className={`inline-flex items-center justify-center w-10 h-10 rounded-lg ${card.color} text-xl mb-3`}>
                      {card.icon}
                    </div>
                    <p className="text-2xl font-bold text-gray-900">
                      {stats[card.key as keyof typeof stats] as number}
                    </p>
                    <p className="text-sm text-gray-500 mt-0.5">{card.label}</p>
                  </div>
                ))}
              </div>

              {/* Top questions */}
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <h3 className="font-semibold text-gray-900 mb-4">Top câu hỏi được hỏi nhiều nhất</h3>
                {stats.topQuestions.length === 0 ? (
                  <p className="text-sm text-gray-400">Chưa có dữ liệu</p>
                ) : (
                  <div className="space-y-2">
                    {stats.topQuestions.map((q, i) => (
                      <div key={i} className="flex items-center justify-between text-sm">
                        <span className="text-gray-700 truncate">{q.question}</span>
                        <span className="ml-4 text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full flex-shrink-0">
                          {q.count}x · {q.language.toUpperCase()}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Unanswered */}
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <h3 className="font-semibold text-gray-900 mb-1">Câu hỏi chưa có câu trả lời</h3>
                <p className="text-xs text-gray-400 mb-4">Cân nhắc tạo FAQ cho các câu hỏi này</p>
                {stats.unanswered.length === 0 ? (
                  <p className="text-sm text-gray-400">Không có câu hỏi nào bị bỏ qua</p>
                ) : (
                  <div className="space-y-2">
                    {stats.unanswered.map((q, i) => (
                      <div key={i} className="flex items-center justify-between text-sm">
                        <span className="text-gray-700 truncate">{q.question}</span>
                        <span className="ml-4 text-xs bg-orange-50 text-orange-600 px-2 py-0.5 rounded-full flex-shrink-0">
                          {q.language.toUpperCase()}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {tab === 'faq' && <AdminFaqManager />}
          {tab === 'documents' && <AdminDocuments />}
        </main>
      </div>
    </div>
  )
}
