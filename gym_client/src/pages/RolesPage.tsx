import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { DashboardLayout } from '../components/layout/DashboardLayout'
import { DashboardSubpageShell } from '../components/layout/DashboardSubpageShell'
import { PermissionGate } from '../components/auth/PermissionGate'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { usePermission } from '../features/auth/hooks/usePermission'
import { authService } from '../services/auth.service'
import { rolesService } from '../services/roles.service'
import type { AppRole, CreateAppRoleDto } from '../types/rolePermission'

function getDashboardUser() {
  try {
    const userJson = localStorage.getItem('user')
    if (!userJson) return { userName: 'User' }
    const user = JSON.parse(userJson) as { fullName?: string; username?: string }
    return { userName: user?.fullName?.trim() || user?.username?.trim() || 'User' }
  } catch {
    return { userName: 'User' }
  }
}

export function RolesPage() {
  const { userName } = getDashboardUser()
  const canManageRoles = usePermission(authService.permissionCodes.config)
  const queryClient = useQueryClient()
  const [isAdding, setIsAdding] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [form, setForm] = useState<CreateAppRoleDto>({
    name: '',
    description: '',
    isActive: true,
    permissionIds: [],
  })
  const [formError, setFormError] = useState<string | null>(null)

  const { data: permissions = [], isLoading: loadingPerms } = useQuery({
    queryKey: ['roles', 'permissions'],
    queryFn: async () => {
      const { data } = await rolesService.getPermissions()
      return Array.isArray(data) ? data : []
    },
    enabled: canManageRoles,
  })

  const { data: roles = [], isLoading: loadingRoles } = useQuery({
    queryKey: ['roles'],
    queryFn: async () => {
      const { data } = await rolesService.getRoles()
      return Array.isArray(data) ? data : []
    },
    enabled: canManageRoles,
  })

  const createMutation = useMutation({
    mutationFn: (dto: CreateAppRoleDto) => rolesService.createRole(dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] })
      setIsAdding(false)
      setForm({ name: '', description: '', isActive: true, permissionIds: [] })
      setFormError(null)
    },
    onError: (err: Error) => setFormError(err.message || 'Failed to create role'),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, dto }: { id: number; dto: Parameters<typeof rolesService.updateRole>[1] }) =>
      rolesService.updateRole(id, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] })
      setEditingId(null)
      setFormError(null)
    },
    onError: (err: Error) => setFormError(err.message || 'Failed to update role'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => rolesService.deleteRole(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['roles'] }),
  })

  const togglePermission = (permissionId: number) => {
    setForm((f) => ({
      ...f,
      permissionIds: f.permissionIds.includes(permissionId)
        ? f.permissionIds.filter((id) => id !== permissionId)
        : [...f.permissionIds, permissionId],
    }))
  }

  const handleStartAdd = () => {
    setIsAdding(true)
    setEditingId(null)
    setForm({ name: '', description: '', isActive: true, permissionIds: [] })
    setFormError(null)
  }

  const handleStartEdit = (role: AppRole) => {
    setEditingId(role.id)
    setIsAdding(false)
    setForm({
      name: role.name,
      description: role.description ?? '',
      isActive: role.isActive,
      permissionIds: role.permissionIds ?? [],
    })
    setFormError(null)
  }

  const handleCancel = () => {
    setIsAdding(false)
    setEditingId(null)
    setForm({ name: '', description: '', isActive: true, permissionIds: [] })
    setFormError(null)
  }

  const handleSubmitCreate = (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)
    if (!form.name?.trim()) {
      setFormError('Role name is required.')
      return
    }
    createMutation.mutate({
      ...form,
      name: form.name.trim(),
      description: form.description?.trim() || undefined,
      permissionIds: form.permissionIds,
    })
  }

  const handleSubmitUpdate = (e: React.FormEvent) => {
    e.preventDefault()
    if (editingId == null) return
    setFormError(null)
    if (!form.name?.trim()) {
      setFormError('Role name is required.')
      return
    }
    updateMutation.mutate({
      id: editingId,
      dto: {
        name: form.name.trim(),
        description: form.description?.trim() || undefined,
        isActive: form.isActive,
        permissionIds: form.permissionIds,
      },
    })
  }

  const handleDelete = (id: number, name: string) => {
    if (!window.confirm(`Delete role "${name}"? This cannot be undone.`)) return
    deleteMutation.mutate(id)
  }

  const permissionNames = (permissionIds: number[]) => {
    return permissionIds
      .map((id) => permissions.find((p) => p.id === id)?.name)
      .filter(Boolean)
      .join(', ') || '—'
  }

  return (
    <DashboardLayout userName={userName}>
      <PermissionGate
        permission={authService.permissionCodes.config}
        fallback={
          <div className="glass-card dashboard-card rounded-2xl p-6 text-sm text-amber-200">
            You do not have permission to manage roles. Ask an admin to grant Config access.
          </div>
        }
      >
        <DashboardSubpageShell
          eyebrow="Access control"
          titleBefore="Roles & "
          titleGradient="permissions"
          subtitle="Create roles and assign API permissions for staff and reception workflows."
          primaryAction={
            !isAdding && editingId == null ? { label: '+ Add role', onClick: handleStartAdd } : undefined
          }
        >
        <div className="glass-card dashboard-card mb-6 min-w-0 rounded-2xl p-6">
          <div className="mb-6 flex flex-col gap-1">
            <h2 className="text-xl font-semibold text-white">Role permissions</h2>
            <p className="text-sm text-slate-400">
              Create roles and assign permissions: Reports, Create users, Config, Payments, Trainer access, Users access.
            </p>
          </div>

          {(isAdding || editingId != null) && (
            <form
              onSubmit={isAdding ? handleSubmitCreate : handleSubmitUpdate}
              className="mb-6 rounded-2xl border border-white/10 bg-white/5 p-6"
            >
              <h3 className="mb-4 text-base font-semibold text-white">
                {isAdding ? 'New role' : 'Edit role'}
              </h3>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Input
                  label="Role name"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. Manager, Receptionist"
                  required
                />
                <Input
                  label="Description (optional)"
                  value={form.description ?? ''}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="Short description"
                />
                {!isAdding && (
                  <label className="flex cursor-pointer items-center gap-3 sm:col-span-2">
                    <input
                      type="checkbox"
                      checked={form.isActive}
                      onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
                      className="h-4 w-4 rounded border-white/20 bg-white/5 text-blue-500 focus:ring-blue-400/40"
                    />
                    <span className="text-sm font-medium text-slate-300">Active</span>
                  </label>
                )}
              </div>
              <div className="mt-4">
                <p className="mb-2 text-xs font-medium uppercase tracking-wider text-slate-400">Permissions</p>
                {loadingPerms ? (
                  <p className="text-sm text-slate-400">Loading permissions…</p>
                ) : (
                  <div className="flex flex-wrap gap-3">
                    {permissions.map((p) => (
                      <label
                        key={p.id}
                        className="flex cursor-pointer items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2"
                      >
                        <input
                          type="checkbox"
                          checked={form.permissionIds.includes(p.id)}
                          onChange={() => togglePermission(p.id)}
                          className="h-4 w-4 rounded border-white/20 bg-white/5 text-blue-500 focus:ring-blue-400/40"
                        />
                        <span className="text-sm text-slate-200">{p.name}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
              {formError && (
                <p className="mt-3 rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-200" role="alert">
                  {formError}
                </p>
              )}
              <div className="mt-4 flex gap-2">
                <Button type="submit" size="md" isLoading={createMutation.isPending || updateMutation.isPending}>
                  {isAdding ? 'Create role' : 'Save changes'}
                </Button>
                <Button type="button" variant="secondary" size="md" onClick={handleCancel}>
                  Cancel
                </Button>
              </div>
            </form>
          )}

          {loadingRoles && <p className="text-slate-400">Loading roles…</p>}
          {!loadingRoles && (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[600px] text-left text-sm">
                <thead>
                  <tr className="border-b border-white/10 text-xs font-semibold uppercase tracking-wider text-slate-400">
                    <th className="px-2 py-3 pr-4 font-medium">ID</th>
                    <th className="px-2 py-3 pr-4 font-medium">Name</th>
                    <th className="px-2 py-3 pr-4 font-medium">Description</th>
                    <th className="px-2 py-3 pr-4 font-medium">Status</th>
                    <th className="px-2 py-3 pr-4 font-medium">Permissions</th>
                    <th className="px-2 py-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {roles.map((role) => (
                    <tr key={role.id} className="border-b border-white/5 transition-colors hover:bg-white/[0.03]">
                      <td className="py-3 pr-4 text-slate-400">{role.id}</td>
                      <td className="py-3 pr-4 font-medium text-white">{role.name}</td>
                      <td className="py-3 pr-4 text-slate-400">{role.description ?? '—'}</td>
                      <td className="py-3 pr-4">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                            role.isActive
                              ? 'bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/30'
                              : 'bg-white/5 text-slate-400 ring-1 ring-white/10'
                          }`}
                        >
                          {role.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="py-3 pr-4 text-slate-300">
                        <span className="line-clamp-2 max-w-xs" title={permissionNames(role.permissionIds ?? [])}>
                          {permissionNames(role.permissionIds ?? [])}
                        </span>
                      </td>
                      <td className="py-3">
                        <span className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => handleStartEdit(role)}
                            className="text-sm text-blue-300 transition hover:text-blue-200 hover:underline"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(role.id, role.name)}
                            className="text-sm text-rose-300 transition hover:text-rose-200 hover:underline"
                          >
                            Delete
                          </button>
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {roles.length === 0 && (
                <p className="py-6 text-center text-slate-400">No roles yet. Add one above.</p>
              )}
            </div>
          )}
        </div>

        <div className="glass-card dashboard-card rounded-2xl p-6">
          <h2 className="mb-2 text-lg font-semibold text-white">Available permissions</h2>
          <p className="mb-4 text-sm text-slate-400">
            These permissions can be assigned to roles. They are seeded by the system.
          </p>
          {loadingPerms ? (
            <p className="text-slate-400">Loading…</p>
          ) : (
            <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-3">
              {permissions.map((p) => (
                <li
                  key={p.id}
                  className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-300"
                >
                  <span className="font-medium text-white">{p.name}</span>
                  {p.description && <span className="ml-1 text-slate-500">– {p.description}</span>}
                </li>
              ))}
            </ul>
          )}
        </div>
        </DashboardSubpageShell>
      </PermissionGate>
    </DashboardLayout>
  )
}
