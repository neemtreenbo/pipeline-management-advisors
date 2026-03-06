import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, RotateCcw, Save, Zap, CheckSquare, Settings2 } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
    loadRules,
    saveRules,
    resetRules,
    getDefaultRules,
    RULE_DEFINITIONS,
    type RulesConfig,
    type RuleMeta,
    refreshRules,
} from '@/lib/dashboard'

const CATEGORY_META = {
    deal: {
        label: 'Deal Rules',
        description: 'Control when deals get flagged for attention',
        icon: <Zap size={16} />,
    },
    task: {
        label: 'Task Rules',
        description: 'Control how tasks surface as action items',
        icon: <CheckSquare size={16} />,
    },
    general: {
        label: 'General',
        description: 'Activity feed and lookback settings',
        icon: <Settings2 size={16} />,
    },
} as const

function RuleField({
    meta,
    value,
    defaultValue,
    onChange,
}: {
    meta: RuleMeta
    value: number
    defaultValue: number
    onChange: (val: number) => void
}) {
    const isModified = value !== defaultValue

    return (
        <div className="flex items-start justify-between gap-6 py-4 border-b border-border last:border-0">
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                    <Label className="text-sm font-medium text-foreground">
                        {meta.label}
                    </Label>
                    {isModified && (
                        <span className="text-[10px] font-medium text-accent bg-accent/10 rounded px-1.5 py-0.5">
                            Modified
                        </span>
                    )}
                </div>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                    {meta.description}
                </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
                <Input
                    type="number"
                    value={value}
                    onChange={(e) => {
                        const num = parseInt(e.target.value, 10)
                        if (!isNaN(num)) {
                            const clamped = Math.min(
                                meta.max ?? 999,
                                Math.max(meta.min ?? 0, num)
                            )
                            onChange(clamped)
                        }
                    }}
                    min={meta.min}
                    max={meta.max}
                    className="w-20 h-9 text-center text-sm"
                />
                {meta.unit && (
                    <span className="text-xs text-muted-foreground w-10">
                        {meta.unit}
                    </span>
                )}
            </div>
        </div>
    )
}

export default function RulesPage() {
    const navigate = useNavigate()
    const [rules, setRules] = useState<RulesConfig>(loadRules)
    const [saved, setSaved] = useState(false)
    const defaults = getDefaultRules()

    const handleChange = useCallback(
        (key: keyof RulesConfig, value: number) => {
            setRules((prev) => ({ ...prev, [key]: value }))
            setSaved(false)
        },
        []
    )

    const handleSave = useCallback(() => {
        saveRules(rules)
        refreshRules()
        setSaved(true)
        setTimeout(() => setSaved(false), 2000)
    }, [rules])

    const handleReset = useCallback(() => {
        const fresh = resetRules()
        setRules(fresh)
        refreshRules()
        setSaved(false)
    }, [])

    const modifiedCount = RULE_DEFINITIONS.filter(
        (r) =>
            r.type === 'number' &&
            (rules[r.key] as number) !== (defaults[r.key] as number)
    ).length

    const categories = ['deal', 'task', 'general'] as const

    return (
        <div className="min-h-screen bg-transparent">
            <div className="max-w-2xl mx-auto px-6 py-4">
                {/* Header */}
                <div className="flex items-center gap-3 mb-8">
                    <button
                        onClick={() => navigate('/app/home')}
                        className="p-1.5 rounded-lg hover:bg-muted transition-colors duration-150"
                    >
                        <ArrowLeft size={20} className="text-muted-foreground" />
                    </button>
                    <div className="flex-1">
                        <h1 className="text-lg font-semibold text-foreground">
                            Alert Rules
                        </h1>
                        <p className="text-xs text-muted-foreground mt-0.5">
                            Fine-tune when action items and insights are triggered
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        {modifiedCount > 0 && (
                            <span className="text-xs text-muted-foreground">
                                {modifiedCount} modified
                            </span>
                        )}
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleReset}
                            className="text-muted-foreground"
                        >
                            <RotateCcw size={14} />
                            Reset
                        </Button>
                        <Button size="sm" onClick={handleSave}>
                            <Save size={14} />
                            {saved ? 'Saved' : 'Save'}
                        </Button>
                    </div>
                </div>

                {/* Rule Categories */}
                <div className="flex flex-col gap-8">
                    {categories.map((cat) => {
                        const meta = CATEGORY_META[cat]
                        const catRules = RULE_DEFINITIONS.filter(
                            (r) => r.category === cat && r.type === 'number'
                        )
                        if (catRules.length === 0) return null

                        return (
                            <div key={cat}>
                                <div className="flex items-center gap-2 mb-3">
                                    <span className="text-muted-foreground">
                                        {meta.icon}
                                    </span>
                                    <div>
                                        <p className="text-sm font-medium text-foreground">
                                            {meta.label}
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            {meta.description}
                                        </p>
                                    </div>
                                </div>
                                <Card>
                                    <CardContent className="p-4">
                                        {catRules.map((rule) => (
                                            <RuleField
                                                key={rule.key}
                                                meta={rule}
                                                value={
                                                    rules[rule.key] as number
                                                }
                                                defaultValue={
                                                    defaults[
                                                        rule.key
                                                    ] as number
                                                }
                                                onChange={(val) =>
                                                    handleChange(rule.key, val)
                                                }
                                            />
                                        ))}
                                    </CardContent>
                                </Card>
                            </div>
                        )
                    })}
                </div>
            </div>
        </div>
    )
}
