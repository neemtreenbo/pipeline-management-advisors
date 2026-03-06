/**
 * Shared date utility functions used across Tasks and Notes features.
 */

/** Returns today's date as YYYY-MM-DD string in local time */
export function todayString(): string {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** Converts YYYY-MM-DD string to ISO timestamp at end of day (23:59:59.999) */
export function toISO(dateStr: string): string | null {
    if (!dateStr) return null
    const [y, m, d] = dateStr.split('-').map(Number)
    return new Date(y, m - 1, d, 23, 59, 59, 999).toISOString()
}

/** Converts ISO timestamp to YYYY-MM-DD date input string */
export function toDateInput(iso: string | null): string {
    if (!iso) return ''
    const d = new Date(iso)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** Converts a Date object to YYYY-MM-DD string in local time */
export function toLocalDayString(dateObj: Date): string {
    const year = dateObj.getFullYear()
    const month = String(dateObj.getMonth() + 1).padStart(2, '0')
    const day = String(dateObj.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
}

/** Formats a due date for display, with overdue detection */
export function formatDueDate(dateString: string | null): { label: string; overdue: boolean } | null {
    if (!dateString) return null
    const date = new Date(dateString)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const isToday =
        date.getDate() === today.getDate() &&
        date.getMonth() === today.getMonth() &&
        date.getFullYear() === today.getFullYear()
    const overdue = date < today && !isToday
    const label = isToday
        ? 'Today'
        : new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(date)
    return { label, overdue }
}
