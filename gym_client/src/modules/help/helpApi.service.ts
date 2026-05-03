import { api } from '../../lib/api'
import type {
  HelpArticleDetail,
  HelpArticleListItem,
  HelpCategory,
  HelpModuleArticleResponse,
  HelpTooltipResponse,
  HelpWalkthroughResponse,
} from './types'
import {
  dummyArticleDetails,
  dummyArticleList,
  dummyCategories,
  dummyModuleArticles,
  dummyTooltips,
  dummyWalkthroughs,
} from './data/dummyHelp.data'

function isNetworkError(e: unknown): boolean {
  return !(
    typeof e === 'object' &&
    e !== null &&
    'response' in e &&
    (e as { response?: { status?: number } }).response?.status != null
  )
}

function mapTooltip(raw: Record<string, unknown>): HelpTooltipResponse {
  return {
    helpKey: String(raw.helpKey ?? raw.HelpKey ?? ''),
    text: String(raw.text ?? raw.Text ?? ''),
  }
}

function mapArticle(raw: Record<string, unknown>): HelpModuleArticleResponse {
  const bulletsRaw = raw.bullets ?? raw.Bullets
  const bullets = Array.isArray(bulletsRaw)
    ? bulletsRaw.map((b) => String(b))
    : typeof bulletsRaw === 'string'
      ? [bulletsRaw]
      : []
  return {
    moduleKey: String(raw.moduleKey ?? raw.ModuleKey ?? ''),
    title: String(raw.title ?? raw.Title ?? ''),
    description: String(raw.description ?? raw.Description ?? ''),
    bullets,
  }
}

function mapWalkthrough(raw: Record<string, unknown>): HelpWalkthroughResponse {
  const stepsRaw = raw.steps ?? raw.Steps
  const steps = Array.isArray(stepsRaw)
    ? stepsRaw.map((s) => {
        const o = s as Record<string, unknown>
        return {
          order: Number(o.order ?? o.Order ?? 0),
          selector: String(o.selector ?? o.Selector ?? ''),
          title: String(o.title ?? o.Title ?? ''),
          body: String(o.body ?? o.Body ?? ''),
        }
      })
    : []
  return {
    moduleKey: String(raw.moduleKey ?? raw.ModuleKey ?? ''),
    steps,
  }
}

function mapCategory(raw: Record<string, unknown>): HelpCategory {
  return {
    id: String(raw.id ?? raw.Id ?? ''),
    name: String(raw.name ?? raw.Name ?? ''),
    description: (raw.description ?? raw.Description) as string | null | undefined,
    sortOrder: Number(raw.sortOrder ?? raw.SortOrder ?? 0),
  }
}

function mapArticleListItem(raw: Record<string, unknown>): HelpArticleListItem {
  return {
    id: String(raw.id ?? raw.Id ?? ''),
    categoryId: String(raw.categoryId ?? raw.CategoryId ?? ''),
    title: String(raw.title ?? raw.Title ?? ''),
    summary: (raw.summary ?? raw.Summary) as string | null | undefined,
  }
}

function mapArticleDetail(raw: Record<string, unknown>): HelpArticleDetail {
  return {
    ...mapArticleListItem(raw),
    bodyMarkdown: String(raw.bodyMarkdown ?? raw.BodyMarkdown ?? ''),
  }
}

export async function fetchTooltip(helpKey: string): Promise<HelpTooltipResponse> {
  const key = encodeURIComponent(helpKey)
  try {
    const { data } = await api.get<Record<string, unknown>>(`help/tooltips/${key}`)
    return mapTooltip(data ?? {})
  } catch (e) {
    const t = dummyTooltips[helpKey] ?? dummyTooltips[helpKey.toLowerCase()]
    if (t) return { helpKey, text: t }
    if (isNetworkError(e)) return { helpKey, text: 'Help is temporarily unavailable. Try again when you are online.' }
    throw e
  }
}

export async function fetchModuleArticle(moduleKey: string): Promise<HelpModuleArticleResponse> {
  const key = encodeURIComponent(moduleKey)
  try {
    const { data } = await api.get<Record<string, unknown>>(`help/articles/module/${key}`)
    return mapArticle(data ?? {})
  } catch {
    const d = dummyModuleArticles[moduleKey]
    if (d) return { ...d, moduleKey }
    return {
      moduleKey,
      title: 'This screen',
      description:
        'Guided copy for this module is not published yet. Open the Help Center for categorized articles, or ask your administrator.',
      bullets: [
        'Press ? anytime to open contextual help for the current page.',
        'Use the Help Center (sidebar) for deeper guides.',
      ],
    }
  }
}

export async function fetchWalkthrough(moduleKey: string): Promise<HelpWalkthroughResponse | null> {
  const key = encodeURIComponent(moduleKey)
  try {
    const { data } = await api.get<Record<string, unknown>>(`help/walkthrough/${key}`)
    return mapWalkthrough(data ?? {})
  } catch {
    return dummyWalkthroughs[moduleKey] ?? null
  }
}

export async function fetchCategories(): Promise<HelpCategory[]> {
  try {
    const { data } = await api.get<unknown>('help/categories')
    const arr = Array.isArray(data) ? data : []
    return arr.map((x) => mapCategory(x as Record<string, unknown>)).sort((a, b) => a.sortOrder - b.sortOrder)
  } catch {
    return [...dummyCategories].sort((a, b) => a.sortOrder - b.sortOrder)
  }
}

export async function fetchArticles(categoryId?: string, search?: string): Promise<HelpArticleListItem[]> {
  try {
    const { data } = await api.get<unknown>('help/articles', {
      params: {
        ...(categoryId ? { category: categoryId } : {}),
        ...(search?.trim() ? { search: search.trim() } : {}),
      },
    })
    const arr = Array.isArray(data) ? data : []
    return arr.map((x) => mapArticleListItem(x as Record<string, unknown>))
  } catch {
    let list = [...dummyArticleList]
    if (categoryId) list = list.filter((a) => a.categoryId === categoryId)
    if (search?.trim()) {
      const s = search.trim().toLowerCase()
      list = list.filter(
        (a) => a.title.toLowerCase().includes(s) || (a.summary?.toLowerCase().includes(s) ?? false),
      )
    }
    return list
  }
}

export async function fetchArticleById(id: string): Promise<HelpArticleDetail | null> {
  const key = encodeURIComponent(id)
  try {
    const { data } = await api.get<Record<string, unknown>>(`help/articles/${key}`)
    return mapArticleDetail(data ?? {})
  } catch {
    return dummyArticleDetails[id] ?? dummyArticleDetails[id.toLowerCase()] ?? null
  }
}
