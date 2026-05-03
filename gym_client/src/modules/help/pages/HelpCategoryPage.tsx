import { Navigate, useParams } from 'react-router-dom'

/** Deep link: `/help/category/:categoryId` → Help Center with category selected. */
export function HelpCategoryPage() {
  const { categoryId } = useParams()
  const c = categoryId?.trim() ?? ''
  const qs = new URLSearchParams()
  if (c) qs.set('category', c)
  return <Navigate to={`/help?${qs.toString()}`} replace />
}
