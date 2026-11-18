export const REPORT_REASONS = ['beleidigend', 'unangemessen', 'betrug', 'sonstiges'] as const
export type ReportReason = (typeof REPORT_REASONS)[number]

export function reportReason(value: string): ReportReason | null {
  return REPORT_REASONS.includes(value as ReportReason) ? value as ReportReason : null
}

/** Three different accounts hide the name. The same account reporting three times does not. */
export function hiddenByReports(reports: readonly { reporter: string; target: string }[], target: string): boolean {
  const people = new Set(reports.filter((row) => row.target === target && row.reporter).map((row) => row.reporter))
  return people.size >= 3
}
