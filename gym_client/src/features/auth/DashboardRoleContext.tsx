import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useLocation, useNavigate } from 'react-router-dom'
import { authService } from '../../services/auth.service'
import { api } from '../../lib/api'
import {
  type DashboardRole,
  getAvailablePersonas,
  getDefaultPersona,
  getPersonaLabel,
  isPathAllowedForRole,
  persistActivePersona,
  resolveDashboardRole,
} from './roleRouting'

type PersonaContextValue = {
  activePersona: DashboardRole
  availablePersonas: DashboardRole[]
  setActivePersona: (persona: DashboardRole) => void
  personaLabel: string
}

const PersonaContext = createContext<PersonaContextValue | null>(null)

export function DashboardRoleProvider({ children }: { children: ReactNode }) {
  const [sessionVersion, setSessionVersion] = useState(0)

  useEffect(() => {
    const onSessionUpdated = () => setSessionVersion((v) => v + 1)
    window.addEventListener('gym-session-updated', onSessionUpdated)
    return () => window.removeEventListener('gym-session-updated', onSessionUpdated)
  }, [])

  const user = useMemo(() => authService.getCurrentUser(), [sessionVersion])

  const { data: liveAppRoles = [] } = useQuery({
    queryKey: ['my-app-roles', user?.userId, sessionVersion],
    queryFn: async () => {
      if (!user?.userId) return []
      const parse = (data: unknown) => {
        if (!Array.isArray(data)) return []
        return data
          .map((row) => {
            const r = row as Record<string, unknown>
            return String(r.name ?? r.Name ?? '').trim()
          })
          .filter(Boolean)
      }
      try {
        const { data } = await api.get<unknown>(`/Users/${user.userId}/app-roles`)
        return parse(data)
      } catch {
        try {
          const { data } = await api.get<unknown>(`/Roles/users/${user.userId}/app-roles`)
          return parse(data)
        } catch {
          return []
        }
      }
    },
    enabled: Boolean(user?.userId),
    staleTime: 60_000,
    retry: false,
  })

  const availablePersonas = useMemo(
    () => getAvailablePersonas(user, liveAppRoles),
    [user, liveAppRoles],
  )

  const [activePersona, setActivePersonaState] = useState<DashboardRole>(() =>
    getDefaultPersona(availablePersonas, user?.userId),
  )

  useEffect(() => {
    if (!availablePersonas.includes(activePersona)) {
      setActivePersonaState(getDefaultPersona(availablePersonas, user?.userId))
    }
  }, [activePersona, availablePersonas, user?.userId])

  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    if (!isPathAllowedForRole(location.pathname, activePersona)) {
      navigate('/dashboard', { replace: true })
    }
  }, [activePersona, location.pathname, navigate])

  const setActivePersona = useCallback(
    (persona: DashboardRole) => {
      if (!availablePersonas.includes(persona)) return
      setActivePersonaState(persona)
      persistActivePersona(user?.userId, persona)
      void queryClient.invalidateQueries()
      if (!isPathAllowedForRole(location.pathname, persona)) {
        navigate('/dashboard', { replace: true })
      }
    },
    [availablePersonas, location.pathname, navigate, queryClient, user?.userId],
  )

  const value = useMemo(
    () => ({
      activePersona,
      availablePersonas,
      setActivePersona,
      personaLabel: getPersonaLabel(activePersona),
    }),
    [activePersona, availablePersonas, setActivePersona],
  )

  return <PersonaContext.Provider value={value}>{children}</PersonaContext.Provider>
}

export function usePersona(): PersonaContextValue {
  const ctx = useContext(PersonaContext)
  if (!ctx) {
    throw new Error('usePersona must be used within DashboardRoleProvider')
  }
  return ctx
}

export function useDashboardRole(): DashboardRole {
  return usePersona().activePersona
}

export function useDashboardRoleOrCurrent(): DashboardRole {
  const ctx = useContext(PersonaContext)
  return ctx?.activePersona ?? resolveDashboardRole(authService.getCurrentUser())
}
