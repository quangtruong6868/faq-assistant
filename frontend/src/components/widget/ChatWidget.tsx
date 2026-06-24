import { useCallback, useEffect } from 'react'
import { useWidget, useCategories, useFaqByCategory } from '../../hooks/useWidget'
import { useChat } from '../../hooks/useChat'
import { getCategoryName } from '../../lib/supabase'
import { WidgetButton } from './WidgetButton'
import { WidgetHeader } from './WidgetHeader'
import { HomeView } from './HomeView'
import { CategoryView } from './CategoryView'
import { ChatView } from './ChatView'
import { WidgetInput } from './WidgetInput'
import { FlowSelector } from './FlowSelector'
import { CorporateFlow } from './CorporateFlow'
import { CandidateFlow } from './CandidateFlow'

interface Props {
  siteKey?: string
}

export function ChatWidget({ siteKey = 'th-group' }: Props) {
  const {
    isOpen, isMinimized, view, selectedCategory, language,
    open, close, minimize, restore,
    selectFlow, selectCategory, goToChat, goBack, setLanguage,
  } = useWidget(siteKey)

  const { messages, isLoading, sendMessage } = useChat(language)
  const { categories, loading: catsLoading } = useCategories()
  const { items: faqItems, loading: faqLoading } = useFaqByCategory(
    selectedCategory?.id || null,
    language
  )

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape' && isOpen) close() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [isOpen, close])

  const handleSelectQuestion = useCallback((question: string) => {
    goToChat()
    sendMessage(question)
  }, [goToChat, sendMessage])

  const handleSendFromInput = useCallback((text: string) => {
    if (view !== 'chat') goToChat()
    sendMessage(text)
  }, [view, goToChat, sendMessage])

  const headerTitle = view === 'internal_category' && selectedCategory
    ? `${selectedCategory.icon || ''} ${getCategoryName(selectedCategory, language)}`
    : 'TH-GROUP'

  const showInput = view === 'chat' || view === 'internal_home' || view === 'internal_category'
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

            <div className="flex-1 overflow-y-auto chat-scroll">
              {view === 'selector' && (
                <FlowSelector language={language} onSelect={selectFlow} />
              )}

              {view === 'corporate' && (
                <CorporateFlow language={language} siteKey={siteKey} />
              )}

              {view === 'candidate' && (
                <CandidateFlow language={language} siteKey={siteKey} />
              )}

              {view === 'internal_home' && (
                <HomeView
                  language={language}
                  categories={categories}
                  loading={catsLoading}
                  onSelectCategory={selectCategory}
                />
              )}

              {view === 'internal_category' && selectedCategory && (
                <CategoryView
                  category={selectedCategory}
                  items={faqItems}
                  loading={faqLoading}
                  language={language}
                  onSelectQuestion={handleSelectQuestion}
                  onOpenChat={goToChat}
                />
              )}

              {view === 'chat' && (
                <ChatView messages={messages} isLoading={isLoading} language={language} />
              )}
            </div>

            {showInput && (
              <WidgetInput language={language} isLoading={isLoading} onSend={handleSendFromInput} />
            )}
          </div>
        </>
      )}
    </>
  )
}
