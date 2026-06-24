import { useEffect } from 'react'
import { useWidget } from '../../hooks/useWidget'
import { WidgetButton } from './WidgetButton'
import { WidgetHeader } from './WidgetHeader'
import { FlowSelector } from './FlowSelector'
import { CorporateFlow } from './CorporateFlow'
import { CandidateFlow } from './CandidateFlow'
import { InternalSelector } from './InternalSelector'
import { HonshaFlow } from './HonshaFlow'
import { HakenFlow } from './HakenFlow'

interface Props {
  siteKey?: string
}

export function ChatWidget({ siteKey = 'th-group' }: Props) {
  const {
    isOpen, isMinimized, view, selectedDepartment, language,
    open, close, minimize, restore,
    selectFlow, selectInternalSubFlow, selectDepartment, goBack, setLanguage,
  } = useWidget(siteKey)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape' && isOpen) close() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [isOpen, close])

  const headerTitle = (() => {
    if (view === 'honsha_dept') return '📋 本社 FAQ'
    if (view === 'honsha_chat' && selectedDepartment) return `📋 ${selectedDepartment.jp}`
    if (view === 'haken_chat') return '📋 派遣 FAQ'
    if (view === 'internal_selector') return '📋 社内 FAQ'
    return 'TH-GROUP'
  })()

  const showBack = view !== 'selector'

  return (
    <>
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
        {isOpen && isMinimized && (
          <button onClick={restore}
            className="flex items-center gap-2.5 bg-red-600 hover:bg-red-700 text-white rounded-2xl shadow-lg px-4 py-2.5 transition-all">
            <span className="text-base select-none">🤖</span>
            <span className="text-sm font-medium">TH-GROUP</span>
            <svg className="w-4 h-4 text-red-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
            </svg>
          </button>
        )}
        {!isOpen && <WidgetButton onClick={open} language={language} />}
      </div>

      {isOpen && !isMinimized && (
        <>
          <div className="fixed inset-0 bg-black/30 z-40 sm:hidden" onClick={close} />

          <div className={`
            fixed z-50 flex flex-col bg-gray-50 shadow-2xl overflow-hidden
            bottom-0 left-0 right-0 h-[92dvh] rounded-t-2xl
            sm:bottom-6 sm:right-6 sm:left-auto sm:w-[380px] sm:h-[600px] sm:rounded-2xl
          `} style={{ maxHeight: '92dvh' }}>

            <WidgetHeader
              language={language}
              onLanguageChange={setLanguage}
              onMinimize={minimize}
              onClose={close}
              onBack={showBack ? goBack : undefined}
              showBack={showBack}
              title={headerTitle}
            />

            <div className="flex-1 overflow-hidden flex flex-col">
              {view === 'selector' && (
                <div className="flex-1 overflow-y-auto">
                  <FlowSelector language={language} onSelect={selectFlow} />
                </div>
              )}

              {view === 'corporate' && (
                <CorporateFlow language={language} siteKey={siteKey} />
              )}

              {view === 'candidate' && (
                <CandidateFlow language={language} siteKey={siteKey} />
              )}

              {view === 'internal_selector' && (
                <div className="flex-1 overflow-y-auto">
                  <InternalSelector language={language} onSelect={selectInternalSubFlow} />
                </div>
              )}

              {(view === 'honsha_dept' || view === 'honsha_chat') && (
                <HonshaFlow
                  selectedDepartment={view === 'honsha_chat' ? selectedDepartment : null}
                  onSelectDepartment={selectDepartment}
                />
              )}

              {view === 'haken_chat' && (
                <HakenFlow language={language} />
              )}
            </div>
          </div>
        </>
      )}
    </>
  )
}
