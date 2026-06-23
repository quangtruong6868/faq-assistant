import { ChatWidget } from '../components/widget/ChatWidget'

export function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex flex-col items-center justify-center p-8 text-center">
      {/* Company logo placeholder */}
      <div className="w-20 h-20 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
        <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      </div>

      <h1 className="text-3xl font-bold text-gray-900 mb-3">
        Hệ thống thông tin nội bộ
      </h1>
      <p className="text-gray-500 max-w-md mb-2">
        Tra cứu quy định công ty, chính sách nhân sự, và các thông tin thường gặp.
      </p>
      <p className="text-sm text-gray-400">
        Nhấn vào nút <strong>🤖</strong> ở góc dưới phải để bắt đầu
      </p>

      {/* Demo info cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-12 max-w-2xl w-full">
        {[
          { icon: '⏰', label: 'Chấm công' },
          { icon: '🏖️', label: 'Nghỉ phép' },
          { icon: '💰', label: 'Lương' },
          { icon: '📋', label: 'Visa' },
        ].map(item => (
          <div key={item.label} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex flex-col items-center gap-2">
            <span className="text-2xl">{item.icon}</span>
            <span className="text-sm text-gray-600 font-medium">{item.label}</span>
          </div>
        ))}
      </div>

      {/* Widget */}
      <ChatWidget />
    </div>
  )
}
