export type HelpTooltipResponse = {
  helpKey: string
  text: string
}

export type HelpModuleArticleResponse = {
  moduleKey: string
  title: string
  description: string
  bullets: string[]
}

export type WalkthroughStep = {
  order: number
  selector: string
  title: string
  body: string
}

export type HelpWalkthroughResponse = {
  moduleKey: string
  steps: WalkthroughStep[]
}

export type HelpCategory = {
  id: string
  name: string
  description?: string | null
  sortOrder: number
}

export type HelpArticleListItem = {
  id: string
  categoryId: string
  title: string
  summary?: string | null
}

export type HelpArticleDetail = HelpArticleListItem & {
  bodyMarkdown: string
}
