import { useState, useCallback } from 'react'
import { FileText, Image, Trash2, ExternalLink, UploadCloud } from 'lucide-react'
import { useDropzone } from 'react-dropzone'
import type { ServiceRequestAttachment } from '@/lib/service-requests'
import {
    validateServiceRequestFile,
    uploadServiceRequestAttachment,
    getServiceRequestSignedUrl,
    deleteServiceRequestAttachment,
    logServiceRequestActivity,
} from '@/lib/service-requests'
import { formatFileSize } from '@/lib/attachments'
import { cn } from '@/lib/utils'

interface ServiceRequestDocumentUploaderProps {
    serviceRequestId: string
    orgId: string
    uploadedBy: string
    attachments: ServiceRequestAttachment[]
    onUploaded: (attachment: ServiceRequestAttachment) => void
    onDeleted: (id: string) => void
}

const FILE_ICON: Record<string, React.ReactNode> = {
    'application/pdf': <FileText size={16} className="text-red-500" />,
    'image/png': <Image size={16} className="text-blue-500" />,
    'image/jpeg': <Image size={16} className="text-blue-500" />,
    'image/jpg': <Image size={16} className="text-blue-500" />,
}

function AttachmentItem({ a, onView, onDelete, deletingId }: {
    a: ServiceRequestAttachment
    onView: (storagePath: string) => void
    onDelete: (id: string, storagePath: string) => void
    deletingId: string | null
}) {
    return (
        <div className="flex items-center gap-3 p-3 rounded-xl border border-border/50 bg-card hover:bg-muted/30 transition-colors shadow-sm">
            <div className="shrink-0">
                {FILE_ICON[a.mime_type ?? ''] ?? <FileText size={16} className="text-muted-foreground" />}
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{a.file_name}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                    {formatFileSize(a.size_bytes)} ·{' '}
                    {new Date(a.created_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                    })}
                </p>
            </div>
            <div className="flex items-center gap-1 shrink-0">
                <button
                    onClick={() => onView(a.storage_path)}
                    title="View / Download"
                    className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
                >
                    <ExternalLink size={15} />
                </button>
                <button
                    onClick={() => onDelete(a.id, a.storage_path)}
                    disabled={deletingId === a.id}
                    title="Delete"
                    className="p-2 text-muted-foreground hover:text-destructive hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                >
                    <Trash2 size={15} />
                </button>
            </div>
        </div>
    )
}

export default function ServiceRequestDocumentUploader({
    serviceRequestId,
    orgId,
    uploadedBy,
    attachments,
    onUploaded,
    onDeleted,
}: ServiceRequestDocumentUploaderProps) {
    const [uploading, setUploading] = useState(false)
    const [uploadError, setUploadError] = useState<string | null>(null)
    const [deletingId, setDeletingId] = useState<string | null>(null)

    const onDrop = useCallback(async (acceptedFiles: File[]) => {
        const file = acceptedFiles[0]
        if (!file) return

        const validationError = validateServiceRequestFile(file)
        if (validationError) {
            setUploadError(validationError)
            return
        }

        setUploading(true)
        setUploadError(null)

        try {
            const attachment = await uploadServiceRequestAttachment(
                serviceRequestId, orgId, uploadedBy, file
            )

            await logServiceRequestActivity(orgId, uploadedBy, serviceRequestId, 'document_uploaded', {
                file_name: file.name,
                attachment_id: attachment.id,
            })

            onUploaded(attachment)
        } catch (err: unknown) {
            setUploadError((err as Error).message ?? 'Upload failed.')
        } finally {
            setUploading(false)
        }
    }, [serviceRequestId, orgId, uploadedBy, onUploaded])

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: {
            'application/pdf': ['.pdf'],
            'image/png': ['.png'],
            'image/jpeg': ['.jpg', '.jpeg'],
        },
        maxSize: 10 * 1024 * 1024,
        disabled: uploading,
        multiple: false,
    })

    async function handleView(storagePath: string) {
        try {
            const url = await getServiceRequestSignedUrl(storagePath)
            window.open(url, '_blank', 'noopener,noreferrer')
        } catch {
            alert('Could not generate download link. Please try again.')
        }
    }

    async function handleDelete(id: string, storagePath: string) {
        if (!confirm('Delete this file? This cannot be undone.')) return
        setDeletingId(id)
        try {
            await deleteServiceRequestAttachment(id, storagePath)
            onDeleted(id)
        } catch (err: unknown) {
            alert((err as Error).message ?? 'Delete failed.')
        } finally {
            setDeletingId(null)
        }
    }

    return (
        <div className="flex flex-col gap-6">
            {/* Dropzone */}
            <div className="flex flex-col gap-2">
                <div
                    {...getRootProps()}
                    className={cn(
                        "relative flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-2xl transition-all cursor-pointer group",
                        isDragActive ? "border-primary bg-primary/5" : "border-border/60 hover:border-primary/50 hover:bg-muted/30",
                        uploading && "opacity-50 pointer-events-none"
                    )}
                >
                    <input {...getInputProps()} />

                    <div className="p-3 bg-muted group-hover:bg-primary/10 rounded-full mb-3 transition-colors">
                        <UploadCloud size={24} className={cn(
                            "transition-colors",
                            isDragActive ? "text-primary" : "text-muted-foreground group-hover:text-primary"
                        )} />
                    </div>

                    <p className="text-sm font-medium text-foreground mb-1 text-center">
                        {uploading ? 'Uploading...' : isDragActive ? 'Drop your file here' : 'Click or drag file to upload'}
                    </p>
                    <p className="text-xs text-muted-foreground text-center">
                        Supports PDF, PNG, JPG up to 10MB
                    </p>
                </div>

                {uploadError && (
                    <div className="text-sm text-destructive bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/30 rounded-xl px-4 py-3 shadow-sm mt-1">
                        {uploadError}
                    </div>
                )}
            </div>

            {/* File list */}
            {attachments.length > 0 ? (
                <div className="flex flex-col gap-3">
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                        Documents <span className="bg-muted px-2 py-0.5 rounded-full text-[10px]">{attachments.length}</span>
                    </h4>
                    <div className="grid gap-2">
                        {attachments.map((a) => <AttachmentItem key={a.id} a={a} onView={handleView} onDelete={handleDelete} deletingId={deletingId} />)}
                    </div>
                </div>
            ) : (
                <div className="text-center py-6">
                    <p className="text-sm text-muted-foreground">No documents uploaded yet.</p>
                </div>
            )}
        </div>
    )
}
