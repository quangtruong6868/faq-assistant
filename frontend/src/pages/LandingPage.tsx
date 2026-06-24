import { ChatWidget } from '../components/widget/ChatWidget'

export function LandingPage({ siteKey = 'th-group' }: { siteKey?: string }) {
  return (
    <>
      <ChatWidget siteKey={siteKey} />
    </>
  )
}
