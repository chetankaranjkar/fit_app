import type { User } from '../types/user'
import type { AttendanceLogDto } from '../types/attendance'
import type { BodyMetricsDto } from '../types/bodyMetrics'

function csvEscape(v: string | number | undefined | null) {
  const s = v == null ? '' : String(v)
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`
  return s
}

export function attendanceRowsToCsv(logs: AttendanceLogDto[]): string {
  const header = ['date', 'method', 'notes']
  const rows = [...logs]
    .sort(
      (a, b) =>
        new Date(a.attendanceDate).getTime() - new Date(b.attendanceDate).getTime(),
    )
    .map((l) =>
      [
        csvEscape(l.attendanceDate?.slice(0, 10)),
        csvEscape(l.checkInMethod ?? ''),
        csvEscape(l.notes ?? ''),
      ].join(','),
    )
  return [header.join(','), ...rows].join('\r\n')
}

export function metricsRowsToCsv(metrics: BodyMetricsDto[]): string {
  const header = [
    'measurementDate',
    'weightKg',
    'bodyFatPct',
    'muscleMassKg',
    'heightCm',
    'notes',
  ]
  const rows = [...metrics]
    .sort(
      (a, b) =>
        new Date(a.measurementDate).getTime() - new Date(b.measurementDate).getTime(),
    )
    .map((m) =>
      [
        csvEscape(m.measurementDate?.slice(0, 10)),
        csvEscape(m.weightKg ?? ''),
        csvEscape(m.bodyFatPct ?? ''),
        csvEscape(m.muscleMassKg ?? ''),
        csvEscape(m.heightCm ?? ''),
        csvEscape(m.notes ?? ''),
      ].join(','),
    )
  return [header.join(','), ...rows].join('\r\n')
}

export function buildMemberReportHtml(
  user: User,
  attendanceLogs: AttendanceLogDto[],
  metricsList: BodyMetricsDto[],
): string {
  const name = `${user.firstName} ${user.lastName}`.trim()
  const attendSorted = [...attendanceLogs].sort(
    (a, b) =>
      new Date(b.attendanceDate).getTime() - new Date(a.attendanceDate).getTime(),
  )
  const metricsSorted = [...metricsList].sort(
    (a, b) =>
      new Date(b.measurementDate).getTime() - new Date(a.measurementDate).getTime(),
  )

  const attendRows = attendSorted
    .slice(0, 200)
    .map(
      (l) =>
        `<tr><td>${escapeHtml(l.attendanceDate?.slice(0, 10) ?? '')}</td><td>${escapeHtml(l.checkInMethod ?? '')}</td><td>${escapeHtml(l.notes ?? '')}</td></tr>`,
    )
    .join('')

  const metricRows = metricsSorted
    .slice(0, 100)
    .map(
      (m) =>
        `<tr><td>${escapeHtml(m.measurementDate?.slice(0, 10) ?? '')}</td><td>${escapeHtml(String(m.weightKg ?? ''))}</td><td>${escapeHtml(String(m.bodyFatPct ?? ''))}</td><td>${escapeHtml(String(m.muscleMassKg ?? ''))}</td></tr>`,
    )
    .join('')

  return `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>Member report — ${escapeHtml(name)}</title>
<style>
body{font-family:system-ui,sans-serif;padding:24px;color:#111;}
h1{font-size:20px;} h2{font-size:14px;margin-top:24px;text-transform:uppercase;letter-spacing:.06em;color:#444;}
table{border-collapse:collapse;width:100%;margin-top:8px;font-size:12px;}
th,td{border:1px solid #ccc;padding:6px 8px;text-align:left;}
th{background:#f0f0f0;}
.meta{color:#555;font-size:13px;}
</style></head><body>
<h1>${escapeHtml(name)}</h1>
<p class="meta">Email: ${escapeHtml(user.email ?? '')} · Member #${user.id}</p>
<p class="meta">Generated ${new Date().toLocaleString()}</p>
<h2>Attendance (${attendSorted.length} records)</h2>
<table><thead><tr><th>Date</th><th>Method</th><th>Notes</th></tr></thead><tbody>${attendRows || '<tr><td colspan="3">No rows</td></tr>'}</tbody></table>
<h2>Body metrics (${metricsSorted.length} readings)</h2>
<table><thead><tr><th>Date</th><th>Weight kg</th><th>Body fat %</th><th>Muscle kg</th></tr></thead><tbody>${metricRows || '<tr><td colspan="4">No rows</td></tr>'}</tbody></table>
</body></html>`
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
