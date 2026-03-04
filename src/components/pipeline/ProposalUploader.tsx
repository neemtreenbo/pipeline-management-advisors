import { useState, useCallback } from 'react'
import { FileText, Image, Trash2, ExternalLink, AlertTriangle, UploadCloud } from 'lucide-react'
import { useDropzone } from 'react-dropzone'
import type { DealAttachment, FileType } from '@/lib/attachments'
import { validateAttachmentFile, uploadDealAttachment, getSignedUrl, deleteAttachment, formatFileSize } from '@/lib/attachments'
import { logDealActivity } from '@/lib/deals'
import { cn } from '@/lib/utils'

interface ProposalUploaderProps {
    dealId: string
    orgId: string
    uploadedBy: string
    attachments: DealAttachment[]
    onUploaded: (attachment: DealAttachment) => void
    onDeleted: (id: string) => void
    dealStage: string
}

const FILE_ICON: Record<string, React.ReactNode> = {
    'application/pdf': <FileText size={16} className="text-red-500" />,
    'image/png': <Image size={16} className="text-blue-500" />,
    'image/jpeg': <Image size={16} className="text-blue-500" />,
    'image/jpg': <Image size={16} className="text-blue-500" />,
}

export default function ProposalUploader({
    dealId,
    orgId,
    uploadedBy,
    attachments,
    onUploaded,
    onDeleted,
    dealStage,
}: ProposalUploaderProps) {
    const [uploading, setUploading] = useState(false)
    const [uploadError, setUploadError] = useState<string | null>(null)
    const [deletingId, setDeletingId] = useState<string | null>(null)

    const proposals = attachments.filter((a) => a.file_type === 'proposal')
    const supporting = attachments.filter((a) => a.file_type === 'supporting_document')

    const stagesNeedingProposal = ['Proposal Presented', 'Decision Pending']
    const isMissingProposal = stagesNeedingProposal.includes(dealStage) && proposals.length === 0

    const onDrop = useCallback(async (acceptedFiles: File[]) => {
        const file = acceptedFiles[0]
        if (!file) return

        const validationError = validateAttachmentFile(file)
        if (validationError) {
            setUploadError(validationError)
            return
        }

        setUploading(true)
        setUploadError(null)

        try {
            const fileType: FileType = 'proposal'
            const attachment = await uploadDealAttachment(dealId, orgId, uploadedBy, file, fileType)

            // Log activity
            await logDealActivity(orgId, uploadedBy, dealId, 'proposal_uploaded', {
                file_name: file.name,
                attachment_id: attachment.id,
            })

            onUploaded(attachment)
        } catch (err: unknown) {
            setUploadError((err as Error).message ?? 'Upload failed.')
        } finally {
            setUploading(false)
        }
    }, [dealId, orgId, uploadedBy, onUploaded])

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: {
            'application/pdf': ['.pdf'],
            'image/png': ['.png'],
            'image/jpeg': ['.jpg', '.jpeg']
        },
        maxSize: 10 * 1024 * 1024, // 10MB
        disabled: uploading,
        multiple: false
    })

    async function handleView(storagePath: string) {
        try {
            const url = await getSignedUrl(storagePath)
            window.open(url, '_blank', 'noopener,noreferrer')
        } catch {
            alert('Could not generate download link. Please try again.')
        }
    }

    async function handleDelete(id: string, storagePath: string) {
        if (!confirm('Delete this file? This cannot be undone.')) return
        setDeletingId(id)
        try {
            await deleteAttachment(id, storagePath)
            onDeleted(id)
        } catch (err: unknown) {
            alert((err as Error).message ?? 'Delete failed.')
        } finally {
            setDeletingId(null)
        }
    }

    function AttachmentItem({ a }: { a: DealAttachment }) {
        return (
            <div
                key={a.id}
                className="flex items-center gap-3 p-3 rounded-xl border border-border/50 bg-white hover:bg-muted/30 transition-colors shadow-sm"
            >
                <div className="shrink-0">
                    {FILE_ICON[a.mime_type ?? ''] ?? <FileText size={16} className="text-muted-foreground" />}
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{a.file_name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                        {formatFileSize(a.size_bytes)} ·{' '}
                        {new Date(a.created_at).toLocaleDateString('en-PH', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                        })}
                    </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                    <button
                        onClick={() => handleView(a.storage_path)}
                        title="View / Download"
                        className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
                    >
                        <ExternalLink size={15} />
                    </button>
                    <button
                        onClick={() => handleDelete(a.id, a.storage_path)}
                        disabled={deletingId === a.id}
                        title="Delete"
                        className="p-2 text-muted-foreground hover:text-destructive hover:bg-red-50 rounded-lg transition-colors"
                    >
                        <Trash2 size={15} />
                    </button>
                </div>
            </div>
        )
    }

    return (
        <div className="flex flex-col gap-6">
            {/* Warning */}
            {isMissingProposal && (
                <div className="flex items-center gap-2.5 p-3.5 rounded-xl bg-amber-50 border border-amber-100/50 text-amber-700 text-sm shadow-sm">
                    <AlertTriangle size={16} className="shrink-0" />
                    <p>Proposal not uploaded yet. This deal is in <strong>{dealStage}</strong> stage.</p>
                </div>
            )}

            {/* Dropzone Upload Box */}
            <div className="flex flex-col gap-2">
                <div
                    {...getRootProps()}
                    className={cn(
                        "relative flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-2xl transition-all cursor-pointer group",
                        isDragActive ? "border-primary bg-primary/5" : "border-border/60 hover:border-primary/50 hover:bg-muted/30",
                        uploading && "opacity-50 pointer-events-none"
                    )}
                >
                    <input {...getInputProps()} id="proposal-file-input" />

                    <div className="p-3 bg-muted group-hover:bg-primary/10 rounded-full mb-3 transition-colors">
                        <UploadCloud size={24} className={cn(
                            "transition-colors",
                            isDragActive ? "text-primary" : "text-muted-foreground group-hover:text-primary"
                        )} />
                    </div>

                    <p className="text-sm font-medium text-foreground mb-1 text-center">
                        {uploading ? 'Uploading...' : isDragActive ? 'Drop your file here' : 'Click or drag file to this area to upload'}
                    </p>
                    <p className="text-xs text-muted-foreground text-center">
                        Supports PDF, PNG, JPG up to 10MB
                    </p>
                </div>

                {uploadError && (
                    <div className="text-sm text-destructive bg-red-50 border border-red-100 rounded-xl px-4 py-3 shadow-sm mt-1">
                        {uploadError}
                    </div>
                )}
            </div>

            <div className="space-y-6">
                {/* Proposals list */}
                {proposals.length > 0 && (
                    <div className="flex flex-col gap-3">
                        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                            Proposals <span className="bg-muted px-2 py-0.5 rounded-full text-[10px]">{proposals.length}</span>
                        </h4>
                        <div className="grid gap-2">
                            {proposals.map((a) => <AttachmentItem key={a.id} a={a} />)}
                        </div>
                    </div>
                )}

                {/* Supporting docs */}
                {supporting.length > 0 && (
                    <div className="flex flex-col gap-3">
                        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                            Supporting Documents <span className="bg-muted px-2 py-0.5 rounded-full text-[10px]">{supporting.length}</span>
                        </h4>
                        <div className="grid gap-2">
                            {supporting.map((a) => <AttachmentItem key={a.id} a={a} />)}
                        </div>
                    </div>
                )}

                {attachments.length === 0 && !isMissingProposal && (
                    <div className="text-center py-6">
                        <p className="text-sm text-muted-foreground">No files uploaded yet.</p>
                    </div>
                )}
            </div>
        </div>
    )
}
