import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
    "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors",
    {
        variants: {
            variant: {
                default: "bg-foreground text-background",
                muted: "bg-muted text-muted-foreground",
                success: "bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400",
                warning: "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
                destructive: "bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400",
                accent: "bg-blue-50 text-accent dark:bg-blue-900/30",
                outline: "border border-border text-muted-foreground",
            },
        },
        defaultVariants: {
            variant: "muted",
        },
    }
)

export interface BadgeProps
    extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> { }

function Badge({ className, variant, ...props }: BadgeProps) {
    return (
        <div className={cn(badgeVariants({ variant }), className)} {...props} />
    )
}

export { Badge, badgeVariants }
