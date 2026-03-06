/** Compact PHP currency format: ₱1.2M, ₱500K, ₱1,234 */
export function formatCurrency(value: number): string | null {
    if (!value) return null
    if (value >= 1_000_000) return `₱${(value / 1_000_000).toFixed(1)}M`
    if (value >= 1_000) return `₱${(value / 1_000).toFixed(0)}K`
    return `₱${value.toLocaleString()}`
}

/** Due date color info for display badges */
export function getDueDateInfo(dueDate: string | null): { label: string; color: string } | null {
    if (!dueDate) return null
    const due = new Date(dueDate)
    const now = new Date()
    const diffDays = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    const label = due.toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })

    if (diffDays < 0) return { label, color: 'text-destructive' }
    if (diffDays <= 7) return { label, color: 'text-warning' }
    return { label, color: 'text-muted-foreground dark:text-muted-foreground/50' }
}

/** Color class for days-in-stage badges */
export function getDaysInStageColor(days: number): string {
    if (days > 30) return 'text-destructive'
    if (days > 14) return 'text-warning'
    return 'text-muted-foreground dark:text-muted-foreground/50'
}
