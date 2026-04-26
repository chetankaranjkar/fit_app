import { useState, useRef, useLayoutEffect, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { DashboardLayout } from '../../components/layout/DashboardLayout'
import { DashboardSubpageShell } from '../../components/layout/DashboardSubpageShell'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Modal } from '../../components/ui/Modal'
import { Textarea } from '../../components/ui/Textarea'
import { bodyPartsService, bodyPartMusclesService } from '../../services/bodyParts.service'
import type {
  BodyPart,
  BodyPartMuscle,
  CreateBodyPartDto,
  UpdateBodyPartDto,
  UpdateBodyPartMuscleDto,
} from '../../types/bodyPart'

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

/** Muscle tag: hover shows rich preview (portal); click opens full detail modal */
function MusclePill({
  muscle,
  parentName,
  onOpen,
}: {
  muscle: BodyPartMuscle
  parentName?: string
  onOpen: () => void
}) {
  const btnRef = useRef<HTMLButtonElement>(null)
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [hoverOpen, setHoverOpen] = useState(false)
  const [tipPos, setTipPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 })

  const clampTipCenterX = (centerX: number) => {
    const vw = typeof window !== 'undefined' ? window.innerWidth : 400
    const tipW = Math.min(288, vw - 16)
    const half = tipW / 2
    const margin = 8
    return Math.min(Math.max(centerX, half + margin), vw - half - margin)
  }

  const clearHideTimer = () => {
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current)
      hideTimerRef.current = null
    }
  }

  const scheduleHide = () => {
    clearHideTimer()
    hideTimerRef.current = setTimeout(() => setHoverOpen(false), 140)
  }

  const showHover = () => {
    clearHideTimer()
    const el = btnRef.current
    if (el) {
      const rect = el.getBoundingClientRect()
      setTipPos({ top: rect.top, left: clampTipCenterX(rect.left + rect.width / 2) })
    }
    setHoverOpen(true)
  }

  useLayoutEffect(() => {
    if (!hoverOpen || !btnRef.current) return
    const update = () => {
      const el = btnRef.current
      if (!el) return
      const rect = el.getBoundingClientRect()
      setTipPos({ top: rect.top, left: clampTipCenterX(rect.left + rect.width / 2) })
    }
    update()
    window.addEventListener('scroll', update, true)
    window.addEventListener('resize', update)
    return () => {
      window.removeEventListener('scroll', update, true)
      window.removeEventListener('resize', update)
    }
  }, [hoverOpen])

  useEffect(() => () => clearHideTimer(), [])

  const tooltip =
    hoverOpen &&
    createPortal(
      <div
        className="fixed z-[150] w-[min(288px,calc(100vw-1rem))] pointer-events-auto"
        style={{
          top: tipPos.top,
          left: tipPos.left,
          transform: 'translate(-50%, calc(-100% - 10px))',
        }}
        onMouseEnter={showHover}
        onMouseLeave={scheduleHide}
        role="tooltip"
      >
        <div className="overflow-hidden rounded-xl border border-white/15 bg-[rgba(14,14,32,0.96)] shadow-[0_16px_50px_-12px_rgba(0,0,0,0.65)] ring-1 ring-white/10 backdrop-blur-xl">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-blue-400/50 to-transparent" aria-hidden />
          {muscle.imageUrl ? (
            <div className="relative h-24 w-full bg-black/30">
              <img
                src={muscle.imageUrl}
                alt=""
                className="size-full object-cover"
                onError={(e) => {
                  ;(e.target as HTMLImageElement).style.display = 'none'
                }}
              />
              <div
                className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[rgba(14,14,32,0.95)] to-transparent"
                aria-hidden
              />
            </div>
          ) : (
            <div
              className="flex h-20 items-center justify-center bg-gradient-to-br from-blue-500/25 via-indigo-500/10 to-purple-600/30"
              aria-hidden
            >
              <span className="text-3xl font-bold text-white/35">{muscle.name.slice(0, 1).toUpperCase()}</span>
            </div>
          )}
          <div className="space-y-1.5 px-3 pb-3 pt-2">
            {parentName && (
              <span className="inline-flex rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-slate-300 ring-1 ring-white/10">
                {parentName}
              </span>
            )}
            <p className="text-sm font-semibold leading-tight text-white">{muscle.name}</p>
            {muscle.description?.trim() ? (
              <p className="line-clamp-4 text-xs leading-relaxed text-slate-400">{muscle.description}</p>
            ) : (
              <p className="text-xs italic text-slate-600">No description</p>
            )}
            <p className="border-t border-white/10 pt-2 text-[11px] font-medium text-blue-400/90">Click for full details</p>
          </div>
        </div>
      </div>,
      document.body
    )

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          setHoverOpen(false)
          onOpen()
        }}
        onMouseEnter={showHover}
        onMouseLeave={scheduleHide}
        className="inline-flex cursor-pointer rounded-full bg-gradient-to-r from-blue-500/15 to-purple-500/15 px-2.5 py-1 text-xs font-medium text-slate-200 ring-1 ring-white/15 transition hover:from-blue-500/25 hover:to-purple-500/25 hover:text-white hover:ring-blue-400/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/50"
      >
        {muscle.name}
      </button>
      {tooltip}
    </>
  )
}

function BodyPartRow({
  bp,
  onStartEdit,
  onDelete,
  onStartAddBodyMuscle,
  onViewMuscles,
  onMuscleDetail,
}: {
  bp: BodyPart
  onStartEdit: (bp: BodyPart) => void
  onDelete: (id: number, name: string) => void
  onStartAddBodyMuscle: (parent: BodyPart) => void
  onViewMuscles: (parent: BodyPart) => void
  onMuscleDetail: (muscle: BodyPartMuscle, parentName: string) => void
}) {
  const displayImageUrl = bp.imageUrl ?? ''
  const muscles = bp.bodyPartMuscles ?? []

  return (
    <tr className="border-b border-white/5 transition-colors hover:bg-white/[0.03]">
      <td className="py-2 pr-4 align-middle">
        <span className="font-medium text-white">{bp.name}</span>
      </td>
        <td className="py-2 pr-4 text-slate-300 whitespace-pre-wrap">{bp.description ?? '—'}</td>
      <td className="py-2 pr-4 align-middle">
        {displayImageUrl ? (
          <a
            href={displayImageUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-blue-300 hover:text-blue-200 hover:underline"
          >
            <img
              src={displayImageUrl}
              alt=""
              className="size-10 rounded object-cover ring-1 ring-white/10"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
            />
            View
          </a>
        ) : (
          <span className="text-slate-500">—</span>
        )}
      </td>
      <td className="py-2 pr-4 align-middle">
        <div className="flex flex-wrap items-center gap-2">
          {muscles.length > 0 ? (
            <>
              {muscles.map((m) => (
                <MusclePill
                  key={m.id}
                  muscle={m}
                  parentName={bp.name}
                  onOpen={() => onMuscleDetail(m, bp.name)}
                />
              ))}
              <button
                type="button"
                onClick={() => onViewMuscles(bp)}
                className="text-blue-300 hover:text-blue-200 hover:underline text-sm"
              >
                View
              </button>
            </>
          ) : (
            <span className="text-slate-500">—</span>
          )}
        </div>
      </td>
      <td className="py-2 pr-4 text-slate-300">{bp.exerciseCount}</td>
      <td className="py-2">
        <span className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => onStartAddBodyMuscle(bp)}
            className="text-blue-300 hover:text-blue-200 hover:underline"
          >
            Add body muscle
          </button>
          <button type="button" onClick={() => onStartEdit(bp)} className="text-blue-300 hover:text-blue-200 hover:underline">
            Edit
          </button>
          <button
            type="button"
            onClick={() => onDelete(bp.id, bp.name)}
            className="text-rose-300 hover:text-rose-200 hover:underline"
          >
            Delete
          </button>
        </span>
      </td>
    </tr>
  )
}

export function BodyPartsPage() {
  const { userName } = getDashboardUser()
  const queryClient = useQueryClient()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const addFormFileInputRef = useRef<HTMLInputElement>(null)
  const [isAdding, setIsAdding] = useState(false)
  const [parentForAdd, setParentForAdd] = useState<BodyPart | null>(null)
  const [formName, setFormName] = useState('')
  const [formDescription, setFormDescription] = useState('')
  const [formImageUrl, setFormImageUrl] = useState('')
  const [addFormSelectedFile, setAddFormSelectedFile] = useState<File | null>(null)
  const [addFormUploadError, setAddFormUploadError] = useState<string | null>(null)
  const [addFormSubmitting, setAddFormSubmitting] = useState(false)

  const [editingBodyPart, setEditingBodyPart] = useState<BodyPart | null>(null)
  const [editingMuscle, setEditingMuscle] = useState<BodyPartMuscle | null>(null)
  const [modalName, setModalName] = useState('')
  const [modalDescription, setModalDescription] = useState('')
  const [modalImageUrl, setModalImageUrl] = useState('')
  const [modalSelectedFile, setModalSelectedFile] = useState<File | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)

  const [viewMusclesFor, setViewMusclesFor] = useState<BodyPart | null>(null)
  const [muscleDetail, setMuscleDetail] = useState<{ muscle: BodyPartMuscle; parentName: string } | null>(null)

  const { data: bodyParts = [], isLoading, error } = useQuery({
    queryKey: ['bodyParts'],
    queryFn: async () => {
      const { data } = await bodyPartsService.getAll()
      return Array.isArray(data) ? data : []
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, dto }: { id: number; dto: UpdateBodyPartDto }) =>
      bodyPartsService.update(id, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bodyParts'] })
      setEditingBodyPart(null)
      setEditingMuscle(null)
      setModalName('')
      setModalDescription('')
      setModalImageUrl('')
      setModalSelectedFile(null)
      setUploadError(null)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => bodyPartsService.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['bodyParts'] }),
  })

  const handleStartAdd = (parent: BodyPart | null = null) => {
    setIsAdding(true)
    setParentForAdd(parent ?? null)
    setFormName('')
    setFormDescription('')
    setFormImageUrl('')
    setAddFormSelectedFile(null)
    setAddFormUploadError(null)
    if (addFormFileInputRef.current) addFormFileInputRef.current.value = ''
  }

  const handleCancelForm = () => {
    setIsAdding(false)
    setParentForAdd(null)
    setFormName('')
    setFormDescription('')
    setFormImageUrl('')
    setAddFormSelectedFile(null)
    setAddFormUploadError(null)
  }

  const handleOpenEditModal = (bp: BodyPart) => {
    setEditingMuscle(null)
    setEditingBodyPart(bp)
    setModalName(bp.name)
    setModalDescription(bp.description ?? '')
    setModalImageUrl(bp.imageUrl ?? '')
    setModalSelectedFile(null)
    setUploadError(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleOpenEditMuscleModal = (muscle: BodyPartMuscle) => {
    setMuscleDetail(null)
    setViewMusclesFor(null)
    setEditingBodyPart(null)
    setEditingMuscle(muscle)
    setModalName(muscle.name)
    setModalDescription(muscle.description ?? '')
    setModalImageUrl(muscle.imageUrl ?? '')
    setModalSelectedFile(null)
    setUploadError(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleCloseEditModal = () => {
    setEditingBodyPart(null)
    setEditingMuscle(null)
    setModalName('')
    setModalDescription('')
    setModalImageUrl('')
    setModalSelectedFile(null)
    setUploadError(null)
  }

  const handleViewMuscles = (parent: BodyPart) => {
    setViewMusclesFor(parent)
  }

  const handleCloseViewMuscles = () => {
    setViewMusclesFor(null)
  }

  const handleEditMuscleFromView = (muscle: BodyPartMuscle) => {
    handleOpenEditMuscleModal(muscle)
  }

  const handleDeleteMuscle = (id: number, name: string) => {
    if (!window.confirm(`Delete muscle "${name}"?`)) return
    bodyPartMusclesService.delete(id).then(() => {
      queryClient.invalidateQueries({ queryKey: ['bodyParts'] })
      setViewMusclesFor(null)
    })
  }

  const handleSubmitAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formName.trim()) return
    setAddFormUploadError(null)
    setAddFormSubmitting(true)
    try {
      if (parentForAdd) {
        const createRes = await bodyPartMusclesService.create({
          bodyPartId: parentForAdd.id,
          name: formName.trim(),
          description: formDescription.trim() || undefined,
          imageUrl: formImageUrl.trim() || undefined,
        })
        const created = createRes.data
        if (addFormSelectedFile) {
          const uploadRes = await bodyPartMusclesService.uploadImage(created.id, addFormSelectedFile)
          const imageUrl = uploadRes.data?.imageUrl
          if (imageUrl) {
            await bodyPartMusclesService.update(created.id, {
              name: created.name,
              description: created.description ?? undefined,
              imageUrl,
            })
          }
        }
      } else {
        const dto: CreateBodyPartDto = {
          name: formName.trim(),
          description: formDescription.trim() || undefined,
          imageUrl: formImageUrl.trim() || undefined,
        }
        const createRes = await bodyPartsService.create(dto)
        const created = createRes.data
        if (addFormSelectedFile) {
          const uploadRes = await bodyPartsService.uploadImage(created.id, addFormSelectedFile)
          const imageUrl = uploadRes.data?.imageUrl
          if (imageUrl) {
            await bodyPartsService.update(created.id, {
              name: created.name,
              description: created.description ?? undefined,
              imageUrl,
            })
          }
        }
      }
      queryClient.invalidateQueries({ queryKey: ['bodyParts'] })
      setIsAdding(false)
      setParentForAdd(null)
      setFormName('')
      setFormDescription('')
      setFormImageUrl('')
      setAddFormSelectedFile(null)
      if (addFormFileInputRef.current) addFormFileInputRef.current.value = ''
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save'
      setAddFormUploadError(message)
    } finally {
      setAddFormSubmitting(false)
    }
  }

  const handleSubmitEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!modalName.trim()) return
    setUploadError(null)
    let imageUrl = modalImageUrl.trim() || undefined

    if (editingMuscle) {
      if (modalSelectedFile) {
        try {
          const { data } = await bodyPartMusclesService.uploadImage(editingMuscle.id, modalSelectedFile)
          imageUrl = data?.imageUrl ?? imageUrl
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Image upload failed'
          setUploadError(message)
          return
        }
      }
      const dto: UpdateBodyPartMuscleDto = {
        name: modalName.trim(),
        description: modalDescription.trim() || undefined,
        imageUrl,
      }
      await bodyPartMusclesService.update(editingMuscle.id, dto)
      queryClient.invalidateQueries({ queryKey: ['bodyParts'] })
      handleCloseEditModal()
      return
    }

    if (!editingBodyPart) return
    if (modalSelectedFile) {
      try {
        const { data } = await bodyPartsService.uploadImage(editingBodyPart.id, modalSelectedFile)
        imageUrl = data?.imageUrl ?? imageUrl
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Image upload failed'
        setUploadError(message)
        return
      }
    }

    updateMutation.mutate({
      id: editingBodyPart.id,
      dto: {
        name: modalName.trim(),
        description: modalDescription.trim() || undefined,
        imageUrl,
      },
    })
  }

  const handleDelete = (id: number, name: string) => {
    if (!window.confirm(`Delete "${name}"? Body muscles under it must be deleted first.`)) return
    deleteMutation.mutate(id)
  }

  return (
    <DashboardLayout userName={userName}>
      <DashboardSubpageShell
        eyebrow="Training"
        titleGradient="body parts"
        subtitle="Define anatomical groups and muscles for exercise tagging."
        showExport={false}
      >
        <div className="glass-card dashboard-card mb-6 min-w-0 rounded-2xl p-6">
          <h2 className="mb-4 border-b border-white/10 pb-3 text-lg font-semibold text-white">
            Body parts & body muscles
          </h2>
          <p className="mb-4 text-sm text-slate-400">
            Add top-level parts (e.g. Shoulders, Chest) and body muscles under them (e.g. Deltoid under Shoulders).
          </p>
          <div className="mb-4 flex flex-wrap gap-2">
            <Button onClick={() => handleStartAdd(null)} size="sm">
              Add top-level body part
            </Button>
          </div>

          {isAdding && (
            <form onSubmit={handleSubmitAdd} className="mb-6 rounded-xl border border-white/10 bg-white/5 p-4">
              <h3 className="mb-3 text-sm font-semibold text-slate-200">
                {parentForAdd ? `New body muscle under "${parentForAdd.name}"` : 'New body part'}
              </h3>
              {parentForAdd && (parentForAdd.bodyPartMuscles?.length ?? 0) > 0 && (
                <div className="mb-4">
                  <p className="mb-2 text-xs font-medium text-slate-400">Existing muscles under "{parentForAdd.name}":</p>
                  <div className="flex flex-wrap gap-2">
                    {parentForAdd.bodyPartMuscles!.map((m) => (
                      <MusclePill
                        key={m.id}
                        muscle={m}
                        parentName={parentForAdd.name}
                        onOpen={() => setMuscleDetail({ muscle: m, parentName: parentForAdd.name })}
                      />
                    ))}
                  </div>
                </div>
              )}
              <div className="flex flex-wrap gap-3">
                <Input
                  label="Name"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder={parentForAdd ? 'e.g. Deltoid' : 'e.g. Shoulders'}
                  required
                />
                <Textarea
                  label="Description (multi-line supported)"
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Optional description — multiple lines allowed"
                  rows={3}
                />
                <div className="w-full">
                  <label className="mb-1 block text-xs font-medium uppercase tracking-wider text-slate-400">Picture (optional)</label>
                  <p className="mb-2 text-xs text-slate-500">
                    Upload an image (saved to server) or enter a URL. Works for both body parts and body muscles.
                  </p>
                  <div className="flex flex-wrap gap-3">
                    <input
                      ref={addFormFileInputRef}
                      type="file"
                      accept=".jpg,.jpeg,.png,.gif,.webp"
                      onChange={(e) => setAddFormSelectedFile(e.target.files?.[0] ?? null)}
                      className="block text-sm text-slate-400 file:mr-2 file:rounded file:border-0 file:bg-white/10 file:px-3 file:py-1.5 file:text-slate-200 file:transition-colors hover:file:bg-white/20"
                      aria-label="Upload image"
                    />
                    <Input
                      label="Or picture URL"
                      value={formImageUrl}
                      onChange={(e) => setFormImageUrl(e.target.value)}
                      placeholder="https://…"
                    />
                  </div>
                  {addFormSelectedFile && (
                    <p className="mt-1 text-sm text-slate-300">
                      Will upload: <strong className="text-white">{addFormSelectedFile.name}</strong>
                    </p>
                  )}
                </div>
                {addFormUploadError && (
                  <p className="w-full text-sm text-rose-300">{addFormUploadError}</p>
                )}
                <div className="flex items-end gap-2">
                  <Button type="submit" size="md" isLoading={addFormSubmitting}>
                    Save
                  </Button>
                  <Button type="button" variant="secondary" size="md" onClick={handleCancelForm}>
                    Cancel
                  </Button>
                </div>
              </div>
            </form>
          )}

          {error && (
            <p className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-300">
              {error instanceof Error ? error.message : 'Failed to load body parts'}
            </p>
          )}
          {isLoading && <p className="text-slate-400">Loading…</p>}
          {!isLoading && !error && (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[320px] text-left text-sm">
                <thead>
                  <tr className="border-b border-white/10 text-xs uppercase tracking-wider text-slate-400">
                    <th className="pb-2 pr-4 font-medium">Name</th>
                    <th className="pb-2 pr-4 font-medium">Description</th>
                    <th className="pb-2 pr-4 font-medium">Picture</th>
                    <th className="pb-2 pr-4 font-medium">Muscles</th>
                    <th className="pb-2 pr-4 font-medium">Exercises</th>
                    <th className="pb-2 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {bodyParts.map((bp) => (
                    <BodyPartRow
                      key={bp.id}
                      bp={bp}
                      onStartEdit={handleOpenEditModal}
                      onDelete={handleDelete}
                      onStartAddBodyMuscle={(parent) => handleStartAdd(parent)}
                      onViewMuscles={handleViewMuscles}
                      onMuscleDetail={(muscle, parentName) => setMuscleDetail({ muscle, parentName })}
                    />
                  ))}
                </tbody>
              </table>
              {bodyParts.length === 0 && (
                <p className="py-6 text-center text-slate-500">No body parts yet. Add one above.</p>
              )}
            </div>
          )}
        </div>
      </DashboardSubpageShell>

      <Modal
        open={editingBodyPart !== null || editingMuscle !== null}
        onClose={handleCloseEditModal}
        title={editingMuscle ? `Edit muscle: ${editingMuscle.name}` : editingBodyPart ? `Edit: ${editingBodyPart.name}` : 'Edit'}
      >
        <form onSubmit={handleSubmitEdit} className="space-y-4">
          <Input
            label="Name"
            value={modalName}
            onChange={(e) => setModalName(e.target.value)}
            placeholder="e.g. Shoulders"
            required
          />
          <Textarea
            label="Description (multi-line supported)"
            value={modalDescription}
            onChange={(e) => setModalDescription(e.target.value)}
            placeholder="Optional description — multiple lines allowed"
            rows={3}
          />
          <div>
            <label className="mb-1 block text-xs font-medium uppercase tracking-wider text-slate-400">Picture</label>
            <p className="mb-2 text-xs text-slate-500">
              Upload an image (saved to server folder) or enter a URL. Optional.
            </p>
            <div className="space-y-2">
              <input
                ref={fileInputRef}
                type="file"
                accept=".jpg,.jpeg,.png,.gif,.webp"
                onChange={(e) => setModalSelectedFile(e.target.files?.[0] ?? null)}
                className="block w-full text-sm text-slate-400 file:mr-2 file:rounded file:border-0 file:bg-white/10 file:px-3 file:py-1.5 file:text-slate-200 file:transition-colors hover:file:bg-white/20"
                aria-label="Upload image file"
              />
              <Input
                label="Or picture URL"
                value={modalImageUrl}
                onChange={(e) => setModalImageUrl(e.target.value)}
                placeholder="https://… (optional)"
              />
              {modalSelectedFile && (
                <p className="text-sm text-slate-300">
                  New image to upload: <strong className="text-white">{modalSelectedFile.name}</strong>
                </p>
              )}
            </div>
          </div>
          {uploadError && <p className="text-sm text-rose-300">{uploadError}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={handleCloseEditModal}>
              Cancel
            </Button>
            <Button type="submit" isLoading={updateMutation.isPending}>
              Update
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        open={muscleDetail !== null}
        onClose={() => setMuscleDetail(null)}
        title="Muscle details"
        size="wide"
        scrollable
      >
        {muscleDetail && (
          <div className="space-y-5">
            <div className="relative -mx-6 -mt-5 overflow-hidden rounded-b-2xl border-b border-white/10">
              {muscleDetail.muscle.imageUrl ? (
                <>
                  <img
                    src={muscleDetail.muscle.imageUrl}
                    alt=""
                    className="h-52 w-full object-cover sm:h-60"
                    onError={(e) => {
                      ;(e.target as HTMLImageElement).style.display = 'none'
                    }}
                  />
                  <div
                    className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[rgba(11,11,26,0.97)] via-[rgba(11,11,26,0.45)] to-transparent"
                    aria-hidden
                  />
                </>
              ) : (
                <div
                  className="relative flex h-44 items-end bg-gradient-to-br from-blue-500/25 via-indigo-500/15 to-purple-600/30 px-6 pb-6 sm:h-52"
                  aria-hidden
                >
                  <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(96,165,250,0.25),transparent_50%)]" />
                </div>
              )}
              <div className="absolute bottom-0 left-0 right-0 px-6 pb-6 pt-12">
                <p className="mb-2">
                  <span className="inline-flex items-center rounded-full bg-white/10 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-slate-200 ring-1 ring-white/15">
                    {muscleDetail.parentName}
                  </span>
                </p>
                <h3 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">{muscleDetail.muscle.name}</h3>
              </div>
            </div>

            <div className="rounded-xl border border-white/10 bg-white/[0.04] p-4 ring-1 ring-white/5">
              <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-500">Description</p>
              {muscleDetail.muscle.description?.trim() ? (
                <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-slate-200">
                  {muscleDetail.muscle.description}
                </p>
              ) : (
                <p className="text-sm italic text-slate-500">No description added yet.</p>
              )}
            </div>

            {muscleDetail.muscle.imageUrl && (
              <a
                href={muscleDetail.muscle.imageUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm font-medium text-blue-300 transition hover:text-blue-200"
              >
                <svg className="size-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
                Open picture in new tab
              </a>
            )}

            <div className="flex flex-wrap gap-2 border-t border-white/10 pt-5">
              <Button type="button" onClick={() => handleOpenEditMuscleModal(muscleDetail.muscle)}>
                Edit muscle
              </Button>
              <Button type="button" variant="secondary" onClick={() => setMuscleDetail(null)}>
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        open={viewMusclesFor !== null}
        onClose={handleCloseViewMuscles}
        title={viewMusclesFor ? `Muscles: ${viewMusclesFor.name}` : 'Muscles'}
        size="wide"
        scrollable
      >
        {viewMusclesFor && (
          <div className="space-y-4">
            {viewMusclesFor.bodyPartMuscles && viewMusclesFor.bodyPartMuscles.length > 0 ? (
              <ul className="grid gap-3 sm:grid-cols-2">
                {viewMusclesFor.bodyPartMuscles.map((m) => (
                  <li key={m.id}>
                    <div className="group flex h-full flex-col overflow-hidden rounded-xl border border-white/10 bg-gradient-to-b from-white/[0.06] to-white/[0.02] shadow-lg ring-1 ring-white/5 transition hover:border-blue-400/30 hover:ring-blue-400/20">
                      <button
                        type="button"
                        onClick={() => {
                          setMuscleDetail({ muscle: m, parentName: viewMusclesFor.name })
                          handleCloseViewMuscles()
                        }}
                        className="flex min-h-0 flex-1 text-left"
                      >
                        <div className="relative h-28 w-28 shrink-0 bg-black/20 sm:h-32 sm:w-32">
                          {m.imageUrl ? (
                            <img
                              src={m.imageUrl}
                              alt=""
                              className="size-full object-cover"
                              onError={(e) => {
                                ;(e.target as HTMLImageElement).style.display = 'none'
                              }}
                            />
                          ) : (
                            <div
                              className="flex size-full items-center justify-center bg-gradient-to-br from-blue-500/20 to-purple-600/25"
                              aria-hidden
                            >
                              <span className="text-2xl font-bold text-white/40">{m.name.slice(0, 1)}</span>
                            </div>
                          )}
                          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 transition group-hover:opacity-100" />
                        </div>
                        <div className="min-w-0 flex-1 p-3">
                          <p className="font-semibold text-white group-hover:text-blue-200">{m.name}</p>
                          {m.description ? (
                            <p className="mt-1 line-clamp-3 text-sm text-slate-400">{m.description}</p>
                          ) : (
                            <p className="mt-1 text-sm italic text-slate-600">No description</p>
                          )}
                          <p className="mt-2 text-xs font-medium text-blue-400/90 opacity-0 transition group-hover:opacity-100">
                            View details →
                          </p>
                        </div>
                      </button>
                      <div className="flex gap-2 border-t border-white/5 px-3 py-2">
                        <button
                          type="button"
                          onClick={() => handleEditMuscleFromView(m)}
                          className="text-sm font-medium text-blue-300 hover:text-blue-200"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteMuscle(m.id, m.name)}
                          className="text-sm font-medium text-rose-300 hover:text-rose-200"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-slate-400">No muscles added yet. Use &quot;Add body muscle&quot; in the table.</p>
            )}
            <div className="pt-2">
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={() => {
                  handleCloseViewMuscles()
                  handleStartAdd(viewMusclesFor)
                }}
              >
                Add body muscle
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </DashboardLayout>
  )
}
