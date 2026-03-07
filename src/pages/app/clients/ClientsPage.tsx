import { useState, useEffect, useRef, useCallback, useMemo, memo, useLayoutEffect } from 'react'
import { createPortal } from 'react-dom'
import { useVirtualizer } from '@tanstack/react-virtual'
import { useNavigate } from 'react-router-dom'
import { Plus, X, Check, Mail, Phone, ArrowUp, ArrowDown, ArrowUpDown, Search, Users, Pencil, ChevronDown } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '@/contexts/AuthContext'
import { useOrg } from '@/contexts/OrgContext'
import { useClients, useCreateClient, useUpdateClient } from '@/hooks/queries/useClients'
import { useTheme } from '@/contexts/ThemeContext'
import { SOURCE_COLORS, getAccentBg } from '@/lib/colors'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'

type SortField = 'name' | 'source' | 'email' | 'phone' | 'birthday'

interface Client {
    id: string
    name: string
    email: string | null
    phone: string | null
    source: string | null
    tags: string[] | null
    created_at: string
    birthday: string | null
    owner_id: string
    org_id: string
    profile_picture_url?: string | null
}

type InlineEdit = {
    id: string
    field: 'name' | 'email' | 'phone' | 'source' | 'birthday'
    value: string
}

interface InlineCellProps {
    client: Client
    field: InlineEdit['field']
    display: React.ReactNode
    placeholder: string
    isEditing: boolean
    editValue: string
    onEditChange: (value: string) => void
    onSave: (overrideValue?: string) => void
    onCancel: () => void
    onStartEdit: (client: Client, field: InlineEdit['field']) => void
    inputRef?: React.RefObject<HTMLInputElement | null>
}

/** Premium floating dropdown for source selection with colored dots — rendered via portal to escape overflow:hidden */
function SourceDropdown({ value, onChange, onClose, options, id, triggerRef }: {
    value: string
    onChange: (value: string) => void
    onClose: () => void
    options: { value: string; label: string }[]
    id?: string
    triggerRef?: React.RefObject<HTMLElement | null>
}) {
    const { theme } = useTheme()
    const isDark = theme === 'dark'
    const menuRef = useRef<HTMLDivElement>(null)
    const [highlightIdx, setHighlightIdx] = useState(() =>
        Math.max(0, options.findIndex(o => o.value === value))
    )
    const [pos, setPos] = useState<{ top: number; left: number } | null>(null)

    // Position the dropdown beneath the trigger element
    useLayoutEffect(() => {
        if (triggerRef?.current) {
            const rect = triggerRef.current.getBoundingClientRect()
            setPos({ top: rect.bottom + 4, left: rect.left })
        }
    }, [triggerRef])

    useEffect(() => {
        function handleClickOutside(e: MouseEvent) {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                onClose()
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [onClose])

    function handleKeyDown(e: React.KeyboardEvent) {
        if (e.key === 'ArrowDown') {
            e.preventDefault()
            setHighlightIdx(i => Math.min(i + 1, options.length - 1))
        } else if (e.key === 'ArrowUp') {
            e.preventDefault()
            setHighlightIdx(i => Math.max(i - 1, 0))
        } else if (e.key === 'Enter') {
            e.preventDefault()
            onChange(options[highlightIdx].value)
            onClose()
        } else if (e.key === 'Escape') {
            onClose()
        }
    }

    const dropdown = (
        <div
            ref={menuRef}
            id={id}
            tabIndex={0}
            autoFocus
            onKeyDown={handleKeyDown}
            className="fixed z-[9999] w-40 rounded-xl border border-border bg-card shadow-lg py-1 outline-none animate-in fade-in-0 zoom-in-95 duration-100"
            style={pos ? { top: pos.top, left: pos.left } : { visibility: 'hidden' as const }}
        >
            {options.map((opt, idx) => {
                const color = opt.value ? SOURCE_COLORS[opt.value] : null
                const isActive = opt.value === value
                const isHighlighted = idx === highlightIdx
                return (
                    <button
                        key={opt.value}
                        onMouseEnter={() => setHighlightIdx(idx)}
                        onClick={() => { onChange(opt.value); onClose() }}
                        className={`w-full flex items-center gap-2.5 px-3 py-1.5 text-left text-[13px] transition-all duration-150 rounded-md mx-0
                            ${isHighlighted ? 'bg-muted/70 translate-x-0.5' : ''}
                            ${isActive ? 'font-medium text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                    >
                        <span
                            className={`w-2 h-2 rounded-full shrink-0 transition-transform duration-150 ${isHighlighted ? 'scale-125' : ''}`}
                            style={{
                                backgroundColor: color
                                    ? getAccentBg(color, isDark)
                                    : 'hsl(var(--border))',
                            }}
                        />
                        <span className="truncate">{opt.label}</span>
                        {isActive && <Check size={12} className="ml-auto text-foreground/50 shrink-0" />}
                    </button>
                )
            })}
        </div>
    )

    return createPortal(dropdown, document.body)
}

const InlineCell = memo(function InlineCell({
    client,
    field,
    display,
    placeholder,
    isEditing,
    editValue,
    onEditChange,
    onSave,
    onCancel,
    onStartEdit,
    inputRef,
}: InlineCellProps) {
    const sourceTriggerRef = useRef<HTMLDivElement>(null)

    if (field === 'source') {
        return (
            <div className="relative" ref={sourceTriggerRef}>
                {isEditing && (
                    <SourceDropdown
                        value={editValue}
                        onChange={(v) => onSave(v)}
                        onClose={onCancel}
                        options={SOURCE_OPTIONS}
                        triggerRef={sourceTriggerRef}
                    />
                )}
                <div
                    className="cursor-pointer rounded px-1.5 py-1 -mx-1.5 hover:bg-muted/60 transition-colors duration-150 min-h-[26px] flex items-center gap-1 group/cell"
                    onClick={() => onStartEdit(client, field)}
                >
                    {display || <span className="text-muted-foreground/25 text-[13px]">{placeholder}</span>}
                    <ChevronDown size={10} className="text-muted-foreground/0 group-hover/cell:text-muted-foreground/30 transition-colors shrink-0" />
                </div>
            </div>
        )
    }

    if (field === 'birthday') {
        return (
            <div className="relative">
                {isEditing ? (
                    <input
                        ref={inputRef}
                        type="date"
                        value={editValue}
                        onChange={e => { onSave(e.target.value) }}
                        onBlur={() => onCancel()}
                        onKeyDown={e => {
                            if (e.key === 'Escape') onCancel()
                        }}
                        className="w-full text-[12px] bg-card border border-accent/30 rounded-lg px-2 py-1 outline-none ring-2 ring-accent/10 focus:ring-accent/20 focus:border-accent/40 transition-all shadow-sm"
                    />
                ) : (
                    <div
                        className="cursor-text rounded px-1.5 py-1 -mx-1.5 hover:bg-muted/60 transition-colors duration-150 min-h-[26px] flex items-center gap-1 group/cell"
                        onClick={() => onStartEdit(client, field)}
                    >
                        {display || <span className="text-muted-foreground/25 text-[13px]">{placeholder}</span>}
                        <Pencil size={10} className="text-muted-foreground/0 group-hover/cell:text-muted-foreground/30 transition-colors shrink-0" />
                    </div>
                )}
            </div>
        )
    }

    return (
        <div className="relative">
            {isEditing ? (
                <input
                    ref={inputRef}
                    value={editValue}
                    onChange={e => onEditChange(e.target.value)}
                    onBlur={onSave}
                    onKeyDown={e => {
                        if (e.key === 'Enter') onSave()
                        if (e.key === 'Escape') onCancel()
                    }}
                    placeholder={placeholder}
                    className="w-full text-[13px] bg-card border border-accent/30 rounded-lg px-2 py-1 outline-none ring-2 ring-accent/10 focus:ring-accent/20 focus:border-accent/40 transition-all shadow-sm"
                />
            ) : (
                <div
                    className="cursor-text rounded px-1.5 py-1 -mx-1.5 hover:bg-muted/60 transition-colors duration-150 min-h-[26px] flex items-center gap-1 group/cell"
                    onClick={() => onStartEdit(client, field)}
                >
                    {display || <span className="text-muted-foreground/25 text-[13px]">{placeholder}</span>}
                    <Pencil size={10} className="text-muted-foreground/0 group-hover/cell:text-muted-foreground/30 transition-colors shrink-0" />
                </div>
            )}
        </div>
    )
})

const SOURCE_OPTIONS = [
    { value: '', label: 'None' },
    { value: 'referral', label: 'Referral' },
    { value: 'family', label: 'Family' },
    { value: 'friends', label: 'Friends' },
    { value: 'social_media', label: 'Social Media' },
    { value: 'website', label: 'Website' },
    { value: 'cold_call', label: 'Cold Call' },
    { value: 'event', label: 'Event' },
    { value: 'other', label: 'Other' },
]

const SOURCE_FILTERS = [
    { value: 'all', label: 'All' },
    { value: 'referral', label: 'Referral' },
    { value: 'family', label: 'Family' },
    { value: 'friends', label: 'Friends' },
    { value: 'social_media', label: 'Social Media' },
    { value: 'website', label: 'Website' },
    { value: 'cold_call', label: 'Cold Call' },
    { value: 'event', label: 'Event' },
]


function getInitials(name: string) {
    if (!name) return '?'
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

function formatSource(src: string | null) {
    if (!src) return null
    return src.replace(/_/g, ' ')
}

const ROW_HEIGHT = 52

function VirtualizedClientTable({
    filtered,
    addingNew,
    newRow,
    setNewRow,
    newNameRef,
    newSourceTriggerRef,
    newSourceOpen,
    setNewSourceOpen,
    saveNewRow,
    cancelAddingNew,
    createClientMutation,
    sortField,
    setSortField,
    sortDir,
    setSortDir,
    inlineEdit,
    handleEditChange,
    saveInlineEdit,
    handleCancelEdit,
    startEdit,
    inlineInputRef,
    navigate,
    isDark,
}: {
    filtered: Client[]
    addingNew: boolean
    newRow: { name: string; email: string; phone: string; source: string }
    setNewRow: React.Dispatch<React.SetStateAction<{ name: string; email: string; phone: string; source: string }>>
    newNameRef: React.RefObject<HTMLInputElement | null>
    newSourceTriggerRef: React.RefObject<HTMLDivElement | null>
    newSourceOpen: boolean
    setNewSourceOpen: React.Dispatch<React.SetStateAction<boolean>>
    saveNewRow: () => void
    cancelAddingNew: () => void
    createClientMutation: { isPending: boolean }
    sortField: SortField
    setSortField: (f: SortField) => void
    sortDir: 'asc' | 'desc'
    setSortDir: React.Dispatch<React.SetStateAction<'asc' | 'desc'>>
    inlineEdit: InlineEdit | null
    handleEditChange: (value: string) => void
    saveInlineEdit: (overrideValue?: string) => void
    handleCancelEdit: () => void
    startEdit: (client: Client, field: InlineEdit['field']) => void
    inlineInputRef: React.RefObject<HTMLInputElement | null>
    navigate: (to: string) => void
    isDark: boolean
}) {
    const scrollRef = useRef<HTMLDivElement>(null)

    const rowVirtualizer = useVirtualizer({
        count: filtered.length,
        getScrollElement: () => scrollRef.current,
        estimateSize: () => ROW_HEIGHT,
        overscan: 20,
    })

    // Cap the Card height: content-driven up to viewport max
    const headerHeight = 37 // thead row
    const newRowHeight = addingNew ? 56 : 0
    const contentHeight = headerHeight + newRowHeight + rowVirtualizer.getTotalSize()
    const maxHeight = typeof window !== 'undefined' ? window.innerHeight - 220 : 600

    return (
        <Card
            ref={scrollRef}
            className="overflow-y-auto"
            style={{ maxHeight: Math.min(contentHeight, maxHeight) }}
        >
            {/* Table header */}
            <div className="sticky top-0 z-10 grid grid-cols-[2.6fr_1fr_1.6fr_1.4fr_0.9fr] px-5 py-2.5 border-b border-border/60 bg-muted dark:bg-card">
                {[
                    { field: 'name', label: 'Name' },
                    { field: 'source', label: 'Source' },
                    { field: 'email', label: 'Email' },
                    { field: 'phone', label: 'Phone' },
                    { field: 'birthday', label: 'Birthday' },
                ].map(({ field, label }) => {
                    const isActive = field && sortField === field;
                    return (
                        <button
                            key={label}
                            onClick={() => {
                                if (!field) return
                                if (isActive) {
                                    setSortDir(d => d === 'asc' ? 'desc' : 'asc')
                                } else {
                                    setSortField(field as SortField)
                                    setSortDir('asc')
                                }
                            }}
                            className={`flex items-center gap-1 text-[11px] font-medium text-muted-foreground/60 uppercase tracking-wider text-left w-fit transition-colors duration-150 ${field ? 'hover:text-muted-foreground cursor-pointer' : 'cursor-default'}`}
                        >
                            {label}
                            {field && (isActive ? (
                                sortDir === 'asc' ? <ArrowUp size={11} /> : <ArrowDown size={11} />
                            ) : (
                                <ArrowUpDown size={11} className="opacity-40" />
                            ))}
                        </button>
                    )
                })}
            </div>

            {/* New inline row */}
            <AnimatePresence>
                {addingNew && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2 }}
                    >
                        <div className="grid grid-cols-[2.6fr_1fr_1.6fr_1.4fr_0.9fr] px-5 py-3 items-center border-b border-border/40 bg-accent/[0.02]">
                            {/* Name */}
                            <div className="pr-4 flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                                    <span className="text-[10px] text-muted-foreground/40">—</span>
                                </div>
                                <input
                                    ref={newNameRef}
                                    value={newRow.name}
                                    onChange={e => setNewRow(r => ({ ...r, name: e.target.value }))}
                                    onKeyDown={e => {
                                        if (e.key === 'Enter' && newRow.name.trim()) saveNewRow()
                                        if (e.key === 'Escape') cancelAddingNew()
                                        if (e.key === 'Tab') { e.preventDefault(); document.getElementById('new-source')?.focus() }
                                    }}
                                    placeholder="Full name"
                                    className="flex-1 text-sm bg-card border border-accent/30 rounded-lg px-2.5 py-1.5 outline-none ring-2 ring-accent/10 focus:ring-accent/20 focus:border-accent/40 transition-all min-w-0 placeholder:text-muted-foreground/30 shadow-sm"
                                />
                            </div>

                            {/* Source */}
                            <div className="pr-4 relative" ref={newSourceTriggerRef}>
                                <button
                                    id="new-source"
                                    type="button"
                                    onClick={() => setNewSourceOpen(o => !o)}
                                    onKeyDown={e => {
                                        if (e.key === 'Escape') { cancelAddingNew(); setNewSourceOpen(false) }
                                        if (e.key === 'Tab') { e.preventDefault(); setNewSourceOpen(false); document.getElementById('new-email')?.focus() }
                                    }}
                                    className="w-full flex items-center justify-between gap-1 text-[13px] bg-card border border-accent/30 rounded-lg px-2.5 py-1.5 outline-none ring-2 ring-accent/10 focus:ring-accent/20 focus:border-accent/40 transition-all shadow-sm text-muted-foreground"
                                >
                                    <span className={newRow.source ? 'text-foreground' : ''}>
                                        {newRow.source ? SOURCE_OPTIONS.find(o => o.value === newRow.source)?.label : 'Source'}
                                    </span>
                                    <ChevronDown size={12} className="text-muted-foreground/40 shrink-0" />
                                </button>
                                {newSourceOpen && (
                                    <SourceDropdown
                                        value={newRow.source}
                                        onChange={(v) => setNewRow(r => ({ ...r, source: v }))}
                                        onClose={() => setNewSourceOpen(false)}
                                        options={SOURCE_OPTIONS}
                                        triggerRef={newSourceTriggerRef}
                                    />
                                )}
                            </div>

                            {/* Email */}
                            <div className="pr-4">
                                <input
                                    id="new-email"
                                    type="email"
                                    value={newRow.email}
                                    onChange={e => setNewRow(r => ({ ...r, email: e.target.value }))}
                                    onKeyDown={e => {
                                        if (e.key === 'Enter' && newRow.name.trim()) saveNewRow()
                                        if (e.key === 'Escape') cancelAddingNew()
                                        if (e.key === 'Tab') { e.preventDefault(); document.getElementById('new-phone')?.focus() }
                                    }}
                                    placeholder="Email"
                                    className="w-full text-[13px] bg-card border border-accent/30 rounded-lg px-2.5 py-1.5 outline-none ring-2 ring-accent/10 focus:ring-accent/20 focus:border-accent/40 transition-all placeholder:text-muted-foreground/30 shadow-sm"
                                />
                            </div>

                            {/* Phone */}
                            <div className="pr-3">
                                <input
                                    id="new-phone"
                                    value={newRow.phone}
                                    onChange={e => setNewRow(r => ({ ...r, phone: e.target.value }))}
                                    onKeyDown={e => {
                                        if (e.key === 'Enter' && newRow.name.trim()) saveNewRow()
                                        if (e.key === 'Escape') cancelAddingNew()
                                    }}
                                    placeholder="Phone"
                                    className="w-full text-[13px] bg-card border border-accent/30 rounded-lg px-2.5 py-1.5 outline-none ring-2 ring-accent/10 focus:ring-accent/20 focus:border-accent/40 transition-all placeholder:text-muted-foreground/30 shadow-sm"
                                />
                            </div>

                            {/* Actions */}
                            <div className="flex items-center gap-1.5">
                                <button
                                    onClick={saveNewRow}
                                    disabled={!newRow.name.trim() || createClientMutation.isPending}
                                    className="w-7 h-7 rounded-full bg-foreground text-background flex items-center justify-center hover:bg-foreground/80 transition-colors duration-150 disabled:opacity-25 disabled:cursor-not-allowed"
                                >
                                    <Check size={12} strokeWidth={2.5} />
                                </button>
                                <button
                                    onClick={cancelAddingNew}
                                    className="w-7 h-7 rounded-full bg-muted text-muted-foreground flex items-center justify-center hover:bg-muted/70 transition-colors duration-150"
                                >
                                    <X size={12} strokeWidth={2.5} />
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Virtualized rows */}
            <div
                style={{
                    height: rowVirtualizer.getTotalSize(),
                    position: 'relative',
                }}
            >
                {rowVirtualizer.getVirtualItems().map(virtualRow => {
                    const client = filtered[virtualRow.index]
                    const idx = virtualRow.index
                    return (
                        <div
                            key={client.id}
                            className={`absolute left-0 w-full`}
                            style={{
                                height: virtualRow.size,
                                transform: `translateY(${virtualRow.start}px)`,
                            }}
                        >
                            <div
                                className={`relative grid grid-cols-[2.6fr_1fr_1.6fr_1.4fr_0.9fr] px-5 h-full items-center ${idx < filtered.length - 1 ? 'border-b border-border/40' : ''} hover:bg-accent/[0.03] dark:hover:bg-accent/[0.06] transition-colors duration-150 group`}
                            >
                                {/* Left accent bar on hover */}
                                <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-accent opacity-0 group-hover:opacity-100 transition-opacity duration-200 rounded-full" />

                                {/* Name — click navigates */}
                                <div
                                    className="min-w-0 pr-4 flex items-center gap-3 cursor-pointer"
                                    onClick={() => navigate(`/app/clients/${client.id}`)}
                                >
                                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-accent/20 to-accent/5 dark:from-accent/30 dark:to-accent/10 flex items-center justify-center shrink-0 overflow-hidden ring-2 ring-transparent group-hover:ring-accent/20 transition-all duration-200">
                                        {client.profile_picture_url ? (
                                            <img src={client.profile_picture_url} alt={client.name} className="w-full h-full object-cover" />
                                        ) : (
                                            <span className="text-[11px] font-semibold text-accent/80">{getInitials(client.name)}</span>
                                        )}
                                    </div>
                                    <span className="text-[13px] font-medium text-foreground truncate group-hover:text-accent transition-colors duration-200">{client.name}</span>
                                </div>

                                {/* Source */}
                                <div className="pr-4">
                                    <InlineCell
                                        client={client}
                                        field="source"
                                        display={
                                            client.source ? (
                                                <span
                                                    className="inline-flex items-center justify-center min-w-[5.5rem] px-2 py-0.5 rounded-full text-[11px] font-medium capitalize text-white/90"
                                                    style={{
                                                        backgroundColor: SOURCE_COLORS[client.source]
                                                            ? getAccentBg(SOURCE_COLORS[client.source], isDark)
                                                            : undefined,
                                                    }}
                                                >
                                                    {formatSource(client.source)}
                                                </span>
                                            ) : null
                                        }
                                        placeholder="—"
                                        isEditing={inlineEdit?.id === client.id && inlineEdit?.field === 'source'}
                                        editValue={inlineEdit?.id === client.id && inlineEdit?.field === 'source' ? inlineEdit.value : ''}
                                        onEditChange={handleEditChange}
                                        onSave={saveInlineEdit}
                                        onCancel={handleCancelEdit}
                                        onStartEdit={startEdit}
                                    />
                                </div>

                                {/* Email */}
                                <div className="pr-4 min-w-0">
                                    <InlineCell
                                        client={client}
                                        field="email"
                                        display={
                                            client.email ? (
                                                <span className="flex items-center gap-1.5 min-w-0">
                                                    <Mail size={12} className="text-muted-foreground/40 shrink-0" />
                                                    <span className="text-[13px] text-foreground/80 truncate">{client.email}</span>
                                                </span>
                                            ) : null
                                        }
                                        placeholder="—"
                                        isEditing={inlineEdit?.id === client.id && inlineEdit?.field === 'email'}
                                        editValue={inlineEdit?.id === client.id && inlineEdit?.field === 'email' ? inlineEdit.value : ''}
                                        onEditChange={handleEditChange}
                                        onSave={saveInlineEdit}
                                        onCancel={handleCancelEdit}
                                        onStartEdit={startEdit}
                                        inputRef={inlineInputRef}
                                    />
                                </div>

                                {/* Phone */}
                                <div className="pr-4">
                                    <InlineCell
                                        client={client}
                                        field="phone"
                                        display={
                                            client.phone ? (
                                                <span className="flex items-center gap-1.5">
                                                    <Phone size={12} className="text-muted-foreground/40 shrink-0" />
                                                    <span className="text-[13px] text-foreground/80">{client.phone}</span>
                                                </span>
                                            ) : null
                                        }
                                        placeholder="—"
                                        isEditing={inlineEdit?.id === client.id && inlineEdit?.field === 'phone'}
                                        editValue={inlineEdit?.id === client.id && inlineEdit?.field === 'phone' ? inlineEdit.value : ''}
                                        onEditChange={handleEditChange}
                                        onSave={saveInlineEdit}
                                        onCancel={handleCancelEdit}
                                        onStartEdit={startEdit}
                                        inputRef={inlineInputRef}
                                    />
                                </div>

                                {/* Birthday */}
                                <div>
                                    <InlineCell
                                        client={client}
                                        field="birthday"
                                        display={
                                            client.birthday ? (
                                                <span className="text-[12px] text-muted-foreground/60 tabular-nums">
                                                    {(() => {
                                                        const bday = new Date(client.birthday + 'T00:00:00')
                                                        const today = new Date()
                                                        let age = today.getFullYear() - bday.getFullYear()
                                                        if (today.getMonth() < bday.getMonth() || (today.getMonth() === bday.getMonth() && today.getDate() < bday.getDate())) age--
                                                        return `${bday.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} (${age})`
                                                    })()}
                                                </span>
                                            ) : null
                                        }
                                        placeholder="—"
                                        isEditing={inlineEdit?.id === client.id && inlineEdit?.field === 'birthday'}
                                        editValue={inlineEdit?.id === client.id && inlineEdit?.field === 'birthday' ? inlineEdit.value : ''}
                                        onEditChange={handleEditChange}
                                        onSave={saveInlineEdit}
                                        onCancel={handleCancelEdit}
                                        onStartEdit={startEdit}
                                        inputRef={inlineInputRef}
                                    />
                                </div>
                            </div>
                        </div>
                    )
                })}
            </div>
        </Card>
    )
}

export default function ClientsPage() {
    const { user } = useAuth()
    const { orgId } = useOrg()
    const { theme } = useTheme()
    const isDark = theme === 'dark'
    const navigate = useNavigate()
    const { data: clients = [], isLoading: loading } = useClients(orgId ?? undefined)
    const createClientMutation = useCreateClient(orgId ?? '')
    const updateClientMutation = useUpdateClient()

    // Inline edit state (existing rows)
    const [inlineEdit, setInlineEdit] = useState<InlineEdit | null>(null)
    const inlineInputRef = useRef<HTMLInputElement>(null)

    // New inline row state
    const [addingNew, setAddingNew] = useState(false)
    const [newRow, setNewRow] = useState({ name: '', email: '', phone: '', source: '' })
    const newNameRef = useRef<HTMLInputElement>(null)
    const [newSourceOpen, setNewSourceOpen] = useState(false)
    const newSourceTriggerRef = useRef<HTMLDivElement>(null)

    // Sort state
    const [sortField, setSortField] = useState<SortField>('name')
    const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')

    // Search & filter state
    const [searchQuery, setSearchQuery] = useState('')
    const [sourceFilter, setSourceFilter] = useState('all')

    // Focus name field when new row opens
    useEffect(() => {
        if (addingNew) {
            setTimeout(() => newNameRef.current?.focus(), 30)
        }
    }, [addingNew])

    function startAddingNew() {
        setNewRow({ name: '', email: '', phone: '', source: '' })
        setAddingNew(true)
    }

    function cancelAddingNew() {
        setAddingNew(false)
        setNewSourceOpen(false)
        setNewRow({ name: '', email: '', phone: '', source: '' })
    }

    async function saveNewRow() {
        if (!orgId || !user || !newRow.name.trim() || createClientMutation.isPending) return

        try {
            await createClientMutation.mutateAsync({
                owner_id: user.id,
                name: newRow.name.trim(),
                email: newRow.email.trim() || undefined,
                phone: newRow.phone.trim() || undefined,
                source: newRow.source || undefined,
                tags: [],
            })
            setAddingNew(false)
            setNewRow({ name: '', email: '', phone: '', source: '' })
        } catch {
            // error handled by mutation
        }
    }

    useEffect(() => {
        if (inlineEdit) {
            setTimeout(() => inlineInputRef.current?.focus(), 30)
        }
    }, [inlineEdit])

    async function saveInlineEdit(overrideValue?: string) {
        if (!inlineEdit || updateClientMutation.isPending) return

        const { id, field } = inlineEdit
        const value = overrideValue ?? inlineEdit.value
        if (field === 'name' && !value.trim()) {
            setInlineEdit(null)
            return
        }

        setInlineEdit(null)
        try {
            await updateClientMutation.mutateAsync({ id, [field]: value.trim() || null })
        } catch {
            // error handled by mutation
        }
    }

    function startEdit(client: Client, field: InlineEdit['field']) {
        setInlineEdit({
            id: client.id,
            field,
            value: (client[field] as string) ?? '',
        })
    }

    const filtered = useMemo(() => {
        let result = [...clients]
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase()
            result = result.filter(c =>
                c.name.toLowerCase().includes(q) ||
                c.email?.toLowerCase().includes(q) ||
                c.phone?.includes(q)
            )
        }
        if (sourceFilter !== 'all') {
            result = result.filter(c => c.source === sourceFilter)
        }
        return result.sort((a, b) => {
            if (sortField === 'birthday') {
                const tA = a.birthday ? new Date(a.birthday + 'T00:00:00').getTime() : 0
                const tB = b.birthday ? new Date(b.birthday + 'T00:00:00').getTime() : 0
                return sortDir === 'asc' ? tA - tB : tB - tA
            }
            const valA = (a[sortField] || '').toLowerCase()
            const valB = (b[sortField] || '').toLowerCase()

            if (valA < valB) return sortDir === 'asc' ? -1 : 1
            if (valA > valB) return sortDir === 'asc' ? 1 : -1
            return 0
        })
    }, [clients, searchQuery, sourceFilter, sortField, sortDir])

    const handleEditChange = useCallback((value: string) => {
        setInlineEdit(prev => prev ? { ...prev, value } : prev)
    }, [])

    const handleCancelEdit = useCallback(() => {
        setInlineEdit(null)
    }, [])

    const showTable = !loading && (filtered.length > 0 || addingNew)
    const hasClientsButNoResults = !loading && filtered.length === 0 && clients.length > 0 && !addingNew

    return (
        <div className="min-h-screen bg-transparent pt-6">
            <div className="max-w-5xl mx-auto px-6 pb-8">
                {/* Header */}
                <div className="flex items-center justify-between mb-5 h-8">
                    <h1 className="text-lg font-semibold text-foreground leading-none flex items-center gap-2">
                        Clients
                        {!loading && clients.length > 0 && (
                            <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-normal bg-muted text-muted-foreground">
                                {filtered.length === clients.length ? clients.length : `${filtered.length} / ${clients.length}`}
                            </span>
                        )}
                    </h1>
                    <Button onClick={startAddingNew} className="h-8 text-xs rounded-full px-3 font-medium">
                        <Plus size={14} className="mr-1.5" /> Add
                    </Button>
                </div>

                {/* Search + Source Filter */}
                {!loading && clients.length > 0 && (
                    <div className="space-y-3 mb-5">
                        <div className="relative max-w-sm">
                            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/40" />
                            <Input
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                placeholder="Search clients..."
                                className="h-8 pl-8 text-sm rounded-lg"
                            />
                        </div>
                        <Tabs value={sourceFilter} onValueChange={setSourceFilter}>
                            <TabsList className="bg-transparent p-0 h-auto gap-0 border-b-0">
                                {SOURCE_FILTERS.map(f => (
                                    <TabsTrigger key={f.value} value={f.value} className="text-xs px-3 py-1.5">
                                        {f.label}
                                    </TabsTrigger>
                                ))}
                            </TabsList>
                        </Tabs>
                    </div>
                )}

                {loading ? (
                    <Card className="overflow-hidden">
                        {/* Skeleton header */}
                        <div className="grid grid-cols-[2.6fr_1fr_1.6fr_1.4fr_0.9fr] px-5 py-2.5 border-b border-border/60 bg-muted/40">
                            {['w-12', 'w-10', 'w-10', 'w-10', 'w-10'].map((w, i) => (
                                <div key={i} className={`h-2.5 bg-muted-foreground/10 rounded ${w}`} />
                            ))}
                        </div>
                        {/* Skeleton rows */}
                        {[...Array(6)].map((_, i) => (
                            <div key={i} className={`grid grid-cols-[2.6fr_1fr_1.6fr_1.4fr_0.9fr] px-5 py-3.5 items-center ${i < 5 ? 'border-b border-border/40' : ''}`}>
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-muted animate-pulse shrink-0" />
                                    <div className="h-3.5 bg-muted animate-pulse rounded w-28" />
                                </div>
                                <div className="h-5 bg-muted animate-pulse rounded-full w-16" />
                                <div className="h-3 bg-muted animate-pulse rounded w-32" />
                                <div className="h-3 bg-muted animate-pulse rounded w-20" />
                                <div className="h-2.5 bg-muted animate-pulse rounded w-16 opacity-50" />
                            </div>
                        ))}
                    </Card>
                ) : hasClientsButNoResults ? (
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                        <Search size={20} className="text-muted-foreground/30 mb-3" />
                        <p className="text-sm font-medium text-foreground mb-1">No matching clients</p>
                        <p className="text-[13px] text-muted-foreground/60">
                            Try adjusting your search or filter.
                        </p>
                        <button
                            onClick={() => { setSearchQuery(''); setSourceFilter('all') }}
                            className="text-[13px] text-accent hover:text-accent/80 mt-3 transition-colors"
                        >
                            Clear filters
                        </button>
                    </div>
                ) : !showTable ? (
                    <div className="flex flex-col items-center justify-center py-28 text-center">
                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-accent/10 to-accent/5 flex items-center justify-center mb-5">
                            <Users size={24} className="text-accent/60" />
                        </div>
                        <p className="text-base font-semibold text-foreground mb-1.5">No clients yet</p>
                        <p className="text-sm text-muted-foreground/60 mb-6 max-w-xs">
                            Start building your client list. Add contacts manually or import them.
                        </p>
                        <Button onClick={startAddingNew} className="rounded-xl shadow-none">
                            <Plus size={14} /> Add your first client
                        </Button>
                    </div>
                ) : (
                    <VirtualizedClientTable
                        filtered={filtered}
                        addingNew={addingNew}
                        newRow={newRow}
                        setNewRow={setNewRow}
                        newNameRef={newNameRef}
                        newSourceTriggerRef={newSourceTriggerRef}
                        newSourceOpen={newSourceOpen}
                        setNewSourceOpen={setNewSourceOpen}
                        saveNewRow={saveNewRow}
                        cancelAddingNew={cancelAddingNew}
                        createClientMutation={createClientMutation}
                        sortField={sortField}
                        setSortField={setSortField}
                        sortDir={sortDir}
                        setSortDir={setSortDir}
                        inlineEdit={inlineEdit}
                        handleEditChange={handleEditChange}
                        saveInlineEdit={saveInlineEdit}
                        handleCancelEdit={handleCancelEdit}
                        startEdit={startEdit}
                        inlineInputRef={inlineInputRef}
                        navigate={navigate}
                        isDark={isDark}
                    />
                )}
            </div>
        </div>
    )
}
