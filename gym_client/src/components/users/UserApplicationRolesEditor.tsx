import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Button } from '../ui/Button'
import { rolesService } from '../../services/roles.service'
import { getApiErrorMessage } from '../../lib/apiErrors'
import type { AppRole } from '../../types/rolePermission'

type UserApplicationRolesEditorProps = {
  userId: number
  /** When true, role chips are read-only (detail header). */
  readOnly?: boolean
  onChanged?: () => void
}

export function UserApplicationRolesEditor({
  userId,
  readOnly = false,
  onChanged,
}: UserApplicationRolesEditorProps) {
  const queryClient = useQueryClient()
  const [selectedRoleNames, setSelectedRoleNames] = useState<string[]>([])

  const { data: allRoles = [] } = useQuery({
    queryKey: ['roles'],
    queryFn: async () => {
      const { data } = await rolesService.getRoles()
      return Array.isArray(data) ? data.filter((r) => r.isActive) : []
    },
  })

  const { data: assignedRoles = [], isLoading } = useQuery({
    queryKey: ['user-app-roles', userId],
    queryFn: async () => {
      const { data } = await rolesService.getUserAppRoles(userId)
      return Array.isArray(data) ? data : []
    },
  })

  useEffect(() => {
    setSelectedRoleNames(assignedRoles.map((r) => r.name))
  }, [assignedRoles])

  const saveMutation = useMutation({
    mutationFn: async () => {
      const current = new Set(assignedRoles.map((r) => r.name.toUpperCase()))
      const next = new Set(selectedRoleNames.map((n) => n.toUpperCase()))
      const toAssign = selectedRoleNames.filter((n) => !current.has(n.toUpperCase()))
      const toRevoke = assignedRoles.filter((r) => !next.has(r.name.toUpperCase())).map((r) => r.name)
      for (const code of toAssign) {
        await rolesService.assignUserRole(userId, code)
      }
      for (const code of toRevoke) {
        await rolesService.revokeUserRole(userId, code)
      }
    },
    onSuccess: async () => {
      toast.success('Application roles updated')
      await queryClient.invalidateQueries({ queryKey: ['user-app-roles', userId] })
      await queryClient.invalidateQueries({ queryKey: ['user', userId] })
      await queryClient.invalidateQueries({ queryKey: ['users'] })
      onChanged?.()
    },
    onError: (e) => toast.error(getApiErrorMessage(e, 'Failed to update roles')),
  })

  const roleOptions = useMemo(
    () => [...allRoles].sort((a, b) => a.name.localeCompare(b.name)),
    [allRoles],
  )

  const dirty = useMemo(() => {
    const current = [...assignedRoles.map((r) => r.name.toUpperCase())].sort().join('|')
    const next = [...selectedRoleNames.map((n) => n.toUpperCase())].sort().join('|')
    return current !== next
  }, [assignedRoles, selectedRoleNames])

  const toggleRole = (role: AppRole) => {
    if (readOnly) return
    const key = role.name.toUpperCase()
    setSelectedRoleNames((prev) => {
      const has = prev.some((n) => n.toUpperCase() === key)
      if (has) return prev.filter((n) => n.toUpperCase() !== key)
      return [...prev, role.name]
    })
  }

  if (isLoading) {
    return <p className="text-sm text-slate-400">Loading application roles…</p>
  }

  if (readOnly) {
    return (
      <div className="flex flex-wrap gap-1.5">
        {assignedRoles.length === 0 ? (
          <span className="text-sm text-slate-500">No roles assigned</span>
        ) : (
          assignedRoles.map((r) => (
            <span
              key={r.id}
              className="rounded-full bg-blue-500/15 px-2.5 py-0.5 text-xs font-medium text-blue-200 ring-1 ring-blue-400/25"
            >
              {r.name}
            </span>
          ))
        )}
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-slate-500">
        Application roles control permissions and profile provisioning (Member, Trainer, Staff). Personal coach
        assignment is separate on this form.
      </p>
      <div className="flex flex-wrap gap-2">
        {roleOptions.map((role) => {
          const checked = selectedRoleNames.some((n) => n.toUpperCase() === role.name.toUpperCase())
          return (
            <label
              key={role.id}
              className={`flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-sm ${
                checked
                  ? 'border-blue-400/40 bg-blue-500/15 text-blue-100'
                  : 'border-white/10 bg-white/5 text-slate-200'
              }`}
            >
              <input
                type="checkbox"
                checked={checked}
                onChange={() => toggleRole(role)}
                className="h-4 w-4 rounded border-white/20 bg-white/5 text-blue-500"
              />
              <span className="font-medium">{role.name}</span>
            </label>
          )
        })}
      </div>
      {dirty ? (
        <Button type="button" size="sm" isLoading={saveMutation.isPending} onClick={() => saveMutation.mutate()}>
          Save roles
        </Button>
      ) : null}
    </div>
  )
}
