/** Parse simple CSV (comma-separated, supports quoted fields). */
export function parseCsvLines(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let cur = ''
  let i = 0
  let inQuotes = false
  const s = text.replace(/^\uFEFF/, '').trim()
  if (!s) return rows

  while (i < s.length) {
    const c = s[i]
    if (inQuotes) {
      if (c === '"') {
        if (s[i + 1] === '"') {
          cur += '"'
          i += 2
          continue
        }
        inQuotes = false
        i++
        continue
      }
      cur += c
      i++
      continue
    }
    if (c === '"') {
      inQuotes = true
      i++
      continue
    }
    if (c === ',' ) {
      row.push(cur.trim())
      cur = ''
      i++
      continue
    }
    if (c === '\r') {
      i++
      continue
    }
    if (c === '\n') {
      row.push(cur.trim())
      rows.push(row)
      row = []
      cur = ''
      i++
      continue
    }
    cur += c
    i++
  }
  row.push(cur.trim())
  rows.push(row)
  return rows.filter((r) => r.some((cell) => cell.length > 0))
}

export type ParsedMemberRow = {
  firstName: string
  lastName: string
  email: string
  phone?: string
  dateOfBirth: string
  gender: string
  isActive: boolean
  username?: string
  password?: string
}

function normHeader(h: string) {
  return h.replace(/\s+/g, '').toLowerCase()
}

function parseBool(v: string): boolean {
  const x = v.trim().toLowerCase()
  return x === '1' || x === 'true' || x === 'yes' || x === 'y'
}

/** Expect header row + data rows. Maps flexible headers to fields. */
export function rowsToMemberImports(rows: string[][]): {
  rows: ParsedMemberRow[]
  errors: string[]
} {
  const errors: string[] = []
  if (rows.length < 2) {
    errors.push('CSV needs a header row and at least one data row.')
    return { rows: [], errors }
  }
  const rawHeader = rows[0]
  const idx = new Map<string, number>()
  rawHeader.forEach((h, i) => idx.set(normHeader(h), i))

  const req = ['firstname', 'lastname', 'email']
  for (const r of req) {
    if (!idx.has(r)) errors.push(`Missing required column: ${r}`)
  }
  if (errors.length) return { rows: [], errors }

  const dobKey = idx.has('dateofbirth')
    ? 'dateofbirth'
    : idx.has('dob')
      ? 'dob'
      : null
  if (!dobKey) errors.push('Missing date column (dateOfBirth or dob).')

  const genderKey = idx.has('gender') ? 'gender' : null
  if (!genderKey) errors.push('Missing gender column.')

  if (errors.length) return { rows: [], errors }

  const out: ParsedMemberRow[] = []

  for (let li = 1; li < rows.length; li++) {
    const line = rows[li]
    const lineNo = li + 1
    const get = (key: string) => {
      const i = idx.get(key)
      if (i == null || i >= line.length) return ''
      return line[i] ?? ''
    }

    const firstName = get('firstname').trim()
    const lastName = get('lastname').trim()
    const email = get('email').trim().toLowerCase()
    if (!firstName || !lastName || !email) {
      errors.push(`Row ${lineNo}: firstName, lastName, email required.`)
      continue
    }

    let dateOfBirth = get(dobKey!).trim()
    if (!dateOfBirth) dateOfBirth = new Date().toISOString().slice(0, 10)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateOfBirth)) {
      errors.push(`Row ${lineNo}: dateOfBirth must be YYYY-MM-DD (got "${dateOfBirth}").`)
      continue
    }

    let gender = get(genderKey!).trim()
    if (!gender) gender = 'Other'

    const activeCell = idx.has('isactive') ? get('isactive') : ''
    const isActive = activeCell === '' ? true : parseBool(activeCell)

    const phoneRaw = idx.has('phone') ? get('phone').trim() : ''
    const username = idx.has('username') ? get('username').trim() : ''
    const password = idx.has('password') ? get('password') : ''

    out.push({
      firstName,
      lastName,
      email,
      phone: phoneRaw || undefined,
      dateOfBirth,
      gender,
      isActive,
      username: username || undefined,
      password: password || undefined,
    })
  }

  return { rows: out, errors }
}

export const MEMBERS_CSV_TEMPLATE = `firstName,lastName,email,phone,dateOfBirth,gender,isActive
Jane,Doe,jane.doe@example.com,+15551234567,1990-05-15,Female,true`

export function downloadMembersCsv(filename: string, headers: string[], lines: string[][]) {
  const esc = (v: string) => {
    if (/[",\n\r]/.test(v)) return `"${v.replace(/"/g, '""')}"`
    return v
  }
  const body = [
    headers.map(esc).join(','),
    ...lines.map((row) => row.map((c) => esc(String(c ?? ''))).join(',')),
  ].join('\r\n')
  const blob = new Blob([body], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
