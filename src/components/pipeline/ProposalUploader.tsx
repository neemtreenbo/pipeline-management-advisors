import { useState, useRef } from 'react'
import { Upload, FileText, Image, Trash2, ExternalLink, AlertTriangle } from 'lucide-react'
import type { DealAttachment, FileType } from '@/lib/attachments'
import { validateAttachmentFile, uploadDealAttachment, getSignedUrl, deleteAttachment, formatFileSize } from '@/lib/attachments'

import { logDealActivity } from '@/lib/deals'
import { Button } from '@/components/ui/button'

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
    const fileInputRef = useRef<HTMLInputElement>(null)
    const [uploading, setUploading] = useState(false)
    const [uploadError, setUploadError] = useState<string | null>(null)
    const [deletingId, setDeletingId] = useState<string | null>(null)

    const proposals = attachments.filter((a) => a.file_type === 'proposal')
    const supporting = attachments.filter((a) => a.file_type === 'supporting_document')

    const stagesNeedingProposal = ['Proposal Presented', 'Decision Pending']
    const isMissingProposal = stagesNeedingProposal.includes(dealStage) && proposals.length === 0

    async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0]
        if (!file) return

        const validationError = validateAttachmentFile(file)
        if (validationError) {
            setUploadError(validationError)
            e.target.value = ''
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
            if (fileInputRef.current) fileInputRef.current.value = ''
        }
    }

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
                className="flex items-center gap-3 p-3 rounded-lg border border-border bg-white hover:bg-muted/30 transition-colors"
            >
                <div className="shrink-0">
                    {FILE_ICON[a.mime_type ?? ''] ?? <FileText size={16} className="text-muted-foreground" />}
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{a.file_name}</p>
                    <p className="text-xs text-muted-foreground">
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
                        className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors"
                    >
                        <ExternalLink size={14} />
                    </button>
                    <button
                        onClick={() => handleDelete(a.id, a.storage_path)}
                        disabled={deletingId === a.id}
                        title="Delete"
                        className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-red-50 rounded-md transition-colors"
                    >
                        <Trash2 size={14} />
                    </button>
                </div>
            </div>
        )
    }

    return (
        <div className="flex flex-col gap-4">
            {/* Warning */}
            {isMissingProposal && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-50 border border-amber-100 text-amber-700 text-sm">
                    <AlertTriangle size={15} className="shrink-0" />
                    Proposal not uploaded yet. This deal is in <strong>{dealStage}</strong> stage.
                </div>
            )}

            {/* Upload button */}
            <div>
                <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.png,.jpg,.jpeg"
                    className="hidden"
                    id="proposal-file-input"
                    onChange={handleFileChange}
                    disabled={uploading}
                />
                <Button
                    id="upload-proposal-btn"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                >
                    <Upload size={15} />
                    {uploading ? 'Uploading...' : 'Upload Proposal'}
                </Button>
                <p className="text-xs text-muted-foreground mt-1.5">PDF, PNG, or JPG · max 10 MB</p>
            </div>

            {uploadError && (
                <p className="text-sm text-destructive bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                    {uploadError}
                </p>
            )}

            {/* Proposals list */}
            {proposals.length > 0 && (
                <div className="flex flex-col gap-2">
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                        Proposals ({proposals.length})
                    </h4>
                    {proposals.map((a) => <AttachmentItem key={a.id} a={a} />)}
                </div>
            )}

            {/* Supporting docs */}
            {supporting.length > 0 && (
                <div className="flex flex-col gap-2 mt-2">
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                        Supporting Documents ({supporting.length})
                    </h4>
                    {supporting.map((a) => <AttachmentItem key={a.id} a={a} />)}
                </div>
            )}

            {attachments.length === 0 && (
                <p className="text-sm text-muted-foreground">No files uploaded yet.</p>
            )}
        </div>
    )
}
