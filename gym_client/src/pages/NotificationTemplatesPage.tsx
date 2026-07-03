import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { DashboardLayout } from '../components/layout/DashboardLayout'
import { DashboardSubpageShell } from '../components/layout/DashboardSubpageShell'
import { PermissionGate } from '../components/auth/PermissionGate'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Modal } from '../components/ui/Modal'
import { authService } from '../services/auth.service'
import { notificationTemplatesService } from '../services/notificationTemplates.service'
import { getApiErrorMessage } from '../lib/apiErrors'
import { NOTIFICATION_PLACEHOLDERS, type NotificationTemplate } from '../types/notificationTemplate'

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

export function NotificationTemplatesPage() {
  const { userName } = getDashboardUser()
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [channel, setChannel] = useState('')
  const [page, setPage] = useState(1)
  const [editing, setEditing] = useState<NotificationTemplate | null>(null)
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [isActive, setIsActive] = useState(true)
  const [previewHtml, setPreviewHtml] = useState<string | null>(null)
  const [previewMode, setPreviewMode] = useState<'desktop' | 'mobile'>('desktop')
  const [testRecipient, setTestRecipient] = useState('')

  const queryKey = useMemo(() => ['notification-templates', search, channel, page], [search, channel, page])

  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: async () => {
      const { data: d } = await notificationTemplatesService.list({
        search: search || undefined,
        channel: channel || undefined,
        page,
        pageSize: 20,
      })
      return d
    },
  })

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!editing) throw new Error('No template')
      const { data: d } = await notificationTemplatesService.update(editing.id, {
        subject,
        body,
        isActive,
      })
      return d
    },
    onSuccess: () => {
      toast.success('Template saved')
      setEditing(null)
      queryClient.invalidateQueries({ queryKey: ['notification-templates'] })
    },
    onError: (e) => toast.error(getApiErrorMessage(e, 'Could not save template')),
  })

  const resetMutation = useMutation({
    mutationFn: (id: number) => notificationTemplatesService.reset(id),
    onSuccess: () => {
      toast.success('Template reset to default')
      queryClient.invalidateQueries({ queryKey: ['notification-templates'] })
    },
    onError: (e) => toast.error(getApiErrorMessage(e, 'Could not reset template')),
  })

  const previewMutation = useMutation({
    mutationFn: (id: number) => notificationTemplatesService.preview(id),
    onSuccess: ({ data: d }) => setPreviewHtml(d.body),
    onError: (e) => toast.error(getApiErrorMessage(e, 'Could not preview')),
  })

  const testMutation = useMutation({
    mutationFn: ({ id, recipient }: { id: number; recipient: string }) =>
      notificationTemplatesService.testSend(id, recipient),
    onSuccess: () => toast.success('Test notification sent'),
    onError: (e) => toast.error(getApiErrorMessage(e, 'Test send failed')),
  })

  function openEdit(row: NotificationTemplate) {
    setEditing(row)
    setSubject(row.subject ?? '')
    setBody(row.body)
    setIsActive(row.isActive)
    setTestRecipient('')
  }

  function insertPlaceholder(name: string) {
    setBody((b) => `${b}{{${name}}}`)
  }

  const items = data?.items ?? []
  const total = data?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / 20))

  return (
    <DashboardLayout userName={userName}>
      <PermissionGate permission={authService.permissionCodes.config} fallback={<p className="p-6 text-slate-400">Config permission required.</p>}>
        <DashboardSubpageShell
          eyebrow="Config"
          titleGradient="Notification templates"
          subtitle="Manage HTML email and SMS templates. Edits apply to all future notifications."
          showExport={false}
        >
          <div className="mb-4 flex flex-wrap gap-3">
            <Input
              placeholder="Search templates…"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setPage(1)
              }}
              className="max-w-xs"
            />
            <select
              value={channel}
              onChange={(e) => {
                setChannel(e.target.value)
                setPage(1)
              }}
              className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
            >
              <option value="">All channels</option>
              <option value="Email">Email</option>
              <option value="SMS">SMS</option>
            </select>
          </div>

          {isLoading ? (
            <p className="text-slate-400">Loading templates…</p>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-white/10">
              <table className="min-w-[720px] w-full text-left text-sm">
                <thead className="border-b border-white/10 bg-white/[0.04] text-xs uppercase text-slate-400">
                  <tr>
                    <th className="px-4 py-3">Code</th>
                    <th className="px-4 py-3">Name</th>
                    <th className="px-4 py-3">Channel</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {items.map((row) => (
                    <tr key={row.id} className="hover:bg-white/[0.03]">
                      <td className="px-4 py-3 font-mono text-xs text-slate-300">{row.templateCode}</td>
                      <td className="px-4 py-3 text-white">{row.templateName}</td>
                      <td className="px-4 py-3 text-slate-300">{row.channel}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full border px-2 py-0.5 text-xs ${row.isActive ? 'border-emerald-500/40 text-emerald-200' : 'border-slate-500/40 text-slate-400'}`}
                        >
                          {row.isActive ? 'Active' : 'Disabled'}
                        </span>
                        {row.isCustomized && (
                          <span className="ml-2 text-xs text-amber-300/80">Customized</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          <Button type="button" variant="ghost" className="!py-1 !text-xs" onClick={() => openEdit(row)}>
                            Edit
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            className="!py-1 !text-xs"
                            onClick={() => previewMutation.mutate(row.id)}
                          >
                            Preview
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            className="!py-1 !text-xs"
                            onClick={() => resetMutation.mutate(row.id)}
                          >
                            Reset
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="mt-4 flex items-center justify-between text-sm text-slate-400">
            <span>
              Page {page} of {totalPages} ({total} templates)
            </span>
            <div className="flex gap-2">
              <Button type="button" variant="ghost" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                Previous
              </Button>
              <Button type="button" variant="ghost" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                Next
              </Button>
            </div>
          </div>
        </DashboardSubpageShell>

        <Modal open={!!editing} onClose={() => setEditing(null)} title={`Edit — ${editing?.templateName ?? ''}`}>
          {editing && (
            <div className="space-y-4">
              {editing.channel === 'Email' && (
                <div>
                  <label className="mb-1 block text-xs text-slate-400">Subject</label>
                  <Input value={subject} onChange={(e) => setSubject(e.target.value)} />
                </div>
              )}
              <div>
                <label className="mb-1 block text-xs text-slate-400">Body</label>
                <textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  rows={editing.isHtml ? 16 : 6}
                  className="w-full rounded-xl border border-white/10 bg-black/30 p-3 font-mono text-xs text-slate-200"
                />
              </div>
              <div>
                <p className="mb-2 text-xs font-semibold uppercase text-slate-500">Insert placeholder</p>
                <div className="flex flex-wrap gap-1">
                  {NOTIFICATION_PLACEHOLDERS.map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => insertPlaceholder(p)}
                      className="rounded-lg border border-white/10 px-2 py-0.5 text-[11px] text-slate-300 hover:bg-white/10"
                    >
                      {`{{${p}}}`}
                    </button>
                  ))}
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm text-slate-300">
                <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
                Active
              </label>
              <div className="flex flex-wrap gap-2 border-t border-white/10 pt-4">
                <Input
                  placeholder={editing.channel === 'Email' ? 'Test email address' : 'Test phone'}
                  value={testRecipient}
                  onChange={(e) => setTestRecipient(e.target.value)}
                  className="flex-1 min-w-[200px]"
                />
                <Button
                  type="button"
                  variant="secondary"
                  disabled={!testRecipient.trim() || testMutation.isPending}
                  onClick={() => testMutation.mutate({ id: editing.id, recipient: testRecipient.trim() })}
                >
                  Test send
                </Button>
                <Button type="button" onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
                  Save
                </Button>
              </div>
            </div>
          )}
        </Modal>

        <Modal open={previewHtml != null} onClose={() => setPreviewHtml(null)} title="Template preview">
          <div className="mb-3 flex gap-2">
            <Button type="button" variant={previewMode === 'desktop' ? 'primary' : 'ghost'} onClick={() => setPreviewMode('desktop')}>
              Desktop
            </Button>
            <Button type="button" variant={previewMode === 'mobile' ? 'primary' : 'ghost'} onClick={() => setPreviewMode('mobile')}>
              Mobile
            </Button>
          </div>
          <div
            className={`mx-auto overflow-auto rounded-xl border border-white/10 bg-white ${previewMode === 'mobile' ? 'max-w-[375px]' : 'w-full'}`}
            style={{ minHeight: 320 }}
          >
            {previewHtml && (
              <iframe title="preview" srcDoc={previewHtml} className="h-[480px] w-full border-0" sandbox="" />
            )}
          </div>
        </Modal>
      </PermissionGate>
    </DashboardLayout>
  )
}
