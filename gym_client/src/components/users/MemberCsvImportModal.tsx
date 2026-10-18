import { useEffect, useState } from 'react'
import { useBranchScope } from '../../features/branch/BranchScopeContext'
import { BranchChoiceField, MEMBER_BRANCH_REASON } from '../../features/branch/BranchChoiceField'
import toast from 'react-hot-toast'
import { Button } from '../ui/Button'
import { Modal } from '../ui/Modal'
import { getApiErrorMessage } from '../../lib/apiErrors'
import {
  MEMBER_IMPORT_COLUMNS,
  MEMBER_IMPORT_SKIP_NOTE,
  MEMBERS_CSV_TEMPLATE,
  downloadMembersCsv,
  parseCsvLines,
  rowsToMemberImports,
  type MemberCsvIssue,
  type ParsedMemberRow,
} from '../../lib/membersCsv'
import { usersService, type BulkImportMemberRowResult, type BulkImportMembersResult } from '../../services/users.service'
import type { CreateUserDto } from '../../types/user'

const BULK_IMPORT_BATCH_SIZE = 250

type Phase = 'idle' | 'parsing' | 'validating' | 'ready' | 'importing' | 'done'

type Props = {
  open: boolean
  onClose: () => void
  onImported: () => Promise<void>
  initialBranchId?: number
}

function toPayload(r: ParsedMemberRow, homeBranchId?: number): CreateUserDto {
  return {
    firstName: r.firstName,
    lastName: r.lastName,
    email: r.email,
    phone: r.phone,
    aadhaarNumber: r.aadhaarNumber,
    dateOfBirth: r.dateOfBirth,
    gender: r.gender,
    address: undefined,
    emergencyContact: undefined,
    emergencyPhone: undefined,
    profilePictureUrl: undefined,
    preferredGymTime: undefined,
    isActive: r.isActive,
    password: r.password?.trim() || r.phone,
    role: 1,
    planId: undefined,
    membershipStartDate: undefined,
    trainerId: undefined,
    instructorSpecialization: undefined,
    instructorBio: undefined,
    instructorHireDate: undefined,
    sourceRowNumber: r.sourceRowNumber,
    homeBranchId,
  }
}

function downloadTemplate() {
  const blob = new Blob([MEMBERS_CSV_TEMPLATE], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'members-import-template.csv'
  a.click()
  URL.revokeObjectURL(url)
}

function mergePreviewRows(
  clientIssues: MemberCsvIssue[],
  server: BulkImportMembersResult | null,
): BulkImportMemberRowResult[] {
  const fromClient: BulkImportMemberRowResult[] = clientIssues.map((issue) => ({
    sourceRowNumber: issue.sourceRowNumber ?? 1,
    outcome: issue.code.includes('duplicate') ? 'skipped' : 'failed',
    field: issue.field,
    code: issue.code,
    message: issue.message,
    howToFix: issue.howToFix,
  }))
  const fromServer = server?.rows ?? []
  return [...fromClient, ...fromServer].sort((a, b) => a.sourceRowNumber - b.sourceRowNumber)
}

export function MemberCsvImportModal({ open, onClose, onImported, initialBranchId }: Props) {
  const [phase, setPhase] = useState<Phase>('idle')
  const [fileName, setFileName] = useState<string | null>(null)
  const [payloads, setPayloads] = useState<CreateUserDto[]>([])
  const [clientIssues, setClientIssues] = useState<MemberCsvIssue[]>([])
  const [preview, setPreview] = useState<BulkImportMembersResult | null>(null)
  const [result, setResult] = useState<BulkImportMembersResult | null>(null)
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [importBranchId, setImportBranchId] = useState<number | undefined>()
  const scope = useBranchScope()

  useEffect(() => {
    if (!open) return
    setPhase('idle')
    setFileName(null)
    setPayloads([])
    setClientIssues([])
    setPreview(null)
    setResult(null)
    setProgress(null)
    setError(null)
    if (initialBranchId) setImportBranchId(initialBranchId)
  }, [open, initialBranchId])

  const displayRows = mergePreviewRows(clientIssues, result ?? preview)
  const failedRows = displayRows.filter((r) => r.outcome === 'failed')
  const skippedRows = displayRows.filter((r) => r.outcome === 'skipped' || (r.matchedOn && r.outcome !== 'accepted'))
  const wouldImport = preview?.wouldImport ?? payloads.length
  const busy = phase === 'parsing' || phase === 'validating' || phase === 'importing'

  const handleFile = async (file: File | null) => {
    if (!file) return
    setFileName(file.name)
    setPhase('parsing')
    setError(null)
    setPreview(null)
    setResult(null)
    try {
      const text = await file.text()
      const grid = parseCsvLines(text)
      const parsed = rowsToMemberImports(grid)
      const issues = [...parsed.issues]
      const branches = scope?.branches ?? []
      const nextPayloads = parsed.rows.flatMap((row) => {
        const raw = row.homeBranch?.trim()
        let branchId = importBranchId
        if (raw) {
          const asNumber = Number(raw)
          const match = Number.isInteger(asNumber) && asNumber > 0
            ? branches.find((branch) => branch.id === asNumber)
            : branches.find((branch) => branch.name.toLowerCase() === raw.toLowerCase())
          if (!match) {
            issues.push({
              sourceRowNumber: row.sourceRowNumber,
              field: 'homeBranch',
              code: 'unknown_branch',
              message: `Row ${row.sourceRowNumber}: branch "${raw}" was not found.`,
              howToFix: 'Use an active branch name or id, or choose the branch on this screen.',
            })
            return []
          }
          branchId = match.id
        }
        if (!branchId && branches.length !== 1 && !(scope?.defaultBranchId && branches.some((branch) => branch.id === scope.defaultBranchId))) {
          issues.push({
            sourceRowNumber: row.sourceRowNumber,
            field: 'homeBranch',
            code: 'branch_required',
            message: `Row ${row.sourceRowNumber}: home branch is required.`,
            howToFix: 'Select a branch for this import or add a homeBranch column.',
          })
          return []
        }
        return [toPayload(row, branchId ?? (branches.length === 1 ? branches[0].id : scope?.defaultBranchId ?? undefined))]
      })
      setClientIssues(issues)
      setPayloads(nextPayloads)
      if (nextPayloads.length === 0) {
        setPhase('ready')
        setPreview(null)
        return
      }
      setPhase('validating')
      setProgress({ done: 0, total: nextPayloads.length })
      const { data } = await usersService.previewBulkImportMembers(nextPayloads, { timeoutMs: 120_000 })
      setPreview(data)
      setProgress(null)
      setPhase('ready')
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, 'Could not read or validate the CSV file.'))
      setPhase('idle')
      setProgress(null)
    }
  }

  const handleImport = async () => {
    if (payloads.length === 0 || wouldImport === 0) return
    setPhase('importing')
    setError(null)
    setProgress({ done: 0, total: payloads.length })
    const log: string[] = []
    const rows: BulkImportMemberRowResult[] = [...(preview?.rows ?? [])]
    let ok = 0
    try {
      for (let offset = 0; offset < payloads.length; offset += BULK_IMPORT_BATCH_SIZE) {
        const batch = payloads.slice(offset, offset + BULK_IMPORT_BATCH_SIZE)
        try {
          const { data } = await usersService.bulkImportMembers(batch, { timeoutMs: 300_000 })
          ok += data.imported ?? 0
          if (data.log?.length) log.push(...data.log)
          if (data.rows?.length) {
            for (const row of data.rows) {
              const idx = rows.findIndex((r) => r.sourceRowNumber === row.sourceRowNumber)
              if (idx >= 0) rows[idx] = row
              else rows.push(row)
            }
          }
        } catch (err: unknown) {
          log.push(
            `Batch ${Math.floor(offset / BULK_IMPORT_BATCH_SIZE) + 1} failed (${batch.length} rows): ${getApiErrorMessage(err)}`,
          )
        }
        setProgress({ done: Math.min(offset + batch.length, payloads.length), total: payloads.length })
      }
      setResult({
        imported: ok,
        wouldImport,
        skipped: rows.filter((r) => r.outcome === 'skipped').length,
        failed: rows.filter((r) => r.outcome === 'failed').length,
        dryRun: false,
        log,
        rows,
      })
      await onImported()
      toast.success(`Imported ${ok} member(s). Review the summary for skips or errors.`)
      setPhase('done')
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, 'Import failed.'))
      setPhase('ready')
    } finally {
      setProgress(null)
    }
  }

  const downloadSummary = () => {
    const rows = mergePreviewRows(clientIssues, result ?? preview)
    downloadMembersCsv(
      `members-import-result-${new Date().toISOString().slice(0, 10)}.csv`,
      ['row', 'outcome', 'email', 'phone', 'field', 'matchedOn', 'existingUser', 'message', 'howToFix'],
      rows.map((r) => [
        String(r.sourceRowNumber),
        r.outcome,
        r.email ?? '',
        r.phone ?? '',
        r.field ?? '',
        r.matchedOn ?? '',
        r.existingUserId != null ? `${r.existingUserLabel ?? ''} (#${r.existingUserId})` : (r.existingUserLabel ?? ''),
        r.message,
        r.howToFix ?? '',
      ]),
    )
  }

  const phaseLabel =
    phase === 'parsing'
      ? 'Reading CSV…'
      : phase === 'validating'
        ? 'Validating against gym records…'
        : phase === 'importing' && progress
          ? `Importing… ${progress.done} / ${progress.total} rows`
          : phase === 'importing'
            ? 'Importing…'
            : phase === 'done'
              ? 'Import finished'
              : null

  return (
    <Modal open={open} onClose={() => !busy && onClose()} title="Import members from CSV" size="wide" scrollable>
      <div className="space-y-4 text-sm" data-testid="member-csv-import-modal">
        <BranchChoiceField
          branches={scope ? scope.branches : null}
          value={importBranchId}
          onChange={setImportBranchId}
          reason={MEMBER_BRANCH_REASON}
          label="Home branch for rows without a homeBranch column"
          defaultBranchId={scope?.defaultBranchId}
          returnTo="/dashboard/users?resume=import"
        />
        <div data-testid="member-csv-required-columns" className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Required columns</p>
          <ul className="space-y-1.5 text-slate-300">
            {MEMBER_IMPORT_COLUMNS.filter((c) => c.required).map((col) => (
              <li key={col.name}>
                <strong className="text-slate-100">{col.name}</strong>
                {col.aliases?.length ? (
                  <span className="text-slate-500"> (also {col.aliases.join(', ')})</span>
                ) : null}
                <span className="text-slate-500"> — {col.hint}</span>
              </li>
            ))}
          </ul>
          <p className="mt-3 mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">Optional</p>
          <ul className="space-y-1.5 text-slate-400">
            {MEMBER_IMPORT_COLUMNS.filter((c) => !c.required).map((col) => (
              <li key={col.name}>
                <strong className="text-slate-300">{col.name}</strong>
                <span> — {col.hint}</span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-slate-500">{MEMBER_IMPORT_SKIP_NOTE}</p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={downloadTemplate}
            className="rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:bg-white/10"
          >
            Download template
          </button>
        </div>

        <label className="block">
          <span className="mb-1 block text-xs font-medium text-slate-500">CSV file</span>
          <input
            data-testid="member-csv-file"
            type="file"
            accept=".csv,text/csv"
            disabled={busy}
            className="block w-full text-xs text-slate-300 file:mr-2 file:rounded-lg file:border-0 file:bg-blue-500/20 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-blue-100"
            onChange={(e) => {
              const f = e.target.files?.[0]
              void handleFile(f ?? null)
              e.target.value = ''
            }}
          />
          {fileName ? <p className="mt-1 text-xs text-slate-500">{fileName}</p> : null}
        </label>

        {phaseLabel ? (
          <p className="text-slate-400" data-testid="member-csv-progress">
            {phaseLabel}
          </p>
        ) : null}
        {error ? (
          <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-3 py-2.5 text-sm text-rose-300" role="alert">
            {error}
          </div>
        ) : null}

        {phase === 'ready' || phase === 'done' || displayRows.length > 0 ? (
          <div data-testid="member-csv-preview" className="space-y-3">
            <p className="text-slate-300">
              {phase === 'done'
                ? `Imported ${result?.imported ?? 0}. Skipped ${result?.skipped ?? skippedRows.length}. Failed ${result?.failed ?? failedRows.length}.`
                : `${wouldImport} row(s) ready to import. ${skippedRows.length} duplicate(s) will be skipped. ${failedRows.length} row(s) have errors.`}
            </p>
            {failedRows.length > 0 ? (
              <div data-testid="member-csv-row-errors" className="max-h-36 overflow-y-auto rounded-xl border border-rose-500/30 bg-rose-500/5 p-3 text-xs text-rose-100">
                {failedRows.map((row) => (
                  <div key={`fail-${row.sourceRowNumber}-${row.code}`} className="mb-2 last:mb-0">
                    <div>
                      Row {row.sourceRowNumber}
                      {row.field ? ` · ${row.field}` : ''}: {row.message}
                    </div>
                    {row.howToFix ? <div className="text-rose-200/80">Fix: {row.howToFix}</div> : null}
                  </div>
                ))}
              </div>
            ) : null}
            {skippedRows.length > 0 ? (
              <div data-testid="member-csv-duplicates" className="max-h-36 overflow-y-auto rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 text-xs text-amber-100">
                {skippedRows.map((row) => (
                  <div key={`skip-${row.sourceRowNumber}-${row.code}`} className="mb-2 last:mb-0">
                    <div>
                      Row {row.sourceRowNumber}
                      {row.matchedOn ? ` · matched on ${row.matchedOn}` : ''}
                      {row.existingUserLabel ? ` · ${row.existingUserLabel}` : ''}: {row.message}
                    </div>
                    <div className="text-amber-200/80">{row.howToFix ?? 'This row will be skipped. Existing members are not updated.'}</div>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}

        <div className="flex flex-wrap justify-end gap-2">
          {displayRows.length > 0 ? (
            <Button type="button" variant="secondary" size="sm" data-testid="member-csv-download-summary" onClick={downloadSummary}>
              Download result summary
            </Button>
          ) : null}
          <Button
            type="button"
            size="sm"
            data-testid="member-csv-submit"
            disabled={busy || phase === 'done' || payloads.length === 0 || wouldImport === 0}
            isLoading={phase === 'importing'}
            onClick={() => void handleImport()}
          >
            Import {wouldImport > 0 ? `${wouldImport} member(s)` : 'members'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
