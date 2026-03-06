import { useState, useRef, useCallback, memo } from 'react'
import type { DealStage, StageTransition } from '@/lib/deals'
import { PIPELINE_STAGES } from '@/lib/deals'
import { useTheme } from '@/contexts/ThemeContext'
import { STAGE_COLORS } from './stageColors'

function formatDuration(days: number): string {
    if (days < 1) return '<1d'
    return `${days}d`
}

interface StageGanttBarProps {
    history: StageTransition[]
    currentStage: DealStage
}

/** Mini Gantt bar with hover interaction — hovered segment lifts, expands, and shows a tooltip */
export default memo(function StageGanttBar({ history, currentStage }: StageGanttBarProps) {
    const [hoveredStage, setHoveredStage] = useState<DealStage | null>(null)
    const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null)
    const containerRef = useRef<HTMLDivElement>(null)
    const { theme } = useTheme()
    const isDark = theme === 'dark'

    const handleMouseEnter = useCallback((stage: DealStage, e: React.MouseEvent<HTMLDivElement>) => {
        setHoveredStage(stage)
        if (containerRef.current) {
            const containerRect = containerRef.current.getBoundingClientRect()
            const segmentRect = e.currentTarget.getBoundingClientRect()
            setTooltipPos({
                x: segmentRect.left - containerRect.left + segmentRect.width / 2,
                y: -4,
            })
        }
    }, [])

    const handleMouseLeave = useCallback(() => {
        setHoveredStage(null)
        setTooltipPos(null)
    }, [])

    if (history.length === 0) return null

    const currentStageIdx = PIPELINE_STAGES.indexOf(currentStage)
    const totalDays = history.reduce((sum, t) => sum + t.daysInStage, 0)
    const hoveredTransition = hoveredStage ? history.find(t => t.stage === hoveredStage) : null

    return (
        <div className="relative mt-2" ref={containerRef}>
            {/* Tooltip */}
            {hoveredStage && tooltipPos && hoveredTransition && (
                <div
                    className="absolute z-10 pointer-events-none"
                    style={{
                        left: tooltipPos.x,
                        top: tooltipPos.y,
                        transform: 'translate(-50%, -100%)',
                    }}
                >
                    <div className="bg-foreground text-background px-2 py-1 rounded-md shadow-lg whitespace-nowrap flex items-center gap-1.5">
                        <span
                            className="w-1.5 h-1.5 rounded-full shrink-0"
                            style={{ backgroundColor: isDark ? STAGE_COLORS[hoveredStage].bg : STAGE_COLORS[hoveredStage].bgDark }}
                        />
                        <span className="text-[10px] font-medium">{hoveredStage}</span>
                        <span className="text-[10px] font-semibold tabular-nums opacity-80">
                            {formatDuration(hoveredTransition.daysInStage)}
                        </span>
                    </div>
                    <div
                        className="w-0 h-0 mx-auto"
                        style={{
                            borderLeft: '4px solid transparent',
                            borderRight: '4px solid transparent',
                            borderTop: '4px solid hsl(var(--foreground))',
                        }}
                    />
                </div>
            )}

            {/* Bar */}
            <div className="flex gap-[2px] h-[4px]">
                {PIPELINE_STAGES.map((stage, idx) => {
                    const transition = history.find(t => t.stage === stage)
                    const colors = STAGE_COLORS[stage]
                    const isHovered = hoveredStage === stage
                    const hasHover = hoveredStage !== null

                    if (idx > currentStageIdx) {
                        return (
                            <div
                                key={stage}
                                className="flex-1 bg-border/30 dark:bg-muted-foreground/8 rounded-full transition-all duration-150"
                                style={{ opacity: hasHover ? 0.3 : 1 }}
                            />
                        )
                    }

                    const widthPercent = transition
                        ? Math.max(8, (transition.daysInStage / Math.max(totalDays, 1)) * 100)
                        : 8

                    return (
                        <div
                            key={stage}
                            className="rounded-full cursor-pointer transition-all duration-150"
                            style={{
                                flex: isHovered
                                    ? `${widthPercent * 1.6} 0 0%`
                                    : `${widthPercent} 0 0%`,
                                backgroundColor: isDark ? colors.bgDark : colors.bg,
                                opacity: hasHover && !isHovered ? 0.35 : 1,
                                height: isHovered ? '6px' : '4px',
                                marginTop: isHovered ? '-1px' : '0',
                                boxShadow: isHovered
                                    ? `0 1px 4px ${isDark ? colors.bgDark : colors.bg}80`
                                    : 'none',
                            }}
                            onMouseEnter={(e) => handleMouseEnter(stage, e)}
                            onMouseLeave={handleMouseLeave}
                        />
                    )
                })}
            </div>
        </div>
    )
})
