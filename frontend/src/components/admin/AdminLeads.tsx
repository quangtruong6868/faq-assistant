import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

type LeadStatus = 'new' | 'contacted' | 'in_progress' | 'closed' | 'rejected'
type LeadTab = 'company' | 'candidate'

const STATUS_COLORS: Record<LeadStatus, string> = {
  new: 'bg-blue-100 text-blue-700',
  contacted: 'bg-yellow-100 text-yellow-700',
  in_progress: 'bg-purple-100 text-purple-700',
  closed: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
}

const STATUS_LABELS: Record<LeadStatus, string> = {
  new: '新規',
  contacted: '連絡済',
  in_progress: '対応中',
  closed: '完了',
  rejected: '不採用',
}

interface CompanyLeadRow {
  id: string
  company_name?: string
  contact_name?: string
  phone?: string
  email?: string
  location?: string
  job_type?: string
  headcount?: string
  desired_timing?: string
  inquiry_type?: string
  inquiry_content?: string
  language?: string
  status: LeadStatus
  notes?: string
  created_at: string
  site_key?: string
}

interface CandidateLeadRow {
  id: string
  full_name?: string
  nationality?: string
  current_visa?: string
  current_prefecture?: string
  japanese_level?: string
  job_type?: string
  phone?: string
  line_id?: string
  email?: string
  language?: string
  status: LeadStatus
  notes?: string
  created_at: string
  site_key?: string
}

function StatusBadge({ status }: { status: LeadStatus }) {
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[status]}`}>
      {STATUS_LABELS[status]}
    </span>
  )
}

function StatusSelect({ id, table, current, onUpdate }: {
  id: string
  table: string
  current: LeadStatus
  onUpdate: (status: LeadStatus) => void
}) {
  const [updating, setUpdating] = useState(false)

  const handleChange = async (newStatus: LeadStatus) => {
    setUpdating(true)
    await supabase.from(table).update({ status: newStatus }).eq('id', id)
    onUpdate(newStatus)
    setUpdating(false)
  }

  return (
    <select
      value={current}
      onChange={e => handleChange(e.target.value as LeadStatus)}
      disabled={updating}
      className="text-xs border border-gray-200 rounded-lg px-2 py-1 bg-white focus:outline-none focus:ring-1 focus:ring-red-400"
    >
      {Object.entries(STATUS_LABELS).map(([val, label]) => (
        <option key={val} value={val}>{label}</option>
      ))}
    </select>
  )
}

export function AdminLeads() {
  const [tab, setTab] = useState<LeadTab>('company')
  const [companyLeads, setCompanyLeads] = useState<CompanyLeadRow[]>([])
  const [candidateLeads, setCandidateLeads] = useState<CandidateLeadRow[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<LeadStatus | 'all'>('all')
  const [expanded, setExpanded] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    Promise.all([
      supabase.from('company_leads').select('*').order('created_at', { ascending: false }),
      supabase.from('candidate_leads').select('*').order('created_at', { ascending: false }),
    ]).then(([c, ca]) => {
      setCompanyLeads((c.data || []) as CompanyLeadRow[])
      setCandidateLeads((ca.data || []) as CandidateLeadRow[])
      setLoading(false)
    })
  }, [])

  const updateCompanyStatus = (id: string, status: LeadStatus) =>
    setCompanyLeads(prev => prev.map(l => l.id === id ? { ...l, status } : l))

  const updateCandidateStatus = (id: string, status: LeadStatus) =>
    setCandidateLeads(prev => prev.map(l => l.id === id ? { ...l, status } : l))

  const filteredCompany = filter === 'all' ? companyLeads : companyLeads.filter(l => l.status === filter)
  const filteredCandidate = filter === 'all' ? candidateLeads : candidateLeads.filter(l => l.status === filter)

  const newCount = (tab === 'company' ? filteredCompany : filteredCandidate).filter(l => l.status === 'new').length

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Leads管理</h2>
          <p className="text-sm text-gray-400 mt-0.5">法人・求職者からの問い合わせ</p>
        </div>
        {newCount > 0 && (
          <span className="bg-red-100 text-red-700 text-sm px-3 py-1 rounded-full font-medium">
            新規 {newCount}件
          </span>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200 pb-0">
        {([
          { id: 'company', label: '🏢 法人', count: companyLeads.filter(l => l.status === 'new').length },
          { id: 'candidate', label: '👤 求職者', count: candidateLeads.filter(l => l.status === 'new').length },
        ] as const).map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === t.id ? 'border-red-600 text-red-700' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}>
            {t.label}
            {t.count > 0 && (
              <span className="ml-1.5 bg-red-600 text-white text-xs rounded-full px-1.5 py-0.5">{t.count}</span>
            )}
          </button>
        ))}
      </div>

      {/* Filter */}
      <div className="flex gap-1.5 flex-wrap">
        {(['all', 'new', 'contacted', 'in_progress', 'closed', 'rejected'] as const).map(s => (
          <button key={s} onClick={() => setFilter(s)}
            className={`text-xs px-3 py-1.5 rounded-full border transition-all ${
              filter === s ? 'bg-red-600 text-white border-red-600' : 'bg-white text-gray-600 border-gray-200 hover:border-red-300'
            }`}>
            {s === 'all' ? '全て' : STATUS_LABELS[s]}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400">読み込み中...</div>
      ) : (
        <>
          {/* Company Leads */}
          {tab === 'company' && (
            <div className="space-y-2">
              {filteredCompany.length === 0 ? (
                <p className="text-sm text-gray-400 py-8 text-center">データなし</p>
              ) : filteredCompany.map(lead => (
                <div key={lead.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                  <div className="flex items-center gap-3 px-4 py-3 cursor-pointer"
                    onClick={() => setExpanded(expanded === lead.id ? null : lead.id)}>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm text-gray-900">{lead.company_name || '-'}</span>
                        <StatusBadge status={lead.status} />
                        {lead.site_key && (
                          <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{lead.site_key}</span>
                        )}
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {lead.contact_name} · {lead.phone} · {new Date(lead.created_at).toLocaleDateString('ja-JP')}
                      </p>
                    </div>
                    <svg className={`w-4 h-4 text-gray-300 transition-transform ${expanded === lead.id ? 'rotate-180' : ''}`}
                      fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>

                  {expanded === lead.id && (
                    <div className="border-t border-gray-100 px-4 py-3 bg-gray-50 space-y-3">
                      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
                        {[
                          ['場所', lead.location],
                          ['職種', lead.job_type],
                          ['人数', lead.headcount],
                          ['時期', lead.desired_timing],
                          ['相談種別', lead.inquiry_type],
                          ['メール', lead.email],
                        ].map(([k, v]) => v ? (
                          <div key={k}>
                            <span className="text-xs text-gray-400">{k}: </span>
                            <span className="text-gray-700">{v}</span>
                          </div>
                        ) : null)}
                      </div>
                      {lead.inquiry_content && (
                        <div className="text-sm bg-white border border-gray-100 rounded-lg p-3">
                          <p className="text-xs text-gray-400 mb-1">相談内容:</p>
                          <p className="text-gray-700">{lead.inquiry_content}</p>
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500">ステータス変更:</span>
                        <StatusSelect id={lead.id} table="company_leads" current={lead.status}
                          onUpdate={s => updateCompanyStatus(lead.id, s)} />
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Candidate Leads */}
          {tab === 'candidate' && (
            <div className="space-y-2">
              {filteredCandidate.length === 0 ? (
                <p className="text-sm text-gray-400 py-8 text-center">データなし</p>
              ) : filteredCandidate.map(lead => (
                <div key={lead.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                  <div className="flex items-center gap-3 px-4 py-3 cursor-pointer"
                    onClick={() => setExpanded(expanded === lead.id ? null : lead.id)}>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm text-gray-900">{lead.full_name || '-'}</span>
                        <StatusBadge status={lead.status} />
                        {lead.nationality && (
                          <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">{lead.nationality}</span>
                        )}
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {lead.current_visa} · {lead.japanese_level} · {lead.phone} · {new Date(lead.created_at).toLocaleDateString('ja-JP')}
                      </p>
                    </div>
                    <svg className={`w-4 h-4 text-gray-300 transition-transform ${expanded === lead.id ? 'rotate-180' : ''}`}
                      fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>

                  {expanded === lead.id && (
                    <div className="border-t border-gray-100 px-4 py-3 bg-gray-50 space-y-3">
                      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
                        {[
                          ['在住', lead.current_prefecture],
                          ['希望職種', lead.job_type],
                          ['LINE', lead.line_id],
                          ['メール', lead.email],
                        ].map(([k, v]) => v ? (
                          <div key={k}>
                            <span className="text-xs text-gray-400">{k}: </span>
                            <span className="text-gray-700">{v}</span>
                          </div>
                        ) : null)}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500">ステータス変更:</span>
                        <StatusSelect id={lead.id} table="candidate_leads" current={lead.status}
                          onUpdate={s => updateCandidateStatus(lead.id, s)} />
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
