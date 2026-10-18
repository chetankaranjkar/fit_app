import { normalizeAadhaarInput } from './aadhaar'
import { getBirthDateError } from './birthDate'
import { getPhoneValidationError, normalizePhoneNumber } from './phone'

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
  sourceRowNumber: number
  firstName: string
  lastName: string
  email: string
  phone: string
  aadhaarNumber?: string
  dateOfBirth: string
  gender: string
  isActive: boolean
  username?: string
  password?: string
  homeBranch?: string
}

export type MemberCsvIssue = {
  sourceRowNumber: number | null
  field: string
  code: string
  message: string
  howToFix: string
}

export type MemberImportColumn = {
  name: string
  required: boolean
  aliases?: string[]
  hint: string
}

export const MEMBER_IMPORT_COLUMNS: MemberImportColumn[] = [
  { name: 'firstName', required: true, hint: 'Given name' },
  { name: 'lastName', required: true, hint: 'Family name' },
  { name: 'email', required: true, hint: 'Login id. Must be unique. Portal and mobile sign-in use this value.' },
  {
    name: 'phone',
    required: true,
    aliases: ['mobile', 'mobileNumber'],
    hint: '10-digit Indian mobile starting with 6–9. Unique. Also used as the default login password when password is omitted.',
  },
  {
    name: 'dateOfBirth',
    required: true,
    aliases: ['dob'],
    hint: 'YYYY-MM-DD, not in the future, year 1900 or later',
  },
  { name: 'gender', required: true, hint: 'Female, Male, or Other (blank becomes Other)' },
  { name: 'aadhaarNumber', required: false, hint: 'Optional. Exactly 12 digits when set; must be unique.' },
  { name: 'isActive', required: false, hint: 'true/false (defaults to true)' },
  {
    name: 'password',
    required: false,
    hint: 'Optional. Defaults to the phone number. Login is created immediately, same as Add Member — there is no invitation-only import path.',
  },
  {
    name: 'homeBranch',
    required: false,
    aliases: ['branch', 'homeBranchId'],
    hint: 'Branch name or id. Required in the file when the import screen does not select one branch for every row.',
  },
]

export const MEMBER_IMPORT_SKIP_NOTE =
  'Duplicate phone, email, or Aadhaar rows are skipped. Existing members are never updated by import.'

function normHeader(h: string) {
  return h.replace(/\s+/g, '').toLowerCase()
}

function parseBool(v: string): boolean {
  const x = v.trim().toLowerCase()
  return x === '1' || x === 'true' || x === 'yes' || x === 'y'
}

function issue(
  sourceRowNumber: number | null,
  field: string,
  code: string,
  message: string,
  howToFix: string,
): MemberCsvIssue {
  return { sourceRowNumber, field, code, message, howToFix }
}

/** Expect header row + data rows. Maps flexible headers to fields. Invalid rows are issues, not silently dropped. */
export function rowsToMemberImports(rows: string[][]): {
  rows: ParsedMemberRow[]
  issues: MemberCsvIssue[]
  errors: string[]
} {
  const issues: MemberCsvIssue[] = []
  if (rows.length < 2) {
    issues.push(
      issue(null, 'file', 'empty_file', 'CSV needs a header row and at least one data row.', 'Download the template and add member rows under the header.'),
    )
    return { rows: [], issues, errors: issues.map((i) => i.message) }
  }
  const rawHeader = rows[0]
  const idx = new Map<string, number>()
  rawHeader.forEach((h, i) => idx.set(normHeader(h), i))

  const req = ['firstname', 'lastname', 'email']
  for (const r of req) {
    if (!idx.has(r)) {
      issues.push(
        issue(1, r, 'missing_column', `Missing required column: ${r}`, `Add a ${r} column. Header names are case-insensitive and ignore spaces.`),
      )
    }
  }
  const phoneKey = idx.has('phone') ? 'phone' : idx.has('mobilenumber') ? 'mobilenumber' : idx.has('mobile') ? 'mobile' : null
  if (!phoneKey) {
    issues.push(
      issue(1, 'phone', 'missing_column', 'Missing phone column (phone, mobile, or mobileNumber).', 'Add a phone column, or alias it as mobile / mobileNumber.'),
    )
  }
  const dobKey = idx.has('dateofbirth') ? 'dateofbirth' : idx.has('dob') ? 'dob' : null
  if (!dobKey) {
    issues.push(issue(1, 'dateOfBirth', 'missing_column', 'Missing date column (dateOfBirth or dob).', 'Add dateOfBirth (YYYY-MM-DD) or the alias dob.'))
  }
  const genderKey = idx.has('gender') ? 'gender' : null
  if (!genderKey) {
    issues.push(issue(1, 'gender', 'missing_column', 'Missing gender column.', 'Add a gender column (Female, Male, or Other).'))
  }
  if (issues.length) return { rows: [], issues, errors: issues.map((i) => i.message) }

  const out: ParsedMemberRow[] = []
  const phonesInFile = new Map<string, number>()
  const emailsInFile = new Map<string, number>()

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
      issues.push(
        issue(lineNo, 'firstName', 'required_fields', `Row ${lineNo}: firstName, lastName, email required.`, 'Fill firstName, lastName, and email. Email is the login id.'),
      )
      continue
    }

    const priorEmail = emailsInFile.get(email)
    if (priorEmail != null) {
      issues.push(
        issue(
          lineNo,
          'email',
          'duplicate_email_in_file',
          `Row ${lineNo}: duplicate email (also on row ${priorEmail}). This row will be skipped.`,
          'Use a unique email, or remove the duplicate row. Import does not update existing members.',
        ),
      )
      continue
    }
    emailsInFile.set(email, lineNo)

    const dateOfBirth = get(dobKey!).trim()
    if (!dateOfBirth) {
      issues.push(
        issue(lineNo, 'dateOfBirth', 'required_dob', `Row ${lineNo}: dateOfBirth is required.`, 'Set dateOfBirth to YYYY-MM-DD (for example 1990-05-15).'),
      )
      continue
    }
    const dobError = getBirthDateError(dateOfBirth, { required: true })
    if (dobError) {
      issues.push(
        issue(lineNo, 'dateOfBirth', 'invalid_dob', `Row ${lineNo}: ${dobError} (got "${dateOfBirth}").`, 'Use YYYY-MM-DD, year 1900 or later, and not a future date.'),
      )
      continue
    }

    let gender = get(genderKey!).trim()
    if (!gender) gender = 'Other'

    const activeCell = idx.has('isactive') ? get('isactive') : ''
    const isActive = activeCell === '' ? true : parseBool(activeCell)

    const phoneRaw = phoneKey ? get(phoneKey).trim() : ''
    if (!phoneRaw) {
      issues.push(
        issue(lineNo, 'phone', 'required_phone', `Row ${lineNo}: phone is required.`, 'Enter a 10-digit Indian mobile starting with 6, 7, 8, or 9.'),
      )
      continue
    }
    const phoneErr = getPhoneValidationError(phoneRaw, true)
    if (phoneErr) {
      issues.push(
        issue(lineNo, 'phone', 'invalid_phone', `Row ${lineNo}: ${phoneErr}`, 'Use a 10-digit Indian mobile. +91, spaces, and a leading 0 are accepted.'),
      )
      continue
    }
    const phone = normalizePhoneNumber(phoneRaw)!
    const priorRow = phonesInFile.get(phone)
    if (priorRow != null) {
      issues.push(
        issue(
          lineNo,
          'phone',
          'duplicate_phone_in_file',
          `Row ${lineNo}: duplicate phone number (also on row ${priorRow}). This row will be skipped.`,
          'Use a unique phone, or remove the duplicate. Import does not update existing members.',
        ),
      )
      continue
    }
    phonesInFile.set(phone, lineNo)

    const aadhaarRaw = idx.has('aadhaarnumber') ? get('aadhaarnumber').trim() : ''
    let aadhaarNumber: string | undefined
    if (aadhaarRaw) {
      try {
        aadhaarNumber = normalizeAadhaarInput(aadhaarRaw)
      } catch {
        issues.push(
          issue(lineNo, 'aadhaarNumber', 'invalid_aadhaar', `Row ${lineNo}: Aadhaar must be exactly 12 digits.`, 'Leave Aadhaar blank or enter 12 digits.'),
        )
        continue
      }
    }
    const passwordOverride = idx.has('password') ? get('password').trim() : ''
    const username = email
    const password = passwordOverride || phone
    if (password.length < 6) {
      issues.push(
        issue(
          lineNo,
          'password',
          'password_length',
          `Row ${lineNo}: password must be at least 6 characters.`,
          'Add a password of at least 6 characters, or use a 10-digit phone as the default password.',
        ),
      )
      continue
    }

    const homeBranch = idx.has('homebranch')
      ? get('homebranch').trim()
      : idx.has('branch')
        ? get('branch').trim()
        : idx.has('homebranchid')
          ? get('homebranchid').trim()
          : ''

    out.push({
      sourceRowNumber: lineNo,
      firstName,
      lastName,
      email,
      phone,
      aadhaarNumber,
      dateOfBirth,
      gender,
      isActive,
      username,
      password,
      homeBranch: homeBranch || undefined,
    })
  }

  return { rows: out, issues, errors: issues.map((i) => i.message) }
}

export const MEMBERS_CSV_TEMPLATE = `firstName,lastName,email,phone,aadhaarNumber,dateOfBirth,gender,isActive,homeBranch
Jane,Doe,jane.doe@example.com,9876543210,123412341234,1990-05-15,Female,true,`

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
