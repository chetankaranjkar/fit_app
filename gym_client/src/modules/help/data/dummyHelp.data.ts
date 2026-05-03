/**
 * Offline fallback when the API is unavailable (dev without backend, network errors).
 * Shape mirrors `GymManagement.Core.DTOs` JSON serialization (camelCase from ASP.NET defaults).
 */
import type {
  HelpArticleDetail,
  HelpArticleListItem,
  HelpCategory,
  HelpModuleArticleResponse,
  HelpWalkthroughResponse,
} from '../types'

export const dummyTooltips: Record<string, string> = {
  'members.search': 'Filter the member list by name, email, or phone.',
  'members.add': 'Create a new member profile.',
  'members.export': 'Export visible members (placeholder until wired).',
}

export const dummyModuleArticles: Record<string, HelpModuleArticleResponse> = {
  members: {
    moduleKey: 'members',
    title: 'Members (offline help)',
    description: 'Could not reach the server; showing cached copy.',
    bullets: ['Add and search members.', 'Open a row for full profile.', 'Deactivate instead of delete when possible.'],
  },
  dashboard: {
    moduleKey: 'dashboard',
    title: 'Dashboard (offline help)',
    description: 'Snapshot of your gym when the API is offline.',
    bullets: ['Review KPI cards.', 'Check notifications.', 'Drill into modules from the sidebar.'],
  },
  help_center: {
    moduleKey: 'help_center',
    title: 'Help Center',
    description: 'Browse guides when online or offline.',
    bullets: ['Categories on the left.', 'Search filters articles.', 'Use ? for contextual help.'],
  },
}

export const dummyWalkthroughs: Record<string, HelpWalkthroughResponse> = {
  members: {
    moduleKey: 'members',
    steps: [
      {
        order: 0,
        selector: '[data-walkthrough="members-header"]',
        title: 'Member directory',
        body: 'This is your live list of gym members.',
      },
      {
        order: 1,
        selector: '[data-walkthrough="members-add"]',
        title: 'Add a member',
        body: 'Click here to create a new profile.',
      },
      {
        order: 2,
        selector: '[data-walkthrough="members-table"]',
        title: 'Table actions',
        body: 'Open a row to edit or view history.',
      },
    ],
  },
}

export const dummyCategories: HelpCategory[] = [
  { id: 'getting-started', name: 'Getting started', description: 'Orientation', sortOrder: 0 },
  { id: 'members-access', name: 'Members & access', description: 'Directory & QR', sortOrder: 1 },
]

export const dummyArticleList: HelpArticleListItem[] = [
  {
    id: 'welcome',
    categoryId: 'getting-started',
    title: 'Welcome',
    summary: 'Start here',
  },
]

export const dummyArticleDetails: Record<string, HelpArticleDetail> = {
  welcome: {
    id: 'welcome',
    categoryId: 'getting-started',
    title: 'Welcome',
    summary: 'Start here',
    bodyMarkdown: '## Offline\n\nConnect the API for full help content.',
  },
}
