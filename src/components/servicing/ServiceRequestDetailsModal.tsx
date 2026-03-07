import { useState } from 'react'
import {
    X,
    ChevronDown,
    Calendar,
    User,
    Trash2,
    ClipboardList,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/contexts/AuthContext'
import { useOrg } from '@/contexts/OrgContext'
import { useTheme } from '@/contexts/ThemeContext'
import { supabase } from '@/lib/supabase'
import {
    SERVICE_REQUEST_STATUSES,
    SERVICE_REQUEST_PRIORITIES,
    SERVICE_REQUEST_TYPES,
    updateServiceRequest,
    deleteServiceRequest,
    logServiceRequestActivity,
} from '@/lib/service-requests'
import type { ServiceRequest, ServiceRequestStatus, ServiceRequestPriority } from '@/lib/service-requests'
import { useServiceRequest, useServiceRequestAttachments, useServiceRequestActivities } from '@/hooks/queries/useServiceRequests'
import { SERVICE_STATUS_COLORS, SERVICE_PRIORITY_COLORS, getAccentBg } from '@/lib/colors'
import { queryKeys } from '@/lib/queryKeys'
import ServiceRequestDocumentUploader from '@/components/servicing/ServiceRequestDocumentUploader'
import CommentThread from '@/components/comments/CommentThread'
import ActivityTimeline from '@/components/pipeline/ActivityTimeline'
import type { ActivityRecord } from '@/components/pipeline/ActivityTimeline'
import { useComments } from '@/hooks/queries/useComments'

function getRequestTypeLabel(value: string) {
    return SERVICE_REQUEST_TYPES.find(t => t.value === value)?.label ?? value
}

type Tab = 'documents' | 'comments' | 'activity'

interface ServiceRequestDetailsModalProps {
    serviceRequestId: string
    onClose: () => void
    onStatusChange?: (id: string, status: ServiceRequestStatus) => void
    onDeleted?: (id: string) => void
}

export default function ServiceRequestDetailsModal({
    serviceRequestId,
    onClose,
    onStatusChange,
    onDeleted,
}: ServiceRequestDetailsModalProps) {
    const { user } = useAuth()
    const { orgId } = useOrg()
    const { theme } = useTheme()
    const isDark = theme === 'dark'
    const qc = useQueryClient()

    const { data: sr = null, isLoading } = useServiceRequest(serviceRequestId)
    const { data: attachments = [] } = useServiceRequestAttachments(serviceRequestId)
    const { data: comments = [] } = useComments('service_request', serviceRequestId)
    const { data: activities = [] } = useServiceRequestActivities(serviceRequestId)

    const [activeTab, setActiveTab] = useState<Tab>('documents')
    const [editingStatus, setEditingStatus] = useState(false)
    const [editingPriority, setEditingPriority] = useState(false)
    const [editingTitle, setEditingTitle] = useState(false)
    const [titleDraft, setTitleDraft] = useState('')
    const [editingDescription, setEditingDescription] = useState(false)
    const [descriptionDraft, setDescriptionDraft] = useState('')
    const [confirmDelete, setConfirmDelete] = useState(false)
    const [deleting, setDeleting] = useState(false)

    async function handleStatusChange(newStatus: ServiceRequestStatus) {
        if (!sr || !user || !orgId) return
        const key = queryKeys.serviceRequests.detail(serviceRequestId)
        const oldStatus = sr.status
        qc.setQueryData<ServiceRequest>(key, (d) => d ? { ...d, status: newStatus } as ServiceRequest : d as unknown as ServiceRequest)
        setEditingStatus(false)
        onStatusChange?.(sr.id, newStatus)
        try {
            await updateServiceRequest(sr.id, { status: newStatus })
            await logServiceRequestActivity(orgId, user.id, sr.id, 'status_changed', {
                from: oldStatus,
                to: newStatus,
            })
            qc.invalidateQueries({ queryKey: queryKeys.serviceRequests.all(orgId) })
            qc.invalidateQueries({ queryKey: queryKeys.serviceRequests.activities(serviceRequestId) })
        } catch {
            qc.setQueryData<ServiceRequest>(key, (d) => d ? { ...d, status: oldStatus } as ServiceRequest : d as unknown as ServiceRequest)
        }
    }

    async function handlePriorityChange(newPriority: ServiceRequestPriority) {
        if (!sr || !orgId) return
        const key = queryKeys.serviceRequests.detail(serviceRequestId)
        const oldPriority = sr.priority
        qc.setQueryData<ServiceRequest>(key, (d) => d ? { ...d, priority: newPriority } as ServiceRequest : d as unknown as ServiceRequest)
        setEditingPriority(false)
        try {
            await updateServiceRequest(sr.id, { priority: newPriority })
            qc.invalidateQueries({ queryKey: queryKeys.serviceRequests.all(orgId) })
        } catch {
            qc.setQueryData<ServiceRequest>(key, (d) => d ? { ...d, priority: oldPriority } as ServiceRequest : d as unknown as ServiceRequest)
        }
    }

    async function handleTitleSave() {
        if (!sr || !orgId) return
        const newTitle = titleDraft.trim()
        if (!newTitle) { setEditingTitle(false); return }
        const key = queryKeys.serviceRequests.detail(serviceRequestId)
        qc.setQueryData<ServiceRequest>(key, (d) => d ? { ...d, title: newTitle } as ServiceRequest : d as unknown as ServiceRequest)
        setEditingTitle(false)
        await updateServiceRequest(sr.id, { title: newTitle })
        qc.invalidateQueries({ queryKey: queryKeys.serviceRequests.all(orgId) })
    }

    async function handleDescriptionSave() {
        if (!sr || !orgId) return
        const newDesc = descriptionDraft.trim() || null
        const key = queryKeys.serviceRequests.detail(serviceRequestId)
        qc.setQueryData<ServiceRequest>(key, (d) => d ? { ...d, description: newDesc } as ServiceRequest : d as unknown as ServiceRequest)
        setEditingDescription(false)
        await updateServiceRequest(sr.id, { description: newDesc })
        qc.invalidateQueries({ queryKey: queryKeys.serviceRequests.all(orgId) })
    }

    async function handleDelete() {
        if (!sr || !orgId) return
        setDeleting(true)
        try {
            // Remove storage files
            const storagePaths = attachments.map((a) => a.storage_path).filter(Boolean)
            if (storagePaths.length > 0) {
                await supabase.storage.from('service-request-files').remove(storagePaths)
            }
            // Clean up related rows
            await supabase.from('activities').delete().eq('entity_id', sr.id).eq('entity_type', 'service_request')
            await supabase.from('links').delete().or(`from_id.eq.${sr.id},to_id.eq.${sr.id}`)
            await deleteServiceRequest(sr.id)
            onDeleted?.(sr.id)
            onClose()
        } catch (err) {
            console.error('Failed to delete service request', err)
            setDeleting(false)
            setConfirmDelete(false)
        }
    }

    const statusColor = sr ? SERVICE_STATUS_COLORS[sr.status] : undefined
    const priorityColor = sr ? SERVICE_PRIORITY_COLORS[sr.priority] : undefined

    if (isLoading) {
        return (
            <>
                <div className="fixed inset-0 bg-black/30 z-50 backdrop-blur-sm" onClick={onClose} />
                <div className="fixed inset-0 z-[60] flex items-center justify-center pointer-events-none p-4">
                    <div className="bg-card rounded-2xl shadow-xl w-full max-w-xl h-[65vh] flex items-center justify-center pointer-events-auto">
                        <p className="text-sm text-muted-foreground/50 animate-pulse">Loading…</p>
                    </div>
                </div>
            </>
        )
    }

    if (!sr) {
        return (
            <>
                <div className="fixed inset-0 bg-black/30 z-50 backdrop-blur-sm" onClick={onClose} />
                <div className="fixed inset-0 z-[60] flex items-center justify-center pointer-events-none p-4">
                    <div className="bg-card rounded-2xl shadow-xl w-full max-w-xl h-[65vh] flex flex-col items-center justify-center gap-3 pointer-events-auto">
                        <p className="text-sm text-muted-foreground">Service request not found.</p>
                        <button className="text-sm text-foreground underline underline-offset-2" onClick={onClose}>Close</button>
                    </div>
                </div>
            </>
        )
    }

    return (
        <>
            <div className="fixed inset-0 bg-black/30 z-50 backdrop-blur-sm" onClick={onClose} />
            <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 pointer-events-none">
                <div className="bg-card rounded-2xl shadow-[0_16px_48px_-12px_rgba(0,0,0,0.18)] w-full max-w-xl h-[65vh] flex flex-col overflow-hidden border border-border pointer-events-auto">

                    {/* Header */}
                    <div className="shrink-0 border-b border-border/60">
                        <div className="px-6 pt-5 pb-4">
                            <div className="flex items-start justify-between gap-3">
                                {/* Left: avatar + title + client */}
                                <div className="flex items-start gap-3 min-w-0 flex-1">
                                    {/* Client avatar */}
                                    {sr.client && (
                                        <div className="shrink-0 mt-0.5">
                                            {sr.client.profile_picture_url ? (
                                                <img
                                                    src={sr.client.profile_picture_url}
                                                    alt={sr.client.name}
                                                    className="w-9 h-9 rounded-full object-cover border border-border/40"
                                                />
                                            ) : (
                                                <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center border border-border/40">
                                                    <span className="text-[13px] font-medium text-muted-foreground">
                                                        {sr.client.name.charAt(0).toUpperCase()}
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-1.5 mb-0.5">
                                            <span className="text-muted-foreground/40 shrink-0">
                                                <ClipboardList size={12} />
                                            </span>
                                            {editingTitle ? (
                                                <input
                                                    autoFocus
                                                    className="text-[15px] font-semibold text-foreground bg-transparent border-0 border-b border-foreground/20 focus:ring-0 outline-none w-full transition-colors"
                                                    value={titleDraft}
                                                    onChange={(e) => setTitleDraft(e.target.value)}
                                                    onBlur={handleTitleSave}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter') handleTitleSave()
                                                        if (e.key === 'Escape') setEditingTitle(false)
                                                    }}
                                                />
                                            ) : (
                                                <h1
                                                    className="text-[15px] font-semibold text-foreground truncate cursor-pointer hover:text-foreground/70 transition-colors"
                                                    onClick={() => { setTitleDraft(sr.title); setEditingTitle(true) }}
                                                >
                                                    {sr.title}
                                                </h1>
                                            )}
                                        </div>

                                        {sr.client && (
                                            <Link
                                                to={`/app/clients/${sr.client.id}`}
                                                className="flex items-center gap-1 text-[11px] text-muted-foreground/60 hover:text-accent transition-colors w-fit"
                                                onClick={onClose}
                                            >
                                                <User size={10} />
                                                {sr.client.name}
                                            </Link>
                                        )}
                                    </div>
                                </div>

                                {/* Right: status + priority + actions */}
                                <div className="flex items-center gap-2 shrink-0">
                                    {/* Status pill */}
                                    <div className="relative">
                                        <button
                                            onClick={() => setEditingStatus((v) => !v)}
                                            className="flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded-full transition-colors text-white/90"
                                            style={statusColor ? { backgroundColor: getAccentBg(statusColor, isDark) } : undefined}
                                        >
                                            {sr.status}
                                            <ChevronDown size={10} />
                                        </button>
                                        {editingStatus && (
                                            <>
                                                <div className="fixed inset-0 z-30" onClick={() => setEditingStatus(false)} />
                                                <div className="absolute right-0 top-full mt-1.5 bg-popover border border-border rounded-xl shadow-lg z-40 py-1 w-[160px]">
                                                    {SERVICE_REQUEST_STATUSES.map((s) => (
                                                        <button
                                                            key={s}
                                                            className={`w-full text-left px-4 py-1.5 text-[13px] hover:bg-muted transition-colors ${sr.status === s ? 'font-medium text-foreground' : 'text-muted-foreground'}`}
                                                            onClick={() => handleStatusChange(s)}
                                                        >
                                                            {s}
                                                        </button>
                                                    ))}
                                                </div>
                                            </>
                                        )}
                                    </div>

                                    {/* Priority pill */}
                                    <div className="relative">
                                        <button
                                            onClick={() => setEditingPriority((v) => !v)}
                                            className="flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded-full transition-colors capitalize text-white/90"
                                            style={priorityColor ? { backgroundColor: getAccentBg(priorityColor, isDark) } : undefined}
                                        >
                                            {sr.priority}
                                            <ChevronDown size={10} />
                                        </button>
                                        {editingPriority && (
                                            <>
                                                <div className="fixed inset-0 z-30" onClick={() => setEditingPriority(false)} />
                                                <div className="absolute right-0 top-full mt-1.5 bg-popover border border-border rounded-xl shadow-lg z-40 py-1 w-[130px]">
                                                    {SERVICE_REQUEST_PRIORITIES.map((p) => (
                                                        <button
                                                            key={p}
                                                            className={`w-full text-left px-4 py-1.5 text-[13px] hover:bg-muted transition-colors capitalize ${sr.priority === p ? 'font-medium text-foreground' : 'text-muted-foreground'}`}
                                                            onClick={() => handlePriorityChange(p)}
                                                        >
                                                            {p}
                                                        </button>
                                                    ))}
                                                </div>
                                            </>
                                        )}
                                    </div>

                                    {/* Delete */}
                                    {confirmDelete ? (
                                        <div className="flex items-center gap-1.5">
                                            <span className="text-[11px] text-destructive font-medium">Delete?</span>
                                            <button
                                                onClick={handleDelete}
                                                disabled={deleting}
                                                className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-destructive text-white hover:bg-destructive/90 transition-colors disabled:opacity-50"
                                            >
                                                {deleting ? 'Deleting…' : 'Yes'}
                                            </button>
                                            <button
                                                onClick={() => setConfirmDelete(false)}
                                                className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-muted hover:bg-muted/70 text-foreground transition-colors"
                                            >
                                                Cancel
                                            </button>
                                        </div>
                                    ) : (
                                        <button
                                            onClick={() => setConfirmDelete(true)}
                                            className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground/40 hover:text-destructive transition-colors"
                                            title="Delete service request"
                                        >
                                            <Trash2 size={14} strokeWidth={2} />
                                        </button>
                                    )}

                                    <button
                                        onClick={onClose}
                                        className="p-1.5 rounded-lg hover:bg-muted/60 text-muted-foreground/50 hover:text-foreground transition-colors"
                                    >
                                        <X size={15} strokeWidth={2} />
                                    </button>
                                </div>
                            </div>

                            {/* Meta row: type + date + description */}
                            <div className="flex items-center gap-3 mt-2.5 flex-wrap">
                                <span className="text-[11px] text-muted-foreground/60 bg-muted/50 px-2 py-0.5 rounded-md">
                                    {getRequestTypeLabel(sr.request_type)}
                                </span>
                                <span className="flex items-center gap-1 text-[11px] text-muted-foreground/50">
                                    <Calendar size={10} className="shrink-0" />
                                    {new Date(sr.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                </span>
                            </div>

                            {/* Description */}
                            <div className="mt-3">
                                {editingDescription ? (
                                    <textarea
                                        autoFocus
                                        className="w-full text-[13px] text-foreground bg-muted/30 border border-border/60 rounded-lg px-3 py-2 resize-none outline-none focus:border-accent/40 transition-colors"
                                        rows={3}
                                        value={descriptionDraft}
                                        onChange={(e) => setDescriptionDraft(e.target.value)}
                                        onBlur={handleDescriptionSave}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Escape') setEditingDescription(false)
                                        }}
                                        placeholder="Add a description..."
                                    />
                                ) : (
                                    <p
                                        className="text-[13px] text-muted-foreground/70 cursor-pointer hover:text-muted-foreground transition-colors leading-relaxed"
                                        onClick={() => { setDescriptionDraft(sr.description || ''); setEditingDescription(true) }}
                                    >
                                        {sr.description || 'Add a description...'}
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* Tabs */}
                        <div className="px-6 flex gap-0">
                            {(['documents', 'comments', 'activity'] as Tab[]).map((tab) => (
                                <button
                                    key={tab}
                                    onClick={() => setActiveTab(tab)}
                                    className={[
                                        'px-3 py-2 text-[12px] font-medium capitalize transition-colors',
                                        activeTab === tab
                                            ? 'border-b-2 border-foreground text-foreground -mb-px'
                                            : 'text-muted-foreground/60 hover:text-foreground',
                                    ].join(' ')}
                                >
                                    {tab === 'documents'
                                        ? `Documents${attachments.length > 0 ? ` · ${attachments.length}` : ''}`
                                        : tab === 'comments'
                                        ? `Comments${comments.length > 0 ? ` · ${comments.length}` : ''}`
                                        : `Activity${activities.length > 0 ? ` · ${activities.length}` : ''}`}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Tab content */}
                    <div className="overflow-y-auto px-6 py-5 flex-1">
                        <div className={activeTab === 'documents' ? '' : 'hidden'}>
                            {orgId && user && (
                                <ServiceRequestDocumentUploader
                                    serviceRequestId={serviceRequestId}
                                    orgId={orgId}
                                    uploadedBy={user.id}
                                    attachments={attachments}
                                    onUploaded={() => {
                                        qc.invalidateQueries({ queryKey: queryKeys.serviceRequests.attachments(serviceRequestId) })
                                        qc.invalidateQueries({ queryKey: queryKeys.serviceRequests.activities(serviceRequestId) })
                                    }}
                                    onDeleted={() => qc.invalidateQueries({ queryKey: queryKeys.serviceRequests.attachments(serviceRequestId) })}
                                />
                            )}
                        </div>
                        <div className={activeTab === 'comments' ? 'h-full flex flex-col' : 'hidden'}>
                            <CommentThread
                                entityType="service_request"
                                entityId={serviceRequestId}
                                onCommentCreated={async (comment) => {
                                    if (!orgId || !user) return
                                    await logServiceRequestActivity(orgId, user.id, serviceRequestId, 'comment_added', {
                                        body_preview: comment.body.slice(0, 100),
                                    })
                                    qc.invalidateQueries({ queryKey: queryKeys.serviceRequests.activities(serviceRequestId) })
                                }}
                            />
                        </div>
                        <div className={activeTab === 'activity' ? '' : 'hidden'}>
                            <ActivityTimeline activities={activities as ActivityRecord[]} />
                        </div>
                    </div>
                </div>
            </div>
        </>
    )
}
