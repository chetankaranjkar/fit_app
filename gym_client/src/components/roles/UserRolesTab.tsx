import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { Modal } from '../ui/Modal'
import { authService } from '../../services/auth.service'
import { rolesService } from '../../services/roles.service'
import { getApiErrorMessage } from '../../lib/apiErrors'
import type { AppRole } from '../../types/rolePermission'
import type { UserRoleAssignment } from '../../types/userRoleAssignment'

function parsePagedAssignments(data: unknown) {
  const raw = data as Record<string, unknown> | undefined
  const itemsRaw = raw?.items ?? raw?.Items
  const items = Array.isArray(itemsRaw)
    ? itemsRaw.map((row) => rolesService.normalizeUserRoleAssignment(row as Record<string, unknown>))
    : []
  return {
    items,
    totalCount: Number(raw?.totalCount ?? raw?.TotalCount ?? items.length),
    page: Number(raw?.page ?? raw?.Page ?? 1),
    pageSize: Number(raw?.pageSize ?? raw?.PageSize ?? 25),
  }
}

function fullName(row: UserRoleAssignment) {
  return `${row.firstName} ${row.lastName}`.trim() || `User #${row.userId}`
}

export function UserRolesTab() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [page, setPage] = useState(1)
  const pageSize = 20
  const [editUser, setEditUser] = useState<UserRoleAssignment | null>(null)
  const [selectedRoleNames, setSelectedRoleNames] = useState<string[]>([])

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search.trim()), 300)
    return () => window.clearTimeout(timer)
  }, [search])

  useEffect(() => {
    setPage(1)
  }, [debouncedSearch])

  const { data: allRoles = [] } = useQuery({
    queryKey: ['roles'],
    queryFn: async () => {
      const { data } = await rolesService.getRoles()
      return Array.isArray(data) ? data.filter((r) => r.isActive) : []
    },
  })

  const { data: paged, isLoading } = useQuery({
    queryKey: ['roles', 'user-assignments', page, pageSize, debouncedSearch],
    queryFn: async () => {
      const { data } = await rolesService.getUserAssignments({
        page,
        pageSize,
        search: debouncedSearch || undefined,
      })
      return parsePagedAssignments(data)
    },
  })

  const rows = paged?.items ?? []
  const totalCount = paged?.totalCount ?? 0
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize))

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!editUser) return
      const current = new Set(editUser.appRoles.map((r) => r.name.toUpperCase()))
      const next = new Set(selectedRoleNames.map((n) => n.toUpperCase()))
      const toAssign = selectedRoleNames.filter((n) => !current.has(n.toUpperCase()))
      const toRevoke = editUser.appRoles.filter((r) => !next.has(r.name.toUpperCase())).map((r) => r.name)
      for (const code of toAssign) {
        await rolesService.assignUserRole(editUser.userId, code)
      }
      for (const code of toRevoke) {
        await rolesService.revokeUserRole(editUser.userId, code)
      }
    },
    onSuccess: async () => {
      toast.success('User roles updated')
      const savedUserId = editUser?.userId
      setEditUser(null)
      setSelectedRoleNames([])
      queryClient.invalidateQueries({ queryKey: ['roles', 'user-assignments'] })
      queryClient.invalidateQueries({ queryKey: ['my-app-roles'] })
      const me = authService.getCurrentUser()
      if (savedUserId && me?.userId === savedUserId) {
        try {
          await authService.refreshSession()
          toast.success('Your session roles were refreshed')
        } catch {
          toast('Sign out and sign in again to update the role switcher', { icon: 'ℹ️' })
        }
      }
    },
    onError: (e) => toast.error(getApiErrorMessage(e, 'Failed to update user roles')),
  })

  const openEdit = (row: UserRoleAssignment) => {
    setEditUser(row)
    setSelectedRoleNames(row.appRoles.map((r) => r.name))
  }

  const toggleRole = (role: AppRole) => {
    const key = role.name.toUpperCase()
    setSelectedRoleNames((prev) => {
      const has = prev.some((n) => n.toUpperCase() === key)
      if (has) return prev.filter((n) => n.toUpperCase() !== key)
      return [...prev, role.name]
    })
  }

  const roleOptions = useMemo(
    () => [...allRoles].sort((a, b) => a.name.localeCompare(b.name)),
    [allRoles],
  )

  return (
    <>
      <p className="mb-4 text-sm text-slate-400">
        Assign application roles (ADMIN, STAFF, TRAINER, MEMBER, etc.) to users. Permissions come from each role&apos;s
        Role permissions tab. Your own role switcher refreshes automatically after save; other users should sign in again.
      </p>

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Input
          placeholder="Search by name, email, or username"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-md"
        />
        <p className="text-xs text-slate-500">
          {totalCount} user{totalCount === 1 ? '' : 's'}
        </p>
      </div>

      <div className="overflow-x-auto rounded-xl border border-white/10">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="border-b border-white/10 bg-white/5 text-xs uppercase tracking-wider text-slate-400">
            <tr>
              <th className="px-4 py-3">User</th>
              <th className="px-4 py-3">Login</th>
              <th className="px-4 py-3">Assigned roles</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {isLoading ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                  Loading…
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                  No users found.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.userId} className="hover:bg-white/[0.03]">
                  <td className="px-4 py-3">
                    <Link
                      to={`/dashboard/users/${row.userId}`}
                      className="font-medium text-blue-300 hover:text-blue-200 hover:underline"
                    >
                      {fullName(row)}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-slate-400">{row.username ?? row.email ?? '—'}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {row.appRoles.length === 0 ? (
                        <span className="text-slate-500">—</span>
                      ) : (
                        row.appRoles.map((r) => (
                          <span
                            key={r.id}
                            className="rounded-full bg-blue-500/15 px-2 py-0.5 text-xs font-medium text-blue-200 ring-1 ring-blue-400/25"
                          >
                            {r.name}
                          </span>
                        ))
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        row.isActive
                          ? 'bg-emerald-500/15 text-emerald-300'
                          : 'bg-white/5 text-slate-400'
                      }`}
                    >
                      {row.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button type="button" variant="ghost" size="sm" onClick={() => openEdit(row)}>
                      Edit roles
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 ? (
        <div className="mt-4 flex items-center justify-between gap-2">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Previous
          </Button>
          <span className="text-xs text-slate-400">
            Page {page} of {totalPages}
          </span>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          >
            Next
          </Button>
        </div>
      ) : null}

      <Modal
        open={editUser != null}
        onClose={() => {
          if (saveMutation.isPending) return
          setEditUser(null)
          setSelectedRoleNames([])
        }}
        title={editUser ? `Roles for ${fullName(editUser)}` : 'Edit roles'}
        size="wide"
      >
        {editUser ? (
          <>
            <p className="mb-4 text-sm text-slate-400">
              Select all roles this user should have. Unchecking removes the role assignment.
            </p>
            <div className="flex flex-wrap gap-2">
              {roleOptions.map((role) => {
                const checked = selectedRoleNames.some((n) => n.toUpperCase() === role.name.toUpperCase())
                return (
                  <label
                    key={role.id}
                    className={`flex cursor-pointer items-center gap-2 rounded-xl border px-4 py-2 ${
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
                    <span className="text-sm font-medium">{role.name}</span>
                  </label>
                )
              })}
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setEditUser(null)
                  setSelectedRoleNames([])
                }}
                disabled={saveMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="primary"
                isLoading={saveMutation.isPending}
                onClick={() => saveMutation.mutate()}
              >
                Save roles
              </Button>
            </div>
          </>
        ) : null}
      </Modal>
    </>
  )
}
