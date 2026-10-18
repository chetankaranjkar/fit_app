import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { api } from '../../lib/api'

export type BranchScopeOption = {
  id: number
  name: string
}

export type BranchScopeView = {
  organizationWide: boolean
  defaultBranchId?: number | null
  branches: BranchScopeOption[]
}

const BranchScopeContext = createContext<BranchScopeView | null>(null)

export function BranchScopeProvider({ children }: { children: ReactNode }) {
  const [view, setView] = useState<BranchScopeView | null>(null)

  useEffect(() => {
    let cancelled = false
    api
      .get<BranchScopeView>('/branch-operations/scope')
      .then((response) => {
        if (!cancelled) setView(response.data)
      })
      .catch(() => {
        if (!cancelled) setView({ organizationWide: false, defaultBranchId: null, branches: [] })
      })
    return () => {
      cancelled = true
    }
  }, [])

  return <BranchScopeContext.Provider value={view}>{children}</BranchScopeContext.Provider>
}

export function useBranchScope() {
  return useContext(BranchScopeContext)
}

export function branchScopeQueryKey(scope: BranchScopeView | null) {
  if (!scope) return 'scope-loading'
  const ids = scope.branches.map((branch) => branch.id).slice().sort((a, b) => a - b).join(',')
  return `${scope.organizationWide ? 'org' : 'restricted'}:${ids}`
}
