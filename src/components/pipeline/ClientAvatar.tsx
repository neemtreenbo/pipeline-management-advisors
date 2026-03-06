import { memo } from 'react'

function getInitials(name: string): string {
    return name
        .split(' ')
        .map((w) => w[0])
        .filter(Boolean)
        .slice(0, 2)
        .join('')
        .toUpperCase()
}

interface ClientAvatarProps {
    name: string
    profilePictureUrl: string | null
    /** Tailwind size class, e.g. 'w-5 h-5'. Defaults to 'w-5 h-5'. */
    size?: 'xs' | 'sm' | 'md'
}

const SIZES = {
    xs: { container: 'w-4 h-4', text: 'text-[8px]' },
    sm: { container: 'w-5 h-5', text: 'text-[9px]' },
    md: { container: 'w-9 h-9', text: 'text-[13px]' },
} as const

export default memo(function ClientAvatar({ name, profilePictureUrl, size = 'sm' }: ClientAvatarProps) {
    const s = SIZES[size]

    if (profilePictureUrl) {
        return (
            <img
                src={profilePictureUrl}
                alt={name}
                className={`${s.container} rounded-full object-cover shrink-0`}
            />
        )
    }

    return (
        <div className={`${s.container} rounded-full bg-muted-foreground/25 dark:bg-muted-foreground/15 flex items-center justify-center shrink-0`}>
            <span className={`${s.text} font-semibold text-muted-foreground dark:text-muted-foreground/70 leading-none`}>
                {getInitials(name)}
            </span>
        </div>
    )
})
