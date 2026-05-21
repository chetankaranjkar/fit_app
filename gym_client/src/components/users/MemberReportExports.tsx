import type { User } from '../../types/user'
import type { AttendanceLogDto } from '../../types/attendance'
import type { BodyMetricsDto } from '../../types/bodyMetrics'
import {
  attendanceRowsToCsv,
  buildMemberReportHtml,
  metricsRowsToCsv,
} from '../../lib/memberReportExport'

export function MemberReportExports({
  user,
  attendanceLogs,
  metricsList,
}: {
  user: User
  attendanceLogs: AttendanceLogDto[]
  metricsList: BodyMetricsDto[]
}) {
  const name = `${user.firstName} ${user.lastName}`.trim() || `user-${user.id}`

  const downloadAttendance = () => {
    const csv = attendanceRowsToCsv(attendanceLogs)
    triggerDownload(`${sanitizeFilename(name)}-attendance.csv`, csv, 'text/csv;charset=utf-8')
  }

  const downloadMetrics = () => {
    const csv = metricsRowsToCsv(metricsList)
    triggerDownload(`${sanitizeFilename(name)}-progress.csv`, csv, 'text/csv;charset=utf-8')
  }

  const printPdf = () => {
    const html = buildMemberReportHtml(user, attendanceLogs, metricsList)
    const w = window.open('', '_blank')
    if (!w) return
    w.document.write(html)
    w.document.close()
    w.focus()
    w.print()
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
        Export
      </span>
      <button
        type="button"
        onClick={downloadAttendance}
        className="rounded-lg border border-white/15 bg-white/5 px-2.5 py-1 text-xs font-medium text-slate-200 hover:bg-white/10"
      >
        Attendance CSV
      </button>
      <button
        type="button"
        onClick={downloadMetrics}
        className="rounded-lg border border-white/15 bg-white/5 px-2.5 py-1 text-xs font-medium text-slate-200 hover:bg-white/10"
      >
        Progress CSV
      </button>
      <button
        type="button"
        onClick={printPdf}
        className="rounded-lg border border-blue-400/30 bg-blue-500/10 px-2.5 py-1 text-xs font-medium text-blue-200 hover:bg-blue-500/20"
      >
        Print / Save PDF
      </button>
    </div>
  )
}

function sanitizeFilename(s: string) {
  return s.replace(/[^\w\-]+/g, '_').slice(0, 80) || 'member'
}

function triggerDownload(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
