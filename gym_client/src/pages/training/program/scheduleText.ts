/** Repair known UTF-8 punctuation decoded as Windows-1252 in legacy day labels. */
export function cleanScheduleText(value: string): string {
  return value
    .replace(/\u00e2\u20ac\u201d/g, '\u2014')
    .replace(/\u00e2\u20ac\u201c/g, '\u2013')
    .replace(/\u00e2\u0080\u0094/g, '\u2014')
    .replace(/\u00e2\u0080\u0093/g, '\u2013')
}
