import { Navigate, useParams } from 'react-router-dom'

/** Deep link: `/help/article/:articleId` → Help Center with article open. */
export function HelpArticlePage() {
  const { articleId } = useParams()
  const id = articleId?.trim() ?? ''
  const qs = new URLSearchParams()
  if (id) qs.set('article', id)
  return <Navigate to={`/help?${qs.toString()}`} replace />
}
