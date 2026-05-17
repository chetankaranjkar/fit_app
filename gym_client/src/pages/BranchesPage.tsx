import { useMemo, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { MapPin } from 'lucide-react'
import { DashboardLayout } from '../components/layout/DashboardLayout'
import { DashboardSubpageShell } from '../components/layout/DashboardSubpageShell'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { authService } from '../services/auth.service'
import { branchesService } from '../services/branches.service'
import { organizationsService } from '../services/organizations.service'
import { LocationPreviewMap } from '../components/maps/LocationPreviewMap'
import type { BranchCrudDto, BranchCreatePayload, BranchUpdatePayload } from '../types/branch'

const selectClass =
  'w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-100 transition-colors focus:border-blue-400/60 focus:bg-white/[0.07] focus:outline-none focus:ring-2 focus:ring-blue-400/20'

const labelClass = 'mb-1.5 block text-xs font-medium uppercase tracking-wider text-slate-400'

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

function errMsg(error: unknown): string {
  if (typeof error === 'object' && error !== null && 'response' in error) {
    const r = error as {
      response?: { status?: number; data?: { message?: unknown } }
      message?: string
    }
    if (r.response?.status === 403)
      return 'Access denied (403). Log out and sign in again, or ask an admin to assign Staff/Admin roles and permissions.'
    const m = r.response?.data?.message
    if (typeof m === 'string') return m
  }
  if (error instanceof Error) return error.message
  return 'Something went wrong.'
}

type TabFilter = 'active' | 'all' | 'inactive'

/** Form coords as strings before submit. */
type BranchFormFields = Omit<BranchUpdatePayload, 'latitude' | 'longitude'> & {
  latitude: number | null
  longitude: number | null
  latStr: string
  lngStr: string
}

function coordsFromInputs(latStr: string, lngStr: string):
  | { ok: false; message: string }
  | { ok: true; latitude: number | null; longitude: number | null }
{
  const parse = (raw: string): number | null | undefined => {
    const t = raw.trim()
    if (!t) return null
    const n = Number(t)
    return Number.isFinite(n) ? n : undefined
  }
  const lat = parse(latStr)
  const lng = parse(lngStr)
  if (lat === undefined || lng === undefined)
    return { ok: false, message: 'Latitude and longitude must be valid numbers when provided (or empty to leave unset).' }
  if (lat != null && (lat < -90 || lat > 90))
    return { ok: false, message: 'Latitude must be between -90 and 90.' }
  if (lng != null && (lng < -180 || lng > 180))
    return { ok: false, message: 'Longitude must be between -180 and 180.' }
  return { ok: true, latitude: lat ?? null, longitude: lng ?? null }
}

function toForm(branch: BranchCrudDto): BranchFormFields {
  const latNum = branch.latitude
  const lngNum = branch.longitude
  return {
    organizationId: branch.organizationId ?? null,
    branchName: branch.branchName,
    address: branch.address ?? '',
    contactNumber: branch.contactNumber ?? '',
    latitude: latNum ?? null,
    longitude: lngNum ?? null,
    esp32DoorBaseUrl: branch.esp32DoorBaseUrl ?? '',
    isActive: branch.isActive,
    latStr: latNum != null && Number.isFinite(latNum) ? String(latNum) : '',
    lngStr: lngNum != null && Number.isFinite(lngNum) ? String(lngNum) : '',
  }
}

function emptyForm(): BranchFormFields {
  return {
    organizationId: null,
    branchName: '',
    address: '',
    contactNumber: '',
    latitude: null,
    longitude: null,
    esp32DoorBaseUrl: '',
    isActive: true,
    latStr: '',
    lngStr: '',
  }
}

export function BranchesPage() {
  const { userName } = getDashboardUser()
  const queryClient = useQueryClient()
  const canManageBranches = authService.hasQrOwnerAccess()

  const [tab, setTab] = useState<TabFilter>('active')
  const [isAdding, setIsAdding] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [form, setForm] = useState<BranchFormFields>(emptyForm())
  const [formError, setFormError] = useState<string | null>(null)
  const [geoBusy, setGeoBusy] = useState(false)
  const [mapRefreshKey, setMapRefreshKey] = useState(0)
  const [newOrgName, setNewOrgName] = useState('')

  const branchesQuery = useQuery({
    queryKey: ['branches'],
    queryFn: async () => (await branchesService.list()).data,
    enabled: canManageBranches,
  })

  const orgQuery = useQuery({
    queryKey: ['branches', 'organizations'],
    queryFn: async () => (await branchesService.organizationOptions()).data,
    enabled: canManageBranches && (isAdding || editingId != null),
  })

  const list = branchesQuery.data ?? []
  const filtered = useMemo(() => {
    if (tab === 'active') return list.filter((b) => b.isActive)
    if (tab === 'inactive') return list.filter((b) => !b.isActive)
    return list
  }, [list, tab])

  const previewCoords = useMemo(() => {
    const parsed = coordsFromInputs(form.latStr, form.lngStr)
    if (!parsed.ok || parsed.latitude == null || parsed.longitude == null) return null
    return { lat: parsed.latitude, lng: parsed.longitude }
  }, [form.latStr, form.lngStr])

  const invalidateBranches = () => {
    queryClient.invalidateQueries({ queryKey: ['branches'] })
  }

  const createMut = useMutation({
    mutationFn: (body: BranchCreatePayload) => branchesService.create(body),
    onSuccess: () => {
      invalidateBranches()
      setIsAdding(false)
      setForm(emptyForm())
      setFormError(null)
    },
    onError: (e: unknown) => setFormError(errMsg(e)),
  })

  const updateMut = useMutation({
    mutationFn: ({ id, body }: { id: number; body: BranchUpdatePayload }) => branchesService.update(id, body),
    onSuccess: () => {
      invalidateBranches()
      setEditingId(null)
      setForm(emptyForm())
      setFormError(null)
    },
    onError: (e: unknown) => setFormError(errMsg(e)),
  })

  const deactivateMut = useMutation({
    mutationFn: (id: number) => branchesService.deactivate(id),
    onSuccess: () => invalidateBranches(),
  })

  const createOrgMut = useMutation({
    mutationFn: (name: string) =>
      organizationsService.create({ name: name.trim(), organizationType: 'Gym' }),
    onSuccess: (res) => {
      const created = res.data
      queryClient.invalidateQueries({ queryKey: ['branches', 'organizations'] })
      if (created?.id) {
        setForm((f) => ({ ...f, organizationId: created.id }))
      }
      setNewOrgName('')
      toast.success(`Organization "${created?.name ?? 'created'}" added.`)
    },
    onError: (e: unknown) => toast.error(errMsg(e)),
  })

  function buildPayload(f: BranchFormFields): BranchUpdatePayload | null {
    const coords = coordsFromInputs(f.latStr, f.lngStr)
    if (!coords.ok) {
      setFormError(coords.message)
      return null
    }
    const door = String(f.esp32DoorBaseUrl ?? '').trim()
    return {
      organizationId: f.organizationId ?? null,
      branchName: f.branchName.trim(),
      address: String(f.address ?? '').trim() || null,
      contactNumber: String(f.contactNumber ?? '').trim() || null,
      latitude: coords.latitude,
      longitude: coords.longitude,
      esp32DoorBaseUrl: door || null,
      isActive: f.isActive,
    }
  }

  function handleStartAdd() {
    setIsAdding(true)
    setEditingId(null)
    setForm(emptyForm())
    setFormError(null)
  }

  function handleStartEdit(b: BranchCrudDto) {
    setForm(toForm(b))
    setEditingId(b.id)
    setIsAdding(false)
    setFormError(null)
  }

  function handleCancel() {
    setIsAdding(false)
    setEditingId(null)
    setForm(emptyForm())
    setFormError(null)
  }

  function fillLocationFromDevice() {
    if (!window.isSecureContext) {
      setFormError(
        'GPS location needs HTTPS. On http://IP-only hosting, type latitude & longitude manually (see OpenStreetMap link after entering coords).',
      )
      return
    }
    if (!navigator.geolocation) {
      setFormError('This browser does not support geolocation.')
      return
    }
    setGeoBusy(true)
    setFormError(null)
    navigator.geolocation.getCurrentPosition(
      (p) => {
        const lat = p.coords.latitude
        const lng = p.coords.longitude
        setForm((f) => ({
          ...f,
          latitude: lat,
          longitude: lng,
          latStr: lat.toFixed(7),
          lngStr: lng.toFixed(7),
        }))
        setMapRefreshKey((k) => k + 1)
        setGeoBusy(false)
        toast.success('Location set — confirm on the map below.')
      },
      (err) => {
        setGeoBusy(false)
        const code = (err as GeolocationPositionError)?.code
        const detail =
          code === 1
            ? 'Permission denied — allow location for this site in the browser.'
            : code === 2
              ? 'Position unavailable.'
              : code === 3
                ? 'Timed out — try again near a window.'
                : 'Could not read location.'
        setFormError(detail)
      },
      { enableHighAccuracy: true, timeout: 15_000, maximumAge: 0 },
    )
  }

  function handleSubmitCreate(e: React.FormEvent) {
    e.preventDefault()
    setFormError(null)
    const payloadFull = buildPayload(form)
    if (!payloadFull) return
    if (!payloadFull.branchName.trim()) {
      setFormError('Branch name is required.')
      return
    }
    const createPayload: BranchCreatePayload = {
      organizationId: payloadFull.organizationId ?? null,
      branchName: payloadFull.branchName,
      address: payloadFull.address ?? null,
      contactNumber: payloadFull.contactNumber ?? null,
      latitude: payloadFull.latitude,
      longitude: payloadFull.longitude,
      esp32DoorBaseUrl: payloadFull.esp32DoorBaseUrl ?? null,
    }
    createMut.mutate(createPayload)
  }

  function handleSubmitUpdate(e: React.FormEvent) {
    e.preventDefault()
    if (editingId == null) return
    setFormError(null)
    const payload = buildPayload(form)
    if (!payload) return
    if (!payload.branchName.trim()) {
      setFormError('Branch name is required.')
      return
    }
    updateMut.mutate({ id: editingId, body: payload })
  }

  function confirmDeactivate(row: BranchCrudDto) {
    const name = row.branchName || `Branch #${row.id}`
    if (!window.confirm(`Deactivate "${name}"? It will disappear from QR and member dropdowns.`)) return
    deactivateMut.mutate(row.id)
  }

  if (!canManageBranches) {
    return <Navigate to="/dashboard" replace />
  }

  const tabBtn = (value: TabFilter, label: string) => (
    <button
      key={value}
      type="button"
      onClick={() => setTab(value)}
      className={`rounded-xl px-4 py-2 text-xs font-semibold transition ${
        tab === value
          ? 'bg-[linear-gradient(135deg,#3b82f6_0%,#a855f7_100%)] text-white shadow-lg shadow-purple-500/25'
          : 'border border-white/10 bg-white/5 text-slate-300 hover:bg-white/[0.08]'
      }`}
    >
      {label}
    </button>
  )

  return (
    <DashboardLayout userName={userName}>
      <DashboardSubpageShell
        eyebrow="Access"
        titleBefore="Branches "
        titleGradient="directory"
        subtitle="Manage locations, contacts, geo, door URLs, and active status."
        primaryAction={
          !isAdding && editingId == null ? { label: '+ Add branch', onClick: handleStartAdd } : undefined
        }
      >
        <p className="text-sm text-slate-400">
          For rotating venue QR pins and scans, open{' '}
          <Link className="text-blue-300 underline underline-offset-2 hover:text-blue-200" to="/dashboard/access/owner-qr">
            Owner QR
          </Link>
          .
        </p>

        <div className="glass-card dashboard-card rounded-2xl p-6">
          <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-white">Branch list</h2>
              <p className="text-sm text-slate-400">Deactivate keeps history; deletes are handled as soft-archive.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {tabBtn('active', 'Active')}
              {tabBtn('all', 'All')}
              {tabBtn('inactive', 'Inactive')}
            </div>
          </div>

          {(isAdding || editingId != null) && (
            <form
              onSubmit={isAdding ? handleSubmitCreate : handleSubmitUpdate}
              className="mb-6 rounded-2xl border border-white/10 bg-white/5 p-6"
            >
              <h3 className="mb-4 text-base font-semibold text-white">
                {isAdding ? 'New branch' : 'Edit branch'}
              </h3>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Input
                  label="Branch name"
                  value={form.branchName}
                  onChange={(e) => setForm((f) => ({ ...f, branchName: e.target.value }))}
                  placeholder="e.g. Downtown"
                  required
                />
                <div>
                  <label className={labelClass}>Organization (optional)</label>
                  <select
                    aria-label="Organization"
                    title="Organization"
                    value={form.organizationId ?? ''}
                    onChange={(e) => {
                      const v = e.target.value
                      setForm((f) => ({
                        ...f,
                        organizationId: v === '' ? null : Number(v),
                      }))
                    }}
                    className={selectClass}
                  >
                    <option value="" className="bg-slate-900">
                      None
                    </option>
                    {(orgQuery.data ?? []).map((o) => (
                      <option key={o.id} value={o.id} className="bg-slate-900">
                        {o.name}
                      </option>
                    ))}
                  </select>
                  {orgQuery.isError && (
                    <p className="mt-1 text-xs text-rose-300" role="alert">
                      Organizations could not be loaded ({errMsg(orgQuery.error)})
                    </p>
                  )}
                  {orgQuery.isSuccess && (!orgQuery.data || orgQuery.data.length === 0) && (
                    <p className="mt-1 text-xs text-amber-200/90">
                      No organizations yet — create one below or leave as &quot;None&quot;.
                    </p>
                  )}
                  <div className="mt-2 flex flex-wrap items-end gap-2">
                    <div className="min-w-[12rem] flex-1">
                      <label className="mb-1 block text-[10px] font-medium uppercase tracking-wider text-slate-500">
                        New organization
                      </label>
                      <input
                        type="text"
                        value={newOrgName}
                        onChange={(e) => setNewOrgName(e.target.value)}
                        placeholder="e.g. PulseFit Gym"
                        className={selectClass}
                      />
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      isLoading={createOrgMut.isPending}
                      disabled={!newOrgName.trim()}
                      onClick={() => createOrgMut.mutate(newOrgName)}
                    >
                      Add organization
                    </Button>
                  </div>
                </div>
                <Input
                  label="Address (optional)"
                  value={String(form.address ?? '')}
                  onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                />
                <Input
                  label="Contact number (optional)"
                  value={String(form.contactNumber ?? '')}
                  onChange={(e) => setForm((f) => ({ ...f, contactNumber: e.target.value }))}
                />
                <Input
                  label="Latitude (optional)"
                  value={form.latStr}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      latStr: e.target.value,
                    }))
                  }
                  placeholder="-90 … 90"
                />
                <Input
                  label="Longitude (optional)"
                  value={form.lngStr}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      lngStr: e.target.value,
                    }))
                  }
                  placeholder="-180 … 180"
                />
                <div className="sm:col-span-2 flex flex-col gap-1.5">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    isLoading={geoBusy}
                    onClick={fillLocationFromDevice}
                    className="w-fit"
                  >
                    <MapPin className="size-4 shrink-0" aria-hidden />
                    Use my current location
                  </Button>
                  <p className="text-xs text-slate-500">
                    Fills latitude &amp; longitude (WGS84) from this device — same idea as{' '}
                    <Link className="text-sky-300 underline underline-offset-2 hover:text-sky-200" to="/dashboard/access/scan">
                      Scan to enter
                    </Link>
                    . You still need to click {isAdding ? 'Create branch' : 'Save changes'}.
                  </p>
                  {previewCoords ? (
                    <LocationPreviewMap
                      latitude={previewCoords.lat}
                      longitude={previewCoords.lng}
                      refreshKey={mapRefreshKey}
                      className="mt-2"
                    />
                  ) : (
                    <p className="mt-1 text-xs text-slate-600">
                      Enter coordinates or use current location to preview the branch on a map.
                    </p>
                  )}
                </div>
                <Input
                  className="sm:col-span-2"
                  label="ESP32 door base URL (optional)"
                  value={String(form.esp32DoorBaseUrl ?? '')}
                  onChange={(e) => setForm((f) => ({ ...f, esp32DoorBaseUrl: e.target.value }))}
                  placeholder="http://192.168.1.50 — no trailing /unlock"
                />
                {!isAdding && (
                  <label className="flex cursor-pointer items-center gap-3 sm:col-span-2">
                    <input
                      type="checkbox"
                      checked={form.isActive}
                      onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
                      className="h-4 w-4 rounded border-white/20 bg-white/5 text-blue-500 focus:ring-blue-400/40"
                    />
                    <span className="text-sm font-medium text-slate-300">Branch is active</span>
                  </label>
                )}
              </div>

              {formError && (
                <p className="mt-3 rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-200" role="alert">
                  {formError}
                </p>
              )}

              <div className="mt-4 flex flex-wrap gap-2">
                <Button type="submit" size="md" isLoading={createMut.isPending || updateMut.isPending}>
                  {isAdding ? 'Create branch' : 'Save changes'}
                </Button>
                <Button type="button" variant="secondary" size="md" onClick={handleCancel}>
                  Cancel
                </Button>
              </div>
            </form>
          )}

          {branchesQuery.isError && (
            <p className="mb-4 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-100" role="alert">
              Branch list failed to load: {errMsg(branchesQuery.error)}
            </p>
          )}
          {branchesQuery.isLoading ? (
            <p className="text-slate-400">Loading branches…</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead>
                  <tr className="border-b border-white/10 text-xs font-semibold uppercase tracking-wider text-slate-400">
                    <th className="px-2 py-3 pr-3 font-medium">Name</th>
                    <th className="px-2 py-3 pr-3 font-medium">Organization</th>
                    <th className="px-2 py-3 pr-3 font-medium">Geo</th>
                    <th className="px-2 py-3 pr-3 font-medium">Door</th>
                    <th className="px-2 py-3 pr-3 font-medium">Status</th>
                    <th className="px-2 py-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((row) => {
                    const hasGeo =
                      row.latitude != null &&
                      row.longitude != null &&
                      Number.isFinite(row.latitude) &&
                      Number.isFinite(row.longitude)
                    const doorSet = !!(row.esp32DoorBaseUrl && String(row.esp32DoorBaseUrl).trim())
                    return (
                      <tr key={row.id} className="border-b border-white/5 transition-colors hover:bg-white/[0.03]">
                        <td className="py-3 pr-3">
                          <span className="font-medium text-white">{row.branchName}</span>
                          <p className="text-[11px] text-slate-500">#{row.id}</p>
                        </td>
                        <td className="py-3 pr-3 text-slate-300">
                          {row.organizationName ?? (row.organizationId != null ? `ID ${row.organizationId}` : '—')}
                        </td>
                        <td className="py-3 pr-3">
                          <span
                            className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                              hasGeo
                                ? 'bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/30'
                                : 'bg-white/5 text-slate-400 ring-1 ring-white/10'
                            }`}
                          >
                            {hasGeo ? `${row.latitude}, ${row.longitude}` : 'Not set'}
                          </span>
                        </td>
                        <td className="py-3 pr-3">
                          <span
                            className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                              doorSet ? 'bg-sky-500/15 text-sky-300 ring-1 ring-sky-500/30' : 'bg-white/5 text-slate-400 ring-1 ring-white/10'
                            }`}
                          >
                            {doorSet ? 'Custom URL' : 'Default'}
                          </span>
                        </td>
                        <td className="py-3 pr-3">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                              row.isActive
                                ? 'bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/30'
                                : 'bg-white/5 text-slate-400 ring-1 ring-white/10'
                            }`}
                          >
                            {row.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="py-3">
                          <span className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => handleStartEdit(row)}
                              className="text-sm text-blue-300 transition hover:text-blue-200 hover:underline"
                            >
                              Edit
                            </button>
                            {row.isActive ? (
                              <button
                                type="button"
                                onClick={() => confirmDeactivate(row)}
                                className="text-sm text-amber-300 transition hover:text-amber-200 hover:underline disabled:opacity-50"
                                disabled={deactivateMut.isPending}
                              >
                                Deactivate
                              </button>
                            ) : null}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
              {filtered.length === 0 && (
                <p className="py-8 text-center text-slate-400">No branches for this tab.</p>
              )}
            </div>
          )}
        </div>
      </DashboardSubpageShell>
    </DashboardLayout>
  )
}
