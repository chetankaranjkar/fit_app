import { useQuery } from '@tanstack/react-query'
import {
  fetchArticleById,
  fetchArticles,
  fetchCategories,
  fetchModuleArticle,
  fetchTooltip,
} from '../helpApi.service'

export function useHelpTooltip(helpKey: string, enabled = true) {
  return useQuery({
    queryKey: ['help', 'tooltip', helpKey],
    queryFn: () => fetchTooltip(helpKey),
    enabled: enabled && helpKey.length > 0,
    staleTime: 1000 * 60 * 30,
  })
}

export function useHelpModuleArticle(moduleKey: string, enabled = true) {
  return useQuery({
    queryKey: ['help', 'module-article', moduleKey],
    queryFn: () => fetchModuleArticle(moduleKey),
    enabled: enabled && moduleKey.length > 0,
    staleTime: 1000 * 60 * 10,
  })
}

export function useHelpCategories() {
  return useQuery({
    queryKey: ['help', 'categories'],
    queryFn: fetchCategories,
    staleTime: 1000 * 60 * 30,
  })
}

export function useHelpArticles(categoryId?: string, search?: string) {
  return useQuery({
    queryKey: ['help', 'articles', categoryId ?? '', search ?? ''],
    queryFn: () => fetchArticles(categoryId, search),
    staleTime: 1000 * 60 * 10,
  })
}

export function useHelpArticleDetail(articleId: string | null) {
  return useQuery({
    queryKey: ['help', 'article', articleId ?? ''],
    queryFn: () => fetchArticleById(articleId!),
    enabled: !!articleId?.trim(),
    staleTime: 1000 * 60 * 30,
  })
}
